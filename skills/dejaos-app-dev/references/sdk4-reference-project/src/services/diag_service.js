/**
 * @layer services
 * @module diag_service
 * @listens CMD_PING_HOST,CMD_RUN_NETWORK_DIAG,CMD_GET_WEBRTC_STATUS,CMD_PREPARE_LOG_EXPORT,CMD_GET_FACE_DIAG_STATUS,CMD_SET_FACE_DIAG_STATUS
 * @depends event_bus,commands,network_domain,mqtt_domain,intercom_domain,software_domain,diag_domain,log_domain,face_domain,core/error
 */

import eventBus from '../core/event_bus.js';
import commands from '../core/commands.js';
import networkDomain from '../domain/network_domain.js';
import mqttDomain from '../domain/mqtt_domain.js';
import intercomDomain from '../domain/intercom_domain.js';
import softwareDomain from '../domain/software_domain.js';
import diagDomain from '../domain/diag_domain.js';
import logDomain from '../domain/log_domain.js';
import faceDomain from '../domain/face_domain.js';
import { AppError } from '../core/error.js';

const EXTERNAL_TARGET = '223.5.5.5';
const DNS_FALLBACK_TARGET = 'www.baidu.com';
let initialized = false;
let activeKey = '';
let activeTask = null;

function dataOf(request) {
    return request && Object.prototype.hasOwnProperty.call(request, 'data') ? request.data : request;
}

function singleFlight(key, factory) {
    if (activeTask) {
        if (activeKey === key) return activeTask;
        throw new AppError('300000', '已有网络诊断任务正在执行');
    }
    activeKey = key;
    activeTask = Promise.resolve().then(factory);
    return activeTask.finally(function () {
        activeKey = '';
        activeTask = null;
    });
}

function item(key, target, status, detail) {
    return Object.assign({ key: key, target: target || '', status: status }, detail || {});
}

async function pingItem(key, target) {
    if (!target) return item(key, '', 'skipped', { message: '缺少检测目标' });
    const result = await diagDomain.ping(target, 1);
    return item(key, target, result.success ? 'success' : 'failed', result);
}

async function getWebrtcInfo() {
    const caps = softwareDomain.getCapabilities();
    if (!caps.intercom) {
        const config = await intercomDomain.getConfig();
        return {
            enabled: false,
            connected: false,
            status: 'UNAVAILABLE',
            server: config.server || '',
            port: config.port || 0,
            serno: '',
        };
    }
    return await intercomDomain.getServiceInfo();
}

async function diagnose() {
    const startedAt = Date.now();
    const network = networkDomain.getActiveParams();
    const mqttConfig = await mqttDomain.getConfig();
    const webrtc = await getWebrtcInfo();
    const mqttHost = diagDomain.endpointHost(mqttConfig.addr);
    const dnsTarget = (!diagDomain.isIpv4(webrtc.server) && webrtc.server)
        || (!diagDomain.isIpv4(mqttHost) && mqttHost)
        || DNS_FALLBACK_TARGET;
    const items = [];

    if (!network.connected) {
        items.push(item('gateway', network.gateway, 'skipped', { message: '设备网络未连接' }));
        items.push(item('internet', EXTERNAL_TARGET, 'skipped', { message: '设备网络未连接' }));
        items.push(item('dns', dnsTarget, 'skipped', { message: '设备网络未连接' }));
    } else {
        items.push(await pingItem('gateway', network.gateway));
        items.push(await pingItem('internet', EXTERNAL_TARGET));
        const resolved = await diagDomain.resolve(dnsTarget);
        items.push(item('dns', dnsTarget, resolved.success ? 'success' : 'failed', resolved));
    }

    items.push(item('mqtt', mqttConfig.addr || '', mqttDomain.isConnected() ? 'success' : 'failed', {
        connected: mqttDomain.isConnected(),
        message: mqttDomain.isConnected() ? '' : 'MQTT服务未连接',
    }));
    items.push(item('webrtc', webrtc.server ? webrtc.server + ':' + webrtc.port : '',
        !webrtc.enabled ? 'skipped' : (webrtc.connected ? 'success' : 'failed'), {
            connected: webrtc.connected,
            message: !webrtc.enabled ? '设备未安装可视对讲模块' : (webrtc.connected ? '' : 'WebRTC服务未连接'),
        }));

    let failed = 0;
    let warning = 0;
    for (let i = 0; i < items.length; i++) {
        if (items[i].status === 'failed') failed += 1;
        else if (items[i].status === 'warning') warning += 1;
    }
    return {
        startedAt: startedAt,
        durationMs: Date.now() - startedAt,
        overall: failed ? 'failed' : (warning ? 'warning' : 'success'),
        network: network,
        items: items,
    };
}

const diagService = {};

diagService.init = async function () {
    if (initialized) return;
    eventBus.registerCommand(commands.PING_HOST, function (request) {
        const data = dataOf(request) || {};
        const target = diagDomain.normalizeTarget(data.target);
        return singleFlight('ping:' + target, function () { return diagDomain.ping(target, 3); });
    });
    eventBus.registerCommand(commands.RUN_NETWORK_DIAG, function () {
        return singleFlight('diagnosis', diagnose);
    });
    eventBus.registerCommand(commands.GET_WEBRTC_STATUS, getWebrtcInfo);
    eventBus.registerCommand(commands.PREPARE_LOG_EXPORT, function () {
        return logDomain.prepare();
    });
    eventBus.registerCommand(commands.GET_FACE_DIAG_STATUS, function () {
        return faceDomain.getDiagnosticStatus();
    });
    eventBus.registerCommand(commands.SET_FACE_DIAG_STATUS, function (request) {
        const data = dataOf(request) || {};
        return faceDomain.setDiagnosticEnabled(data.enabled === true);
    });
    initialized = true;
};

diagService.destroy = async function () {
    if (!initialized) return;
    eventBus.unregisterCommand(commands.PING_HOST);
    eventBus.unregisterCommand(commands.RUN_NETWORK_DIAG);
    eventBus.unregisterCommand(commands.GET_WEBRTC_STATUS);
    eventBus.unregisterCommand(commands.PREPARE_LOG_EXPORT);
    eventBus.unregisterCommand(commands.GET_FACE_DIAG_STATUS);
    eventBus.unregisterCommand(commands.SET_FACE_DIAG_STATUS);
    faceDomain.setDiagnosticEnabled(false);
    activeKey = '';
    activeTask = null;
    initialized = false;
};

export default diagService;
