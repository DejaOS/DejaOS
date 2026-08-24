/**
 * @layer    domain
 * @module   alarm_domain
 * @depends  dxStd,dxLogger,storage/config,door_domain,audio_driver
 *
 * 火警/防拆报警音与火警状态；门磁仅由 Service 上报，不经本 Domain。
 */

import dxStd from '../../dxmodules/dxStd.js';
import dxLogger from '../../dxmodules/dxLogger.js';
import configStorage from '../storage/config/config.js';
import doorDomain from './door_domain.js';
import audioDriver from '../drivers/audio_driver.js';

const FIRE_WAV = '/app/code/resource/wav/alarm.wav';
const TAMPER_WAV = '/app/code/resource/wav/tamper.wav';
const FIRE_INTERVAL_MS = 4000;
const TAMPER_INTERVAL_MS = 8000;
const RESUME_FIRE_DELAY_MS = 5000;

let fireTimer = null;
let tamperTimer = null;
let resumeTimer = null;

function playSafe(path) {
    try {
        audioDriver.playWav(path);
    } catch (e) {
        dxLogger.error('alarm_domain play failed: ' + e.message);
    }
}

function stopAudioSafe() {
    try {
        if (audioDriver.isInitialized()) audioDriver.stop();
    } catch (e) {
        dxLogger.error('alarm_domain stop failed: ' + e.message);
    }
}

function clearFireTimer() {
    if (fireTimer !== null) {
        dxStd.clearInterval(fireTimer);
        fireTimer = null;
    }
}

function clearTamperTimer() {
    if (tamperTimer !== null) {
        dxStd.clearInterval(tamperTimer);
        tamperTimer = null;
    }
}

function clearResumeTimer() {
    if (resumeTimer !== null) {
        dxStd.clearTimeout(resumeTimer);
        resumeTimer = null;
    }
}

const alarmDomain = {};

// MQTT 协议报警类型。
alarmDomain.TYPE = {
    DOOR_SENSOR: 0,
    FIRE_ALARM: 1,
    TAMPER_ALARM: 2,
};

// 硬件 Linux input code（真机实测）。
alarmDomain.HW_CODE = {
    TAMPER_ALARM: 256,
    FIRE_ALARM: 257,
    DOOR_SENSOR: 258,
};

/** 硬件 code → 业务报警类型；无法识别返回 null。 */
alarmDomain.typeOfHwCode = function (hwCode) {
    const code = Number(hwCode);
    if (code === alarmDomain.HW_CODE.TAMPER_ALARM) return alarmDomain.TYPE.TAMPER_ALARM;
    if (code === alarmDomain.HW_CODE.FIRE_ALARM) return alarmDomain.TYPE.FIRE_ALARM;
    if (code === alarmDomain.HW_CODE.DOOR_SENSOR) return alarmDomain.TYPE.DOOR_SENSOR;
    return null;
};

/** 火警触发：落库状态、保持开门、循环报警音。 */
alarmDomain.triggerFire = async function () {
    if (Number(await configStorage.get('access.fire', 0)) !== 1) return false;
    await doorDomain.holdOpenForFire();
    if (fireTimer !== null) return true;
    playSafe(FIRE_WAV);
    fireTimer = dxStd.setInterval(async function () {
        try {
            if (Number(await configStorage.get('access.fire', 0)) === 1
                && Number(await configStorage.get('access.fireStatus', 0)) === 1) {
                playSafe(FIRE_WAV);
            } else {
                await alarmDomain.clearFireAlarm();
            }
        } catch (e) {
            dxLogger.error('alarm_domain fire loop failed: ' + e.message);
        }
    }, FIRE_INTERVAL_MS);
    return true;
};

/** 停止火警音（不改继电器/状态；解除火警用 clearFire）。 */
alarmDomain.clearFireAlarm = async function () {
    clearFireTimer();
    stopAudioSafe();
};

/** 解除火警：清状态、关门、停音。 */
alarmDomain.clearFire = async function () {
    await alarmDomain.clearFireAlarm();
    await doorDomain.releaseFire();
};

/** 防拆触发：循环报警音。 */
alarmDomain.triggerTamper = async function () {
    if (Number(await configStorage.get('access.tamper', 0)) !== 1) return false;
    if (tamperTimer !== null) return true;
    playSafe(TAMPER_WAV);
    tamperTimer = dxStd.setInterval(async function () {
        try {
            if (Number(await configStorage.get('access.tamper', 0)) === 1) {
                playSafe(TAMPER_WAV);
            } else {
                await alarmDomain.clearTamper();
            }
        } catch (e) {
            dxLogger.error('alarm_domain tamper loop failed: ' + e.message);
        }
    }, TAMPER_INTERVAL_MS);
    return true;
};

/** 防拆解除：停音。 */
alarmDomain.clearTamper = async function () {
    clearTamperTimer();
    stopAudioSafe();
    return true;
};

/** 防拆开关开启时才处理解除边沿。 */
alarmDomain.clearTamperIfEnabled = async function () {
    if (Number(await configStorage.get('access.tamper', 0)) !== 1) return false;
    await alarmDomain.clearTamper();
    return true;
};

/**
 * access 配置变更后的运行时副作用（落库由 config_service 完成）。
 * 关闭火警开关时清状态并停音关门；关闭防拆时停音。
 */
alarmDomain.applyAccessConfig = async function (values) {
    if (!values || typeof values !== 'object') return;
    if (Object.prototype.hasOwnProperty.call(values, 'fire') && Number(values.fire) === 0) {
        await alarmDomain.clearFire();
    }
    if (Object.prototype.hasOwnProperty.call(values, 'tamper') && Number(values.tamper) === 0) {
        await alarmDomain.clearTamper();
    }
};

/**
 * 启动时若火警未解除，延时回调 resume（由 Service 编排上报）。
 * @param {Function} resume
 */
alarmDomain.scheduleFireResume = async function (resume) {
    clearResumeTimer();
    if (Number(await configStorage.get('access.fire', 0)) !== 1) return;
    if (Number(await configStorage.get('access.fireStatus', 0)) !== 1) return;
    if (typeof resume !== 'function') return;
    resumeTimer = dxStd.setTimeout(function () {
        resumeTimer = null;
        Promise.resolve().then(resume).catch(function (e) {
            dxLogger.error('alarm_domain fire resume failed: ' + e.message);
        });
    }, RESUME_FIRE_DELAY_MS);
};

alarmDomain.destroy = async function () {
    clearResumeTimer();
    clearFireTimer();
    clearTamperTimer();
    stopAudioSafe();
};

export default alarmDomain;
