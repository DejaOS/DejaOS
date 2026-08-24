/**
 * @layer domain
 * @module mqtt_domain
 * @depends storage/config,mqtt_protocol
 */

import configStorage from '../storage/config/config.js';
import mqtt from '../protocols/mqtt/mqtt_protocol.js';

const mqttDomain = {};

mqttDomain.isOnlineVerifyEnabled = async function () {
    const values = await configStorage.getGroup('mqtt');
    return Number(values.onlinecheck) === 1;
};

mqttDomain.getConfig = async function () {
    return await configStorage.getGroup('mqtt');
};

mqttDomain.setConfig = async function (values, context) {
    await configStorage.setGroup('mqtt', values);
    const apply = function () { return mqtt.updateConfig(values); };
    // 修改当前MQTT连接参数时必须先完成本次请求回包。
    if (context && typeof context.afterResponse === 'function') context.afterResponse(apply);
    else await apply();
    return await mqttDomain.getConfig();
};

mqttDomain.setSystemConfig = async function (values, context) {
    await configStorage.setGroup('sys', values);
    const apply = function () { return mqtt.updateSystemConfig(values); };
    if (context && typeof context.afterResponse === 'function') context.afterResponse(apply);
    else await apply();
    return await configStorage.getGroup('sys');
};

/** 只改运行时连接地址，不落库（企微激活后切到 weComMqttAddr 用）。 */
mqttDomain.useBrokerAddr = async function (addr, context) {
    if (!addr) return;
    const apply = function () { return mqtt.updateConfig({ addr: String(addr) }); };
    if (context && typeof context.afterResponse === 'function') context.afterResponse(apply);
    else await apply();
};

mqttDomain.getRuntimeConfig = function () {
    return { 'mqtt.clientId': mqtt.getClientId() || '' };
};

mqttDomain.reconnect = function () {
    mqtt.reconnect();
};

mqttDomain.suspend = function () {
    mqtt.suspend();
};

mqttDomain.isConnected = function () {
    return mqtt.isConnected();
};

mqttDomain.reportAlarm = function (data) {
    return mqtt.reportAlarm(data);
};

mqttDomain.verifyAccess = function (data) {
    return mqtt.verifyAccess(data);
};

mqttDomain.reportWecom = function (data) {
    return mqtt.reportWecom(data);
};

mqttDomain.reportAccess = function (data, recordId) {
    return mqtt.reportAccess(data, recordId);
};

mqttDomain.getCallContacts = function () {
    return mqtt.getCallContacts();
};

mqttDomain.reportCall = function (data) {
    return mqtt.reportCall(data);
};

export default mqttDomain;
