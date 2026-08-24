/** @layer domain @module ui_domain @depends storage/config/config,view/ui_driver */

import uiDriver from '../view/ui_driver.js';
import configStorage from '../storage/config/config.js';

const uiDomain = {};
const ACCESS_FIELDS = ['name', 'department', 'employeeNo'];

function shortText(value) {
    if (value === undefined || value === null || typeof value === 'object') return '';
    return String(value).trim().substring(0, 32);
}

async function accessFields() {
    let base = {};
    try {
        base = await configStorage.getGroup('base');
    } catch (_error) {
        // 配置读取异常不能吞掉通行结果提示，使用默认展示策略降级。
    }
    const configured = Array.isArray(base.accessDisplayFields)
        ? base.accessDisplayFields : ['name', 'department'];
    return configured.filter(function (field, index) {
        return ACCESS_FIELDS.indexOf(field) >= 0 && configured.indexOf(field) === index;
    }).slice(0, 3);
}

function displayPerson(person, fields) {
    const source = person && typeof person === 'object' ? person : {};
    const extra = source.extra && typeof source.extra === 'object' ? source.extra : {};
    const output = { name: '', fields: [] };
    for (let i = 0; i < fields.length; i++) {
        const key = fields[i];
        const value = shortText(key === 'name' ? source.name : extra[key]);
        if (!value) continue;
        if (key === 'name') output.name = value;
        else output.fields.push({ key: key, value: value });
    }
    return output;
}

/**
 * 通行结果提示：按凭证类型展示刷卡/扫码/人脸/密码成功或失败。
 * @param {{ allowed?: boolean, person?: object, reason?: string }} result
 * @param {{ type?: string }=} input
 */
uiDomain.showAccess = async function (result, input) {
    const allowed = !!(result && result.allowed);
    const type = String(
        (input && input.type !== undefined && input.type !== null)
            ? input.type
            : (result && result.type !== undefined && result.type !== null ? result.type : '')
    );
    if (typeof uiDriver.showAccessResult === 'function') {
        return uiDriver.showAccessResult({
            allowed: allowed,
            type: type,
            reason: result && result.reason ? String(result.reason) : '',
            // 失败结果不携带身份信息，避免在未授权场景泄露人员资料。
            person: allowed ? displayPerson(result && result.person, await accessFields()) : null,
        });
    }
    // 兼容旧适配器：退回成功/失败文案接口。
    if (allowed) {
        return uiDomain.showAccessSuccess('通行成功');
    }
    return uiDomain.showAccessFailure('通行失败');
};

uiDomain.showAccessBatch = async function (summary) {
    const fields = await accessFields();
    const people = summary && Array.isArray(summary.people) ? summary.people : [];
    const passed = people.filter(function (item) { return item && item.allowed; });
    const names = fields.indexOf('name') >= 0
        ? passed.map(function (item) { return shortText(item.name); }).filter(Boolean).slice(0, 3)
        : [];
    return uiDriver.showAccessBatch({
        allowed: passed.length > 0,
        reason: summary && summary.reason ? String(summary.reason) : '',
        passedCount: passed.length,
        names: names,
    });
};

uiDomain.showVerifyStatus = function (status) {
    return uiDriver.showVerifyStatus(status);
};

uiDomain.showAccessSuccess = function (message, options) {
    return uiDriver.showAccessSuccess(message, options);
};

uiDomain.showAccessFailure = function (message, options) {
    return uiDriver.showAccessFailure(message, options);
};

uiDomain.showSuccess = function (message, options) {
    return uiDriver.showSuccess(message, options);
};

uiDomain.showError = function (message, options) {
    return uiDriver.showError(message, options);
};

uiDomain.replace = function (name, params) {
    return uiDriver.replace(name, params);
};

uiDomain.setNetworkStatus = function (connected, type) {
    return uiDriver.setNetworkStatus(connected, type);
};

/** 更新首页 / 企微底栏右下角 SN。 */
uiDomain.setDeviceSn = function (sn) {
    return uiDriver.setDeviceSn(sn);
};

/** 更新首页 / 企微底栏右下角 IP。 */
uiDomain.setDeviceIp = function (ip) {
    return uiDriver.setDeviceIp(ip);
};

uiDomain.setMqttStatus = function (connected) {
    return uiDriver.setMqttStatus(connected);
};

// 可视对讲Service在通话开始/结束时调用该稳定入口。
uiDomain.setCallStatus = function (inCall) {
    return uiDriver.setCallStatus(inCall);
};

uiDomain.updateCallSession = function (state) {
    return uiDriver.updateCallSession(state);
};

/**
 * 绘制 / 更新人脸识别框（业务稳定入口）。
 * @param {Array<object>|object} faces 屏幕像素坐标；支持 {x,y,w,h} / {rect} / width|height；可选 state、label|name
 * @returns {boolean}
 */
uiDomain.showFaceBoxes = function (faces) {
    return uiDriver.showFaceBoxes(faces);
};

/** 清空人脸识别框。 */
uiDomain.clearFaceBoxes = function () {
    return uiDriver.clearFaceBoxes();
};

/**
 * 人脸框全局显隐（离开主页预览、进入设置等场景关闭）。
 * @param {boolean} visible
 * @returns {boolean}
 */
uiDomain.setFaceBoxVisible = function (visible) {
    return uiDriver.setFaceBoxVisible(visible);
};

// 控制码8的稳定入口：导航到抓拍页，完成后返回 MQTT control_reply 所需字段。
uiDomain.captureFace = async function (extra) {
    return await uiDriver.captureFace(extra || {});
};

/**
 * 控制码12的稳定入口：拉起远程指纹申请/录入页，完成后返回 { fingerFeature }。
 * @param {object} extra
 */
uiDomain.enrollFinger = async function (extra) {
    return await uiDriver.enrollFinger(extra || {});
};

/** 录入进度下发（Domain → ui_driver），属长操作 UI 侧信道；页面经适配器刷新。 */
uiDomain.notifyFingerEnroll = function (payload) {
    return uiDriver.notifyFingerEnroll(payload || {});
};

// 控制码13的稳定入口：更新屏保底图路径；图片落盘与持久化由后续业务补齐。
uiDomain.setWallpaper = async function (extra) {
    let path = '';
    if (typeof extra === 'string') {
        path = extra;
    } else if (extra && typeof extra === 'object') {
        path = String(extra.path || extra.url || extra.image || extra.wallpaper || '');
    }
    const ok = uiDriver.setWallpaper(path);
    if (!ok) {
        throw new AppError('300000', '更换屏保图片失败');
    }
    return true;
};

uiDomain.setAdvertisements = function (state) {
    return uiDriver.setAdvertisements(state);
};

uiDomain.setScreensaverTimeout = function (minutes) {
    return uiDriver.setScreensaverTimeout(minutes);
};

uiDomain.setScreenOffTimeout = function (minutes) {
    return uiDriver.setScreenOffTimeout(minutes);
};

uiDomain.notifyActivity = function () {
    return uiDriver.notifyActivity();
};

/** 屏保或息屏遮罩是否覆盖当前页面；供状态编排判断是否需要唤醒。 */
uiDomain.isIdleOverlayVisible = function () {
    return uiDriver.isIdleOverlayVisible();
};
export default uiDomain;
