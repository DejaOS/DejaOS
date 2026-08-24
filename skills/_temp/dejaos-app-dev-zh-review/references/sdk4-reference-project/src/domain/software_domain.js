/**
 * @layer    domain
 * @module   software_domain
 * @depends  storage/config,config/rules,os_driver,ota_driver,person_domain,voucher_domain,record_domain
 */

import configStorage from '../storage/config/config.js';
import rules from '../storage/config/rules.js';
import osDriver from '../drivers/os_driver.js';
import otaDriver from '../drivers/ota_driver.js';
import personDomain from './person_domain.js';
import voucherDomain from './voucher_domain.js';
import recordDomain from './record_domain.js';
import { AppError } from '../core/error.js';

// 卡 200/201/202，人脸 300，密码 400，指纹 500。
const CARD_TYPES = ['200', '201', '202'];
const FACE_TYPE = '300';
const PASSWORD_TYPE = '400';
const FINGERPRINT_TYPE = '500';

const softwareDomain = {};

/**
 * 设备硬件能力（UI 只要开关；正文仅 lifecycle / 驱动侧使用）。
 * @returns {{ nfc: boolean, finger: boolean, scanner: boolean, intercom: boolean, display: object }}
 */
softwareDomain.getCapabilities = function () {
    const caps = osDriver.getCapabilities();
    return {
        nfc: caps.nfc.enabled,
        finger: caps.finger.enabled,
        scanner: caps.scanner.enabled,
        intercom: caps.intercom.enabled,
        display: osDriver.getDisplayInfo(),
    };
};

softwareDomain.getConfigDefaults = function () {
    return Object.assign({}, rules.runtimeDefaults);
};

softwareDomain.validateConfig = function (values, current) {
    return rules.validate(values, current);
};

softwareDomain.getConfig = async function (selection, runtime) {
    const grouped = rules.project(await configStorage.getAll(), runtime);
    return rules.select(grouped, selection);
};

softwareDomain.setConfig = async function (group, values) {
    await configStorage.setGroup(group, values);
    return await configStorage.getGroup(group);
};

/** 首次设密属于应用内部状态，不能通过通用setConfig伪造。 */
softwareDomain.completeFirstLogin = async function (password) {
    const values = { firstLogin: 1 };
    if (password !== undefined) {
        if (typeof password !== 'string' || password.length < 4 || password.length > 16) {
            throw new AppError('200000', '管理员密码长度必须为4到16位');
        }
        values.password = password;
    }
    await configStorage.setGroup('base', values);
    return true;
};

/** 仅重建配置表；人员、凭证、权限和通行记录不属于配置恢复范围。 */
softwareDomain.restoreConfigDefaults = async function () {
    await configStorage.resetToDefaults();
    return true;
};

softwareDomain.getRuntimeConfig = function () {
    return {
        'sys.mac': osDriver.getMac(),
        // 对外uuid字段保留协议名称，但值统一使用设备SN。
        'sys.uuid': osDriver.getSn(),
        'sys.sn': osDriver.getSn(),
        // 当前组件没有发布时间接口，保留MQTT兼容字段但不写入SQLite。
        // TODO：由版本发布流程补充真实发布时间来源。
        'sys.releaseTime': '',
    };
};

/**
 * 设备信息页聚合查询：系统标识、固件、磁盘与业务容量统计。
 * View 不得直连 Storage/Driver，统一经 Command 进入本方法。
 */
softwareDomain.getDeviceInfo = async function () {
    const sys = await configStorage.getGroup('sys');
    const runtime = softwareDomain.getRuntimeConfig();
    const disk = osDriver.getDiskStats();
    return {
        sn: osDriver.getSn() || '',
        firmwareVersion: sys.appVersion || '',
        // releaseTime 暂无运行时覆盖；无来源时为空字符串。
        firmwareDate: runtime['sys.releaseTime'] || '',
        totalSpaceMb: disk.total,
        usedSpaceMb: disk.used,
        freeSpaceMb: disk.free,
        personCount: await personDomain.count(),
        faceWhitelistCount: await voucherDomain.countByType(FACE_TYPE),
        passwordWhitelistCount: await voucherDomain.countByType(PASSWORD_TYPE),
        cardWhitelistCount: await voucherDomain.countByTypes(CARD_TYPES),
        fingerprintWhitelistCount: await voucherDomain.countByType(FINGERPRINT_TYPE),
        passRecordCount: await recordDomain.count(),
    };
};

softwareDomain.reboot = async function (delaySec) {
    return await osDriver.reboot(delaySec);
};

softwareDomain.reset = async function () {
    return await osDriver.reset();
};

function normalizeUpgrade(input) {
    if (!input || typeof input !== 'object' || Array.isArray(input)) {
        throw new AppError('200000', '升级参数必须是对象');
    }
    const type = input.type === undefined ? 0 : Number(input.type);
    const url = String(input.url || '').trim();
    const md5 = String(input.md5 || '').trim().toLowerCase();
    const timeoutSec = input.timeoutSec === undefined ? 300 : Number(input.timeoutSec);
    if (type !== 0) throw new AppError('200000', '当前仅支持type=0的HTTP升级');
    if (!url) throw new AppError('200000', '升级地址不能为空');
    if (!/^[a-f0-9]{32}$/.test(md5)) throw new AppError('200000', 'md5必须是32位十六进制字符串');
    if (!Number.isInteger(timeoutSec) || timeoutSec <= 0 || timeoutSec > 3600) {
        throw new AppError('200000', 'timeoutSec必须是1到3600之间的整数');
    }
    return { url: url, md5: md5, timeoutMs: timeoutSec * 1000 };
}

softwareDomain.upgrade = async function (input) {
    try {
        return await otaDriver.updateHttp(normalizeUpgrade(input));
    } catch (e) {
        if (e instanceof AppError) throw e;
        throw new AppError('300000', e && e.message ? e.message : '升级失败');
    }
};

softwareDomain.uploadUpgradeChunk = async function (input) {
    try {
        return await otaDriver.uploadChunk(input);
    } catch (e) {
        throw new AppError('300000', e && e.message ? e.message : '升级包上传失败');
    }
};

softwareDomain.abortUpgrade = async function () {
    try {
        return await otaDriver.abortUpload();
    } catch (e) {
        throw new AppError('300000', e && e.message ? e.message : '取消升级失败');
    }
};

softwareDomain.rebootForUpgrade = function (delaySec) {
    return otaDriver.reboot(delaySec);
};

/** 扫码OTA没有协议回包钩子，升级包安全落位后直接安排延时重启。 */
softwareDomain.upgradeFromHttp = async function (input) {
    const result = await softwareDomain.upgrade(input);
    softwareDomain.rebootForUpgrade(2);
    return result;
};

export default softwareDomain;
