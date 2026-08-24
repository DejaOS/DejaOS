/** @layer domain @module light_domain @depends pwm_driver,storage/config */

import pwmDriver from '../drivers/pwm_driver.js';
import configStorage from '../storage/config/config.js';

const WHITE_MODE = Object.freeze({ AUTO: 0, ON: 1, OFF: 2 });
/** 实机采样：低于500属于暗光；自动模式只在暗光且检测到人员时补光。 */
const DARK_BRIGHTNESS_THRESHOLD = 500;
let runtimeConfig = { whiteLightMode: WHITE_MODE.AUTO, brightness: 70, nirBrightness: 80 };
let personCount = 0;
let zeroSamples = 0;
let environmentBrightness = null;
let lastWhitePower = null;

function normalizeConfig(base) {
    return {
        whiteLightMode: Number(base.whiteLightMode),
        brightness: Number(base.brightness),
        nirBrightness: Number(base.nirBrightness),
    };
}

function applyWhitePower() {
    if (!pwmDriver.isInitialized()) return null;
    let power = 0;
    if (runtimeConfig.whiteLightMode === WHITE_MODE.ON) {
        power = runtimeConfig.brightness;
    } else if (runtimeConfig.whiteLightMode === WHITE_MODE.AUTO
        && personCount > 0
        && Number.isFinite(environmentBrightness)
        && environmentBrightness < DARK_BRIGHTNESS_THRESHOLD) {
        power = runtimeConfig.brightness;
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
    runtimeConfig = normalizeConfig(base);
    if (pwmDriver.isInitialized()) {
        pwmDriver.setNirPower(runtimeConfig.nirBrightness);
        applyWhitePower();
    }
    return await lightDomain.getConfig();
};

/** 人数状态由Domain维护；连续3次无人后才熄灯，防止NIR检测抖动。 */
lightDomain.updatePresence = function (count, brightness) {
    const nextCount = Math.max(0, Math.trunc(Number(count) || 0));
    if (nextCount > 0) {
        personCount = nextCount;
        zeroSamples = 0;
    } else {
        zeroSamples += 1;
        if (zeroSamples >= 3) personCount = 0;
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
