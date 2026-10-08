/** @layer domain @module light_domain @depends pwm_driver,storage/config */

import pwmDriver from '../drivers/pwm_driver.js';
import configStorage from '../storage/config/config.js';

const WHITE_MODE = Object.freeze({ AUTO: 0, ON: 1, OFF: 2 });
/** 连续无人采样次数达到后熄灯，防止 NIR 抖动。 */
const ZERO_CLEAR_SAMPLES = 3;
/** NIR 采样连续失败达到后清在场，避免人数接口挂死导致白光常亮。 */
const FAIL_CLEAR_SAMPLES = 5;
let runtimeConfig = { whiteLightMode: WHITE_MODE.AUTO, brightness: 70, nirBrightness: 80 };
let personCount = 0;
let zeroSamples = 0;
let failedSamples = 0;
let environmentBrightness = null;
let lastWhitePower = null;

function normalizeConfig(base) {
    return {
        whiteLightMode: Number(base.whiteLightMode),
        brightness: Number(base.brightness),
        nirBrightness: Number(base.nirBrightness),
    };
}

/**
 * 根据环境光计算自动模式白光功率；环境越暗功率越高，上限为配置亮度。
 * @param {number} env 0–100，越大越亮
 * @param {number} maxBrightness
 * @returns {number}
 */
function autoWhitePower(env, maxBrightness) {
    const maxPower = Math.max(0, Math.min(100, Math.round(Number(maxBrightness) || 0)));
    if (!Number.isFinite(env) || maxPower <= 0) return 0;
    // 量程外视为采样异常，有人时按配置亮度补光，避免被错误夹成“全亮→功率0”
    if (env < 0 || env > 100) return maxPower;
    return Math.round(maxPower * (100 - env) / 100);
}

function applyWhitePower() {
    if (!pwmDriver.isInitialized()) return null;
    let power = 0;
    if (runtimeConfig.whiteLightMode === WHITE_MODE.ON) {
        power = runtimeConfig.brightness;
    } else if (runtimeConfig.whiteLightMode === WHITE_MODE.AUTO && personCount > 0) {
        if (Number.isFinite(environmentBrightness)) {
            power = autoWhitePower(environmentBrightness, runtimeConfig.brightness);
        } else {
            // 环境光尚未采样时，有人先按配置亮度补光，避免一直不亮
            power = runtimeConfig.brightness;
        }
    }
    power = Math.max(0, Math.min(100, Math.round(Number(power) || 0)));
    if (lastWhitePower !== power) {
        pwmDriver.setWhitePower(power);
        lastWhitePower = power;
    }
    return power;
}

/** 临时红外覆盖：标定等场景改功率后恢复，不落配置库。 */
let nirOverrideActive = false;
let nirOverrideSaved = null;

const lightDomain = {};
lightDomain.WHITE_MODE = WHITE_MODE;

lightDomain.getConfig = async function () {
    const base = await configStorage.getGroup('base');
    return {
        whiteLightMode: base.whiteLightMode,
        brightness: base.brightness,
        nirBrightness: base.nirBrightness,
    };
};

lightDomain.setConfig = async function (values) {
    await configStorage.setGroup('base', values);
    const base = await configStorage.getGroup('base');
    runtimeConfig = normalizeConfig(base);
    if (Object.prototype.hasOwnProperty.call(values, 'nirBrightness') && pwmDriver.isInitialized()) {
        pwmDriver.setNirPower(runtimeConfig.nirBrightness);
    }
    applyWhitePower();
    return {
        whiteLightMode: base.whiteLightMode,
        brightness: base.brightness,
        nirBrightness: base.nirBrightness,
    };
};

/** 启动时把持久化模式同步到PWM，自动/常闭且无人时默认关闭白光。 */
lightDomain.syncRuntime = async function () {
    const base = await configStorage.getGroup('base');
    // 生命周期允许同进程内销毁后重启；清空输出缓存，确保新PWM句柄一定收到首个功率。
    lastWhitePower = null;
    personCount = 0;
    zeroSamples = 0;
    failedSamples = 0;
    environmentBrightness = null;
    runtimeConfig = normalizeConfig(base);
    if (pwmDriver.isInitialized()) {
        pwmDriver.setNirPower(runtimeConfig.nirBrightness);
        applyWhitePower();
    }
    return await lightDomain.getConfig();
};

/** 人数状态由Domain维护；连续无人或连续采样失败后熄灯。 */
lightDomain.updatePresence = function (count, brightness) {
    if (count !== null && count !== undefined) {
        failedSamples = 0;
        const nextCount = Math.max(0, Math.trunc(Number(count) || 0));
        if (nextCount > 0) {
            personCount = nextCount;
            zeroSamples = 0;
        } else {
            zeroSamples += 1;
            if (zeroSamples >= ZERO_CLEAR_SAMPLES) personCount = 0;
        }
    } else {
        failedSamples += 1;
        if (failedSamples >= FAIL_CLEAR_SAMPLES) {
            personCount = 0;
            zeroSamples = 0;
        }
    }
    const nextBrightness = Number(brightness);
    if (brightness !== null && brightness !== undefined && Number.isFinite(nextBrightness)) {
        environmentBrightness = nextBrightness;
    }
    return {
        personCount: personCount,
        environmentBrightness: environmentBrightness,
        whitePower: applyWhitePower(),
    };
};

/** 当前运行时红外功率；驱动未就绪时返回 null。 */
lightDomain.getNirPower = function () {
    if (!pwmDriver.isInitialized()) {
        return null;
    }
    const light = pwmDriver.getConfig() || {};
    const value = Number(light.nirBrightness);
    return Number.isFinite(value) ? value : null;
};

/** 仅改运行时红外功率，不写配置库。 */
lightDomain.setNirPower = function (power) {
    if (!pwmDriver.isInitialized()) {
        return;
    }
    pwmDriver.setNirPower(power);
};

/**
 * 临时覆盖红外功率（嵌套调用复用首次保存值）。
 * @param {number} power
 */
lightDomain.beginOverrideNir = function (power) {
    if (!pwmDriver.isInitialized()) {
        return;
    }
    if (!nirOverrideActive) {
        const current = lightDomain.getNirPower();
        nirOverrideSaved = current != null ? current : Number(power);
        nirOverrideActive = true;
    }
    lightDomain.setNirPower(power);
};

/** 结束临时覆盖并恢复进入前的红外功率。 */
lightDomain.endOverrideNir = function () {
    if (!nirOverrideActive) {
        return;
    }
    try {
        if (nirOverrideSaved != null) {
            lightDomain.setNirPower(nirOverrideSaved);
        }
    } finally {
        nirOverrideSaved = null;
        nirOverrideActive = false;
    }
};

export default lightDomain;
