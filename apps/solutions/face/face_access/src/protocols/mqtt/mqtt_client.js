/**
 * @layer    protocols
 * @module   mqtt_client
 * @fires    fixed callbacks: connected,offline,message,error
 * @listens  none
 * @depends  dxMqttClient,dxOs,dxStd,dxLogger
 *
 * 调用边界：
 * - 本文件只封装MQTT连接、重连、订阅、发布和客户端状态。
 * - 本文件不解析Topic，不组装协议报文，不触发业务Command。
 * - 仅mqtt_protocol.js可以调用本文件，其他模块统一调用mqtt_protocol.js。
 */

import dxMqtt from '../../../dxmodules/dxMqttClient.js';
import dxOs from '../../../dxmodules/dxOs.js';
import dxStd from '../../../dxmodules/dxStd.js';
import dxLogger from '../../../dxmodules/dxLogger.js';

const SOURCE_ID = 'face_app_mqtt';
const MAX_RETRY_DELAY_MS = 60000;
const FAST_FAILURE_WINDOW_MS = 2000;
const FAST_FAILURE_RESET_THRESHOLD = 3;
const DEFAULT_CONFIG = {
    addr: '',
    clientId: '',
    username: '',
    password: '',
    qos: 0,
    operationTimeoutSec: 10,
    keepAlive: 60,
    retryIntervalMs: 5000,
    clientIdSuffix: 0,
    willTopic: '',
    willPayload: '',
    cleanSession: 0,
};

let config = Object.assign({}, DEFAULT_CONFIG);
let initialized = false;
let connected = false;
let connecting = false;
// connectEnabled表示MQTT是否允许连接，由reconnect/suspend控制。
let connectEnabled = false;
let client = null;
let clientGeneration = 0;
let runtimeClientId = '';
let retryTimer = null;
let callbacks = {};
let networkGeneration = 0;
let retryAttempt = 0;
let fastFailureCount = 0;
let controlledResetUsed = false;

function validateConfig(value) {
    if (typeof value.addr !== 'string' || value.addr.length === 0) {
        throw new TypeError('mqtt: addr must be a non-empty string');
    }
    if (!Number.isInteger(value.qos) || value.qos < 0 || value.qos > 2) {
        throw new RangeError('mqtt: qos must be an integer in range [0, 2]');
    }
    if (typeof value.operationTimeoutSec !== 'number' || value.operationTimeoutSec <= 0) {
        throw new RangeError('mqtt: operationTimeoutSec must be a positive number');
    }
    if (!Number.isInteger(value.keepAlive) || value.keepAlive <= 0) {
        throw new RangeError('mqtt: keepAlive must be a positive integer');
    }
    if (!Number.isInteger(value.retryIntervalMs) || value.retryIntervalMs <= 0) {
        throw new RangeError('mqtt: retryIntervalMs must be a positive integer');
    }
    if (value.cleanSession !== 0 && value.cleanSession !== 1
        && value.cleanSession !== false && value.cleanSession !== true) {
        throw new RangeError('mqtt: cleanSession must be 0, 1 or boolean');
    }
}

function normalizeUri(uri) {
    if (uri.indexOf('mqtt://') === 0) {
        return 'tcp://' + uri.substring('mqtt://'.length);
    }
    if (uri.indexOf('mqtts://') === 0) {
        return 'ssl://' + uri.substring('mqtts://'.length);
    }
    return uri;
}

function createClientId() {
    let clientId = config.clientId || dxOs.getSn() || 'face_app';
    if (config.clientIdSuffix === 1) {
        clientId += '_' + dxStd.genRandomStr(3);
    }
    return clientId;
}

function notify(eventName) {
    const callback = callbacks[eventName];
    if (typeof callback !== 'function') {
        return;
    }
    const args = Array.prototype.slice.call(arguments, 1);
    try {
        callback.apply(null, args);
    } catch (e) {
        dxLogger.error('mqtt ' + eventName + ' callback failed: ' + e.message);
    }
}

function assertInitialized() {
    if (!initialized || !client) {
        throw new Error('mqtt: module is not initialized');
    }
}

function assertConnected() {
    assertInitialized();
    if (!connected || !client.isConnected()) {
        onClientOffline('connection_lost');
        throw new Error('mqtt: client is not connected');
    }
}

function clearRetryTimer() {
    if (retryTimer !== null) {
        dxStd.clearTimeout(retryTimer);
        retryTimer = null;
    }
}

function resetRecoveryState() {
    retryAttempt = 0;
    fastFailureCount = 0;
    controlledResetUsed = false;
}

function retryDelay() {
    const exponent = Math.min(retryAttempt, 8);
    const maxDelay = Math.max(MAX_RETRY_DELAY_MS, config.retryIntervalMs);
    return Math.min(maxDelay, config.retryIntervalMs * Math.pow(2, exponent));
}

function scheduleRetry() {
    // retryTimer同时承担去重标记，任何时刻最多保留一个重连定时器。
    if (!initialized || !connectEnabled || connected || retryTimer !== null) {
        return;
    }
    const delayMs = retryDelay();
    retryAttempt++;
    dxLogger.info('mqtt recovery retry scheduled: networkGeneration=' + networkGeneration
        + ', attempt=' + retryAttempt + ', delayMs=' + delayMs);
    retryTimer = dxStd.setTimeout(function () {
        retryTimer = null;
        // 错误已通过固定error回调交给mqtt_protocol统一记录。
        attemptConnect().catch(function () {});
    }, delayMs);
}

function onClientMessage(topic, payload) {
    notify('message', topic, payload);
}

function onClientOffline(cause) {
    const wasConnected = connected;
    connected = false;
    connecting = false;
    if (wasConnected) {
        notify('offline', cause || '');
    }
    scheduleRetry();
}

function createClient() {
    clientGeneration++;
    runtimeClientId = createClientId();
    client = dxMqtt.createClient(SOURCE_ID, {
        uri: normalizeUri(config.addr),
        clientId: runtimeClientId,
    });
    client.on('message', onClientMessage);
    client.on('offline', onClientOffline);
}

function destroyClient() {
    if (!client) {
        return;
    }
    clientGeneration++;
    client.off('message', onClientMessage);
    client.off('offline', onClientOffline);
    client.destroy();
    client = null;
    connected = false;
    connecting = false;
}

function resetNativeClient(reason) {
    clientGeneration++;
    connected = false;
    connecting = false;
    try {
        client.reset();
        dxLogger.info('mqtt recovery client reset: reason=' + reason
            + ', networkGeneration=' + networkGeneration);
        return true;
    } catch (e) {
        notify('error', e);
        return false;
    }
}

function isFastGenericConnectFailure(error, durationMs) {
    const message = error && error.message ? error.message : String(error || '');
    return durationMs <= FAST_FAILURE_WINDOW_MS
        && /connect failed,\s*code=-1(?:\D|$)/.test(message);
}

async function attemptConnect() {
    assertInitialized();
    if (connected) {
        return true;
    }
    if (connecting || !connectEnabled) {
        return false;
    }

    clearRetryTimer();
    connecting = true;
    const targetClient = client;
    const targetGeneration = clientGeneration;
    const startedAt = Date.now();
    try {
        const connectOptions = {
            username: config.username,
            password: config.password,
            keepAlive: config.keepAlive,
            cleanSession: config.cleanSession === 1 || config.cleanSession === true,
        };
        if (config.willTopic) {
            let willPayload = config.willPayload || '';
            if (typeof callbacks.willPayload === 'function') {
                try {
                    willPayload = String(callbacks.willPayload() || '');
                } catch (e) {
                    dxLogger.error('mqtt willPayload callback failed: ' + e.message);
                }
            }
            connectOptions.will = {
                topic: config.willTopic,
                payload: willPayload,
                qos: config.qos,
                retained: false,
            };
        }
        await targetClient.connect(connectOptions, Math.floor(config.operationTimeoutSec * 1000));
        /*
         * reset、重配或销毁都会推进代次。旧Promise即使晚到，也不得覆盖
         * 当前连接状态，这是应用层对异步组件的最后一道状态保护。
         */
        if (!initialized || !connectEnabled || targetClient !== client
            || targetGeneration !== clientGeneration) {
            return false;
        }
        connected = targetClient.isConnected();
        if (!connected) {
            throw new Error('mqtt: component returned but client is not connected');
        }
        resetRecoveryState();
        notify('connected', { clientId: runtimeClientId });
        return true;
    } catch (e) {
        const isCurrent = targetClient === client && targetGeneration === clientGeneration;
        if (isCurrent) {
            connected = false;
        }
        if (isCurrent && initialized && connectEnabled) {
            notify('error', e);
            if (isFastGenericConnectFailure(e, Date.now() - startedAt)) {
                fastFailureCount++;
            } else {
                fastFailureCount = 0;
            }
            /*
             * 网络尚未真正可路由时，Paho可能连续快速返回通用错误-1。
             * 同一网络代次只重建一次原生句柄，既清理异常状态，也避免无限重建。
             */
            if (fastFailureCount >= FAST_FAILURE_RESET_THRESHOLD && !controlledResetUsed) {
                controlledResetUsed = true;
                fastFailureCount = 0;
                retryAttempt = 0;
                resetNativeClient('fast_connect_failure');
            }
            scheduleRetry();
            throw e;
        }
        return false;
    } finally {
        if (targetClient === client && targetGeneration === clientGeneration) {
            connecting = false;
        }
    }
}

const mqttClient = {};

mqttClient.init = async function (nextConfig, nextCallbacks) {
    if (initialized) {
        return;
    }
    const next = Object.assign({}, DEFAULT_CONFIG, nextConfig || {});
    validateConfig(next);
    config = next;
    callbacks = Object.assign({}, nextCallbacks || {});
    try {
        createClient();
        initialized = true;
    } catch (e) {
        try {
            destroyClient();
        } catch (_destroyError) {}
        callbacks = {};
        throw e;
    }
};

mqttClient.updateConfig = async function (nextConfig) {
    const next = Object.assign({}, config, nextConfig || {});
    validateConfig(next);
    config = next;
    if (!initialized) {
        return;
    }
    clearRetryTimer();
    resetRecoveryState();
    destroyClient();
    createClient();
    if (connectEnabled) {
        await attemptConnect();
    }
};

mqttClient.reconnect = function () {
    assertInitialized();
    const startsNetworkGeneration = !connectEnabled;
    connectEnabled = true;
    if (connected && client.isConnected()) {
        return;
    }
    connected = false;
    if (connecting) {
        return;
    }
    if (startsNetworkGeneration) {
        networkGeneration++;
        resetRecoveryState();
        // 每次网络恢复都从干净原生句柄开始，隔离上一网络周期的Paho状态。
        resetNativeClient('network_generation');
    }
    attemptConnect().catch(function () {});
};

mqttClient.suspend = function () {
    assertInitialized();
    if (!connectEnabled && !connected && !connecting) {
        return;
    }
    connectEnabled = false;
    clearRetryTimer();
    const wasConnected = connected;
    connected = false;
    connecting = false;
    /*
     * 网络已不可用时无需做优雅断开。reset会同步重建原生句柄，并拒绝
     * 未完成的connect任务，网络恢复后从干净句柄开始新的连接周期。
     */
    resetNativeClient('network_suspend');

    if (wasConnected) {
        notify('offline', 'network_offline');
    }
};

mqttClient.subscribe = async function (topics, qos) {
    assertConnected();
    return await client.subscribe(topics, qos === undefined ? config.qos : qos, Math.floor(config.operationTimeoutSec * 1000));
};

mqttClient.publish = async function (topic, payload, qos) {
    assertConnected();
    return await client.publish(topic, payload, qos === undefined ? config.qos : qos, Math.floor(config.operationTimeoutSec * 1000));
};

mqttClient.isConnected = function () {
    return connected && !!client && client.isConnected();
};

mqttClient.getClientId = function () {
    return runtimeClientId;
};

mqttClient.destroy = async function () {
    if (!initialized) {
        return;
    }
    initialized = false;
    connectEnabled = false;
    clearRetryTimer();
    destroyClient();
    callbacks = {};
    networkGeneration = 0;
    resetRecoveryState();
};

export default mqttClient;
