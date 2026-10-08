/**
 * @layer    drivers
 * @module   gpiokey_driver
 * @fires    GPIO_KEY_PRESSED
 * @listens  none
 * @depends  dxGpioKey,dxDriver,dxLogger,event_bus,core/events
 *
 * 上报 Linux input code 与 value(0/1)；业务类型即 code，见 alarm_domain.TYPE。
 */

import dxGpioKey from '../../dxmodules/dxGpioKey.js';
import dxDriver from '../../dxmodules/dxDriver.js';
import dxLogger from '../../dxmodules/dxLogger.js';
import eventBus from '../core/event_bus.js';
import events from '../core/events.js';

const DEFAULT_CONFIG = {
    devPath: dxDriver.GPIO_KEY.DEV_PATH,
    maxCallbackNum: dxDriver.GPIO_KEY.MAX_CALLBACK_NUM,
};

let config = Object.assign({}, DEFAULT_CONFIG);
let initialized = false;

function onKeyEvent(keyEvent) {
    if (!keyEvent || keyEvent.code === undefined || keyEvent.code === null) return;
    const value = Number(keyEvent.value);
    if (value !== 0 && value !== 1) return;
    const payload = {
        code: Number(keyEvent.code),
        value: value,
        ts: Date.now(),
    };
    dxLogger.info('gpiokey_driver: ' + JSON.stringify(payload));
    eventBus.fire(events.GPIO_KEY_PRESSED, payload).catch(function (e) {
        dxLogger.error('gpiokey_driver event dispatch failed: ' + e.message);
    });
}

function start() {
    dxGpioKey.init({
        devPath: config.devPath,
        maxCallbackNum: config.maxCallbackNum,
    });
    try {
        dxGpioKey.on('key', onKeyEvent);
        initialized = true;
    } catch (e) {
        dxGpioKey.deinit();
        throw e;
    }
}

function stop() {
    if (!initialized) return;
    let firstError = null;
    try {
        dxGpioKey.off('key', onKeyEvent);
    } catch (e) {
        firstError = e;
    }
    try {
        dxGpioKey.deinit();
    } catch (e) {
        firstError = firstError || e;
    }
    initialized = false;
    if (firstError) throw firstError;
}

const gpiokeyDriver = {};

gpiokeyDriver.init = async function (nextConfig) {
    if (initialized) return;
    config = Object.assign({}, DEFAULT_CONFIG, nextConfig || {});
    if (typeof config.maxCallbackNum === 'string' && /^\d+$/.test(config.maxCallbackNum)) {
        config.maxCallbackNum = Number(config.maxCallbackNum);
    }
    if (typeof config.devPath !== 'string' || !config.devPath) {
        config.devPath = DEFAULT_CONFIG.devPath;
    }
    start();
};

gpiokeyDriver.updateConfig = async function (nextConfig) {
    const restart = initialized;
    if (restart) stop();
    config = Object.assign({}, config, nextConfig || {});
    if (typeof config.maxCallbackNum === 'string' && /^\d+$/.test(config.maxCallbackNum)) {
        config.maxCallbackNum = Number(config.maxCallbackNum);
    }
    if (restart) start();
};

gpiokeyDriver.getState = function (code) {
    if (!initialized) {
        throw new Error('gpiokey_driver.getState: module is not initialized');
    }
    return dxGpioKey.getState(code);
};

gpiokeyDriver.isInitialized = function () {
    return initialized;
};

gpiokeyDriver.destroy = async function () {
    stop();
};

export default gpiokeyDriver;
