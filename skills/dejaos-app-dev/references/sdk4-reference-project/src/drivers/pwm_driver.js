/**
 * @layer    drivers
 * @module   pwm_driver
 * @fires    none
 * @listens  none
 * @depends  dxPwm,dxDriver
 */

import dxPwm from '../../dxmodules/dxPwm.js';
import dxDriver from '../../dxmodules/dxDriver.js';

let initialized = false;
const resources = new Map();
let lightConfig = {
    brightness: 70,
    nirBrightness: 80,
};


function assertInitialized() {
    if (!initialized) {
        throw new Error('pwm_driver: module is not initialized');
    }
}

function getResource(channel) {
    assertInitialized();
    const resource = resources.get(channel);
    if (!resource) {
        throw new Error('pwm_driver: channel is not open, channel=' + channel);
    }
    return resource;
}

function saveResource(channel, resource) {
    if (resources.has(channel)) {
        resource.close();
        throw new Error('pwm_driver: channel already open, channel=' + channel);
    }
    resources.set(channel, resource);
    return resource;
}

function validatePower(name, value) {
    if (!Number.isInteger(value) || value < 0 || value > 100) {
        throw new RangeError('pwm_driver: ' + name + ' must be an integer from 0 to 100');
    }
    return value;
}

function dutyOf(power, periodNs, inverted) {
    // VF105补光输出为低电平有效：配置100%时占空比为0，配置0%时占空比为完整周期。
    const ratio = inverted ? 100 - power : power;
    return Math.max(0, Math.min(periodNs, Math.round(periodNs * ratio / 100)));
}

function openLight(channel, periodNs, inverted, power) {
    return saveResource(channel, dxPwm.openWith(
        channel,
        true,
        periodNs,
        dutyOf(power, periodNs, inverted)
    ));
}

const pwmDriver = {
    PWM: dxDriver.PWM,
};

pwmDriver.init = async function (options) {
    if (initialized) return;
    const pwm = dxDriver.PWM;
    const next = Object.assign({}, lightConfig, options || {});
    validatePower('brightness', next.brightness);
    validatePower('nirBrightness', next.nirBrightness);

    try {
        openLight(
            pwm.WHITE_SUPPLEMENT_CHANNEL,
            pwm.WHITE_SUPPLEMENT_PERIOD_NS,
            pwm.WHITE_SUPPLEMENT_INVERT,
            next.brightness
        );
        openLight(
            pwm.NIR_SUPPLEMENT_CHANNEL,
            pwm.NIR_SUPPLEMENT_PERIOD_NS,
            pwm.NIR_SUPPLEMENT_INVERT,
            next.nirBrightness
        );
        lightConfig = next;
        initialized = true;
    } catch (e) {
        resources.forEach(function (resource) {
            try { resource.close(); } catch (ignored) {}
        });
        resources.clear();
        throw e;
    }
};

pwmDriver.setWhitePower = function (power) {
    const value = validatePower('brightness', power);
    const pwm = dxDriver.PWM;
    getResource(pwm.WHITE_SUPPLEMENT_CHANNEL).setDuty(dutyOf(
        value, pwm.WHITE_SUPPLEMENT_PERIOD_NS, pwm.WHITE_SUPPLEMENT_INVERT
    ));
    lightConfig.brightness = value;
};

pwmDriver.setNirPower = function (power) {
    const value = validatePower('nirBrightness', power);
    const pwm = dxDriver.PWM;
    getResource(pwm.NIR_SUPPLEMENT_CHANNEL).setDuty(dutyOf(
        value, pwm.NIR_SUPPLEMENT_PERIOD_NS, pwm.NIR_SUPPLEMENT_INVERT
    ));
    lightConfig.nirBrightness = value;
};

pwmDriver.updateConfig = async function (values) {
    if (Object.prototype.hasOwnProperty.call(values, 'brightness')) {
        pwmDriver.setWhitePower(values.brightness);
    }
    if (Object.prototype.hasOwnProperty.call(values, 'nirBrightness')) {
        pwmDriver.setNirPower(values.nirBrightness);
    }
};

pwmDriver.getConfig = function () {
    assertInitialized();
    return Object.assign({}, lightConfig);
};

pwmDriver.open = function (channel) {
    assertInitialized();
    if (resources.has(channel)) {
        throw new Error('pwm_driver.open: channel already open, channel=' + channel);
    }
    return saveResource(channel, dxPwm.open(channel));
};

pwmDriver.openWith = function (channel, enabled, periodNs, dutyNs) {
    assertInitialized();
    if (resources.has(channel)) {
        throw new Error('pwm_driver.openWith: channel already open, channel=' + channel);
    }
    return saveResource(channel, dxPwm.openWith(channel, enabled, periodNs, dutyNs));
};

pwmDriver.configure = function (channel, enabled, periodNs, dutyNs) {
    return getResource(channel).configure(enabled, periodNs, dutyNs);
};

pwmDriver.setPeriod = function (channel, periodNs) {
    return getResource(channel).setPeriod(periodNs);
};

pwmDriver.setDuty = function (channel, dutyNs) {
    return getResource(channel).setDuty(dutyNs);
};

pwmDriver.enable = function (channel) {
    return getResource(channel).enable();
};

pwmDriver.disable = function (channel) {
    return getResource(channel).disable();
};

pwmDriver.close = function (channel) {
    const resource = getResource(channel);
    resource.close();
    resources.delete(channel);
};

pwmDriver.isOpen = function (channel) {
    return resources.has(channel);
};

pwmDriver.isInitialized = function () {
    return initialized;
};

pwmDriver.destroy = async function () {
    if (!initialized) {
        return;
    }
    let firstError = null;
    resources.forEach(function (resource) {
        try {
            resource.close();
        } catch (e) {
            firstError = firstError || e;
        }
    });
    resources.clear();
    initialized = false;
    if (firstError) {
        throw firstError;
    }
};

export default pwmDriver;
