/**
 * @layer    services
 * @module   call_service
 * @listens  INTERCOM_*,NETWORK_CHANGED
 * @depends  event_bus,core/events,core/commands,intercom_domain,mqtt_domain,ui_domain
 *
 * 可视对讲流程编排：
 * - 设备主动呼叫：MQTT通知App，App再以同一sessionId呼入，设备自动接听音视频。
 * - App直接看设备：空闲时自动接听，仅开启设备视频，不展示通话页面。
 */

import dxStd from '../../dxmodules/dxStd.js';
import dxLogger from '../../dxmodules/dxLogger.js';
import eventBus from '../core/event_bus.js';
import events from '../core/events.js';
import commands from '../core/commands.js';
import intercomDomain from '../domain/intercom_domain.js';
import mqttDomain from '../domain/mqtt_domain.js';
import uiDomain from '../domain/ui_domain.js';
import diagLog from '../utils/diag_log.js';

const APP_CALLBACK_TIMEOUT_MS = 20000;
const MEDIA_CONNECT_TIMEOUT_MS = 15000;
const DESTROY_WAIT_TIMEOUT_MS = 5000;

let initialized = false;
let callbackTimer = null;
let connectTimer = null;
let endTimer = null;

function clearTimer(name) {
    if (name === 'callback' && callbackTimer !== null) {
        dxStd.clearTimeout(callbackTimer);
        callbackTimer = null;
    }
    if (name === 'connect' && connectTimer !== null) {
        dxStd.clearTimeout(connectTimer);
        connectTimer = null;
    }
    if (name === 'end' && endTimer !== null) {
        dxStd.clearTimeout(endTimer);
        endTimer = null;
    }
}

function clearCallTimers() {
    clearTimer('callback');
    clearTimer('connect');
    clearTimer('end');
}

function syncUi() {
    const state = intercomDomain.getState();
    // 图标只表达媒体已建立；请求中、连接中和结束中都不显示“通话中”。
    uiDomain.setCallStatus(state.state === 'active');
    uiDomain.updateCallSession(state);
    return state;
}

function logAsync(label, promise) {
    Promise.resolve(promise).catch(function (e) {
        dxLogger.error('call_service ' + label + ' failed: ' + e.message);
    });
}

function notifyHangup(sessionId) {
    if (!intercomDomain.markHangupReported(sessionId)) {
        return;
    }
    logAsync('report hangup', mqttDomain.reportCall({
        callId: sessionId,
        type: 'H',
        id: '',
    }));
}

function finish(sessionId) {
    const previous = intercomDomain.finish(sessionId);
    if (!previous) {
        return null;
    }
    clearCallTimers();
    syncUi();
    return previous;
}

function fail(sessionId, error) {
    clearCallTimers();
    const state = intercomDomain.fail(sessionId, error);
    if (state) {
        syncUi();
    }
    return state;
}

function armCallbackTimeout(sessionId) {
    clearTimer('callback');
    callbackTimer = dxStd.setTimeout(function () {
        callbackTimer = null;
        if (!intercomDomain.isCurrent(sessionId)) {
            return;
        }
        diagLog.warn('call_service', 'callback_timeout', {
            session_id: sessionId, timeout_ms: APP_CALLBACK_TIMEOUT_MS,
        });
        notifyHangup(sessionId);
        fail(sessionId, '等待App接听超时');
    }, APP_CALLBACK_TIMEOUT_MS);
}

function armConnectTimeout(sessionId) {
    clearTimer('connect');
    connectTimer = dxStd.setTimeout(function () {
        connectTimer = null;
        if (!intercomDomain.isCurrent(sessionId)) {
            return;
        }
        diagLog.warn('call_service', 'media_connect_timeout', {
            session_id: sessionId, timeout_ms: MEDIA_CONNECT_TIMEOUT_MS,
        });
        logAsync('connect timeout hangup', endCall('媒体连接超时'));
    }, MEDIA_CONNECT_TIMEOUT_MS);
}

function armDestroyWait(sessionId) {
    clearTimer('end');
    endTimer = dxStd.setTimeout(function () {
        endTimer = null;
        if (!intercomDomain.isCurrent(sessionId)) {
            return;
        }
        // 组件尚未发出callEnd时仍持有原生session，应用不得伪装为空闲。
        dxLogger.error('call_service still waiting for native callEnd: ' + sessionId);
    }, DESTROY_WAIT_TIMEOUT_MS);
}

async function endCall(reason) {
    const state = intercomDomain.getState();
    if (!state.sessionId || state.state === 'idle') {
        return state;
    }
    const sessionId = state.sessionId;
    clearTimer('callback');
    clearTimer('connect');
    notifyHangup(sessionId);

    // MQTT呼叫尚未形成WebRTC会话时只需撤销业务请求，不调用不存在的原生会话。
    if (state.state === 'requesting' || state.state === 'waiting' || state.state === 'failed') {
        finish(sessionId);
        return intercomDomain.getState();
    }
    if (state.state === 'ending') {
        return state;
    }

    intercomDomain.beginEnding(sessionId, reason || '');
    syncUi();
    try {
        await intercomDomain.hangupMedia(sessionId);
    } catch (e) {
        dxLogger.error('call_service hangup media failed: ' + e.message);
    }
    armDestroyWait(sessionId);
    return intercomDomain.getState();
}

function mapContacts(data) {
    const source = Array.isArray(data)
        ? data
        : (data && Array.isArray(data.list) ? data.list : []);
    const result = [];
    for (let i = 0; i < source.length; i++) {
        const row = source[i];
        if (!row || typeof row !== 'object' || !String(row.id || '')) {
            continue;
        }
        result.push(Object.assign({}, row.extra || {}, {
            id: String(row.id),
            name: String(row.name || ''),
        }));
    }
    return result;
}

async function getContacts() {
    return mapContacts(await mqttDomain.getCallContacts());
}

async function startCall(payload) {
    const source = payload && payload.contact ? payload.contact : payload;
    const state = intercomDomain.beginOutgoing(source || {});
    diagLog.info('call_service', 'outgoing_started', {
        session_id: state.sessionId,
    });
    syncUi();
    armCallbackTimeout(state.sessionId);
    try {
        await mqttDomain.reportCall({
            callId: state.sessionId,
            type: 'S',
            id: state.contact.id,
            name: state.contact.name,
        });
        if (intercomDomain.isCurrent(state.sessionId)) {
            intercomDomain.markWaiting(state.sessionId);
            syncUi();
        }
        return intercomDomain.getState();
    } catch (e) {
        if (intercomDomain.isCurrent(state.sessionId)) {
            notifyHangup(state.sessionId);
            fail(state.sessionId, e);
        }
        throw e;
    }
}

async function setCallAudio(payload) {
    const state = await intercomDomain.setAudio(payload || {});
    syncUi();
    return state;
}

async function onIncoming(payload) {
    if (!payload || !payload.sessionId) {
        return;
    }
    diagLog.info('call_service', 'incoming_received', {
        session_id: payload.sessionId, action: payload.action || '',
    });
    if (payload.action === 'end') {
        if (!intercomDomain.isCurrent(payload.sessionId)) {
            return;
        }
        clearTimer('callback');
        clearTimer('connect');
        intercomDomain.beginEnding(payload.sessionId, '远端已结束通话');
        syncUi();
        try {
            await intercomDomain.stopMedia();
        } catch (e) {
            dxLogger.error('call_service stop ended media failed: ' + e.message);
        }
        notifyHangup(payload.sessionId);
        armDestroyWait(payload.sessionId);
        return;
    }
    if (payload.action !== 'start') {
        return;
    }

    const decision = intercomDomain.acceptIncoming(payload.sessionId);
    if (decision.duplicate) {
        diagLog.warn('call_service', 'incoming_ignored', {
            session_id: payload.sessionId, reason: 'duplicate',
        });
        return;
    }
    if (decision.busy) {
        diagLog.warn('call_service', 'incoming_rejected', {
            session_id: payload.sessionId, reason: 'busy',
        });
        await intercomDomain.reject(payload.sessionId);
        return;
    }

    clearTimer('callback');
    syncUi();
    try {
        // 设备主动呼叫需要双向音视频；App直接查看设备只推视频，设备端无感接听。
        diagLog.info('call_service', 'answer_start', {
            session_id: payload.sessionId, mode: decision.mode,
            audio_enabled: decision.mode === 'outgoing',
        });
        await intercomDomain.answer(payload.sessionId, decision.mode === 'outgoing');
        armConnectTimeout(payload.sessionId);
    } catch (e) {
        intercomDomain.beginEnding(payload.sessionId, e.message || '接听失败');
        syncUi();
        try {
            await intercomDomain.hangupMedia(payload.sessionId);
        } catch (hangupError) {
            dxLogger.error('call_service cleanup after answer failed: ' + hangupError.message);
        }
        armDestroyWait(payload.sessionId);
    }
}

function onCallStarted(payload) {
    if (!payload || !intercomDomain.isCurrent(payload.sessionId)) {
        return;
    }
    const state = intercomDomain.getState();
    if (state.state === 'ending') {
        return;
    }
    clearTimer('connect');
    try {
        // CALL_START(5)是唯一的媒体建立判据，不能再用DataChannel或CALL_LINK代替。
        diagLog.info('call_service', 'media_started', {
            session_id: payload.sessionId,
        });
        intercomDomain.markActive(payload.sessionId);
        syncUi();
    } catch (e) {
        dxLogger.error('call_service mark active failed: ' + e.message);
    }
}

function onCallLinked(payload) {
    if (!payload || !intercomDomain.isCurrent(payload.sessionId)) {
        return;
    }
    // CALL_LINK(6)仅说明音频链路已有数据，不参与核心会话状态迁移。
    diagLog.info('call_service', 'audio_linked', { session_id: payload.sessionId });
}

async function onCallFailed(payload) {
    if (!payload || !intercomDomain.isCurrent(payload.sessionId)) {
        return;
    }
    notifyHangup(payload.sessionId);
    clearTimer('callback');
    clearTimer('connect');
    diagLog.warn('call_service', 'call_failed', {
        session_id: payload.sessionId, reason: payload.reason || '',
    });
    // 组件失败后仍可能在释放原生资源，只有callEnd才能把应用状态切回idle。
    intercomDomain.beginEnding(payload.sessionId, payload.reason || '呼叫失败');
    syncUi();
    try {
        await intercomDomain.stopMedia();
    } catch (e) {
        dxLogger.error('call_service stop failed media failed: ' + e.message);
    }
    armDestroyWait(payload.sessionId);
}

async function onCallDisconnected(payload) {
    if (!payload || !intercomDomain.isCurrent(payload.sessionId)) {
        return;
    }
    clearTimer('callback');
    clearTimer('connect');
    notifyHangup(payload.sessionId);
    diagLog.warn('call_service', 'media_disconnected', {
        session_id: payload.sessionId,
    });
    intercomDomain.beginEnding(payload.sessionId, '通话连接已断开');
    syncUi();
    try {
        await intercomDomain.stopMedia();
    } catch (e) {
        dxLogger.error('call_service stop disconnected media failed: ' + e.message);
    }
    armDestroyWait(payload.sessionId);
}

async function onCallEnded(payload) {
    if (!payload || !intercomDomain.isCurrent(payload.sessionId)) {
        return;
    }
    diagLog.info('call_service', 'native_call_ended', {
        session_id: payload.sessionId,
    });
    try {
        await intercomDomain.stopMedia();
    } catch (e) {
        dxLogger.error('call_service stop ended media failed: ' + e.message);
    }
    notifyHangup(payload.sessionId);
    finish(payload.sessionId);
}

function onServiceStatus(payload) {
    if (!payload || payload.status !== 'DISCONNECTED' || !intercomDomain.isBusy()) {
        return;
    }
    logAsync('service offline cleanup', endCall('可视服务已断开'));
}

function onNetworkChanged(payload) {
    if (!payload || !payload.current || payload.current.connected !== false || !intercomDomain.isBusy()) {
        return;
    }
    logAsync('network offline cleanup', endCall('网络已断开'));
}

function onDataReceived(payload) {
    if (!payload || !intercomDomain.isCurrent(payload.sessionId)) {
        return;
    }
    const data = payload.message || {};
    if (data.type !== 'text' || typeof data.message !== 'string') {
        return;
    }
    try {
        const message = JSON.parse(data.message);
        if (!message || typeof message !== 'object') {
            return;
        }
        const state = intercomDomain.updatePeer(payload.sessionId, {
            id: message.userId || '',
            name: message.username || '',
        });
        uiDomain.updateCallSession(state);
    } catch (_e) {
        // DataChannel允许承载非JSON文本，无法解析时直接忽略。
    }
}

const callService = {};

callService.init = async function () {
    if (initialized) {
        return;
    }
    eventBus.registerCommand(commands.GET_CALL_CONTACTS, getContacts);
    eventBus.registerCommand(commands.START_CALL, startCall);
    eventBus.registerCommand(commands.HANGUP_CALL, endCall);
    eventBus.registerCommand(commands.SET_CALL_AUDIO, setCallAudio);
    eventBus.registerCommand(commands.GET_CALL_STATE, intercomDomain.getState);
    eventBus.on(events.INTERCOM_INCOMING, onIncoming);
    eventBus.on(events.INTERCOM_CALL_FAILED, onCallFailed);
    eventBus.on(events.INTERCOM_CALL_STARTED, onCallStarted);
    eventBus.on(events.INTERCOM_CALL_LINKED, onCallLinked);
    eventBus.on(events.INTERCOM_CALL_DISCONNECTED, onCallDisconnected);
    eventBus.on(events.INTERCOM_CALL_ENDED, onCallEnded);
    eventBus.on(events.INTERCOM_SERVICE_STATUS_CHANGED, onServiceStatus);
    eventBus.on(events.INTERCOM_DATA_RECEIVED, onDataReceived);
    eventBus.on(events.NETWORK_CHANGED, onNetworkChanged);
    syncUi();
    initialized = true;
};

callService.isInitialized = function () {
    return initialized;
};

callService.destroy = async function () {
    if (!initialized) {
        intercomDomain.reset();
        return;
    }
    initialized = false;
    clearCallTimers();
    eventBus.off(events.INTERCOM_INCOMING, onIncoming);
    eventBus.off(events.INTERCOM_CALL_FAILED, onCallFailed);
    eventBus.off(events.INTERCOM_CALL_STARTED, onCallStarted);
    eventBus.off(events.INTERCOM_CALL_LINKED, onCallLinked);
    eventBus.off(events.INTERCOM_CALL_DISCONNECTED, onCallDisconnected);
    eventBus.off(events.INTERCOM_CALL_ENDED, onCallEnded);
    eventBus.off(events.INTERCOM_SERVICE_STATUS_CHANGED, onServiceStatus);
    eventBus.off(events.INTERCOM_DATA_RECEIVED, onDataReceived);
    eventBus.off(events.NETWORK_CHANGED, onNetworkChanged);
    eventBus.unregisterCommand(commands.GET_CALL_CONTACTS);
    eventBus.unregisterCommand(commands.START_CALL);
    eventBus.unregisterCommand(commands.HANGUP_CALL);
    eventBus.unregisterCommand(commands.SET_CALL_AUDIO);
    eventBus.unregisterCommand(commands.GET_CALL_STATE);
    const state = intercomDomain.getState();
    try {
        if (state.sessionId && intercomDomain.isBusy()) {
            await intercomDomain.hangupMedia(state.sessionId);
        }
    } catch (_e) {
        // Driver最终deinit仍会释放媒体；应用状态必须无条件复位，避免再次bootstrap保持busy。
    } finally {
        intercomDomain.reset();
        try { uiDomain.updateCallSession(intercomDomain.getState()); } catch (_e) {}
    }
};

export default callService;
