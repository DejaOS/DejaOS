/** @layer domain @module door_domain @depends gpio_driver,storage/config,os */

import * as os from 'os';
import gpioDriver from '../drivers/gpio_driver.js';
import configStorage from '../storage/config/config.js';

let closeTimer = null;
let closeGeneration = 0;
let scheduleMode = 'normal';

function clearCloseTimer() {
    if (closeTimer !== null) os.clearTimeout(closeTimer);
    closeTimer = null;
    // 使已经进入事件队列的旧回调失效，避免重复开门后被旧任务提前关门。
    closeGeneration++;
}

function ensureRelay() {
    const relay = gpioDriver.GPIO.RELAY0;
    if (!gpioDriver.isOpen(relay)) {
        // 4.0 GPIO不会在setValue时自动切换方向；继电器必须显式初始化为低电平输出。
        gpioDriver.open(relay, { mode: gpioDriver.MODE.OUTPUT0, value: 0 });
    }
    return relay;
}

const doorDomain = {};

doorDomain.open = async function () {
    if (scheduleMode === 'open') {
        gpioDriver.setValue(ensureRelay(), 1);
        return true;
    }
    const relay = ensureRelay();
    gpioDriver.setValue(relay, 1);
    const seconds = Number(await configStorage.get('access.relayTime', 3));
    const delay = Number.isFinite(seconds) && seconds > 0 ? seconds * 1000 : 3000;
    if (closeTimer !== null) os.clearTimeout(closeTimer);
    const generation = ++closeGeneration;
    closeTimer = os.setTimeout(async function () {
        if (generation !== closeGeneration) return;
        closeTimer = null;
        try {
            const fireStatus = await configStorage.get('access.fireStatus', 0);
            // 读取配置期间可能再次开门；旧回调必须再次确认代次后才能操作继电器。
            if (generation === closeGeneration && fireStatus === 0 && scheduleMode !== 'open') {
                gpioDriver.setValue(relay, 0);
            }
        } catch (_e) {}
    }, delay);
    return true;
};

doorDomain.close = async function () {
    if (await configStorage.get('access.fireStatus', 0) !== 0) return false;
    clearCloseTimer();
    gpioDriver.setValue(ensureRelay(), scheduleMode === 'open' ? 1 : 0);
    return scheduleMode !== 'open';
};

/** 应用时段期望状态；消防状态存在时只记录期望值，解除消防后再恢复。 */
doorDomain.setScheduleMode = async function (mode) {
    if (mode !== 'normal' && mode !== 'open' && mode !== 'closed') {
        throw new RangeError('door_domain: invalid schedule mode ' + mode);
    }
    const changed = scheduleMode !== mode;
    scheduleMode = mode;
    if (Number(await configStorage.get('access.fireStatus', 0)) !== 0) return changed;
    // 远程开门的自动关闭窗口高于计划状态；时段切换只更新期望值，不提前关门。
    if (closeTimer !== null) return changed;
    clearCloseTimer();
    gpioDriver.setValue(ensureRelay(), scheduleMode === 'open' ? 1 : 0);
    return changed;
};

doorDomain.getScheduleMode = function () {
    return scheduleMode;
};

/** 火警保持开门：置位 fireStatus 并吸合继电器（不受通行自动关门影响）。 */
doorDomain.holdOpenForFire = async function () {
    await configStorage.set('access.fireStatus', 1);
    gpioDriver.setValue(ensureRelay(), 1);
    return true;
};

/** 火警解除：清 fireStatus 并关闭继电器。 */
doorDomain.releaseFire = async function () {
    await configStorage.set('access.fireStatus', 0);
    clearCloseTimer();
    gpioDriver.setValue(ensureRelay(), scheduleMode === 'open' ? 1 : 0);
    return true;
};

doorDomain.destroy = async function () {
    clearCloseTimer();
    scheduleMode = 'normal';
    const relay = gpioDriver.GPIO.RELAY0;
    if (gpioDriver.isInitialized() && gpioDriver.isOpen(relay) &&
        await configStorage.get('access.fireStatus', 0) === 0) {
        gpioDriver.setValue(relay, 0);
    }
};

export default doorDomain;
