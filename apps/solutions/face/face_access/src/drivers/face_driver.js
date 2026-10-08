/**
 * @layer    drivers
 * @module   face_driver
 * @fires    FACE_DETECTED,FACE_RECOGNIZED,NIR_PERSON_SAMPLED
 * @listens  none
 * @depends  dxFacial,dxStd,dxLogger,event_bus,core/events
 */

import dxFacial from '../../dxmodules/dxFacial.js';
import dxStd from '../../dxmodules/dxStd.js';
import dxLogger from '../../dxmodules/dxLogger.js';
import eventBus from '../core/event_bus.js';
import events from '../core/events.js';

const DEFAULT_CONFIG = {
    options: {
        pic_path: '/data/face_app/capture',
    },
    multiFace: false,
};
const MULTI_FACE_MAX = 5;

let config = Object.assign({}, DEFAULT_CONFIG);
let initialized = false;
let nativeRunning = false;
// 组件保持运行以支持特征库增删；空场景只屏蔽检测/识别事件，不停算法服务。
let eventScene = '';
const SENSOR_POLL_MS = 1000;
const SENSOR_LOG_MS = 5000;
let sensorTimer = null;
let sensorDispatching = false;
let lastSensorLogAt = 0;
let lastPersonCount = null;
let lastSensorErrorAt = 0;

function validateConfig(value) {
    if (!value.options || typeof value.options !== 'object' || Array.isArray(value.options)) {
        throw new TypeError('face_driver: options must be an object');
    }
}

/**
 * 多人模型只在设备以多人模式启动时加载。普通模式保持单人容量，避免长期占用额外模型资源；
 * 核验模式发生切换后由配置流程提示重启，不在运行中销毁并重建人脸算法。
 */
function buildNativeOptions(value) {
    const source = value && value.options ? value.options : {};
    const options = Object.assign({}, DEFAULT_CONFIG.options, source);
    const faceInit = Object.assign({}, source.face_init || {});
    const nna = Object.assign({}, faceInit.nna || {});
    nna.max_det_faces = value && value.multiFace === true ? MULTI_FACE_MAX : 1;
    faceInit.nna = nna;
    options.face_init = faceInit;
    return options;
}
/* 应用配置字段在Driver边界统一映射为dxFacial运行时字段。 */
function toRuntimeConfig(values) {
    const source = values || {};
    const result = {};
    if (Object.prototype.hasOwnProperty.call(source, 'similarity')) {
        result.com_threshold = source.similarity;
    }
    if (Object.prototype.hasOwnProperty.call(source, 'livenessOff')) {
        result.liv_enable = source.livenessOff;
    }
    if (Object.prototype.hasOwnProperty.call(source, 'livenessVal')) {
        result.liv_threshold = source.livenessVal;
    }
    if (Object.prototype.hasOwnProperty.call(source, 'recheck')) {
        const seconds = Number(source.recheck);
        result.det_timeout_ms = (Number.isFinite(seconds) && seconds >= 1 ? seconds : 8) * 1000;
    }
    if (Object.prototype.hasOwnProperty.call(source, 'recognitionTimeout')) {
        const seconds = Number(source.recognitionTimeout);
        result.rec_timeout_ms = (Number.isFinite(seconds) && seconds >= 1 ? seconds : 5) * 1000;
    }
    if (Object.prototype.hasOwnProperty.call(source, 'capcal_path')) {
        result.capcal_path = source.capcal_path;
    }
    if (Object.prototype.hasOwnProperty.call(source, 'multiFace')) {
        result.det_max = source.multiFace === true ? MULTI_FACE_MAX : 1;
    }
    // stranger/voiceMode属于通行通知策略，由audio_domain消费，不映射为人脸组件参数。
    return result;
}


function assertInitialized() {
    if (!initialized) {
        throw new Error('face_driver: module is not initialized');
    }
}

function dispatch(eventName, data, scene) {
    eventBus.fire(eventName, {
        data: data,
        ts: Date.now(),
        // 事件产生时的场景快照，避免切页后把旧结果交给错误的Service。
        scene: scene,
    }).catch(function (e) {
        dxLogger.error('face_driver ' + eventName + ' dispatch failed: ' + e.message);
    });
}

function onDetection(data) {
    const scene = eventScene;
    if (!scene) return;
    dispatch(events.FACE_DETECTED, data, scene);
}

function onRecognition(data) {
    const scene = eventScene;
    if (!scene) {
        // 无业务消费者时及时清除组件生成的临时抓拍，避免长期占用/data。
        const path = data && (data.picPath || data.pic_path);
        if (typeof path === 'string' && path.indexOf('/data/') === 0) {
            try { dxStd.removeSync(path); } catch (_e) {}
        }
        return;
    }
    dispatch(events.FACE_RECOGNIZED, data, scene);
}

function pollSensors() {
    if (!initialized || !nativeRunning || sensorDispatching) return;
    let count = null;
    let brightness = null;
    try {
        const rawCount = Number(dxFacial.getNirPersonCount());
        if (Number.isFinite(rawCount) && rawCount >= 0) {
            count = Math.trunc(rawCount);
        } else {
            const now = Date.now();
            if (now - lastSensorErrorAt >= SENSOR_LOG_MS) {
                lastSensorErrorAt = now;
                dxLogger.error('face_driver NIR person sample failed: ' + rawCount);
            }
        }
        try {
            const rawBrightness = Number(dxFacial.getEnvBrightness());
            brightness = Number.isFinite(rawBrightness) ? rawBrightness : null;
        } catch (brightnessError) {
            const now = Date.now();
            if (now - lastSensorErrorAt >= SENSOR_LOG_MS) {
                lastSensorErrorAt = now;
                dxLogger.error('face_driver env brightness sample failed: ' + brightnessError.message);
            }
        }
    } catch (e) {
        const now = Date.now();
        if (now - lastSensorErrorAt >= SENSOR_LOG_MS) {
            lastSensorErrorAt = now;
            dxLogger.error('face_driver sensor sample failed: ' + e.message);
        }
        return;
    }

    const now = Date.now();
    // 仅在人数变化时打点，避免每 5s 刷 info；失败走上方 error 限流。
    if (count !== lastPersonCount) {
        lastPersonCount = count;
        lastSensorLogAt = now;
        dxLogger.info('face_driver sensor sample: nirPerson='
            + (count == null ? 'null' : count)
            + ' envBrightness=' + (brightness == null ? 'null' : brightness));
    }

    sensorDispatching = true;
    eventBus.fire(events.NIR_PERSON_SAMPLED, {
        count: count,
        brightness: brightness,
        ts: now,
    }).catch(function (e) {
        dxLogger.error('face_driver NIR_PERSON_SAMPLED dispatch failed: ' + e.message);
    }).finally(function () {
        sensorDispatching = false;
    });
}

function startSensorPolling() {
    if (sensorTimer !== null) return;
    sensorTimer = dxStd.setInterval(pollSensors, SENSOR_POLL_MS);
    pollSensors();
}

function stopSensorPolling() {
    if (sensorTimer !== null) dxStd.clearInterval(sensorTimer);
    sensorTimer = null;
    sensorDispatching = false;
    lastPersonCount = null;
}

const faceDriver = {};

faceDriver.init = async function (nextConfig) {
    if (initialized) {
        return;
    }
    const next = Object.assign({}, DEFAULT_CONFIG, nextConfig || {});
    next.options = buildNativeOptions(next);
    validateConfig(next);

    dxFacial.on('detection', onDetection);
    dxFacial.on('recognition', onRecognition);
    let nativeInitialized = false;
    try {
        // 组件抓拍先进入临时目录，record_domain落库前再接管为正式记录图片。
        dxStd.ensurePathExists(next.options.pic_path + '/.dir');
        dxFacial.init(next.options);
        nativeInitialized = true;
        const runtimeConfig = toRuntimeConfig(next);
        if (Object.keys(runtimeConfig).length > 0) {
            dxFacial.setConfig(runtimeConfig);
        }
        // 算法服务常驻，保证MQTT/HTTP/UI可随时增删特征；业务事件由eventScene门控。
        dxFacial.setStatus(true);
        nativeRunning = true;
        config = next;
        initialized = true;
        startSensorPolling();
    } catch (e) {
        stopSensorPolling();
        initialized = false;
        nativeRunning = false;
        eventScene = '';
        dxFacial.off('detection', onDetection);
        dxFacial.off('recognition', onRecognition);
        if (nativeInitialized) {
            try {
                dxFacial.deinit();
            } catch (_deinitError) {}
        }
        throw e;
    }
};

faceDriver.updateConfig = async function (nextConfig) {
    const next = Object.assign({}, config, nextConfig || {});
    validateConfig(next);
    if (initialized && next.options !== config.options) {
        const previousScene = eventScene;
        await faceDriver.destroy();
        await faceDriver.init(next);
        eventScene = previousScene;
        return;
    }
    const runtimeConfig = toRuntimeConfig(nextConfig);
    if (initialized && Object.keys(runtimeConfig).length > 0) {
        dxFacial.setConfig(runtimeConfig);
    }
    config = next;
};

faceDriver.setStatus = function (running) {
    assertInitialized();
    const next = running === true;
    if (nativeRunning === next) return;
    const result = dxFacial.setStatus(next);
    nativeRunning = next;
    return result;
};

/** 设置检测/识别事件业务场景；空串表示假停止，只屏蔽事件。 */
faceDriver.setEventScene = function (scene) {
    assertInitialized();
    eventScene = typeof scene === 'string' ? scene : '';
};

faceDriver.getEventScene = function () {
    return eventScene;
};

faceDriver.isRunning = function () {
    return initialized && nativeRunning;
};

faceDriver.getEnvBrightness = function () {
    assertInitialized();
    return dxFacial.getEnvBrightness();
};

faceDriver.getNirPersonCount = function () {
    assertInitialized();
    return dxFacial.getNirPersonCount();
};

faceDriver.getConfig = function () {
    assertInitialized();
    return dxFacial.getConfig();
};

faceDriver.setConfig = function (nextConfig) {
    assertInitialized();
    const runtimeConfig = toRuntimeConfig(nextConfig);
    if (Object.keys(runtimeConfig).length > 0) {
        dxFacial.setConfig(runtimeConfig);
    }
    config = Object.assign({}, config, nextConfig || {});
};

faceDriver.getFeaByCap = function (timeout) {
    assertInitialized();
    return dxFacial.getFeaByCap(timeout);
};

faceDriver.getFeaByFile = function (filePath) {
    assertInitialized();
    return dxFacial.getFeaByFile(filePath);
};

faceDriver.compareFea = function (featureBase64) {
    assertInitialized();
    return dxFacial.compareFea(featureBase64);
};

faceDriver.addFea = function (userId, featureBase64) {
    assertInitialized();
    return dxFacial.addFea(userId, featureBase64);
};

faceDriver.updateFea = function (userId, featureBase64) {
    assertInitialized();
    return dxFacial.updateFea(userId, featureBase64);
};

faceDriver.deleteFea = function (userId) {
    assertInitialized();
    return dxFacial.deleteFea(userId);
};

faceDriver.cleanFea = function () {
    assertInitialized();
    return dxFacial.cleanFea();
};

faceDriver.isInitialized = function () {
    return initialized;
};

faceDriver.destroy = async function () {
    if (!initialized) {
        return;
    }
    stopSensorPolling();
    let firstError = null;
    try {
        dxFacial.setStatus(false);
        nativeRunning = false;
    } catch (e) {
        firstError = e;
    }
    dxFacial.off('detection', onDetection);
    dxFacial.off('recognition', onRecognition);
    try {
        dxFacial.deinit();
    } catch (e) {
        firstError = firstError || e;
    }
    initialized = false;
    nativeRunning = false;
    eventScene = '';
    if (firstError) {
        throw firstError;
    }
};

export default faceDriver;
