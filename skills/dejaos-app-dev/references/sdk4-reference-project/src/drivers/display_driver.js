/**
 * @layer    drivers
 * @module   display_driver
 * @fires    none
 * @listens  none
 * @depends  dxDisplay
 */

import dxDisplay from '../../dxmodules/dxDisplay.js';

const DEFAULT_CONFIG = {
    backlight: 70,
    options: {},
};

let config = Object.assign({}, DEFAULT_CONFIG);
let initialized = false;
let awake = true;

function validateConfig(value) {
    if (typeof value.backlight !== 'number' || value.backlight < 0 || value.backlight > 100) {
        throw new RangeError('display_driver: backlight must be a number in range [0, 100]');
    }
    if (!value.options || typeof value.options !== 'object' || Array.isArray(value.options)) {
        throw new TypeError('display_driver: options must be an object');
    }
}

function assertInitialized() {
    if (!initialized) {
        throw new Error('display_driver: module is not initialized');
    }
}

const displayDriver = {
    POWER_MODE: {
        NORMAL: 0,
        STANDBY: 1,
    },
};

displayDriver.init = async function (nextConfig) {
    if (initialized) {
        return;
    }
    const next = Object.assign({}, DEFAULT_CONFIG, nextConfig || {});
    validateConfig(next);
    dxDisplay.init(next.options);
    try {
        dxDisplay.setBacklight(next.backlight);
    } catch (e) {
        dxDisplay.deinit();
        throw e;
    }
    config = next;
    awake = true;
    initialized = true;
};

displayDriver.updateConfig = async function (nextConfig) {
    const next = Object.assign({}, config, nextConfig || {});
    validateConfig(next);
    if (initialized && next.options !== config.options) {
        await displayDriver.destroy();
        await displayDriver.init(next);
        return;
    }
    // 息屏期间只更新“唤醒后亮度”，不能因配置修改意外点亮屏幕。
    if (initialized && awake && next.backlight !== config.backlight) {
        dxDisplay.setBacklight(next.backlight);
    }
    config = next;
};

displayDriver.getBacklight = function () {
    assertInitialized();
    return dxDisplay.getBacklight();
};

displayDriver.setBacklight = function (backlight) {
    assertInitialized();
    const next = Object.assign({}, config, { backlight: backlight });
    validateConfig(next);
    if (awake) {
        dxDisplay.setBacklight(backlight);
    }
    config = next;
};

/**
 * 息屏只关闭背光，不销毁Display和图像Pipeline；唤醒恢复已配置亮度。
 * @param {boolean} nextAwake
 */
displayDriver.setAwake = function (nextAwake) {
    assertInitialized();
    const next = nextAwake === true;
    if (awake === next) return;
    dxDisplay.setBacklight(next ? config.backlight : 0);
    awake = next;
};

displayDriver.isAwake = function () {
    assertInitialized();
    return awake;
};

displayDriver.getEnableStatus = function () {
    assertInitialized();
    return dxDisplay.getEnableStatus();
};

displayDriver.setEnableStatus = function (enabled) {
    assertInitialized();
    return dxDisplay.setEnableStatus(enabled);
};

displayDriver.getPowerMode = function () {
    assertInitialized();
    return dxDisplay.getPowerMode();
};

displayDriver.setPowerMode = function (mode) {
    assertInitialized();
    return dxDisplay.setPowerMode(mode);
};

displayDriver.isInitialized = function () {
    return initialized;
};

displayDriver.destroy = async function () {
    if (!initialized) {
        return;
    }
    dxDisplay.deinit();
    awake = true;
    initialized = false;
};

export default displayDriver;
