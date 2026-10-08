/**
 * @layer    view
 * @module   ui_driver
 * @exports  UI基础能力，供Domain同步调用
 * @fires    none
 * @listens  none
 * @depends  dxLogger
 */

import logger from '../../dxmodules/dxLogger.js';

// ui_driver本身不import dxUi，避免Domain导入本文件时提前初始化原生UI。
let adapter = null;
// 模块状态可能早于UI初始化到达；这里保存最终状态，bind后一次性回放。
const status = {
    networkConnected: false,
    networkType: 'ethernet',
    mqttConnected: false,
    inCall: false,
    sn: '',
    ip: '',
};

/** 人脸框状态；UI未就绪时先缓存，bind后回放。 */
const faceBoxState = {
    visible: true,
    faces: [],
};
let verifyStatus = { mode: 0, sequence: [], state: 'idle', completed: 0, nextFactor: '' };
const callState = {
    state: 'idle',
    mode: '',
    sessionId: '',
    contact: null,
    micMuted: false,
    speakerMuted: false,
    startedAt: 0,
    error: '',
    revision: 0,
    updatedAt: 0,
};

function invoke(name, callback) {
    if (!adapter || typeof adapter[name] !== 'function') {
        logger.error('ui_driver.' + name + ': UI is not initialized');
        return false;
    }
    try {
        return callback();
    } catch (e) {
        // UI失败不能回滚Domain已经完成的存储或设备操作。
        logger.error('ui_driver.' + name + ' failed: ' + e.message);
        return false;
    }
}

const uiDriver = {};

function push(name, payload) {
    if (!adapter || typeof adapter[name] !== 'function') return;
    invoke(name, function () { return adapter[name](payload); });
}

/** 缓存并下发状态栏图标。未 bind 时只写缓存。 */
function applyStatus(partial) {
    Object.assign(status, partial);
    if (!adapter) return true;
    push('applyStatusBar', Object.assign({}, status));
    return true;
}

/** 下发首页与企微底栏 SN/IP（网络变更或 bind 回放时调用；两端样式各自处理）。 */
function pushDevicePanel() {
    if (!adapter) return true;
    const snap = Object.assign({}, status);
    push('applyHomePanel', snap);
    push('applyWecomPanel', snap);
    return true;
}

/**
 * 将 SDK / 业务矩形归一为 { x, y, w, h }。
 * 支持：{x,y,w,h}、{width,height}、嵌套 rect 对象、以及数组 [x,y,w,h]。
 * @param {*} face
 * @returns {{ x: number, y: number, w: number, h: number, state?: string, label?: string }|null}
 */
function normalizeFace(face) {
    if (!face || typeof face !== 'object') {
        return null;
    }

    let x;
    let y;
    let w;
    let h;
    const rect = Object.prototype.hasOwnProperty.call(face, 'rect') ? face.rect : face;

    if (Array.isArray(rect) && rect.length >= 4) {
        // 本设备 detection：rect = [x, y, w, h]
        x = Number(rect[0]);
        y = Number(rect[1]);
        w = Number(rect[2]);
        h = Number(rect[3]);
        if (![x, y, w, h].every(function (n) { return Number.isFinite(n); })) {
            return null;
        }
    } else if (rect && typeof rect === 'object' && !Array.isArray(rect)) {
        x = Number(rect.x);
        y = Number(rect.y);
        w = Number(rect.w !== undefined ? rect.w : rect.width);
        h = Number(rect.h !== undefined ? rect.h : rect.height);
        if (![x, y, w, h].every(function (n) { return Number.isFinite(n); })) {
            return null;
        }
    } else {
        return null;
    }

    if (w <= 0 || h <= 0) {
        return null;
    }

    const item = { x: x, y: y, w: w, h: h };
    if (face.id !== undefined && face.id !== null) item.id = String(face.id);
    if (typeof face.state === 'string') item.state = face.state;
    if (typeof face.primaryText === 'string') item.primaryText = face.primaryText;
    else if (typeof face.label === 'string') item.primaryText = face.label;
    else if (typeof face.name === 'string') item.primaryText = face.name;
    if (typeof face.diagnosticText === 'string') item.diagnosticText = face.diagnosticText;
    if (face.diagnostic && typeof face.diagnostic === 'object') {
        item.diagnostic = Object.assign({}, face.diagnostic);
    }
    return item;
}

/**
 * @param {*} faces
 * @returns {Array<{ x: number, y: number, w: number, h: number, state?: string, label?: string }>}
 */
function normalizeFaces(faces) {
    if (!Array.isArray(faces)) {
        const single = normalizeFace(faces);
        return single ? [single] : [];
    }
    const result = [];
    for (let i = 0; i < faces.length; i++) {
        const item = normalizeFace(faces[i]);
        if (item) {
            result.push(item);
        }
    }
    return result;
}

function applyFaceBoxes() {
    if (!adapter) {
        return true;
    }
    if (!faceBoxState.visible || faceBoxState.faces.length === 0) {
        if (typeof adapter.clearFaceBoxes !== 'function') {
            return true;
        }
        return invoke('clearFaceBoxes', function () {
            return adapter.clearFaceBoxes();
        });
    }
    if (typeof adapter.applyFaceBoxes !== 'function') {
        return true;
    }
    return invoke('applyFaceBoxes', function () {
        return adapter.applyFaceBoxes(faceBoxState.faces.slice());
    });
}

uiDriver.replace = function (name, params) {
    return invoke('replace', function () { return adapter.replace(name, params); });
};

/**
 * 远程抓拍：由 View 适配器导航采集页并返回 Promise 结果。
 * @param {object} extra
 * @returns {Promise<object>}
 */
uiDriver.captureFace = function (extra) {
    if (!adapter || typeof adapter.captureFace !== 'function') {
        return Promise.reject(new Error('ui_driver.captureFace: UI is not initialized'));
    }
    try {
        return Promise.resolve(adapter.captureFace(extra || {}));
    } catch (e) {
        return Promise.reject(e);
    }
};

uiDriver.enrollFinger = function (extra) {
    if (!adapter || typeof adapter.enrollFinger !== 'function') {
        return Promise.reject(new Error('ui_driver.enrollFinger: UI is not initialized'));
    }
    try {
        return Promise.resolve(adapter.enrollFinger(extra || {}));
    } catch (e) {
        return Promise.reject(e);
    }
};

uiDriver.notifyFingerEnroll = function (payload) {
    return invoke('notifyFingerEnroll', function () {
        return adapter.notifyFingerEnroll(payload || {});
    });
};

uiDriver.showSuccess = function (message, options) {
    return invoke('showSuccess', function () { return adapter.showSuccess(message, options); });
};

uiDriver.showError = function (message, options) {
    return invoke('showError', function () { return adapter.showError(message, options); });
};

/** 需重启配置提示；适配器映射到与本地保存相同的 restart_required 组件。 */
uiDriver.promptRestartRequired = function () {
    return invoke('promptRestartRequired', function () {
        return adapter.promptRestartRequired();
    });
};

/** base.language（CN|EN|…）变更后切换 UI locale 并刷新当前页。 */
uiDriver.applyLanguage = function (languageCode) {
    return invoke('applyLanguage', function () {
        return adapter.applyLanguage(languageCode);
    });
};

/** base.showIp / base.showSn 变更后重载配置快照并重绘首页底栏。 */
uiDriver.applySnIpVisibility = function () {
    return invoke('applySnIpVisibility', function () {
        return adapter.applySnIpVisibility();
    });
};

/**
 * 通行结果（按凭证类型展示文案），由 View 适配器映射到 result_popup。
 * @param {{ allowed?: boolean, type?: string }} payload
 * @returns {boolean}
 */
uiDriver.showAccessResult = function (payload) {
    if (adapter && typeof adapter.showAccessResult === 'function') {
        return invoke('showAccessResult', function () {
            return adapter.showAccessResult(payload || {});
        });
    }
    const allowed = !!(payload && payload.allowed);
    if (allowed) {
        return uiDriver.showAccessSuccess('通行成功');
    }
    return uiDriver.showAccessFailure('通行失败');
};

/** 通行结果使用独立语义接口，Domain无需理解Popup实现。 */
uiDriver.showAccessBatch = function (summary) {
    return invoke('showAccessBatch', function () { return adapter.showAccessBatch(summary || {}); });
};

uiDriver.showVerifyStatus = function (status) {
    verifyStatus = Object.assign({}, verifyStatus, status || {});
    if (!adapter) return true;
    return invoke('showVerifyStatus', function () { return adapter.showVerifyStatus(Object.assign({}, verifyStatus)); });
};

uiDriver.showAccessSuccess = function (message, options) {
    if (adapter && typeof adapter.showAccessSuccess === 'function') {
        return invoke('showAccessSuccess', function () {
            return adapter.showAccessSuccess(message || '通行成功', options);
        });
    }
    return uiDriver.showSuccess(message || '通行成功', options);
};

uiDriver.showAccessFailure = function (message, options) {
    if (adapter && typeof adapter.showAccessFailure === 'function') {
        return invoke('showAccessFailure', function () {
            return adapter.showAccessFailure(message || '通行失败', options);
        });
    }
    return uiDriver.showError(message || '通行失败', options);
};

uiDriver.setScreensaverTimeout = function (minutes) {
    return invoke('setScreensaverTimeout', function () { return adapter.setScreensaverTimeout(minutes); });
};

uiDriver.setScreenOffTimeout = function (minutes) {
    return invoke('setScreenOffTimeout', function () { return adapter.setScreenOffTimeout(minutes); });
};

/** 本地设备活动：退出屏保/息屏遮罩并重置UI空闲计时。 */
uiDriver.notifyActivity = function () {
    if (!adapter || typeof adapter.notifyActivity !== 'function') return true;
    return invoke('notifyActivity', function () { return adapter.notifyActivity(); });
};

uiDriver.isIdleOverlayVisible = function () {
    if (!adapter || typeof adapter.isIdleOverlayVisible !== 'function') return false;
    return invoke('isIdleOverlayVisible', function () {
        return adapter.isIdleOverlayVisible() === true;
    }) === true;
};

/** 当前是否在主页路由；UI 未就绪时视为否。 */
uiDriver.isHomeRoute = function () {
    if (!adapter || typeof adapter.isHomeRoute !== 'function') return false;
    return invoke('isHomeRoute', function () {
        return adapter.isHomeRoute() === true;
    }) === true;
};

/**
 * 热更新屏保广告清单。
 * @returns {boolean}
 */
uiDriver.setAdvertisements = function (state) {
    return invoke('setAdvertisements', function () { return adapter.setAdvertisements(state); });
};

/**
 * 更新右上角网络连接图标（不负责右下角 IP）。
 * @param {boolean} connected
 * @param {*=} type
 */
uiDriver.setNetworkStatus = function (connected, type) {
    const partial = { networkConnected: connected === true };
    if (type !== undefined && type !== null) partial.networkType = type;
    applyStatus(partial);
    // 联网态影响首页 IP 显隐，需同步回放底栏。
    return pushDevicePanel();
};

/**
 * 更新右下角设备 SN（首页 / 企微底栏）。由 Domain 下发，禁止本层读硬件。
 * @param {string} sn
 * @returns {boolean}
 */
uiDriver.setDeviceSn = function (sn) {
    status.sn = sn == null ? '' : String(sn);
    return pushDevicePanel();
};

/**
 * 更新右下角设备 IP（首页 / 企微底栏）。
 * @param {string} ip 空串表示清空
 * @returns {boolean}
 */
uiDriver.setDeviceIp = function (ip) {
    status.ip = ip == null ? '' : String(ip);
    return pushDevicePanel();
};

uiDriver.setMqttStatus = function (connected) {
    return applyStatus({ mqttConnected: connected === true });
};

uiDriver.setCallStatus = function (inCall) {
    return applyStatus({ inCall: inCall === true });
};

uiDriver.updateCallSession = function (state) {
    Object.assign(callState, state || {});
    if (!adapter || typeof adapter.applyCallSession !== 'function') {
        return true;
    }
    return invoke('applyCallSession', function () {
        return adapter.applyCallSession(Object.assign({}, callState));
    });
};

/**
 * 绘制 / 更新人脸识别框。
 * 坐标为屏幕像素（与 display 分辨率一致）；也接受 SDK 的 { rect } / width/height。
 * @param {Array<{ x?: number, y?: number, w?: number, h?: number, width?: number, height?: number, rect?: object, state?: string, label?: string, name?: string }>|object} faces
 * @returns {boolean}
 */
uiDriver.showFaceBoxes = function (faces) {
    faceBoxState.faces = normalizeFaces(faces);
    return applyFaceBoxes();
};

/** 清空全部人脸框。 */
uiDriver.clearFaceBoxes = function () {
    faceBoxState.faces = [];
    return applyFaceBoxes();
};

/**
 * 全局开关：设置页等非预览场景可关闭；关闭后仍可缓存坐标，重新打开后回放。
 * @param {boolean} visible
 * @returns {boolean}
 */
uiDriver.setFaceBoxVisible = function (visible) {
    faceBoxState.visible = visible === true;
    if (adapter && typeof adapter.setFaceBoxVisible === 'function') {
        invoke('setFaceBoxVisible', function () {
            return adapter.setFaceBoxVisible(faceBoxState.visible);
        });
    }
    return applyFaceBoxes();
};

// 下面两个接口只由view/index.js管理，Domain禁止调用。
uiDriver.bind = function (nextAdapter) {
    if (!nextAdapter || typeof nextAdapter !== 'object') {
        throw new TypeError('ui_driver.bind: adapter must be an object');
    }
    adapter = nextAdapter;
    // SN/IP 等由 Domain 提前写入 status 缓存；bind 后统一回放。
    applyStatus({});
    pushDevicePanel();
    if (adapter && typeof adapter.setFaceBoxVisible === 'function') {
        invoke('setFaceBoxVisible', function () {
            return adapter.setFaceBoxVisible(faceBoxState.visible);
        });
    }
    applyFaceBoxes();
    if (typeof adapter.showVerifyStatus === 'function') {
        invoke('showVerifyStatus', function () {
            return adapter.showVerifyStatus(Object.assign({}, verifyStatus));
        });
    }
    if (typeof adapter.applyCallSession === 'function') {
        invoke('applyCallSession', function () {
            return adapter.applyCallSession(Object.assign({}, callState));
        });
    }
};

uiDriver.unbind = function () {
    adapter = null;
};

export default uiDriver;
