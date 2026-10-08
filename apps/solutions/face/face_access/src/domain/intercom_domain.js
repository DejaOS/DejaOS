/**
 * @layer    domain
 * @module   intercom_domain
 * @depends  dxStd,intercom_driver,core/error
 *
 * 可视对讲多会话状态：current只表示主通话，monitors保存最多两路监控。
 * Service负责编排MQTT/UI，Domain集中维护会话事实和共享媒体所有权。
 */

import dxStd from '../../dxmodules/dxStd.js';
import configStorage from '../storage/config/config.js';
import intercomDriver from '../drivers/intercom_driver.js';
import { AppError } from '../core/error.js';

const PRIMARY_ACTIVE_STATES = ['requesting', 'waiting', 'connecting', 'active', 'ending'];
const NATIVE_STATES = ['connecting', 'active', 'ending'];
const MONITOR_LIMIT = 2;

function idleState(revision) {
    return {
        state: 'idle',
        mode: '',
        sessionId: '',
        contact: null,
        micMuted: false,
        speakerMuted: false,
        startedAt: 0,
        error: '',
        hangupReported: false,
        revision: revision || 0,
        updatedAt: Date.now(),
    };
}

let current = idleState(0);
const monitors = new Map();
let videoEnabled = false;
let audioOutEnabled = false;
let audioInEnabled = false;
let videoQueue = Promise.resolve();
let audioQueue = Promise.resolve();

function cloneContact(contact) {
    if (!contact) return null;
    return { id: String(contact.id || ''), name: String(contact.name || '') };
}

function primarySnapshot() {
    return Object.assign({}, current, { contact: cloneContact(current.contact) });
}

function monitorSnapshot(session) {
    return session ? Object.assign({}, session) : null;
}

function replacePrimary(values) {
    current = Object.assign({}, current, values, {
        revision: current.revision + 1,
        updatedAt: Date.now(),
    });
    return primarySnapshot();
}

function replaceMonitor(sessionId, values) {
    const previous = monitors.get(sessionId);
    if (!previous) return null;
    const next = Object.assign({}, previous, values, {
        revision: previous.revision + 1,
        updatedAt: Date.now(),
    });
    monitors.set(sessionId, next);
    return monitorSnapshot(next);
}

function assertSession(sessionId) {
    if (typeof sessionId !== 'string' || !sessionId) {
        throw new AppError('200000', '通话sessionId不能为空');
    }
}

function assertPrimary(sessionId) {
    assertSession(sessionId);
    if (current.sessionId !== sessionId) {
        throw new AppError('300000', '主通话会话已变化');
    }
}

function primaryOwnsNativeSession() {
    return !!current.sessionId && NATIVE_STATES.indexOf(current.state) >= 0;
}

function hasNativeSessions() {
    return primaryOwnsNativeSession() || monitors.size > 0;
}

function roleOf(sessionId) {
    if (sessionId && current.sessionId === sessionId) return 'primary';
    if (sessionId && monitors.has(sessionId)) return 'monitor';
    return '';
}

function assertRole(sessionId, role) {
    if (roleOf(sessionId) !== role || (role !== 'primary' && role !== 'monitor')) {
        throw new AppError('300000', '通话会话角色已变化');
    }
}

function queueVideo(work) {
    const task = videoQueue.then(work, work);
    videoQueue = task.catch(function () {});
    return task;
}

function queueAudio(work) {
    const task = audioQueue.then(work, work);
    audioQueue = task.catch(function () {});
    return task;
}

async function setPrimaryAudio(audioOut, audioIn) {
    return queueAudio(async function () {
        if (audioOutEnabled === audioOut && audioInEnabled === audioIn) return;
        await intercomDriver.setAudio(audioOut, audioIn);
        audioOutEnabled = audioOut;
        audioInEnabled = audioIn;
    });
}

const intercomDomain = {};

intercomDomain.getState = function () {
    return primarySnapshot();
};

intercomDomain.getMonitors = function () {
    return Array.from(monitors.values()).map(monitorSnapshot);
};

intercomDomain.getSessions = function () {
    const result = [];
    if (current.sessionId && current.state !== 'idle' && current.state !== 'failed') {
        result.push(Object.assign({ role: 'primary' }, primarySnapshot()));
    }
    monitors.forEach(function (session) {
        result.push(Object.assign({ role: 'monitor' }, monitorSnapshot(session)));
    });
    return result;
};

intercomDomain.getSession = function (sessionId) {
    const role = roleOf(sessionId);
    if (role === 'primary') return Object.assign({ role: role }, primarySnapshot());
    if (role === 'monitor') return Object.assign({ role: role }, monitorSnapshot(monitors.get(sessionId)));
    return null;
};

intercomDomain.getRole = roleOf;

intercomDomain.hasSession = function (sessionId) {
    return !!roleOf(sessionId);
};

intercomDomain.reset = function () {
    const previous = primarySnapshot();
    current = idleState(current.revision + 1);
    monitors.clear();
    videoEnabled = false;
    audioOutEnabled = false;
    audioInEnabled = false;
    videoQueue = Promise.resolve();
    audioQueue = Promise.resolve();
    return previous;
};

intercomDomain.isBusy = function () {
    return PRIMARY_ACTIVE_STATES.indexOf(current.state) >= 0 || monitors.size > 0;
};

intercomDomain.isPrimaryBusy = function () {
    return PRIMARY_ACTIVE_STATES.indexOf(current.state) >= 0;
};

intercomDomain.isCurrent = function (sessionId) {
    return !!sessionId && current.sessionId === sessionId;
};

intercomDomain.beginOutgoing = function (contact) {
    if (!contact || typeof contact !== 'object' || !String(contact.id || '')) {
        throw new AppError('200000', '呼叫联系人不能为空');
    }
    if (intercomDomain.isPrimaryBusy()) {
        throw new AppError('300000', '设备正在通话');
    }
    return replacePrimary({
        state: 'requesting',
        mode: 'outgoing',
        sessionId: dxStd.genRandomStr(32),
        contact: cloneContact(contact),
        micMuted: false,
        speakerMuted: false,
        startedAt: 0,
        error: '',
        hangupReported: false,
    });
};

intercomDomain.markWaiting = function (sessionId) {
    assertPrimary(sessionId);
    if (current.state !== 'requesting') return primarySnapshot();
    return replacePrimary({ state: 'waiting' });
};

intercomDomain.acceptIncoming = function (sessionId) {
    assertSession(sessionId);
    if (
        current.mode === 'outgoing'
        && current.sessionId === sessionId
        && (current.state === 'requesting' || current.state === 'waiting')
    ) {
        return {
            accepted: true,
            role: 'primary',
            state: replacePrimary({ state: 'connecting', error: '' }),
        };
    }
    if (current.sessionId === sessionId || monitors.has(sessionId)) {
        return { accepted: false, duplicate: true, role: roleOf(sessionId) };
    }
    if (monitors.size >= MONITOR_LIMIT) {
        return { accepted: false, busy: true, reason: 'monitor_capacity' };
    }
    const now = Date.now();
    const monitor = {
        sessionId: sessionId,
        state: 'connecting',
        createdAt: now,
        startedAt: 0,
        error: '',
        revision: 1,
        updatedAt: now,
    };
    monitors.set(sessionId, monitor);
    return { accepted: true, role: 'monitor', state: monitorSnapshot(monitor) };
};

intercomDomain.ensureVideoEnabled = async function () {
    return queueVideo(async function () {
        if (videoEnabled) return;
        await intercomDriver.setVideo(true);
        videoEnabled = true;
    });
};

intercomDomain.answer = async function (sessionId, role) {
    assertRole(sessionId, role);
    await intercomDomain.ensureVideoEnabled();
    assertRole(sessionId, role);
    if (role === 'primary') {
        await setPrimaryAudio(!current.micMuted, !current.speakerMuted);
        assertRole(sessionId, role);
    }
    await intercomDriver.answer(sessionId, role);
    return intercomDomain.getSession(sessionId);
};

intercomDomain.reject = function (sessionId) {
    assertSession(sessionId);
    return intercomDriver.hangup(sessionId);
};

intercomDomain.markActive = function (sessionId) {
    const role = roleOf(sessionId);
    if (role === 'primary') {
        if (current.state === 'active') return primarySnapshot();
        if (current.state !== 'connecting') throw new AppError('300000', '主通话不在连接中');
        return replacePrimary({ state: 'active', startedAt: Date.now(), error: '' });
    }
    if (role === 'monitor') {
        const session = monitors.get(sessionId);
        if (session.state === 'active') return monitorSnapshot(session);
        if (session.state !== 'connecting') throw new AppError('300000', '监控会话不在连接中');
        return replaceMonitor(sessionId, { state: 'active', startedAt: Date.now(), error: '' });
    }
    throw new AppError('300000', '通话会话不存在');
};

intercomDomain.setAudio = async function (values) {
    if (current.state !== 'active') throw new AppError('300000', '当前没有已接通的主通话');
    const source = values || {};
    const micMuted = source.micMuted === true;
    const speakerMuted = source.speakerMuted === true;
    await setPrimaryAudio(!micMuted, !speakerMuted);
    return replacePrimary({ micMuted: micMuted, speakerMuted: speakerMuted });
};

intercomDomain.disablePrimaryAudio = async function () {
    if (!audioOutEnabled && !audioInEnabled) return;
    await setPrimaryAudio(false, false);
};

intercomDomain.beginEnding = function (sessionId, reason) {
    const role = roleOf(sessionId);
    if (role === 'primary') {
        if (current.state === 'ending') {
            if (reason && !current.error) return replacePrimary({ error: String(reason) });
            return primarySnapshot();
        }
        return replacePrimary({ state: 'ending', error: reason || '' });
    }
    if (role === 'monitor') {
        const session = monitors.get(sessionId);
        if (session.state === 'ending') {
            if (reason && !session.error) return replaceMonitor(sessionId, { error: String(reason) });
            return monitorSnapshot(session);
        }
        return replaceMonitor(sessionId, { state: 'ending', error: reason || '' });
    }
    return null;
};

intercomDomain.hangupMedia = async function (sessionId) {
    const role = roleOf(sessionId);
    if (!role) return;
    let firstError = null;
    if (role === 'primary') {
        try { await intercomDomain.disablePrimaryAudio(); } catch (e) { firstError = e; }
    }
    try { await intercomDriver.hangup(sessionId); } catch (e) { if (!firstError) firstError = e; }
    if (firstError) throw firstError;
};

intercomDomain.releaseUnusedMedia = async function () {
    let firstError = null;
    if (!intercomDomain.isPrimaryBusy()) {
        try { await intercomDomain.disablePrimaryAudio(); } catch (e) { firstError = e; }
    }
    try {
        await queueVideo(async function () {
            if (hasNativeSessions() || !videoEnabled) return;
            await intercomDriver.setVideo(false);
            videoEnabled = false;
        });
    } catch (e) {
        if (!firstError) firstError = e;
    }
    if (firstError) throw firstError;
};

intercomDomain.stopMedia = async function () {
    let firstError = null;
    try { await setPrimaryAudio(false, false); } catch (e) { firstError = e; }
    try {
        await queueVideo(async function () {
            if (!videoEnabled) return;
            await intercomDriver.setVideo(false);
            videoEnabled = false;
        });
    } catch (e) {
        if (!firstError) firstError = e;
    }
    if (firstError) throw firstError;
};

intercomDomain.finish = function (sessionId) {
    const role = roleOf(sessionId);
    if (!role) return null;
    if (role === 'primary') {
        const previous = Object.assign({ role: role }, primarySnapshot());
        current = idleState(current.revision + 1);
        return previous;
    }
    const previous = Object.assign({ role: role }, monitorSnapshot(monitors.get(sessionId)));
    monitors.delete(sessionId);
    return previous;
};

intercomDomain.fail = function (sessionId, error) {
    if (!sessionId || current.sessionId !== sessionId) return null;
    return replacePrimary({
        state: 'failed',
        startedAt: 0,
        error: error && error.message ? error.message : String(error || '呼叫失败'),
    });
};

intercomDomain.markHangupReported = function (sessionId) {
    if (current.sessionId !== sessionId || current.mode !== 'outgoing' || current.hangupReported) return false;
    replacePrimary({ hangupReported: true });
    return true;
};

intercomDomain.updatePeer = function (sessionId, contact) {
    if (current.sessionId !== sessionId || !contact || typeof contact !== 'object') return primarySnapshot();
    return replacePrimary({
        contact: {
            id: String(contact.id || (current.contact && current.contact.id) || ''),
            name: String(contact.name || (current.contact && current.contact.name) || ''),
        },
    });
};

intercomDomain.getConfig = async function () {
    return await configStorage.getGroup('intercom');
};

intercomDomain.setConfig = async function (values) {
    if (intercomDomain.isBusy()) throw new AppError('300000', '通话或监控中不能修改WebRTC服务配置');
    const previous = await intercomDomain.getConfig();
    const next = Object.assign({}, previous, values || {});
    await configStorage.setGroup('intercom', values || {});
    try {
        if (intercomDriver.isInitialized()) await intercomDriver.updateConfig(next);
    } catch (error) {
        await configStorage.setGroup('intercom', previous);
        throw error;
    }
    return await intercomDomain.getConfig();
};

intercomDomain.getServiceInfo = async function () {
    const configured = await intercomDomain.getConfig();
    const base = {
        server: configured.server || '',
        port: configured.port || 0,
        serno: intercomDriver.getIntercomSerno() || '',
        primaryState: current.state,
        monitorCount: monitors.size,
        sessionCount: intercomDomain.getSessions().length,
    };
    if (!intercomDriver.isInitialized()) {
        return Object.assign(base, { enabled: false, connected: false, status: 'UNAVAILABLE' });
    }
    const status = intercomDriver.getServiceStatus();
    return Object.assign(base, { enabled: true, connected: status === 'CONNECTED', status: status });
};

intercomDomain.getServiceStatus = function () {
    return intercomDriver.isInitialized() ? intercomDriver.getServiceStatus() : 'UNAVAILABLE';
};

export default intercomDomain;
