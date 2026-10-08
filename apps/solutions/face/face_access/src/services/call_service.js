/**
 * @layer    services
 * @module   call_service
 * @listens  INTERCOM_*,NETWORK_CHANGED
 * @fires    INTERCOM_PRIMARY_INCOMING
 * @depends  event_bus,core/events,core/commands,intercom_domain,mqtt_domain,ui_domain
 *
 * 主通话由MQTT主叫sessionId唯一识别；其他H5/App来电均作为监控。
 * 通话页面和MQTT只感知主通话；状态栏图标聚合所有活动会话，监控不触发页面切换。
 * 监控只参与共享视频、自身生命周期和状态栏活动指示。
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
const connectTimers = new Map();
const endTimers = new Map();

function clearCallbackTimer() {
    if (callbackTimer === null) return;
    dxStd.clearTimeout(callbackTimer);
    callbackTimer = null;
}

function clearMappedTimer(timers, sessionId) {
    const timer = timers.get(sessionId);
    if (timer === undefined) return;
    dxStd.clearTimeout(timer);
    timers.delete(sessionId);
}

function clearSessionTimers(sessionId) {
    clearMappedTimer(connectTimers, sessionId);
    clearMappedTimer(endTimers, sessionId);
}

function clearAllTimers() {
    clearCallbackTimer();
    connectTimers.forEach(function (timer) { dxStd.clearTimeout(timer); });
    endTimers.forEach(function (timer) { dxStd.clearTimeout(timer); });
    connectTimers.clear();
    endTimers.clear();
}

function syncCallIndicator() {
    const sessions = intercomDomain.getSessions();
    for (let i = 0; i < sessions.length; i++) {
        if (sessions[i].state === 'active') return uiDomain.setCallStatus(true);
    }
    return uiDomain.setCallStatus(false);
}

function syncUi() {
    const state = intercomDomain.getState();
    syncCallIndicator();
    uiDomain.updateCallSession(state);
    return state;
}

function syncSessionUi(role) {
    if (role === 'primary') return syncUi();
    return syncCallIndicator();
}

function logAsync(label, promise) {
    Promise.resolve(promise).catch(function (e) {
        dxLogger.error('call_service ' + label + ' failed: ' + e.message);
    });
}

function notifyHangup(sessionId) {
    if (!intercomDomain.markHangupReported(sessionId)) return;
    logAsync('report hangup', mqttDomain.reportCall({ callId: sessionId, type: 'H', id: '' }));
}

function failPrimary(sessionId, error) {
    clearCallbackTimer();
    const state = intercomDomain.fail(sessionId, error);
    if (state) syncUi();
    return state;
}

function armCallbackTimeout(sessionId) {
    clearCallbackTimer();
    callbackTimer = dxStd.setTimeout(function () {
        callbackTimer = null;
        const state = intercomDomain.getState();
        if (state.sessionId !== sessionId || (state.state !== 'requesting' && state.state !== 'waiting')) return;
        diagLog.warn('call_service', 'callback_timeout', {
            session_id: sessionId, timeout_ms: APP_CALLBACK_TIMEOUT_MS,
        });
        notifyHangup(sessionId);
        failPrimary(sessionId, '等待App接听超时');
    }, APP_CALLBACK_TIMEOUT_MS);
}

function armConnectTimeout(sessionId) {
    clearMappedTimer(connectTimers, sessionId);
    const session = intercomDomain.getSession(sessionId);
    if (!session) return;
    const timer = dxStd.setTimeout(function () {
        connectTimers.delete(sessionId);
        const currentSession = intercomDomain.getSession(sessionId);
        if (!currentSession || currentSession.role !== session.role || currentSession.state !== 'connecting') return;
        diagLog.warn('call_service', 'media_connect_timeout', {
            session_id: sessionId, role: session.role, timeout_ms: MEDIA_CONNECT_TIMEOUT_MS,
        });
        logAsync('connect timeout hangup', endSession(sessionId, '媒体连接超时'));
    }, MEDIA_CONNECT_TIMEOUT_MS);
    connectTimers.set(sessionId, timer);
}

function armDestroyWait(sessionId) {
    clearMappedTimer(endTimers, sessionId);
    const session = intercomDomain.getSession(sessionId);
    if (!session) return;
    const timer = dxStd.setTimeout(function () {
        endTimers.delete(sessionId);
        const currentSession = intercomDomain.getSession(sessionId);
        if (!currentSession || currentSession.role !== session.role || currentSession.state !== 'ending') return;
        dxLogger.error('call_service still waiting for native callEnd: ' + sessionId);
    }, DESTROY_WAIT_TIMEOUT_MS);
    endTimers.set(sessionId, timer);
}

async function finishSession(sessionId) {
    const session = intercomDomain.getSession(sessionId);
    if (!session) return null;
    clearSessionTimers(sessionId);
    if (session.role === 'primary') {
        clearCallbackTimer();
        notifyHangup(sessionId);
    }
    const previous = intercomDomain.finish(sessionId);
    try {
        await intercomDomain.releaseUnusedMedia();
    } catch (e) {
        dxLogger.error('call_service release media failed: ' + e.message);
    }
    syncSessionUi(session.role);
    return previous;
}

async function endSession(sessionId, reason) {
    const session = intercomDomain.getSession(sessionId);
    if (!session) return null;
    clearMappedTimer(connectTimers, sessionId);
    if (session.role === 'primary') {
        clearCallbackTimer();
        notifyHangup(sessionId);
        if (session.state === 'requesting' || session.state === 'waiting' || session.state === 'failed') {
            return await finishSession(sessionId);
        }
    }
    if (session.state === 'ending') return session;
    intercomDomain.beginEnding(sessionId, reason || '');
    if (session.role === 'primary') syncUi();
    try {
        await intercomDomain.hangupMedia(sessionId);
    } catch (e) {
        dxLogger.error('call_service hangup session failed: ' + e.message);
    }
    armDestroyWait(sessionId);
    return intercomDomain.getSession(sessionId);
}

async function endCall(reason) {
    const state = intercomDomain.getState();
    if (!state.sessionId || state.state === 'idle') return state;
    await endSession(state.sessionId, reason || '');
    return intercomDomain.getState();
}

async function endAllSessions(reason) {
    const sessions = intercomDomain.getSessions();
    for (let i = 0; i < sessions.length; i++) {
        await endSession(sessions[i].sessionId, reason);
    }
}

function mapContacts(data) {
    const source = Array.isArray(data) ? data : (data && Array.isArray(data.list) ? data.list : []);
    const result = [];
    for (let i = 0; i < source.length; i++) {
        const row = source[i];
        if (!row || typeof row !== 'object' || !String(row.id || '')) continue;
        result.push(Object.assign({}, row.extra || {}, { id: String(row.id), name: String(row.name || '') }));
    }
    return result;
}

async function getContacts() {
    return mapContacts(await mqttDomain.getCallContacts());
}

async function startCall(payload) {
    const source = payload && payload.contact ? payload.contact : payload;
    const state = intercomDomain.beginOutgoing(source || {});
    diagLog.info('call_service', 'outgoing_started', { session_id: state.sessionId });
    syncUi();
    armCallbackTimeout(state.sessionId);
    try {
        await mqttDomain.reportCall({
            callId: state.sessionId, type: 'S', id: state.contact.id, name: state.contact.name,
        });
        if (intercomDomain.isCurrent(state.sessionId)) {
            intercomDomain.markWaiting(state.sessionId);
            syncUi();
        }
        return intercomDomain.getState();
    } catch (e) {
        if (intercomDomain.isCurrent(state.sessionId)) {
            notifyHangup(state.sessionId);
            failPrimary(state.sessionId, e);
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
    if (!payload || !payload.sessionId) return;
    const sessionId = payload.sessionId;
    diagLog.info('call_service', 'incoming_received', {
        session_id: sessionId, action: payload.action || '',
    });
    if (payload.action === 'end') {
        const session = intercomDomain.getSession(sessionId);
        if (!session) return;
        clearMappedTimer(connectTimers, sessionId);
        if (session.role === 'primary') {
            clearCallbackTimer();
            notifyHangup(sessionId);
        }
        intercomDomain.beginEnding(sessionId, '远端已结束通话');
        if (session.role === 'primary') {
            try { await intercomDomain.disablePrimaryAudio(); } catch (e) {
                dxLogger.error('call_service disable primary audio failed: ' + e.message);
            }
        }
        syncSessionUi(session.role);
        armDestroyWait(sessionId);
        return;
    }
    if (payload.action !== 'start') return;

    const decision = intercomDomain.acceptIncoming(sessionId);
    if (decision.duplicate) {
        diagLog.warn('call_service', 'incoming_ignored', {
            session_id: sessionId, reason: 'duplicate', role: decision.role || '',
        });
        return;
    }
    if (!decision.accepted) {
        diagLog.warn('call_service', 'incoming_rejected', {
            session_id: sessionId, reason: decision.reason || 'capacity',
        });
        await intercomDomain.reject(sessionId);
        return;
    }

    if (decision.role === 'primary') {
        clearCallbackTimer();
        syncUi();
        logAsync('primary incoming activity', eventBus.fire(events.INTERCOM_PRIMARY_INCOMING, { sessionId: sessionId }));
    }
    try {
        diagLog.info('call_service', 'answer_start', {
            session_id: sessionId, role: decision.role,
            audio_enabled: decision.role === 'primary',
        });
        await intercomDomain.answer(sessionId, decision.role);
        armConnectTimeout(sessionId);
    } catch (e) {
        intercomDomain.beginEnding(sessionId, e.message || '接听失败');
        syncSessionUi(decision.role);
        try { await intercomDomain.hangupMedia(sessionId); } catch (hangupError) {
            dxLogger.error('call_service cleanup after answer failed: ' + hangupError.message);
        }
        armDestroyWait(sessionId);
    }
}

function onCallStarted(payload) {
    if (!payload || !intercomDomain.hasSession(payload.sessionId)) return;
    const session = intercomDomain.getSession(payload.sessionId);
    if (session.state === 'ending') return;
    clearMappedTimer(connectTimers, payload.sessionId);
    try {
        diagLog.info('call_service', 'media_started', {
            session_id: payload.sessionId, role: session.role,
        });
        intercomDomain.markActive(payload.sessionId);
        syncSessionUi(session.role);
    } catch (e) {
        dxLogger.error('call_service mark active failed: ' + e.message);
    }
}

function onCallLinked(payload) {
    if (!payload || !intercomDomain.hasSession(payload.sessionId)) return;
    diagLog.info('call_service', 'audio_linked', {
        session_id: payload.sessionId, role: intercomDomain.getRole(payload.sessionId),
    });
}

async function markTransportEnding(payload, label, fallbackReason) {
    if (!payload || !intercomDomain.hasSession(payload.sessionId)) return;
    const session = intercomDomain.getSession(payload.sessionId);
    clearMappedTimer(connectTimers, payload.sessionId);
    if (session.role === 'primary') {
        clearCallbackTimer();
        notifyHangup(payload.sessionId);
    }
    diagLog.warn('call_service', label, {
        session_id: payload.sessionId,
        role: session.role,
        reason: payload.reason || '',
    });
    intercomDomain.beginEnding(payload.sessionId, payload.reason || fallbackReason);
    if (session.role === 'primary') {
        try { await intercomDomain.disablePrimaryAudio(); } catch (e) {
            dxLogger.error('call_service disable primary audio failed: ' + e.message);
        }
    }
    syncSessionUi(session.role);
    armDestroyWait(payload.sessionId);
}

async function onCallFailed(payload) {
    await markTransportEnding(payload, 'call_failed', '呼叫失败');
}

async function onCallDisconnected(payload) {
    await markTransportEnding(payload, 'media_disconnected', '通话连接已断开');
}

async function onCallEnded(payload) {
    if (!payload || !intercomDomain.hasSession(payload.sessionId)) return;
    const session = intercomDomain.getSession(payload.sessionId);
    diagLog.info('call_service', 'native_call_ended', {
        session_id: payload.sessionId, role: session.role,
    });
    await finishSession(payload.sessionId);
}

function onSessionState(payload) {
    if (!payload || !payload.sessionId) return;
    diagLog.info('call_service', 'native_session_state', {
        session_id: payload.sessionId,
        role: payload.role || '',
        action: payload.action || '',
        count: payload.count,
    });
}

function onServiceStatus(payload) {
    if (!payload || payload.status !== 'DISCONNECTED' || !intercomDomain.isBusy()) return;
    logAsync('service offline cleanup', endAllSessions('可视服务已断开'));
}

function onNetworkChanged(payload) {
    if (!payload || !payload.current || payload.current.connected !== false || !intercomDomain.isBusy()) return;
    logAsync('network offline cleanup', endAllSessions('网络已断开'));
}

function onDataReceived(payload) {
    if (!payload || !intercomDomain.isCurrent(payload.sessionId)) return;
    const data = payload.message || {};
    if (data.type !== 'text' || typeof data.message !== 'string') return;
    try {
        const message = JSON.parse(data.message);
        if (!message || typeof message !== 'object') return;
        const state = intercomDomain.updatePeer(payload.sessionId, {
            id: message.userId || '', name: message.username || '',
        });
        uiDomain.updateCallSession(state);
    } catch (_e) {
        // DataChannel允许承载非JSON文本。
    }
}

const callService = {};

callService.init = async function () {
    if (initialized) return;
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
    eventBus.on(events.INTERCOM_SESSION_STATE_CHANGED, onSessionState);
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
    clearAllTimers();
    eventBus.off(events.INTERCOM_INCOMING, onIncoming);
    eventBus.off(events.INTERCOM_CALL_FAILED, onCallFailed);
    eventBus.off(events.INTERCOM_CALL_STARTED, onCallStarted);
    eventBus.off(events.INTERCOM_CALL_LINKED, onCallLinked);
    eventBus.off(events.INTERCOM_CALL_DISCONNECTED, onCallDisconnected);
    eventBus.off(events.INTERCOM_CALL_ENDED, onCallEnded);
    eventBus.off(events.INTERCOM_SESSION_STATE_CHANGED, onSessionState);
    eventBus.off(events.INTERCOM_SERVICE_STATUS_CHANGED, onServiceStatus);
    eventBus.off(events.INTERCOM_DATA_RECEIVED, onDataReceived);
    eventBus.off(events.NETWORK_CHANGED, onNetworkChanged);
    eventBus.unregisterCommand(commands.GET_CALL_CONTACTS);
    eventBus.unregisterCommand(commands.START_CALL);
    eventBus.unregisterCommand(commands.HANGUP_CALL);
    eventBus.unregisterCommand(commands.SET_CALL_AUDIO);
    eventBus.unregisterCommand(commands.GET_CALL_STATE);
    const sessions = intercomDomain.getSessions();
    try {
        for (let i = 0; i < sessions.length; i++) {
            try { await intercomDomain.hangupMedia(sessions[i].sessionId); } catch (_e) {}
        }
        await intercomDomain.stopMedia();
    } catch (_e) {
        // Driver最终deinit仍会释放媒体。
    } finally {
        intercomDomain.reset();
        try { uiDomain.updateCallSession(intercomDomain.getState()); } catch (_e) {}
    }
};

export default callService;
