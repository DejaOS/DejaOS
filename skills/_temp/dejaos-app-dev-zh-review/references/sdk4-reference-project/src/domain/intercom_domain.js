/**
 * @layer    domain
 * @module   intercom_domain
 * @depends  dxStd,intercom_driver,core/error
 *
 * 可视对讲单会话状态机。Service负责编排MQTT/UI/网络流程，本Domain只维护
 * 通话事实并控制Intercom原子能力，避免状态散落在页面或Service中。
 */

import dxStd from '../../dxmodules/dxStd.js';
import configStorage from '../storage/config/config.js';
import intercomDriver from '../drivers/intercom_driver.js';
import { AppError } from '../core/error.js';

const ACTIVE_STATES = ['requesting', 'waiting', 'connecting', 'active', 'ending'];

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

function cloneContact(contact) {
    if (!contact) {
        return null;
    }
    return {
        id: String(contact.id || ''),
        name: String(contact.name || ''),
    };
}

function snapshot() {
    return Object.assign({}, current, {
        contact: cloneContact(current.contact),
    });
}

function replace(values) {
    current = Object.assign({}, current, values, {
        revision: current.revision + 1,
        updatedAt: Date.now(),
    });
    return snapshot();
}

function assertSession(sessionId) {
    if (typeof sessionId !== 'string' || !sessionId) {
        throw new AppError('200000', '通话sessionId不能为空');
    }
}

function assertCurrent(sessionId) {
    assertSession(sessionId);
    if (current.sessionId !== sessionId) {
        throw new AppError('300000', '通话会话已变化');
    }
}

const intercomDomain = {};

intercomDomain.getState = function () {
    return snapshot();
};

/** 同进程重新bootstrap前强制回到空闲态，不保留上一轮会话。 */
intercomDomain.reset = function () {
    const previous = snapshot();
    current = idleState(current.revision + 1);
    return previous;
};

intercomDomain.isBusy = function () {
    return ACTIVE_STATES.indexOf(current.state) >= 0;
};

intercomDomain.isCurrent = function (sessionId) {
    return !!sessionId && current.sessionId === sessionId;
};

intercomDomain.beginOutgoing = function (contact) {
    if (!contact || typeof contact !== 'object' || !String(contact.id || '')) {
        throw new AppError('200000', '呼叫联系人不能为空');
    }
    if (intercomDomain.isBusy()) {
        throw new AppError('300000', '设备正在通话');
    }
    return replace({
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
    assertCurrent(sessionId);
    // App可能在MQTT回执到达前已反向呼入，不能把connecting降级为waiting。
    if (current.state !== 'requesting') {
        return snapshot();
    }
    return replace({ state: 'waiting' });
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
            mode: 'outgoing',
            state: replace({ state: 'connecting', error: '' }),
        };
    }
    if (current.state === 'idle' || current.state === 'failed') {
        return {
            accepted: true,
            mode: 'passive_video',
            state: replace({
                state: 'connecting',
                mode: 'passive_video',
                sessionId: sessionId,
                contact: null,
                micMuted: true,
                speakerMuted: true,
                startedAt: 0,
                error: '',
                hangupReported: true,
            }),
        };
    }
    if (current.sessionId === sessionId) {
        return { accepted: false, duplicate: true, state: snapshot() };
    }
    return { accepted: false, busy: true, state: snapshot() };
};

intercomDomain.answer = async function (sessionId, withAudio) {
    assertCurrent(sessionId);
    await intercomDriver.setVideo(true);
    await intercomDriver.setAudio(withAudio === true, withAudio === true);
    await intercomDriver.answer(sessionId);
    return snapshot();
};

intercomDomain.reject = function (sessionId) {
    assertSession(sessionId);
    return intercomDriver.hangup(sessionId);
};

intercomDomain.markActive = function (sessionId) {
    assertCurrent(sessionId);
    if (current.state === 'active') {
        return snapshot();
    }
    if (current.state !== 'connecting') {
        throw new AppError('300000', '当前会话不在连接中');
    }
    return replace({ state: 'active', startedAt: Date.now(), error: '' });
};

intercomDomain.setAudio = async function (values) {
    if (current.state !== 'active') {
        throw new AppError('300000', '当前没有已接通的通话');
    }
    const source = values || {};
    const micMuted = source.micMuted === true;
    const speakerMuted = source.speakerMuted === true;
    await intercomDriver.setAudio(!micMuted, !speakerMuted);
    return replace({
        micMuted: micMuted,
        speakerMuted: speakerMuted,
    });
};

intercomDomain.beginEnding = function (sessionId, reason) {
    assertCurrent(sessionId);
    if (current.state === 'ending') {
        if (reason && !current.error) {
            return replace({ error: String(reason) });
        }
        return snapshot();
    }
    return replace({ state: 'ending', error: reason || '' });
};

intercomDomain.hangupMedia = async function (sessionId) {
    assertCurrent(sessionId);
    let firstError = null;
    try {
        await intercomDomain.stopMedia();
    } catch (e) {
        firstError = e;
    }
    try {
        await intercomDriver.hangup(sessionId);
    } catch (e) {
        if (!firstError) {
            firstError = e;
        }
    }
    if (firstError) {
        throw firstError;
    }
};

intercomDomain.stopMedia = async function () {
    let firstError = null;
    try {
        await intercomDriver.setAudio(false, false);
    } catch (e) {
        firstError = e;
    }
    try {
        await intercomDriver.setVideo(false);
    } catch (e) {
        if (!firstError) {
            firstError = e;
        }
    }
    if (firstError) {
        throw firstError;
    }
};

intercomDomain.finish = function (sessionId) {
    if (!sessionId || current.sessionId !== sessionId) {
        return null;
    }
    const previous = snapshot();
    current = idleState(current.revision + 1);
    return previous;
};

intercomDomain.fail = function (sessionId, error) {
    if (!sessionId || current.sessionId !== sessionId) {
        return null;
    }
    return replace({
        state: 'failed',
        startedAt: 0,
        error: error && error.message ? error.message : String(error || '呼叫失败'),
    });
};

intercomDomain.markHangupReported = function (sessionId) {
    if (
        current.sessionId !== sessionId
        || current.mode !== 'outgoing'
        || current.hangupReported
    ) {
        return false;
    }
    replace({ hangupReported: true });
    return true;
};

intercomDomain.updatePeer = function (sessionId, contact) {
    if (current.sessionId !== sessionId || !contact || typeof contact !== 'object') {
        return snapshot();
    }
    return replace({
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
    if (intercomDomain.isBusy()) {
        throw new AppError('300000', '通话中不能修改WebRTC服务配置');
    }
    const previous = await intercomDomain.getConfig();
    const next = Object.assign({}, previous, values || {});
    await configStorage.setGroup('intercom', values || {});
    try {
        if (intercomDriver.isInitialized()) {
            await intercomDriver.updateConfig(next);
        }
    } catch (error) {
        await configStorage.setGroup('intercom', previous);
        throw error;
    }
    return await intercomDomain.getConfig();
};

intercomDomain.getServiceInfo = async function () {
    const configured = await intercomDomain.getConfig();
    if (!intercomDriver.isInitialized()) {
        return {
            enabled: false,
            connected: false,
            status: 'UNAVAILABLE',
            server: configured.server || '',
            port: configured.port || 0,
            serno: intercomDriver.getIntercomSerno() || '',
        };
    }
    const status = intercomDriver.getServiceStatus();
    return {
        enabled: true,
        connected: status === 'CONNECTED',
        status: status,
        server: configured.server || '',
        port: configured.port || 0,
        serno: intercomDriver.getIntercomSerno() || '',
    };
};

intercomDomain.getServiceStatus = function () {
    return intercomDriver.isInitialized() ? intercomDriver.getServiceStatus() : 'UNAVAILABLE';
};

export default intercomDomain;
