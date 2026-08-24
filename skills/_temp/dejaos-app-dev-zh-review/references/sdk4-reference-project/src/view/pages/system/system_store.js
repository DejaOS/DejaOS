/** @layer view @module system_store @depends event_bus,commands */

import eventBus from '../../../core/event_bus.js';
import commands from '../../../core/commands.js';

export const TIMEOUT_OPTIONS = [0, 1, 2, 3, 4, 5];
export const TZ_REGIONS = ['pacific', 'america', 'atlantic', 'europe', 'asia', 'australia'];
export const TZ_BY_REGION = {
    pacific: ['Pacific/Honolulu', 'Pacific/Auckland', 'Pacific/Fiji', 'Pacific/Guam', 'Pacific/Pago_Pago', 'Pacific/Port_Moresby', 'Pacific/Noumea', 'Pacific/Tahiti'],
    america: ['America/Los_Angeles', 'America/Denver', 'America/Chicago', 'America/New_York', 'America/Toronto', 'America/Mexico_City', 'America/Sao_Paulo', 'America/Argentina/Buenos_Aires', 'America/Lima', 'America/Santiago', 'America/Bogota', 'America/Caracas'],
    atlantic: ['Atlantic/Reykjavik', 'Atlantic/Azores', 'Atlantic/Canary', 'Atlantic/Bermuda', 'Atlantic/Cape_Verde', 'Atlantic/South_Georgia'],
    europe: ['Europe/London', 'Europe/Paris', 'Europe/Berlin', 'Europe/Madrid', 'Europe/Rome', 'Europe/Amsterdam', 'Europe/Moscow', 'Europe/Istanbul', 'Europe/Athens', 'Europe/Warsaw', 'Europe/Stockholm', 'Europe/Zurich'],
    asia: ['Asia/Shanghai', 'Asia/Hong_Kong', 'Asia/Taipei', 'Asia/Tokyo', 'Asia/Seoul', 'Asia/Singapore', 'Asia/Bangkok', 'Asia/Jakarta', 'Asia/Dubai', 'Asia/Kolkata', 'Asia/Karachi', 'Asia/Jerusalem', 'Asia/Manila', 'Asia/Ho_Chi_Minh', 'Asia/Kuala_Lumpur', 'Asia/Riyadh'],
    australia: ['Australia/Sydney', 'Australia/Melbourne', 'Australia/Brisbane', 'Australia/Perth', 'Australia/Adelaide', 'Australia/Darwin', 'Australia/Hobart'],
};

export function regionOfTimeZone(zone) {
    const id = String(zone || '');
    const regions = Object.keys(TZ_BY_REGION);
    for (let i = 0; i < regions.length; i++) {
        if (TZ_BY_REGION[regions[i]].indexOf(id) >= 0) return regions[i];
    }
    for (let i = 0; i < regions.length; i++) {
        if (id.indexOf(regions[i][0].toUpperCase() + regions[i].substring(1) + '/') === 0) return regions[i];
    }
    return null;
}

let config = null;

function has(value, key) {
    return Object.prototype.hasOwnProperty.call(value, key);
}

function mapConfig(result) {
    const base = result && result.base ? result.base : {};
    const face = result && result.face ? result.face : {};
    const sys = result && result.sys ? result.sys : {};
    const ntp = result && result.ntp ? result.ntp : {};
    return {
        brightness: base.backlight,
        screenOff: base.screenOff,
        screensaver: base.screensaver,
        showIp: base.showIp === 1,
        showSn: base.showSn === 1,
        accessDisplayFields: Array.isArray(base.accessDisplayFields)
            ? base.accessDisplayFields.slice() : ['name', 'department'],
        language: base.language === 'EN' ? 'en' : 'zh',
        whiteLight: base.brightness,
        whiteLightMode: Number(base.whiteLightMode) || 0,
        nirLight: base.nirBrightness,
        similarity: Math.round(Number(face.similarity || 0) * 100),
        // 历史字段名虽然叫livenessOff，但协议和Driver约定1表示开启。
        liveness: face.livenessOff === 1,
        livenessVal: face.livenessVal,
        recheck: Number(face.recheck) || 8,
        recognitionTimeout: Number(face.recognitionTimeout) || 5,
        cardVerify: sys.nfc === 1,
        cardIdentity: Number(sys.nfcIdentityCardEnable) || 1,
        passwordOpen: sys.pwd === 1,
        loginPassword: base.password || '',
        /** firstLogin: 0 未完成首次设密，1 已完成（持久化的应用内部只读字段） */
        firstLoginDone: Number(base.firstLogin) === 1,
        ntpServer: ntp.server || '',
        timeZone: ntp.timeZone || 'Asia/Shanghai',
    };
}

function fail(error) {
    return {
        ok: false,
        error: error && error.code === '300000' ? 'pending' : 'service',
        message: error && error.message ? error.message : '系统配置操作失败',
    };
}

const systemStore = {};

systemStore.load = async function () {
    config = mapConfig(await eventBus.execute(commands.GET_CONFIG, ['base', 'face', 'sys', 'ntp']));
    return systemStore.getConfig();
};

systemStore.getConfig = function () {
    if (!config) throw new Error('system_store: config is not loaded');
    return Object.assign({}, config);
};

systemStore.getSystemTime = async function () {
    return await eventBus.execute(commands.GET_SYSTEM_TIME, {});
};

systemStore.setSystemTime = async function (value) {
    try {
        const data = await eventBus.execute(commands.SET_SYSTEM_TIME, { value: value });
        return { ok: true, data: data };
    } catch (error) {
        return fail(error);
    }
};

/**
 * 是否已完成首次管理员设密。
 * @returns {boolean}
 */
systemStore.isFirstLoginDone = function () {
    if (!config) {
        return false;
    }
    return config.firstLoginDone === true;
};

systemStore.completeFirstLogin = async function (password) {
    try {
        const data = {};
        if (password !== undefined) data.password = password;
        await eventBus.execute(commands.COMPLETE_FIRST_LOGIN, data);
        await systemStore.load();
        return { ok: true };
    } catch (error) {
        return fail(error);
    }
};

systemStore.save = async function (patch) {
    if (!patch) return { ok: false, error: 'required' };
    const groups = {};
    const base = {};
    const face = {};
    const sys = {};
    const ntp = {};
    if (has(patch, 'brightness')) base.backlight = Math.round(Number(patch.brightness));
    if (has(patch, 'screenOff')) base.screenOff = Math.round(Number(patch.screenOff));
    if (has(patch, 'screensaver')) base.screensaver = Math.round(Number(patch.screensaver));
    if (has(patch, 'showIp')) base.showIp = patch.showIp ? 1 : 0;
    if (has(patch, 'showSn')) base.showSn = patch.showSn ? 1 : 0;
    if (has(patch, 'accessDisplayFields')) base.accessDisplayFields = patch.accessDisplayFields.slice(0, 3);
    if (has(patch, 'language')) base.language = patch.language === 'en' ? 'EN' : 'CN';
    if (has(patch, 'whiteLight')) base.brightness = Math.round(Number(patch.whiteLight));
    if (has(patch, 'whiteLightMode')) base.whiteLightMode = Math.round(Number(patch.whiteLightMode));
    if (has(patch, 'nirLight')) base.nirBrightness = Math.round(Number(patch.nirLight));
    if (has(patch, 'similarity')) face.similarity = Number(patch.similarity) / 100;
    if (has(patch, 'liveness')) face.livenessOff = patch.liveness ? 1 : 0;
    if (has(patch, 'livenessVal')) face.livenessVal = Math.round(Number(patch.livenessVal));
    if (has(patch, 'recheck')) face.recheck = Math.round(Number(patch.recheck));
    if (has(patch, 'recognitionTimeout')) face.recognitionTimeout = Math.round(Number(patch.recognitionTimeout));
    if (has(patch, 'cardVerify')) sys.nfc = patch.cardVerify ? 1 : 0;
    if (has(patch, 'cardIdentity')) sys.nfcIdentityCardEnable = Number(patch.cardIdentity) === 3 ? 3 : 1;
    if (has(patch, 'passwordOpen')) sys.pwd = patch.passwordOpen ? 1 : 0;
    if (has(patch, 'ntpServer')) ntp.server = String(patch.ntpServer || '').trim();
    if (has(patch, 'timeZone')) ntp.timeZone = String(patch.timeZone || '').trim();

    if (patch._changePassword) {
        if (!patch.oldPassword || !patch.newPassword || !patch.confirmPassword) {
            return { ok: false, error: 'passwordRequired' };
        }
        if (String(patch.oldPassword) !== config.loginPassword) return { ok: false, error: 'passwordOld' };
        if (String(patch.newPassword) !== String(patch.confirmPassword)) return { ok: false, error: 'passwordMismatch' };
        base.password = String(patch.newPassword);
    }
    if (Object.keys(base).length) groups.base = base;
    if (Object.keys(face).length) groups.face = face;
    if (Object.keys(sys).length) groups.sys = sys;
    if (Object.keys(ntp).length) groups.ntp = ntp;
    try {
        const result = await eventBus.execute(commands.SET_CONFIG, groups);
        await systemStore.load();
        return {
            ok: true,
            changed: !!(result._meta && result._meta.changed),
            restartRequired: !!(result._meta && result._meta.restartRequired),
        };
    } catch (error) {
        return fail(error);
    }
};

systemStore.reboot = async function () {
    try {
        await eventBus.execute(commands.CONTROL_DEVICE, { command: 0 });
        return { ok: true };
    } catch (error) { return fail(error); }
};

systemStore.restoreDefaults = async function () {
    try {
        await eventBus.execute(commands.RESTORE_CONFIG_DEFAULTS, {});
        await systemStore.load();
        // 默认配置已经落库后再复用统一重启Command，确保所有Driver按默认值重新初始化。
        await eventBus.execute(commands.CONTROL_DEVICE, { command: 0 });
        return { ok: true };
    } catch (error) {
        return fail(error);
    }
};

systemStore.resetDevice = async function () {
    try {
        await eventBus.execute(commands.CONTROL_DEVICE, { command: 4 });
        return { ok: true };
    } catch (error) { return fail(error); }
};

export default systemStore;
