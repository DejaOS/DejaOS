/**
 * @layer    services
 * @module   alarm_service
 * @listens  GPIO_KEY_PRESSED
 * @depends  event_bus,events,dxLogger,alarm/mqtt domains
 *
 * 门磁 / 火警 / 防拆：听 GPIO Key 事实事件，编排本地动作与 MQTT 报警上报。
 */

import logger from '../../dxmodules/dxLogger.js';
import eventBus from '../core/event_bus.js';
import events from '../core/events.js';
import alarmDomain from '../domain/alarm_domain.js';
import mqttDomain from '../domain/mqtt_domain.js';

let initialized = false;

async function reportAlarm(type, value) {
    try {
        await mqttDomain.reportAlarm({ type: type, value: value });
    } catch (e) {
        // 上报失败不回滚本地报警动作。
        logger.info('alarm_service report pending: ' + e.message);
    }
}

async function handleDoorSensor(value) {
    await reportAlarm(alarmDomain.TYPE.DOOR_SENSOR, value);
}

async function handleFire(value) {
    // 仅处理触发沿；解除走配置关闭。
    if (value !== 1) return;
    const triggered = await alarmDomain.triggerFire();
    if (triggered) await reportAlarm(alarmDomain.TYPE.FIRE_ALARM, value);
}

async function handleTamper(value) {
    let changed = false;
    if (value === 1) {
        changed = await alarmDomain.triggerTamper();
    } else {
        changed = await alarmDomain.clearTamperIfEnabled();
    }
    if (changed) await reportAlarm(alarmDomain.TYPE.TAMPER_ALARM, value);
}

async function onGpioKey(payload) {
    const hwCode = payload ? Number(payload.code) : NaN;
    const value = payload ? Number(payload.value) : NaN;
    if (!Number.isInteger(hwCode) || (value !== 0 && value !== 1)) return;
    const type = alarmDomain.typeOfHwCode(hwCode);
    if (type === null) return;
    try {
        if (type === alarmDomain.TYPE.DOOR_SENSOR) {
            await handleDoorSensor(value);
        } else if (type === alarmDomain.TYPE.FIRE_ALARM) {
            await handleFire(value);
        } else if (type === alarmDomain.TYPE.TAMPER_ALARM) {
            await handleTamper(value);
        }
    } catch (e) {
        logger.error('alarm_service gpio key handle failed: ' + e.message);
    }
}

const alarmService = {};

alarmService.init = async function () {
    if (initialized) return;
    try {
        eventBus.on(events.GPIO_KEY_PRESSED, onGpioKey);
        initialized = true;
        // 重启后若火警未解除，延时恢复开门、播音并上报。
        alarmDomain.scheduleFireResume(function () {
            return handleFire(1);
        }).catch(function (e) {
            logger.error('alarm_service fire resume schedule failed: ' + e.message);
        });
    } catch (e) {
        await alarmService.destroy();
        throw e;
    }
};

alarmService.destroy = async function () {
    eventBus.off(events.GPIO_KEY_PRESSED, onGpioKey);
    await alarmDomain.destroy();
    initialized = false;
};

export default alarmService;
