/**
 * @layer    drivers
 * @module   network_driver
 * @fires    NETWORK_CHANGED
 * @listens  none
 * @depends  dxNetwork,dxLogger,event_bus,core/events
 *
 * 主网络配置采用“最后目标生效”：随时接收新配置，底层控制保持串行，
 * 尚未开始的旧配置会被跳过。Wi-Fi扫描独立单飞，不切换主网卡。
 */

import dxNetwork from '../../dxmodules/dxNetwork.js';
import dxLogger from '../../dxmodules/dxLogger.js';
import eventBus from '../core/event_bus.js';
import events from '../core/events.js';
import diagLog from '../utils/diag_log.js';

const DEFAULT_CONFIG = {
    type: dxNetwork.NET_TYPE.ETH,
    dhcp: dxNetwork.IP_MODE.DHCP,
    ssid: '',
    psk: '',
    ip: '',
    gateway: '',
    mask: '',
    dns: '',
    mac: '',
    scanTimeoutMs: 2500,
    scanIntervalMs: 100,
};

let config = Object.assign({}, DEFAULT_CONFIG);
let initialized = false;
let eventsEnabled = false;
let quiesced = false;
let applyGeneration = 0;
let applyQueue = Promise.resolve();
let state = offlineState();

function offlineState() {
    return {
        connected: false,
        status: 'offline',
        netType: dxNetwork.NET_TYPE.NONE,
        netStatus: dxNetwork.NET_STATUS.NONE,
    };
}

function normalizeConfig(value) {
    const next = Object.assign({}, DEFAULT_CONFIG, value || {});
    next.type = Number(next.type);
    next.dhcp = Number(next.dhcp);
    return next;
}

function validateConfig(value) {
    if (value.type !== dxNetwork.NET_TYPE.ETH &&
        value.type !== dxNetwork.NET_TYPE.WIFI &&
        value.type !== dxNetwork.NET_TYPE.MODEM) {
        throw new RangeError('network_driver: type must be ETH, WIFI, or MODEM');
    }
    if (value.dhcp !== dxNetwork.IP_MODE.STATIC && value.dhcp !== dxNetwork.IP_MODE.DHCP) {
        throw new RangeError('network_driver: dhcp must be STATIC or DHCP');
    }
    if (value.type === dxNetwork.NET_TYPE.WIFI &&
        (typeof value.ssid !== 'string' || value.ssid.length === 0)) {
        throw new TypeError('network_driver: ssid is required for Wi-Fi');
    }
    if (!Number.isInteger(value.scanTimeoutMs) || value.scanTimeoutMs <= 0) {
        throw new RangeError('network_driver: scanTimeoutMs must be a positive integer');
    }
    if (!Number.isInteger(value.scanIntervalMs) || value.scanIntervalMs <= 0) {
        throw new RangeError('network_driver: scanIntervalMs must be a positive integer');
    }
}

function assertInitialized() {
    if (!initialized) throw new Error('network_driver: module is not initialized');
}

function isOnlineStatus(netStatus) {
    return netStatus >= dxNetwork.NET_STATUS.CONNECTED_ROUTE;
}

function dispatchStatus(nextState) {
    const previous = Object.assign({}, state);
    state = nextState;
    if (previous.connected === state.connected) return;
    diagLog.info('network_driver', 'status_changed', {
        previous: previous.status, current: state.status,
        net_type: state.netType, net_status: state.netStatus,
    });
    eventBus.fire(events.NETWORK_CHANGED, {
        previous,
        current: Object.assign({}, state),
        ts: Date.now(),
    }).catch(function (error) {
        dxLogger.error('network_driver NETWORK_CHANGED dispatch failed: ' + error.message);
    });
}

function onStatusChange(raw) {
    const connected = isOnlineStatus(raw.netStatus);
    dispatchStatus({
        connected,
        status: connected ? 'online' : 'offline',
        netType: raw.netType,
        netStatus: raw.netStatus,
    });
}

function connectOptions(value) {
    if (value.type === dxNetwork.NET_TYPE.WIFI) {
        const options = {
            netType: dxNetwork.NET_TYPE.WIFI,
            ipMode: value.dhcp,
            ssid: value.ssid,
            psk: value.psk || '',
        };
        if (value.dhcp === dxNetwork.IP_MODE.STATIC) {
            Object.assign(options, {
                ip: value.ip,
                gateway: value.gateway,
                netmask: value.mask,
                dns: value.dns || '',
            });
        }
        return options;
    }
    if (value.type === dxNetwork.NET_TYPE.MODEM) {
        // TODO(vbar): VBAR开放4G参数后从配置映射并传入组件。
        return { netType: dxNetwork.NET_TYPE.MODEM, ipMode: dxNetwork.IP_MODE.DHCP };
    }
    const options = { netType: dxNetwork.NET_TYPE.ETH, ipMode: value.dhcp };
    if (value.mac) options.macaddr = value.mac;
    if (value.dhcp === dxNetwork.IP_MODE.STATIC) {
        Object.assign(options, {
            ip: value.ip,
            gateway: value.gateway,
            netmask: value.mask,
            dns: value.dns || '',
        });
    }
    return options;
}

function enqueueApply(kind, value) {
    const generation = ++applyGeneration;
    const startedAt = Date.now();
    diagLog.info('network_driver', 'apply_start', { action: kind, generation: generation, net_type: value ? value.type : '' });
    const snapshot = value ? Object.assign({}, value) : null;
    const run = async function () {
        if (generation !== applyGeneration) return { superseded: true };
        try {
            const result = kind === 'disconnect'
                ? await dxNetwork.disconnect()
                : await dxNetwork.connect(connectOptions(snapshot));
            if (generation !== applyGeneration) {
                diagLog.warn('network_driver', 'apply_superseded', { action: kind, generation: generation });
                return { superseded: true };
            }
            diagLog.info('network_driver', 'apply_done', {
                action: kind, generation: generation, duration_ms: diagLog.duration(startedAt),
            });
            return result;
        } catch (error) {
            // 已被新目标替代的旧任务即使失败，也不应污染当前流程或提示用户。
            if (generation !== applyGeneration) {
                diagLog.warn('network_driver', 'apply_failed_superseded', { action: kind, generation: generation });
                return { superseded: true };
            }
            diagLog.error('network_driver', 'apply_failed', error, {
                action: kind, generation: generation, duration_ms: diagLog.duration(startedAt),
            });
            throw error;
        }
    };
    const task = applyQueue.then(run, run);
    applyQueue = task.catch(function () {});
    return task;
}

const networkDriver = {
    NET_TYPE: dxNetwork.NET_TYPE,
    NET_STATUS: dxNetwork.NET_STATUS,
    IP_MODE: dxNetwork.IP_MODE,
};

networkDriver.init = async function (nextConfig) {
    if (initialized) return;
    const next = normalizeConfig(nextConfig);
    validateConfig(next);
    quiesced = false;
    dxNetwork.init();
    dxNetwork.on('statusChange', onStatusChange);
    eventsEnabled = true;
    config = next;
    initialized = true;
    try {
        await enqueueApply('connect', next);
    } catch (error) {
        dxNetwork.off('statusChange', onStatusChange);
        eventsEnabled = false;
        await dxNetwork.deinit();
        initialized = false;
        throw error;
    }
};

networkDriver.updateConfig = function (nextConfig) {
    const next = normalizeConfig(Object.assign({}, config, nextConfig || {}));
    validateConfig(next);
    config = next;
    if (!initialized || quiesced) return Promise.resolve();
    return enqueueApply('connect', next);
};

networkDriver.connect = function () {
    assertInitialized();
    return enqueueApply('connect', config);
};

networkDriver.disconnect = function () {
    assertInitialized();
    return enqueueApply('disconnect');
};

networkDriver.getStatus = function () {
    assertInitialized();
    return dxNetwork.getStatus();
};

networkDriver.getType = function () {
    assertInitialized();
    return dxNetwork.getType();
};

networkDriver.getState = function () {
    assertInitialized();
    const netStatus = dxNetwork.getStatus();
    const netType = dxNetwork.getType();
    const connected = isOnlineStatus(netStatus);
    return {
        connected,
        status: connected ? 'online' : 'offline',
        netType,
        netStatus,
    };
};

networkDriver.isOnline = function () {
    return initialized && dxNetwork.isConnected();
};

networkDriver.getNetParam = function () {
    assertInitialized();
    return dxNetwork.getNetParam();
};

networkDriver.getNetMac = function () {
    assertInitialized();
    return dxNetwork.getNetMac();
};

networkDriver.getRSSI = function () {
    assertInitialized();
    return dxNetwork.getRSSI();
};

networkDriver.scanWifi = function (timeoutMs, intervalMs) {
    assertInitialized();
    return dxNetwork.scanWifi(
        timeoutMs === undefined ? config.scanTimeoutMs : timeoutMs,
        intervalMs === undefined ? config.scanIntervalMs : intervalMs
    );
};

networkDriver.isInitialized = function () {
    return initialized;
};

networkDriver.quiesce = async function () {
    if (!initialized || quiesced) return;
    quiesced = true;
    ++applyGeneration;
    if (eventsEnabled) dxNetwork.off('statusChange', onStatusChange);
    eventsEnabled = false;
    try { await applyQueue; } catch (_e) {}
};

networkDriver.destroy = async function () {
    if (!initialized) return;
    ++applyGeneration;
    try { await applyQueue; } catch (_error) {}
    if (eventsEnabled) dxNetwork.off('statusChange', onStatusChange);
    eventsEnabled = false;
    let firstError = null;
    try { await dxNetwork.disconnect(); } catch (error) { firstError = error; }
    try { await dxNetwork.deinit(); } catch (error) { firstError = firstError || error; }
    initialized = false;
    quiesced = false;
    state = offlineState();
    if (firstError) throw firstError;
};

export default networkDriver;