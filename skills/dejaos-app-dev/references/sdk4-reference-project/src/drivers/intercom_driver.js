/**
 * @layer    drivers
 * @module   intercom_driver
 * @fires    INTERCOM_SERVICE_STATUS_CHANGED,INTERCOM_INCOMING,INTERCOM_CALL_FAILED,INTERCOM_CALL_STARTED,INTERCOM_CALL_LINKED,INTERCOM_CALL_DISCONNECTED,INTERCOM_CALL_ENDED,INTERCOM_DATA_OPENED,INTERCOM_DATA_RECEIVED
 * @listens  none
 * @depends  dxIntercom,dxStd,dxLogger,event_bus,core/events
 */

import dxIntercom from '../../dxmodules/dxIntercom.js';
import dxStd from '../../dxmodules/dxStd.js';
import dxLogger from '../../dxmodules/dxLogger.js';
import eventBus from '../core/event_bus.js';
import events from '../core/events.js';
import diagLog from '../utils/diag_log.js';

let config = null;
let initialized = false;
let eventsEnabled = false;
let quiesced = false;
const INTERCOM_SERNO_PATH = '/etc/app/.intercom';
const DEFAULT_SERVER = 'webrtc.dxiot.com';
const DEFAULT_PORT = 6699;

/**
 * 读取可视对讲序列号。
 * @returns {string}
 */
function readIntercomSerno() {
    try {
        const text = dxStd.loadFileSync(INTERCOM_SERNO_PATH);
        return text ? String(text).trim() : '';
    } catch (_e) {
        return '';
    }
}

function normalizeConfig(value) {
    const source = value || {};
    const server = String(source.server || DEFAULT_SERVER).trim();
    const port = Number(source.port === undefined ? DEFAULT_PORT : source.port);
    if (!server || !Number.isInteger(port) || port < 1 || port > 65535) {
        throw new TypeError('intercom_driver: invalid server or port');
    }
    const options = source.options || {};
    if (!options || typeof options !== 'object' || Array.isArray(options)) {
        throw new TypeError('intercom_driver: options must be an object');
    }
    if (options.webrtc !== undefined && (
        !options.webrtc || typeof options.webrtc !== 'object' || Array.isArray(options.webrtc)
    )) {
        throw new TypeError('intercom_driver: options.webrtc must be an object');
    }
    const fileSerno = readIntercomSerno();
    const webrtc = Object.assign({
        serno: fileSerno,
        servers: server + ':' + port,
    }, options.webrtc || {});
    // customerserno不参与当前标品身份和路由，禁止透传旧版本遗留值。
    delete webrtc.customerserno;
    if (typeof webrtc.serno !== 'string' || webrtc.serno.length === 0) {
        throw new TypeError('intercom_driver: options.webrtc.serno must be a non-empty string');
    }
    return {
        server: server,
        port: port,
        options: Object.assign({}, options, { webrtc: webrtc }),
    };
}

function assertInitialized() {
    if (!initialized) {
        throw new Error('intercom_driver: module is not initialized');
    }
}

function dispatch(eventName, payload) {
    // 生命周期事件低频且影响会话释放，保留session链路，不记录数据通道正文。
    diagLog.info('intercom_driver', 'event_received', {
        name: eventName, session_id: payload && payload.sessionId ? payload.sessionId : '',
        status: payload && payload.status !== undefined ? payload.status : '',
    });
    payload.ts = Date.now();
    eventBus.fire(eventName, payload).catch(function (e) {
        dxLogger.error('intercom_driver ' + eventName + ' dispatch failed: ' + e.message);
    });
}

const handlers = {
    // SDK回调只转换为无回执event，通话流程和跨模块联动统一交给Service编排。
    serviceStatus: function (status) {
        dispatch(events.INTERCOM_SERVICE_STATUS_CHANGED, { status: status });
    },
    incoming: function (sessionId, action) {
        dispatch(events.INTERCOM_INCOMING, { sessionId: sessionId, action: action });
    },
    callFail: function (sessionId, reason) {
        dispatch(events.INTERCOM_CALL_FAILED, { sessionId: sessionId, reason: reason });
    },
    callStart: function (sessionId) {
        dispatch(events.INTERCOM_CALL_STARTED, { sessionId: sessionId });
    },
    callLink: function (sessionId) {
        dispatch(events.INTERCOM_CALL_LINKED, { sessionId: sessionId });
    },
    callDisconnected: function (sessionId) {
        dispatch(events.INTERCOM_CALL_DISCONNECTED, { sessionId: sessionId });
    },
    callEnd: function (sessionId) {
        dispatch(events.INTERCOM_CALL_ENDED, { sessionId: sessionId });
    },
    dataOpen: function (sessionId, streamId) {
        dispatch(events.INTERCOM_DATA_OPENED, { sessionId: sessionId, streamId: streamId });
    },
    dataMessage: function (sessionId, message) {
        dispatch(events.INTERCOM_DATA_RECEIVED, { sessionId: sessionId, message: message });
    },
};

function registerListeners() {
    Object.keys(handlers).forEach(function (eventName) {
        dxIntercom.on(eventName, handlers[eventName]);
    });
}

function unregisterListeners() {
    Object.keys(handlers).forEach(function (eventName) {
        dxIntercom.off(eventName, handlers[eventName]);
    });
}

const intercomDriver = {};

/** @returns {string} */
intercomDriver.getIntercomSerno = function () {
    return readIntercomSerno();
};

intercomDriver.init = async function (nextConfig) {
    if (initialized) {
        return;
    }
    const next = normalizeConfig(nextConfig);
    diagLog.info('intercom_driver', 'init_start', { server: next.server, port: next.port });
    quiesced = false;
    registerListeners();
    eventsEnabled = true;
    try {
        dxIntercom.init(next.options);
        config = next;
        initialized = true;
        diagLog.info('intercom_driver', 'init_done', { server: next.server, port: next.port });
    } catch (e) {
        unregisterListeners();
        eventsEnabled = false;
        diagLog.error('intercom_driver', 'init_failed', e, { server: next.server, port: next.port });
        throw e;
    }
};

intercomDriver.updateConfig = async function (nextConfig) {
    const next = normalizeConfig(nextConfig || config);
    if (initialized && !quiesced) {
        const previous = config;
        try {
            await intercomDriver.destroy();
            await intercomDriver.init(next);
        } catch (error) {
            // 新服务启动失败时尽力恢复旧连接，避免一次错误配置永久停掉可视服务。
            if (previous) {
                try { await intercomDriver.init(previous); } catch (_rollbackError) {}
            }
            throw error;
        }
        return;
    }
    config = next;
};

intercomDriver.getConfig = function () {
    return config ? { server: config.server, port: config.port } : null;
};

intercomDriver.getServiceStatus = function () {
    assertInitialized();
    return dxIntercom.getServiceStatus();
};

intercomDriver.call = function (serno, sessionId) {
    assertInitialized();
    diagLog.info('intercom_driver', 'call', { session_id: sessionId });
    return dxIntercom.call(serno, sessionId);
};

intercomDriver.answer = function (sessionId) {
    assertInitialized();
    diagLog.info('intercom_driver', 'answer', { session_id: sessionId });
    return dxIntercom.answer(sessionId);
};

intercomDriver.hangup = function (sessionId) {
    assertInitialized();
    diagLog.info('intercom_driver', 'hangup', { session_id: sessionId });
    return dxIntercom.hangup(sessionId);
};

intercomDriver.closeSession = function (sessionId) {
    assertInitialized();
    diagLog.info('intercom_driver', 'close_session', { session_id: sessionId });
    return dxIntercom.closeSession(sessionId);
};

intercomDriver.setAudio = function (audioOut, audioIn) {
    assertInitialized();
    diagLog.info('intercom_driver', 'set_audio', {
        audio_out: audioOut === true, audio_in: audioIn === true,
    });
    return dxIntercom.setAudio(audioOut, audioIn);
};

intercomDriver.setVideo = function (videoOut) {
    assertInitialized();
    diagLog.info('intercom_driver', 'set_video', { video_out: videoOut === true });
    return dxIntercom.setVideo(videoOut);
};

intercomDriver.getQuality = function (sessionId) {
    assertInitialized();
    return dxIntercom.getQuality(sessionId);
};

intercomDriver.sendDataChannelMessage = function (sessionId, message, options) {
    assertInitialized();
    return dxIntercom.sendDataChannelMessage(sessionId, message, options);
};

intercomDriver.isInitialized = function () {
    return initialized;
};

intercomDriver.quiesce = async function () {
    if (!initialized || quiesced) return;
    quiesced = true;
    if (eventsEnabled) unregisterListeners();
    eventsEnabled = false;
};

intercomDriver.destroy = async function () {
    if (!initialized) {
        return;
    }
    let firstError = null;
    try {
        dxIntercom.deinit();
    } catch (e) {
        firstError = e;
    }
    if (eventsEnabled) unregisterListeners();
    eventsEnabled = false;
    initialized = false;
    quiesced = false;
    if (firstError) {
        throw firstError;
    }
};

export default intercomDriver;
