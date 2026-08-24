/**
 * @layer    view
 * @module   call_store
 * @depends  event_bus,core/commands
 *
 * 页面侧只保存可渲染快照。真实会话状态由intercom_domain维护，UI操作统一通过
 * Command进入call_service，禁止页面直接调用MQTT或Intercom组件。
 */

import eventBus from '../../../core/event_bus.js';
import commands from '../../../core/commands.js';

let contacts = [];
const listeners = new Set();
const session = {
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

function copySession() {
    return Object.assign({}, session, {
        contact: session.contact ? Object.assign({}, session.contact) : null,
    });
}

function notify() {
    const value = copySession();
    listeners.forEach(function (listener) {
        try {
            listener(value);
        } catch (_e) {}
    });
}

const callStore = {};

callStore.loadContacts = async function () {
    const result = await eventBus.execute(commands.GET_CALL_CONTACTS);
    contacts = Array.isArray(result) ? result.slice() : [];
    return contacts.slice();
};

callStore.listContacts = function () {
    return contacts.slice();
};

callStore.findContact = function (id) {
    const key = String(id || '');
    for (let i = 0; i < contacts.length; i++) {
        if (contacts[i].id === key) {
            return contacts[i];
        }
    }
    return null;
};

callStore.getSession = function () {
    return copySession();
};

callStore.isInCall = function () {
    return ['requesting', 'waiting', 'connecting', 'active', 'ending'].indexOf(session.state) >= 0;
};

callStore.applySession = function (next) {
    Object.assign(session, next || {});
    session.contact = next && next.contact ? Object.assign({}, next.contact) : null;
    notify();
    return true;
};

callStore.subscribe = function (listener) {
    if (typeof listener !== 'function') {
        throw new TypeError('call_store.subscribe: listener must be a function');
    }
    listeners.add(listener);
    listener(copySession());
    return function () {
        listeners.delete(listener);
    };
};

callStore.startCall = function (contact) {
    return eventBus.execute(commands.START_CALL, { contact: contact });
};

callStore.setMicMuted = function (muted) {
    return eventBus.execute(commands.SET_CALL_AUDIO, {
        micMuted: muted === true,
        speakerMuted: session.speakerMuted,
    });
};

callStore.setSpeakerMuted = function (muted) {
    return eventBus.execute(commands.SET_CALL_AUDIO, {
        micMuted: session.micMuted,
        speakerMuted: muted === true,
    });
};

callStore.hangup = function (reason) {
    return eventBus.execute(commands.HANGUP_CALL, reason || 'ui_hangup');
};

export default callStore;
