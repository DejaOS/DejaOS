/**
 * @layer domain
 * @module mqtt_domain
 * @depends storage/config,mqtt_protocol,dxStd,dxLogger
 */

import configStorage from '../storage/config/config.js';
import mqtt from '../protocols/mqtt/mqtt_protocol.js';
import dxStd from '../../dxmodules/dxStd.js';
import dxLogger from '../../dxmodules/dxLogger.js';

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
    else {
        /*
         * MQTT地址合法且成功落库后，连接是否立即建立属于运行时状态，不能反向
         * 判定为“配置保存失败”。本地UI先返回保存结果，再异步重建连接；失败由
         * mqtt_client受控重试，并通过连接状态和日志向外反馈。
         */
        dxStd.setTimeout(function () {
            try {
                const task = apply();
                if (task && typeof task.then === 'function') {
                    task.catch(function (e) {
                        dxLogger.error('mqtt_domain deferred apply failed: ' + e.message);
                    });
                }
            } catch (e) {
                dxLogger.error('mqtt_domain deferred apply failed: ' + e.message);
            }
        }, 50);
    }
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
