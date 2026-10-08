/**
 * @layer    domain
 * @module   software_domain
 * @depends  storage/config,config/rules,os_driver,ota_driver,person_domain,voucher_domain,record_domain,finger_domain,dxLogger
 */

import configStorage from '../storage/config/config.js';
import rules from '../storage/config/rules.js';
import osDriver from '../drivers/os_driver.js';
import otaDriver from '../drivers/ota_driver.js';
import dxDriver from '../../dxmodules/dxDriver.js';
import personDomain from './person_domain.js';
import voucherDomain from './voucher_domain.js';
import recordDomain from './record_domain.js';
import fingerDomain from './finger_domain.js';
import dxLogger from '../../dxmodules/dxLogger.js';
import { AppError } from '../core/error.js';
import { APP_VERSION, RELEASE_TIME } from '../version.js';
import voucherTypes from '../core/voucher_types.js';

// 设备资源统计与凭证类型常量统一，身份证 205 独立于普通卡 200。
const CARD_TYPES = voucherTypes.GROUPS.card;
const FACE_TYPE = voucherTypes.FACE;
const PASSWORD_TYPE = voucherTypes.PASSWORD;
const FINGERPRINT_TYPE = voucherTypes.FINGER;

const softwareDomain = {};

/**
 * 设备硬件能力（UI 只要开关；正文仅 lifecycle / 驱动侧使用）。
 * @returns {{
 *   nfc: boolean,
 *   finger: boolean,
 *   scanner: boolean,
 *   intercom: boolean,
 *   pwmWhite: boolean,
 *   pwmNir: boolean,
 *   wifi: boolean,
 *   tamper: boolean,
 *   model: string,
 *   display: object
 * }}
 */
softwareDomain.getCapabilities = function () {
    const caps = osDriver.getCapabilities();
    const model = dxDriver.DRIVER && dxDriver.DRIVER.MODEL;
    const pwmMode = String((caps.pwm && caps.pwm.content) || '').trim().toLowerCase();
    const pwmOn = !!(caps.pwm && caps.pwm.enabled);
    return {
        nfc: caps.nfc.enabled,
        finger: caps.finger.enabled,
        scanner: caps.scanner.enabled,
        intercom: caps.intercom.enabled,
        pwmWhite: pwmOn && (pwmMode === 'white' || pwmMode === 'all' || pwmMode === ''),
        pwmNir: pwmOn && (pwmMode === 'nir' || pwmMode === 'all' || pwmMode === ''),
        wifi: model.indexOf('vf202') < 0,
        tamper: model.indexOf('vf105') < 0 && model.indexOf('vf114') < 0,
        model: model,
        display: osDriver.getDisplayInfo(),
    };
};

softwareDomain.getConfigDefaults = function () {
    return Object.assign({}, rules.runtimeDefaults);
};

softwareDomain.validateConfig = function (values) {
    return rules.validatePartial(values);
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
    // 默认配置可能预置密码但firstLogin仍为0；此时Web首次设密允许替换预置值。
    // 只有首次流程已完成且密码非空时才拒绝匿名调用，避免接口退化为密码重置入口。
    const firstLogin = Number(await configStorage.get('base.firstLogin', 0));
    const currentPassword = await configStorage.get('base.password', '');
    if (password !== undefined && firstLogin === 1 && currentPassword !== '') {
        throw new AppError('403', '管理员密码已完成首次设置');
    }
    const values = { firstLogin: 1 };
    if (password !== undefined) {
        if (typeof password !== 'string' || !password) throw new AppError('200000', '管理员密码不能为空');
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
    const disk = osDriver.getDiskStats();
    return {
        'sys.appVersion': APP_VERSION,
        'sys.mac': osDriver.getMac(),
        'sys.sn': osDriver.getSn(),
        'sys.releaseTime': RELEASE_TIME,
        'sys.totaldisk': disk.total + ' MB',
        'sys.freedisk': disk.free + ' MB',
    };
};

/**
 * 设备信息页聚合查询：系统标识、固件、磁盘与业务容量统计。
 * View 不得直连 Storage/Driver，统一经 Command 进入本方法。
 */
softwareDomain.getDeviceInfo = async function () {
    const runtime = softwareDomain.getRuntimeConfig();
    const disk = osDriver.getDiskStats();
    return {
        sn: osDriver.getSn() || '',
        firmwareVersion: runtime['sys.appVersion'] || '',
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
    // 指纹模板在模组 Flash，不在 /data；重置磁盘前必须先清模组，否则重启后库满会「指纹模板写入失败」。
    if (fingerDomain.isActive()) {
        try {
            await fingerDomain.clear();
        } catch (e) {
            dxLogger.error('software_domain.reset: finger clear failed: '
                + (e && e.message ? e.message : e));
        }
    }
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
