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

let fireTimer = null;
let tamperTimer = null;

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

const alarmDomain = {};

// 报警类型即硬件 Linux input code（与 MQTT alarm.data.type 同值）。
// 协议仅公开门磁/火警；防拆码保留供本地处理。
alarmDomain.TYPE = {
    DOOR_SENSOR: 256,
    FIRE_ALARM: 257,
    TAMPER_ALARM: 258,
};

/** 硬件 code → 报警类型；无法识别返回 null。 */
alarmDomain.typeOfHwCode = function (hwCode) {
    const code = Number(hwCode);
    if (code === alarmDomain.TYPE.DOOR_SENSOR) return code;
    if (code === alarmDomain.TYPE.FIRE_ALARM) return code;
    if (code === alarmDomain.TYPE.TAMPER_ALARM) return code;
    return null;
};

/**
 * 火警触发（锁存）：落库预警状态、保持开门、循环报警音；需手动解除。
 * GPIO 路径须火警开关已开；Web/MQTT 将 fireStatus 置预警时不检查开关。
 */
alarmDomain.triggerFire = async function (options) {
    const requireSwitch = !(options && options.requireSwitch === false);
    if (requireSwitch && Number(await configStorage.get('access.fire', 0)) !== 1) return false;
    await doorDomain.holdOpenForFire();
    if (fireTimer !== null) return true;
    playSafe(FIRE_WAV);
    fireTimer = dxStd.setInterval(async function () {
        try {
            if (Number(await configStorage.get('access.fireStatus', 0)) === 1) {
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
 * - 关闭火警开关，或手动将 fireStatus 置 0（正常）：停音、清状态、关门
 * - 手动将 fireStatus 置 1（预警）：锁存播音并保持开门（不依赖火警开关）
 * - 同包既关开关又置预警时：关开关优先，不得留下「开关关着却在火警态」
 * - 关闭防拆：停防拆音
 */
alarmDomain.applyAccessConfig = async function (values) {
    if (!values || typeof values !== 'object') return;
    const fireSwitchOff = Object.prototype.hasOwnProperty.call(values, 'fire')
        && Number(values.fire) === 0;
    if (fireSwitchOff) {
        await alarmDomain.clearFire();
    }
    if (Object.prototype.hasOwnProperty.call(values, 'fireStatus')) {
        if (Number(values.fireStatus) === 0) {
            await alarmDomain.clearFire();
        } else if (Number(values.fireStatus) === 1 && !fireSwitchOff) {
            await alarmDomain.triggerFire({ requireSwitch: false });
        }
    }
    if (Object.prototype.hasOwnProperty.call(values, 'tamper') && Number(values.tamper) === 0) {
        await alarmDomain.clearTamper();
    }
};

/**
 * 启动时清掉残留 fireStatus，避免历史火警在重启后反复播音。
 * 运行中火警由 GPIO 边沿重新触发。
 */
alarmDomain.clearStaleFireOnBoot = async function () {
    if (Number(await configStorage.get('access.fireStatus', 0)) !== 1) return;
    await alarmDomain.clearFire();
};

alarmDomain.destroy = async function () {
    clearFireTimer();
    clearTamperTimer();
    stopAudioSafe();
};

export default alarmDomain;
