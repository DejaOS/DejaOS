/**
 * @layer services
 * @module state_service
 * @listens NETWORK_CHANGED,MQTT_CHANGED,NIR_PERSON_SAMPLED,INTERCOM_PRIMARY_INCOMING及本地设备活动事件
 * @depends event_bus,network_domain,mqtt_domain,time_domain,ui_domain,software_domain,display_domain,light_domain
 */

import eventBus from '../core/event_bus.js';
import events from '../core/events.js';
import commands from '../core/commands.js';
import networkDomain from '../domain/network_domain.js';
import mqttDomain from '../domain/mqtt_domain.js';
import timeDomain from '../domain/time_domain.js';
import uiDomain from '../domain/ui_domain.js';
import softwareDomain from '../domain/software_domain.js';
import displayDomain from '../domain/display_domain.js';
import lightDomain from '../domain/light_domain.js';
import logger from '../../dxmodules/dxLogger.js';
import diagLog from '../utils/diag_log.js';

let initialized = false;
let generation = 0;
const LOCAL_ACTIVITY_EVENTS = [
    events.CODE_SCANNED,
    events.CARD_SWIPED,
    events.EID_DETECTED,
    events.FINGER_TOUCHED,
    events.GPIO_KEY_PRESSED,
    events.INPUT_TRIGGERED,
    events.INTERCOM_PRIMARY_INCOMING,
];

function syncConnectionIcons() {
    try {
        const active = networkDomain.getActiveParams();
        uiDomain.setNetworkStatus(active.connected, active.netType);
        uiDomain.setDeviceIp(active.connected ? (active.ip || '') : '');
    } catch (e) {
        uiDomain.setNetworkStatus(false);
        uiDomain.setDeviceIp('');
        logger.error('state_service sync network icon failed: ' + e.message);
    }
    try {
        uiDomain.setMqttStatus(mqttDomain.isConnected());
    } catch (e) {
        uiDomain.setMqttStatus(false);
        logger.error('state_service sync mqtt icon failed: ' + e.message);
    }
}

function onNetChanged(payload) {
    if (!payload || !payload.current || typeof payload.current.connected !== 'boolean') return;
    diagLog.info('state_service', 'network_changed', {
        connected: payload.current.connected,
        net_type: payload.current.netType,
    });
    const run = generation;
    const active = networkDomain.getActiveParams();
    uiDomain.setNetworkStatus(payload.current.connected, payload.current.netType);
    uiDomain.setDeviceIp(payload.current.connected ? (active.ip || '') : '');
    if (payload.current.connected) {
        networkDomain.syncActiveParams().then(function (next) {
            if (initialized && run === generation) uiDomain.setDeviceIp(next.ip || '');
        }).catch(function (e) {
            logger.error('state_service syncActiveParams failed: ' + e.message);
        });
        mqttDomain.reconnect();
        timeDomain.sync();
        return;
    }
    uiDomain.setMqttStatus(false);
    mqttDomain.suspend();
    timeDomain.suspend();
}

function onMqttChanged(payload) {
    if (!payload || !payload.current || typeof payload.current.connected !== 'boolean') return;
    diagLog.info('state_service', 'mqtt_changed', {
        connected: payload.current.connected,
    });
    uiDomain.setMqttStatus(payload.current.connected);
}

function onLocalActivity() {
    try {
        displayDomain.setAwake(true);
        uiDomain.notifyActivity();
    } catch (e) {
        logger.error('state_service wake local activity failed: ' + e.message);
    }
}

function onNirPersonSample(payload) {
    if (!payload) return;
    // count 为 null：不推进无人计数；连续失败由 light_domain 自行清在场。
    lightDomain.updatePresence(payload.count, payload.brightness);
    /*
     * NIR是周期采样，不是一次性用户操作。仅在息屏或屏保覆盖层可见时
     * 唤醒；主页亮屏时不反复刷新空闲计时，避免屏保永远无法进入。
     */
    const idleOverlayVisible = uiDomain.isIdleOverlayVisible();
    if (Number(payload.count) > 0 && (!displayDomain.isAwake() || idleOverlayVisible)) {
        logger.info((idleOverlayVisible ? 'screensaver' : 'screen_off') + ' woke by nir');
        onLocalActivity();
    }
}

const stateService = {};

stateService.init = async function () {
    if (initialized) return;
    await lightDomain.syncRuntime();
    generation++;
    initialized = true;
    try {
        eventBus.on(events.NETWORK_CHANGED, onNetChanged);
        eventBus.on(events.MQTT_CHANGED, onMqttChanged);
        eventBus.registerCommand(commands.GET_MQTT_STATUS, function () {
            return {
                connected: mqttDomain.isConnected(),
                clientId: mqttDomain.getRuntimeConfig()['mqtt.clientId'] || '',
            };
        });
        eventBus.on(events.NIR_PERSON_SAMPLED, onNirPersonSample);
        for (let i = 0; i < LOCAL_ACTIVITY_EVENTS.length; i++) {
            eventBus.on(LOCAL_ACTIVITY_EVENTS[i], onLocalActivity);
        }
        uiDomain.setDeviceSn(softwareDomain.getRuntimeConfig()['sys.sn'] || '');
        syncConnectionIcons();
        try {
            const active = networkDomain.getActiveParams();
            if (active.connected) await networkDomain.syncActiveParams();
        } catch (e) {
            logger.error('state_service init syncActiveParams failed: ' + e.message);
        }
    } catch (e) {
        await stateService.destroy();
        throw e;
    }
};
stateService.isInitialized = function () {
    return initialized;
};

stateService.destroy = async function () {
    if (!initialized) return;
    initialized = false;
    generation++;
    eventBus.off(events.NETWORK_CHANGED, onNetChanged);
    eventBus.off(events.MQTT_CHANGED, onMqttChanged);
    eventBus.unregisterCommand(commands.GET_MQTT_STATUS);
    eventBus.off(events.NIR_PERSON_SAMPLED, onNirPersonSample);
    for (let i = 0; i < LOCAL_ACTIVITY_EVENTS.length; i++) {
        eventBus.off(LOCAL_ACTIVITY_EVENTS[i], onLocalActivity);
    }
};

export default stateService;
