/** @layer view @module door_store @depends event_bus,commands */

import eventBus from '../../../core/event_bus.js';
import commands from '../../../core/commands.js';
import { parseMqttEndpoint, buildMqttEndpoint } from '../../../utils/mqtt_endpoint.js';

let config = null;

function has(value, key) {
    return Object.prototype.hasOwnProperty.call(value, key);
}

function mapConfig(result, status) {
    const access = result && result.access ? result.access : {};
    const mqtt = result && result.mqtt ? result.mqtt : {};
    const sys = result && result.sys ? result.sys : {};
    const runtime = status || {};
    const endpoint = parseMqttEndpoint(mqtt.addr || 'mqtt://localhost');
    return {
        relayTime: access.relayTime,
        verifyMode: Number(access.verifyMode) || 0,
        factorSequence: Array.isArray(access.factorSequence) ? access.factorSequence.slice() : ['face', 'card'],
        verifyTimeout: Number(access.verifyTimeout) || 15,
        tamper: access.tamper === 1,
        fire: access.fire === 1,
        uploadToCloud: access.uploadToCloud === 1,
        deleteRecordAfterUpload: access.deleteRecordAfterUpload === 1,
        faceImageRetention: sys.faceImageRetention === 1,
        strangerImage: sys.strangerImage === 1,
        mqttScheme: endpoint.scheme,
        mqttHost: endpoint.host,
        mqttPort: endpoint.port,
        mqttUsername: mqtt.username || '',
        mqttPassword: mqtt.password || '',
        mqttConnected: runtime.connected === true,
        clientId: runtime.clientId || mqtt.clientId || '',
        qos: mqtt.qos,
        topicPrefix: mqtt.prefix || '',
        willTopic: mqtt.willTopic || '',
        cleanSession: mqtt.cleanSession === 1,
        clientIdSuffix: mqtt.clientIdSuffix === 1,
        heartbeatEnabled: sys.heart_en === 1,
        heartbeatInterval: sys.heart_time,
        onlineCheck: mqtt.onlinecheck === 1,
        onlineTimeout: mqtt.timeout,
    };
}

function failure(error) {
    return {
        ok: false,
        error: error && error.code === '300000' ? 'pending' : 'service',
        message: error && error.message ? error.message : '门禁配置操作失败',
    };
}

const doorStore = {};

doorStore.load = async function () {
    const result = await Promise.all([
        eventBus.execute(commands.GET_CONFIG, ['access', 'mqtt', 'sys']),
        eventBus.execute(commands.GET_MQTT_STATUS),
    ]);
    config = mapConfig(result[0], result[1]);
    return doorStore.getConfig();
};

doorStore.getConfig = function () {
    if (!config) throw new Error('door_store: config is not loaded');
    return Object.assign({}, config);
};

doorStore.save = async function (next) {
    if (!next) return { ok: false, error: 'required' };
    const access = {};
    const mqtt = {};
    const sys = {};

    if (has(next, 'relayTime')) {
        const relayTime = Number(next.relayTime);
        if (!Number.isInteger(relayTime) || relayTime < 1) return { ok: false, error: 'relayTime' };
        access.relayTime = relayTime;
    }
    if (has(next, 'verifyMode')) {
        const mode = Number(next.verifyMode);
        if (![0, 1, 2, 3].includes(mode)) return { ok: false, error: 'verifyMode' };
        access.verifyMode = mode;
        if (mode > 0) mqtt.onlinecheck = 0;
    }
    if (has(next, 'factorSequence')) {
        const sequence = next.factorSequence;
        const supported = ['face', 'card', 'code', 'password', 'finger'];
        if (!Array.isArray(sequence) || sequence.length !== 2 || sequence[0] === sequence[1]
            || sequence.some(function (item) { return supported.indexOf(item) < 0; })) {
            return { ok: false, error: 'factorSequence' };
        }
        access.factorSequence = sequence.slice();
    }
    if (has(next, 'verifyTimeout')) {
        const timeout = Number(next.verifyTimeout);
        if (!Number.isInteger(timeout) || timeout < 3 || timeout > 300) return { ok: false, error: 'verifyTimeout' };
        access.verifyTimeout = timeout;
    }
    if (has(next, 'tamper')) access.tamper = next.tamper ? 1 : 0;
    if (has(next, 'fire')) access.fire = next.fire ? 1 : 0;
    if (has(next, 'uploadToCloud')) access.uploadToCloud = next.uploadToCloud ? 1 : 0;
    if (has(next, 'deleteRecordAfterUpload')) access.deleteRecordAfterUpload = next.deleteRecordAfterUpload ? 1 : 0;
    if (has(next, 'faceImageRetention')) sys.faceImageRetention = next.faceImageRetention ? 1 : 0;
    if (has(next, 'strangerImage')) sys.strangerImage = next.strangerImage ? 1 : 0;

    if (has(next, 'mqttScheme') || has(next, 'mqttHost') || has(next, 'mqttPort')) {
        try {
            mqtt.addr = buildMqttEndpoint({
                scheme: has(next, 'mqttScheme') ? next.mqttScheme : config.mqttScheme,
                host: has(next, 'mqttHost') ? next.mqttHost : config.mqttHost,
                port: has(next, 'mqttPort') ? next.mqttPort : config.mqttPort,
            });
        } catch (e) {
            return { ok: false, error: 'mqttEndpoint', message: e.message };
        }
    }
    if (has(next, 'mqttUsername')) mqtt.username = String(next.mqttUsername || '').trim();
    if (has(next, 'mqttPassword')) mqtt.password = String(next.mqttPassword || '');
    if (has(next, 'onlineCheck')) {
        const mode = has(next, 'verifyMode') ? Number(next.verifyMode) : Number(config.verifyMode);
        mqtt.onlinecheck = mode > 0 ? 0 : (next.onlineCheck ? 1 : 0);
    }
    if (has(next, 'onlineTimeout')) {
        const timeout = Number(next.onlineTimeout);
        if (next.onlineCheck && (!Number.isInteger(timeout) || timeout < 1)) {
            return { ok: false, error: 'onlineTimeout' };
        }
        if (Number.isInteger(timeout) && timeout > 0) mqtt.timeout = timeout;
    }
    if (has(next, 'qos')) {
        const qos = Number(next.qos);
        if (!Number.isInteger(qos) || qos < 0 || qos > 2) return { ok: false, error: 'qos' };
        mqtt.qos = qos;
    }
    if (has(next, 'topicPrefix')) mqtt.prefix = String(next.topicPrefix || '').trim();
    if (has(next, 'willTopic')) mqtt.willTopic = String(next.willTopic || '').trim();
    if (has(next, 'cleanSession')) mqtt.cleanSession = next.cleanSession ? 1 : 0;
    if (has(next, 'clientIdSuffix')) mqtt.clientIdSuffix = next.clientIdSuffix ? 1 : 0;
    if (has(next, 'heartbeatEnabled')) sys.heart_en = next.heartbeatEnabled ? 1 : 0;
    if (has(next, 'heartbeatInterval')) {
        const interval = Number(next.heartbeatInterval);
        if (!Number.isInteger(interval) || interval < 30) return { ok: false, error: 'heartbeatInterval' };
        sys.heart_time = interval;
    }

    const groups = {};
    if (Object.keys(access).length) groups.access = access;
    if (Object.keys(mqtt).length) groups.mqtt = mqtt;
    if (Object.keys(sys).length) groups.sys = sys;
    if (!Object.keys(groups).length) return { ok: true };
    try {
        const result = await eventBus.execute(commands.SET_CONFIG, groups);
        await doorStore.load();
        return {
            ok: true,
            restartRequired: !!(result && result._meta && result._meta.restartRequired),
        };
    } catch (error) {
        return failure(error);
    }
};

export default doorStore;