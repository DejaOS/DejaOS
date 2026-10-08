/**
 * @layer    drivers
 * @module   os_driver
 * @depends  dxOs,dxCommonUtils,dxStd
 */

import dxOs from '../../dxmodules/dxOs.js';
import dxCommonUtils from '../../dxmodules/dxCommonUtils.js';
import dxStd from '../../dxmodules/dxStd.js';
import dxDriver from '../../dxmodules/dxDriver.js';

/** 硬件能力标志文件（存在即具备对应能力；文件内容供厂商/激活码等扩展）。 */
const FLAG = {
    nfc: '/etc/app/.nfc',
    finger: '/etc/app/.finger',
    scanner: '/etc/app/.scanner',
    intercom: '/etc/app/.intercom',
    cloudService: '/etc/app/.cloudService',
    pwm: '/etc/app/.pwm',
};

function flagExists(path) {
    try {
        return dxStd.existSync(path) === true;
    } catch (_e) {
        return false;
    }
}

/** @param {string} path @returns {string} */
function readFlagContent(path) {
    try {
        const text = dxStd.loadFileSync(path);
        return text ? String(text).trim() : '';
    } catch (_e) {
        return '';
    }
}

/**
 * 读取单路标志：存在即 enabled，并带上文件正文。
 * @param {string} path
 * @returns {{ enabled: boolean, content: string }}
 */
function readCapability(path) {
    if (!flagExists(path)) {
        return { enabled: false, content: '' };
    }
    return { enabled: true, content: readFlagContent(path) };
}

const osDriver = {};

/**
 * 启动早期系统调参：放宽 overcommit，避免低内存设备 fork/shell 失败。
 * 须在可能 fork 的模块（sqlite、网络等）之前调用。
 */
osDriver.applyEarlyTuning = function () {
    try {
        dxOs.systemBlocked('echo 1 > /proc/sys/vm/overcommit_memory');
    } catch (_e) {
        // 个别机型无该节点或权限不足时忽略，不阻断启动。
    }
};

osDriver.init = async function () {};

osDriver.updateConfig = async function () {};

osDriver.getMac = function () {
    return dxOs.getUuid2mac() || '';
};

osDriver.getSn = function () {
    return dxOs.getSn() || '';
};

/**
 * 系统单调运行时长（毫秒）。只用于超时和延时，禁止替代业务时间戳。
 * 修改系统日期、NTP校时不会影响该值。
 */
osDriver.getUptimeMs = function () {
    const seconds = Number(dxOs.getUptime());
    return Number.isFinite(seconds) && seconds >= 0 ? seconds * 1000 : 0;
};

/**
 * 产品硬件能力快照（一次返回开关 + 文件内容）。
 * - finger：依赖 /etc/app/.finger；存在即启用，正文含模组型号（如 zaz5000 / MZ1021-VF201）
 * - scanner：依赖 /etc/app/.scanner；存在即启用，正文为模组型号（vg / ad331）
 * - pwm：依赖 /etc/app/.pwm；存在即启用，正文为 white / nir / all
 * @returns {{
 *   nfc: { enabled: boolean, content: string },
 *   finger: { enabled: boolean, content: string },
 *   scanner: { enabled: boolean, content: string },
 *   intercom: { enabled: boolean, content: string },
 *   cloudService: { enabled: boolean, content: string },
 *   pwm: { enabled: boolean, content: string }
 * }}
 */
osDriver.getCapabilities = function () {
    return {
        nfc: readCapability(FLAG.nfc),
        finger: readCapability(FLAG.finger),
        scanner: readCapability(FLAG.scanner),
        intercom: readCapability(FLAG.intercom),
        cloudService: readCapability(FLAG.cloudService),
        pwm: readCapability(FLAG.pwm),
    };
};

/**
 * 读取磁盘容量。dxCommonUtils.getDiskStats 返回值单位已是 MB。
 * @returns {{ total: number, used: number, free: number }}
 */
osDriver.getDiskStats = function () {
    try {
        const stats = dxCommonUtils.getDiskStats() || {};
        const total = Math.max(0, Math.floor(Number(stats.total) || 0));
        const free = Math.max(0, Math.floor(Number(stats.free) || 0));
        const usedRaw = Number(stats.used);
        const used = Number.isFinite(usedRaw) && usedRaw >= 0
            ? Math.floor(usedRaw)
            : Math.max(0, total - free);
        return { total: total, used: used, free: free };
    } catch (_error) {
        return { total: 0, used: 0, free: 0 };
    }
};

/** WebServer和UI统一从板级dxDriver读取真实显示参数，禁止按型号维护映射表。 */
osDriver.getDisplayInfo = function () {
    const display = dxDriver.DISPLAY || {};
    return {
        width: Number(display.WIDTH) || 0,
        height: Number(display.HEIGHT) || 0,
        rotation: Number(display.ROTATION) || 0,
        dpi: Number(display.DPI) || 0,
    };
};

osDriver.reboot = async function (delaySec) {
    dxOs.asyncReboot(delaySec === undefined ? 0 : delaySec);
};

osDriver.reset = async function () {
    /*
     * 只删除本应用及已确认的人脸/升级数据，禁止沿用2.0的rm -rf /data/*，
     * 避免误删系统或其他应用数据；新增模块必须在此显式追加自己的数据路径。
     */
    const result = await dxOs.systemBrief(
        'rm -rf /data/face_app /data/face.db /upgrades.zip /upgrades.temp /upgrades.chunk /upgrades.upload'
    );
    if (result !== 0) {
        throw new Error('os_driver.reset: failed to remove application data, code=' + result);
    }
    dxOs.asyncReboot(0);
};

osDriver.destroy = async function () {};

export default osDriver;
