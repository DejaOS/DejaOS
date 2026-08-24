/**
 * @layer    core
 * @module   event_bus
 * @fires    all events in core/events.js
 * @listens  all events in core/events.js
 * @depends  none
 */

import diagLog from '../utils/diag_log.js';

const listeners = new Map();
const commands = new Map();

const eventBus = {};

eventBus.on = function (eventName, handler) {
    if (typeof eventName !== 'string') {
        throw new Error('eventBus.on: eventName must be string');
    }
    if (typeof handler !== 'function') {
        throw new Error('eventBus.on: handler must be function');
    }
    if (!listeners.has(eventName)) {
        listeners.set(eventName, []);
    }
    listeners.get(eventName).push(handler);
};

eventBus.off = function (eventName, handler) {
    const list = listeners.get(eventName);
    if (!list) {
        return;
    }
    const next = [];
    for (let i = 0; i < list.length; i++) {
        if (list[i] !== handler) {
            next.push(list[i]);
        }
    }
    if (next.length === 0) {
        listeners.delete(eventName);
    } else {
        listeners.set(eventName, next);
    }
};

eventBus.fire = async function (eventName, payload) {
    const list = listeners.get(eventName);
    if (!list || list.length === 0) {
        return;
    }

    // 使用快照隔离本次广播，避免handler在执行过程中增删监听器而改变当前遍历结果。
    const snapshot = list.slice();
    let firstError = null;
    for (let i = 0; i < snapshot.length; i++) {
        const handler = snapshot[i];
        try {
            await handler(payload);
        } catch (e) {
            if (!firstError) {
                firstError = e;
            }
        }
    }
    if (firstError) {
        throw firstError;
    }
};

eventBus.registerCommand = function (commandName, handler) {
    if (typeof commandName !== 'string') {
        throw new Error('eventBus.registerCommand: commandName must be string');
    }
    if (typeof handler !== 'function') {
        throw new Error('eventBus.registerCommand: handler must be function');
    }
    if (commands.has(commandName)) {
        // command必须有且只有一个处理者，否则请求方无法确定最终返回结果。
        throw new Error('eventBus.registerCommand: duplicated command handler');
    }
    commands.set(commandName, handler);
};

eventBus.unregisterCommand = function (commandName) {
    commands.delete(commandName);
};

eventBus.execute = async function (commandName, payload) {
    const startedAt = Date.now();
    const traceId = payload && payload.context && payload.context.traceId
        ? payload.context.traceId : '';
    const handler = commands.get(commandName);
    if (!handler) {
        const error = new Error('eventBus.execute: command handler not found');
        diagLog.error('event_bus', 'command_missing', error, { command: commandName });
        throw error;
    }
    // 查询、会话校验和触屏唤醒频率较高，仅保留DEBUG；其余事务用INFO记录完整结果。
    const lowNoise = commandName.indexOf('CMD_GET_') === 0
        || commandName === 'CMD_VERIFY_SESSION'
        || commandName === 'CMD_SET_DISPLAY_AWAKE';
    const writeCommand = lowNoise ? diagLog.debug : diagLog.info;
    writeCommand('event_bus', 'command_start', { command: commandName, trace_id: traceId });
    try {
        const result = await handler(payload);
        writeCommand('event_bus', 'command_done', {
            command: commandName,
            duration_ms: diagLog.duration(startedAt),
            trace_id: traceId,
        });
        return result;
    } catch (error) {
        diagLog.error('event_bus', 'command_failed', error, {
            command: commandName,
            duration_ms: diagLog.duration(startedAt),
            trace_id: traceId,
        });
        throw error;
    }
};

eventBus.clear = function () {
    listeners.clear();
    commands.clear();
};

export default eventBus;
