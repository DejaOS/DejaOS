/**
 * @layer    protocols
 * @module   mqtt_protocol
 * @fires    MQTT_CHANGED
 * @listens  mqtt_client fixed callbacks
 * @depends  mqtt_client,event_bus,core/events,core/commands,dxStd,dxOs,dxLogger
 *
 * 调用边界：
 * - 本文件是MQTT对外入口，负责Topic、报文、路由、回执、心跳和主动上报。
 * - lifecycle和mqtt_domain可以调用本文件公开接口。
 * - 只有本文件可以调用mqtt_client.js，其他模块不得直接publish或subscribe。
 * - Service和Domain只处理业务参数与结果，不接触MQTT Topic和协议报文。
 */

import dxStd from '../../../dxmodules/dxStd.js';
import dxOs from '../../../dxmodules/dxOs.js';
import dxLogger from '../../../dxmodules/dxLogger.js';
import eventBus from '../../core/event_bus.js';
import events from '../../core/events.js';
import commands from '../../core/commands.js';
import mqttClient from './mqtt_client.js';
import { normalizeMqttEndpoint } from '../../utils/mqtt_endpoint.js';
import diagLog from '../../utils/diag_log.js';

/* ==================== 协议常量与路由定义 ==================== */

/** control.extra.weComStatus → APPLY_WECOM_BIND_STATUS（协议边界归一，不进 Service） */
function mapWecomBindControl(data) {
    const extra = data && data.extra && typeof data.extra === 'object' ? data.extra : null;
    if (!extra || !Object.prototype.hasOwnProperty.call(extra, 'weComStatus')) {
        return null;
    }
    const raw = Number(extra.weComStatus);
    if (raw !== 0 && raw !== 1) {
        return null;
    }
    return {
        command: commands.APPLY_WECOM_BIND_STATUS,
        data: { status: raw === 1 ? 1 : 0 },
    };
}

const SUCCESS_CODE = '000000';
const UNKNOWN_ERROR_CODE = '100000';
const PARAM_ERROR_CODE = '200000';
const NOT_READY_CODE = '300000';

const DEFAULT_CONFIG = {
    qos: 0,
    prefix: '',
    uuid: '',
    commandTimeoutMs: 10000,
    eventTimeoutMs: 10000,
    heartbeatEnabled: false,
    heartbeatIntervalSec: 30,
    connectData: {},
};

/*
 * action与Command是一对稳定映射。HTTP可将同名路径映射到相同Command，
 * UI也直接execute相同Command；只有MQTT层知道Topic和协议信封。
 */
const COMMAND_DEFINITIONS = [
    ['getConfig', commands.GET_CONFIG],
    ['setConfig', commands.SET_CONFIG],
    ['upgradeFirmware', commands.UPGRADE_FIRMWARE],
    ['control', commands.CONTROL_DEVICE],
    ['insertUser', commands.INSERT_USER],
    ['delUser', commands.DELETE_USER],
    ['clearUser', commands.CLEAR_USER],
    ['getUser', commands.GET_USER],
    ['modifyUser', commands.MODIFY_USER],
    ['insertKey', commands.INSERT_KEY],
    ['getKey', commands.GET_KEY],
    ['delKey', commands.DELETE_KEY],
    ['clearKey', commands.CLEAR_KEY],
    ['modifyKey', commands.MODIFY_KEY],
    ['insertPermission', commands.INSERT_PERMISSION],
    ['getPermission', commands.GET_PERMISSION],
    ['delPermission', commands.DELETE_PERMISSION],
    ['clearPermission', commands.CLEAR_PERMISSION],
    ['modifyPermission', commands.MODIFY_PERMISSION],
    ['insertSecurity', commands.INSERT_SECURITY],
    ['getSecurity', commands.GET_SECURITY],
    ['delSecurity', commands.DELETE_SECURITY],
    ['clearSecurity', commands.CLEAR_SECURITY],
    ['getRecords', commands.GET_RECORDS],
    ['delRecords', commands.DELETE_RECORDS],
];

const EVENT_REPLIES = ['alarm', 'access_online', 'wecom', 'access', 'getCallList', 'call'];
const FACE_COMMAND_TIMEOUT_MS = 35000;
/** 远程指纹 control：自申请页唤起起整段 60s（申请 + 采指共用） */
const FINGER_CONTROL_TIMEOUT_MS = 60000;
const OTA_COMMAND_TIMEOUT_MS = 310000;

/* ==================== 协议运行状态 ==================== */

let config = Object.assign({}, DEFAULT_CONFIG);
let initialized = false;
let routingStarted = false;
let mqttOnline = false;
let deviceUuid = '';
let topicRoot = 'access_device/v2';
let heartbeatTimer = null;
let setupRetryTimer = null;
let pendingConnectionInfo = null;
let serialSeed = 0;
let activeRequests = 0;
let pendingConfig = null;
let transportConfig = {};
const routes = new Map();
const pendingEvents = new Map();

/* ==================== 配置映射与基础校验 ==================== */

function isObject(value) {
    return !!value && typeof value === 'object' && !Array.isArray(value);
}

function nowSeconds() {
    return Math.floor(Date.now() / 1000);
}

function normalizePrefix(prefix) {
    if (!prefix) {
        return '';
    }
    const value = String(prefix).replace(/^\/+|\/+$/g, '');
    return value ? value + '/' : '';
}

/** 会改动 MQTT 连接本身的字段；onlinecheck/timeout 只影响本地业务。 */
function isTransportPatch(values) {
    const keys = [
        'addr', 'clientId', 'username', 'password', 'qos',
        'cleanSession', 'clientIdSuffix', 'willTopic', 'prefix',
    ];
    for (let i = 0; i < keys.length; i++) {
        if (Object.prototype.hasOwnProperty.call(values || {}, keys[i])) return true;
    }
    return false;
}

function isWeComDevice() {
    try {
        const text = dxStd.loadFileSync('/etc/app/.weCom');
        return !!(text && String(text).trim() === 'weCom');
    } catch (_e) {
        return false;
    }
}

function normalizeInitConfig(source) {
    const input = source || {};
    const mqttConfig = isObject(input.mqtt) ? input.mqtt : {};
    const sysConfig = isObject(input.sys) ? input.sys : {};
    const netConfig = isObject(input.net) ? input.net : {};

    /*
     * lifecycle只传递原始配置分组。协议所需的UUID、心跳和连接上报字段
     * 在模块内部完成映射，避免生命周期承担模块参数解析职责。
     *
     * broker：未激活/标品用 mqtt.addr；已激活企微用 sys.weComMqttAddr（企微全程）。
     * 首次开机尚未选模式时走 mqtt.addr；激活企微后由 mqttDomain.useBrokerAddr 热切换。
     */
    const uuid = dxOs.getSn() || '';
    const transport = Object.assign({}, mqttConfig);
    delete transport.timeout;
    delete transport.onlinecheck;
    delete transport.prefix;
    // 域名配置允许省略端口；协议层仅校验并归一格式，不替客户补端口。
    transport.addr = normalizeMqttEndpoint(transport.addr);
    transport.operationTimeoutSec = 10;
    if (isWeComDevice() && sysConfig.weComMqttAddr) {
        transport.addr = normalizeMqttEndpoint(String(sysConfig.weComMqttAddr));
    }
    if (mqttConfig.willTopic) {
        // 遗嘱正文在 CONNECT 时由 willPayload 回调生成，这里只登记 topic。
        transport.willTopic = normalizePrefix(mqttConfig.prefix) + String(mqttConfig.willTopic).replace(/^\/+/, '');
    }

    const result = {
        transport: transport,
        protocol: Object.assign({}, DEFAULT_CONFIG, mqttConfig, {
            uuid: uuid,
            eventTimeoutMs: (mqttConfig.timeout || 5) * 1000,
            heartbeatEnabled: sysConfig.heart_en === 1,
            heartbeatIntervalSec: sysConfig.heart_time || DEFAULT_CONFIG.heartbeatIntervalSec,
            connectData: {
                appVersion: sysConfig.appVersion || '',
                btMac: '',
                mac: dxOs.getUuid2mac() || '',
                type: netConfig.type,
                ssid: netConfig.ssid || '',
                psk: netConfig.psk || '',
                dhcp: netConfig.dhcp,
                ip: netConfig.ip || '',
                gateway: netConfig.gateway || '',
                dns: netConfig.dns || '',
                subnetMask: netConfig.mask || '',
                netMac: netConfig.mac || '',
            },
        }),
    };
    const intercomSerno = typeof input.intercomSerno === 'string' ? input.intercomSerno.trim() : '';
    if (intercomSerno) {
        result.protocol.connectData.intercomSerno = intercomSerno;
    }
    return result;
}

function buildProtocolState(next) {
    deviceUuid = next.uuid || dxOs.getSn() || mqttClient.getClientId() || 'face_app';
    topicRoot = normalizePrefix(next.prefix) + 'access_device/v2';
    routes.clear();
    for (let i = 0; i < COMMAND_DEFINITIONS.length; i++) {
        routes.set(COMMAND_DEFINITIONS[i][0], COMMAND_DEFINITIONS[i][1]);
    }
}

function validateConfig(value) {
    if (!Number.isInteger(value.qos) || value.qos < 0 || value.qos > 2) {
        throw new RangeError('mqtt_protocol: qos must be an integer in range [0, 2]');
    }
    if (!Number.isInteger(value.commandTimeoutMs) || value.commandTimeoutMs <= 0) {
        throw new RangeError('mqtt_protocol: commandTimeoutMs must be a positive integer');
    }
    if (!Number.isInteger(value.eventTimeoutMs) || value.eventTimeoutMs <= 0) {
        throw new RangeError('mqtt_protocol: eventTimeoutMs must be a positive integer');
    }
    if (!Number.isInteger(value.heartbeatIntervalSec) || value.heartbeatIntervalSec <= 0) {
        throw new RangeError('mqtt_protocol: heartbeatIntervalSec must be a positive integer');
    }
    if (!isObject(value.connectData)) {
        throw new TypeError('mqtt_protocol: connectData must be an object');
    }
}

function assertInitialized() {
    if (!initialized) {
        throw new Error('mqtt_protocol: module is not initialized');
    }
}

/* ==================== 协议信封与Topic工具 ==================== */

function nextSerialNo() {
    serialSeed = (serialSeed + 1) % 1000000;
    return String(Date.now()) + String(serialSeed).padStart(6, '0');
}

function makeEnvelope(serialNo, data) {
    const result = {
        serialNo: serialNo || nextSerialNo(),
        uuid: deviceUuid,
        time: nowSeconds(),
        sign: '',
    };
    if (data !== undefined) {
        result.data = data;
    }
    return result;
}

/**
 * 写类 Command（insertUser/delUser/clearUser/modifyUser 等）成功时常返回 true。
 * 协议约定：这类成功回包不含 data（data 仅失败时存在）；查询类结果原样带回。
 */
function successReplyData(result) {
    if (result === true || result === undefined || result === null) {
        return undefined;
    }
    return result;
}

function makeResponse(request, code, message, data) {
    const response = makeEnvelope(request && request.serialNo ? request.serialNo : '', data);
    response.code = code;
    response.message = message || (code === SUCCESS_CODE ? 'success' : 'failed');
    return response;
}

function protocolError(code, message, detail) {
    const error = new Error(message);
    error.code = code;
    error.detail = detail;
    return error;
}

function errorCode(error) {
    const code = error && error.code ? String(error.code) : '';
    return /^[0-9A-Z]{6}$/.test(code) ? code : UNKNOWN_ERROR_CODE;
}

function errorData(error) {
    if (!error || error.detail === undefined || error.detail === null) {
        return undefined;
    }
    if (Array.isArray(error.detail)) {
        return error.detail.length ? error.detail : undefined;
    }
    if (!isObject(error.detail) || Object.keys(error.detail).length === 0) return undefined;
    return error.detail;
}

function decodeEnvelope(payload) {
    let request;
    try {
        request = JSON.parse(payload);
    } catch (e) {
        throw protocolError(PARAM_ERROR_CODE, '消息内容不是有效JSON');
    }
    if (!isObject(request)) {
        throw protocolError(PARAM_ERROR_CODE, '消息内容必须是JSON对象');
    }
    if (typeof request.serialNo !== 'string' || request.serialNo.length === 0 || request.serialNo.length > 32) {
        throw protocolError(PARAM_ERROR_CODE, 'serialNo必须是1到32位字符串');
    }
    if (typeof request.uuid !== 'string' || request.uuid.length === 0) {
        throw protocolError(PARAM_ERROR_CODE, 'uuid不能为空');
    }
    if (request.uuid !== deviceUuid) {
        throw protocolError(PARAM_ERROR_CODE, 'uuid与设备不匹配');
    }
    return request;
}

function getAction(topic) {
    const prefix = topicRoot + '/cmd/' + deviceUuid + '/';
    if (topic.indexOf(prefix) !== 0) {
        return '';
    }
    const action = topic.substring(prefix.length);
    return action && action.indexOf('/') < 0 ? action : '';
}

/* ==================== Command执行桥接 ==================== */

function commandTimeout(command, payload) {
    const data = payload && payload.data;
    const faceWrite = (command === commands.INSERT_KEY || command === commands.MODIFY_KEY) &&
        Array.isArray(data) && data.some(function (item) { return String(item && item.type) === '300'; });
    if (faceWrite) return Math.max(FACE_COMMAND_TIMEOUT_MS, config.commandTimeoutMs);
    if (command === commands.CONTROL_DEVICE && Number(data && data.command) === 12
        && data.extra && Number(data.extra.fingerprintAction) === 0) {
        return Math.max(FINGER_CONTROL_TIMEOUT_MS, config.commandTimeoutMs);
    }
    if (command === commands.CONTROL_DEVICE && Number(data && data.command) === 8) {
        // 含抓拍页倒计时与默认抓拍时长；extra.timeout 为抓拍毫秒。
        const captureMs = Number(data.extra && data.extra.timeout);
        const waitMs = (Number.isFinite(captureMs) && captureMs > 0 ? captureMs : 6500) + 10000;
        return Math.max(waitMs, config.commandTimeoutMs, FACE_COMMAND_TIMEOUT_MS);
    }
    if (command === commands.UPGRADE_FIRMWARE || command === commands.UPDATE_ADVERTISEMENTS_REMOTE) {
        const timeoutSec = Number(data && data.timeoutSec);
        const otaTimeout = Number.isInteger(timeoutSec) && timeoutSec > 0
            ? (timeoutSec + 10) * 1000
            : OTA_COMMAND_TIMEOUT_MS;
        return Math.max(otaTimeout, config.commandTimeoutMs);
    }
    return config.commandTimeoutMs;
}

function executeCommand(command, payload) {
    return new Promise(function (resolve, reject) {
        let settled = false;
        const timer = dxStd.setTimeout(function () {
            if (!settled) {
                settled = true;
                reject(protocolError('100004', '命令执行超时'));
            }
        }, commandTimeout(command, payload));

        eventBus.execute(command, payload).then(function (result) {
            if (!settled) {
                settled = true;
                dxStd.clearTimeout(timer);
                resolve(result);
            }
        }).catch(function (error) {
            if (!settled) {
                settled = true;
                dxStd.clearTimeout(timer);
                if (error && String(error.message).indexOf('command handler not found') >= 0) {
                    reject(protocolError(NOT_READY_CODE, '功能尚未接入'));
                } else {
                    reject(error);
                }
            }
        });
    });
}

function commandReplyTopic(action) {
    return topicRoot + '/cmd/' + action + '_reply';
}

function eventTopic(name) {
    return topicRoot + '/event/' + name;
}

function eventReplyTopic(name) {
    return topicRoot + '/event/' + deviceUuid + '/' + name + '_reply';
}

/** 兼容平台误拼的回包 Topic：event 与 uuid 之间漏写 `/`。 */
function eventReplyTopicMalformed(name) {
    return topicRoot + '/event' + deviceUuid + '/' + name + '_reply';
}

function isEventReplyTopic(topic, name) {
    return topic === eventReplyTopic(name) || topic === eventReplyTopicMalformed(name);
}

/* ==================== 入站命令处理 ==================== */

async function flushPendingConfig() {
    if (!pendingConfig || activeRequests > 0) {
        return;
    }
    const next = pendingConfig;
    pendingConfig = null;
    await applyConfig(next);
}

async function handleCommand(topic, payload) {
    if (!routingStarted) {
        return false;
    }
    const action = getAction(topic);
    const command = routes.get(action);
    if (!command) {
        return false;
    }

    const startedAt = Date.now();
    const traceId = 'mqtt-' + startedAt.toString(36) + '-' + activeRequests.toString(36);
    activeRequests++;
    let request = null;
    let routedCommand = command;
    let response;
    const afterResponseTasks = [];
    try {
        request = decodeEnvelope(payload);
        let commandName = command;
        routedCommand = commandName;
        let commandData = request.data;
        if (action === 'control') {
            const mapped = mapWecomBindControl(commandData);
            if (mapped) {
                commandName = mapped.command;
                routedCommand = commandName;
                commandData = mapped.data;
            }
        }
        // MQTT沿用upgradeFirmware报文；type=10在协议边界转为广告资源发布Command。
        if (action === 'upgradeFirmware' && Number(commandData && commandData.type) === 10) {
            commandName = commands.UPDATE_ADVERTISEMENTS_REMOTE;
            routedCommand = commandName;
        }
        const result = await executeCommand(commandName, {
            data: commandData,
            context: {
                source: 'mqtt',
                traceId: traceId,
                afterResponse: function (task) {
                    if (typeof task !== 'function') {
                        throw new TypeError('afterResponse task must be a function');
                    }
                    afterResponseTasks.push(task);
                },
            },
        });
        response = makeResponse(request, SUCCESS_CODE, 'success', successReplyData(result));
        diagLog.info('mqtt_protocol', 'request_handled', {
            action: action, command: routedCommand,
            duration_ms: diagLog.duration(startedAt), result: 'success',
            trace_id: traceId,
        });
    } catch (e) {
        diagLog.error('mqtt_protocol', 'request_failed', e, {
            action: action, command: routedCommand,
            duration_ms: diagLog.duration(startedAt), result: 'failed',
            trace_id: traceId,
        });
        response = makeResponse(request, errorCode(e), e.message, errorData(e));
    }

    try {
        /*
         * 每个入站请求只允许Protocol回复一次。Service和Domain只返回业务结果，
         * 不接触serialNo、Topic、QoS或MQTT publish。
         */
        await mqttClient.publish(commandReplyTopic(action), JSON.stringify(response), config.qos);
        diagLog.info('mqtt_protocol', 'reply_published', {
            action: action, command: routedCommand,
            duration_ms: diagLog.duration(startedAt),
            trace_id: traceId,
        });
        for (let i = 0; i < afterResponseTasks.length; i++) {
            try {
                await afterResponseTasks[i]();
            } catch (e) {
                /*
                 * 响应已成功发出，此时下层重配失败不能撤回回包，只能记录并由
                 * 后续状态上报反映真实运行状态。
                 */
                dxLogger.error('mqtt_protocol afterResponse task failed: ' + e.message);
            }
        }
    } catch (e) {
        diagLog.error('mqtt_protocol', 'reply_publish_failed', e, {
            action: action, command: routedCommand,
            duration_ms: diagLog.duration(startedAt),
            trace_id: traceId,
        });
        throw e;
    } finally {
        activeRequests--;
        flushPendingConfig().catch(function (e) {
            dxLogger.error('mqtt_protocol deferred config failed: ' + e.message);
        });
    }
    return true;
}

function settleEventReply(topic, payload) {
    for (let i = 0; i < EVENT_REPLIES.length; i++) {
        if (!isEventReplyTopic(topic, EVENT_REPLIES[i])) {
            continue;
        }
        let response;
        try {
            response = JSON.parse(payload);
        } catch (e) {
            dxLogger.error('mqtt_protocol invalid event reply JSON: topic=' + topic);
            return true;
        }
        const pending = response && pendingEvents.get(response.serialNo);
        if (!pending) {
            return true;
        }
        pendingEvents.delete(response.serialNo);
        dxStd.clearTimeout(pending.timer);
        if (response.code === SUCCESS_CODE) {
            pending.resolve(response.data);
        } else {
            pending.reject(protocolError(response.code || UNKNOWN_ERROR_CODE, response.message || 'event failed', response.data));
        }
        return true;
    }
    return false;
}

async function handleMessage(topic, payload) {
    if (settleEventReply(topic, payload)) {
        return;
    }
    await handleCommand(topic, payload);
}

/* ==================== Topic订阅与协议就绪状态 ==================== */

async function subscribeTopics() {
    if (!routingStarted) {
        throw new Error('mqtt_protocol: routing is not started');
    }
    if (!mqttClient.isConnected()) {
        throw new Error('mqtt_protocol: client is not connected');
    }
    const topics = [topicRoot + '/cmd/' + deviceUuid + '/#'];
    for (let i = 0; i < EVENT_REPLIES.length; i++) {
        topics.push(eventReplyTopic(EVENT_REPLIES[i]));
        // 兼容平台漏写 `/` 的回包 Topic，确保能订阅到并完成 ACK。
        topics.push(eventReplyTopicMalformed(EVENT_REPLIES[i]));
    }
    await mqttClient.subscribe(topics, config.qos);
}

function fireState(online, detail) {
    if (mqttOnline === online) {
        return;
    }
    const previous = { connected: mqttOnline };
    mqttOnline = online;
    eventBus.fire(events.MQTT_CHANGED, {
        previous: previous,
        current: {
            connected: mqttOnline,
            clientId: mqttClient.getClientId(),
        },
        detail: detail || null,
        ts: Date.now(),
    }).catch(function (e) {
        dxLogger.error('mqtt_protocol MQTT_CHANGED dispatch failed: ' + e.message);
    });
}

function clearHeartbeat() {
    if (heartbeatTimer !== null) {
        dxStd.clearInterval(heartbeatTimer);
        heartbeatTimer = null;
    }
}

function clearSetupRetry() {
    if (setupRetryTimer !== null) {
        dxStd.clearTimeout(setupRetryTimer);
        setupRetryTimer = null;
    }
}

/* ==================== 主动上报与回执匹配 ==================== */

async function publishEvent(name, data) {
    const envelope = makeEnvelope('', data);
    await mqttClient.publish(eventTopic(name), JSON.stringify(envelope), config.qos);
    return envelope.serialNo;
}

function requestEvent(name, data, serialNo) {
    assertInitialized();
    if (EVENT_REPLIES.indexOf(name) < 0) {
        return Promise.reject(new Error('mqtt_protocol: unsupported reply event ' + name));
    }
    if (!mqttClient.isConnected()) {
        return Promise.reject(protocolError('100005', '设备离线'));
    }
    const envelope = makeEnvelope(serialNo || '', data);
    if (pendingEvents.has(envelope.serialNo)) {
        return Promise.reject(new Error(
            'mqtt_protocol: event is already pending, serialNo=' + envelope.serialNo
        ));
    }
    return new Promise(function (resolve, reject) {
        const timer = dxStd.setTimeout(function () {
            pendingEvents.delete(envelope.serialNo);
            reject(protocolError('100004', '事件回执超时'));
        }, config.eventTimeoutMs);
        pendingEvents.set(envelope.serialNo, {
            resolve: resolve,
            reject: reject,
            timer: timer,
        });
        mqttClient.publish(eventTopic(name), JSON.stringify(envelope), config.qos).catch(function (e) {
            const pending = pendingEvents.get(envelope.serialNo);
            if (pending) {
                pendingEvents.delete(envelope.serialNo);
                dxStd.clearTimeout(pending.timer);
                reject(e);
            }
        });
    });
}

/* ==================== 连接后流程与心跳 ==================== */

function startHeartbeat() {
    clearHeartbeat();
    if (!config.heartbeatEnabled || !mqttClient.isConnected()) {
        return;
    }
    heartbeatTimer = dxStd.setInterval(function () {
        publishEvent('heartbeat').catch(function (e) {
            dxLogger.error('mqtt_protocol heartbeat failed: ' + e.message);
        });
    }, config.heartbeatIntervalSec * 1000);
}

function scheduleSetupRetry() {
    if (setupRetryTimer !== null || !mqttClient.isConnected()) {
        return;
    }
    const retryIntervalMs = transportConfig.retryIntervalMs || 5000;
    setupRetryTimer = dxStd.setTimeout(function () {
        setupRetryTimer = null;
        setupConnection().catch(function (e) {
            dxLogger.error('mqtt_protocol setup retry failed: ' + e.message);
        });
    }, retryIntervalMs);
}

async function setupConnection() {
    if (!pendingConnectionInfo || !mqttClient.isConnected()) {
        return;
    }
    try {
        /*
         * 只有业务Topic订阅成功后，MQTT协议才算真正可用。连接成功但订阅
         * 失败时保持离线状态并定时重试，避免出现“在线但收不到命令”。
         */
        await subscribeTopics();
    } catch (e) {
        dxLogger.error('mqtt_protocol subscribe failed: ' + e.message);
        scheduleSetupRetry();
        return;
    }
    if (!mqttClient.isConnected()) {
        return;
    }

    const connectionInfo = pendingConnectionInfo;
    pendingConnectionInfo = null;
    clearSetupRetry();
    fireState(true, connectionInfo);
    startHeartbeat();
    dxLogger.info('mqtt_protocol ready: clientId=' + connectionInfo.clientId);
    // 连接上报失败不影响订阅状态和心跳，只记录本次失败。
    publishEvent('connect', Object.assign({
        clientId: connectionInfo.clientId,
    }, config.connectData)).catch(function (e) {
        dxLogger.error('mqtt_protocol connect report failed: ' + e.message);
    });
}

function onConnected(connectionInfo) {
    pendingConnectionInfo = connectionInfo;
    clearSetupRetry();
    setupConnection().catch(function (e) {
        dxLogger.error('mqtt_protocol connected workflow failed: ' + e.message);
    });
}

function rejectPendingEvents(cause) {
    const error = protocolError('100005', cause || '设备离线');
    pendingEvents.forEach(function (pending) {
        dxStd.clearTimeout(pending.timer);
        pending.reject(error);
    });
    pendingEvents.clear();
}

function onOffline(cause) {
    clearSetupRetry();
    pendingConnectionInfo = null;
    clearHeartbeat();
    rejectPendingEvents('MQTT连接已断开');
    fireState(false, cause);
    dxLogger.info('mqtt_protocol offline: ' + (cause || 'unknown'));
}

function onMessage(topic, payload) {
    handleMessage(topic, payload).catch(function (e) {
        dxLogger.error('mqtt_protocol message handling failed: ' + e.message);
    });
}

function onError(error) {
    dxLogger.error('mqtt_protocol transport error: ' + ((error && error.message) || String(error)));
}

/* ==================== 运行时配置更新 ==================== */

async function applyConfig(changes) {
    const values = changes || {};
    const next = Object.assign({}, config, values);
    if (Object.prototype.hasOwnProperty.call(values, 'timeout')) {
        next.eventTimeoutMs = values.timeout * 1000;
    }
    validateConfig(next);

    config = next;
    buildProtocolState(config);
    // onlinecheck / timeout 等不改传输参数：只更新本地协议状态，不重建连接。
    if (!isTransportPatch(values)) return;

    const transport = Object.assign({}, transportConfig);
    const transportKeys = ['addr', 'clientId', 'username', 'password', 'qos', 'cleanSession', 'clientIdSuffix'];
    for (let i = 0; i < transportKeys.length; i++) {
        const key = transportKeys[i];
        if (Object.prototype.hasOwnProperty.call(values, key)) transport[key] = values[key];
    }
    if (Object.prototype.hasOwnProperty.call(values, 'addr')) {
        transport.addr = normalizeMqttEndpoint(values.addr);
    }
    if (Object.prototype.hasOwnProperty.call(values, 'prefix')
        || Object.prototype.hasOwnProperty.call(values, 'willTopic')) {
        transport.willTopic = normalizePrefix(next.prefix) + String(next.willTopic || '').replace(/^\/+/, '');
        transport.willPayload = '';
    }

    transportConfig = transport;
    clearSetupRetry();
    clearHeartbeat();
    if (initialized) {
        rejectPendingEvents('MQTT配置正在更新');
        fireState(false, 'config_update');
        await mqttClient.updateConfig(transportConfig);
    }
}

/* ==================== 对外公开接口 ==================== */

const mqttProtocol = {};

mqttProtocol.init = async function (nextConfig) {
    if (initialized) {
        return;
    }
    const normalized = normalizeInitConfig(nextConfig);
    validateConfig(normalized.protocol);
    config = normalized.protocol;
    transportConfig = normalized.transport;

    /*
     * mqtt_client只有一个消费者，因此使用固定回调，不再维护第二套
     * on/off/once监听器。客户端重建时回调仍保存在mqtt_client模块内。
     */
    await mqttClient.init(transportConfig, {
        connected: onConnected,
        offline: onOffline,
        message: onMessage,
        error: onError,
        // 每次 CONNECT 现取遗嘱，保证 serialNo/time 随连接变化。
        willPayload: function () {
            if (!transportConfig.willTopic) return '';
            return JSON.stringify({
                serialNo: nextSerialNo(),
                uuid: deviceUuid,
                time: nowSeconds(),
                sign: '',
            });
        },
    });
    buildProtocolState(config);
    initialized = true;
};

/* 所有Service command handler注册完成后，才能开放业务Topic。 */
mqttProtocol.startRouting = async function () {
    assertInitialized();
    if (routingStarted) {
        return;
    }
    routingStarted = true;
    try {
        if (mqttClient.isConnected()) {
            pendingConnectionInfo = {
                clientId: mqttClient.getClientId(),
            };
            await setupConnection();
        }
    } catch (e) {
        routingStarted = false;
        throw e;
    }
};

mqttProtocol.updateConfig = async function (nextConfig) {
    if (activeRequests > 0) {
        pendingConfig = Object.assign({}, pendingConfig || {}, nextConfig || {});
        return;
    }
    await applyConfig(nextConfig || {});
};


mqttProtocol.updateSystemConfig = function (values) {
    assertInitialized();
    const next = values || {};
    if (Object.prototype.hasOwnProperty.call(next, 'heart_en')) {
        config.heartbeatEnabled = next.heart_en === 1;
    }
    if (Object.prototype.hasOwnProperty.call(next, 'heart_time')) {
        config.heartbeatIntervalSec = next.heart_time;
    }
    startHeartbeat();
};
mqttProtocol.reconnect = function () {
    assertInitialized();
    mqttClient.reconnect();
};

mqttProtocol.suspend = function () {
    assertInitialized();
    mqttClient.suspend();
};

mqttProtocol.reportAlarm = function (data) {
    return requestEvent('alarm', data);
};

mqttProtocol.verifyAccess = function (data) {
    return requestEvent('access_online', data);
};

mqttProtocol.reportWecom = function (data) {
    return requestEvent('wecom', data);
};

mqttProtocol.reportAccess = function (data, recordId) {
    return requestEvent('access', data, recordId);
};

mqttProtocol.getCallContacts = function () {
    return requestEvent('getCallList', undefined);
};

mqttProtocol.reportCall = function (data) {
    return requestEvent('call', data);
};

mqttProtocol.isConnected = function () {
    return mqttClient.isConnected();
};

mqttProtocol.getClientId = function () {
    return mqttClient.getClientId();
};

mqttProtocol.getUuid = function () {
    return deviceUuid;
};

mqttProtocol.isInitialized = function () {
    return initialized;
};

/** 关闭新入站Command；保留传输连接以完成已进入请求和事件ACK。 */
mqttProtocol.quiesce = async function () {
    if (!initialized) return;
    routingStarted = false;
    clearSetupRetry();
    clearHeartbeat();
    while (activeRequests > 0) {
        await new Promise(function (resolve) { dxStd.setTimeout(resolve, 10); });
    }
};

mqttProtocol.destroy = async function () {
    if (!initialized) {
        return;
    }
    routingStarted = false;
    clearSetupRetry();
    pendingConnectionInfo = null;
    clearHeartbeat();
    rejectPendingEvents('MQTT模块已销毁');
    pendingConfig = null;
    try {
        await mqttClient.destroy();
    } finally {
        routes.clear();
        transportConfig = {};
        mqttOnline = false;
        initialized = false;
    }
};

export default mqttProtocol;
