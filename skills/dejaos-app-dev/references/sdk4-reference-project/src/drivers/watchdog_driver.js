/**
 * @layer    drivers
 * @module   watchdog_driver
 * @fires    none
 * @listens  none
 * @depends  dxWatchdog,dxDriver,dxStd
 */

import dxWatchdog from '../../dxmodules/dxWatchdog.js';
import dxDriver from '../../dxmodules/dxDriver.js';
import dxStd from '../../dxmodules/dxStd.js';

const DEFAULT_CONFIG = {
    timeoutMs: dxDriver.WATCHDOG.TIMEOUT_MS,
    channelId: dxDriver.WATCHDOG.MAIN_CHANNEL_ID,
    feedIntervalMs: Math.floor(dxDriver.WATCHDOG.TIMEOUT_MS / 2),
};

let config = Object.assign({}, DEFAULT_CONFIG);
let initialized = false;
let started = false;
let poweronByWatchdog = false;
let channel = null;
let feedTimer = null;

function validateConfig(value) {
    if (!Number.isInteger(value.timeoutMs) || value.timeoutMs <= 0) {
        throw new TypeError('watchdog_driver: timeoutMs must be a positive integer');
    }
    if (!Number.isInteger(value.channelId) || value.channelId < 0) {
        throw new TypeError('watchdog_driver: channelId must be a non-negative integer');
    }
    if (!Number.isInteger(value.feedIntervalMs) || value.feedIntervalMs <= 0 || value.feedIntervalMs >= value.timeoutMs) {
        throw new RangeError('watchdog_driver: feedIntervalMs must be positive and less than timeoutMs');
    }
}

const watchdogDriver = {};

watchdogDriver.init = async function (nextConfig) {
    if (initialized) {
        return;
    }
    config = Object.assign({}, DEFAULT_CONFIG, nextConfig || {});
    validateConfig(config);
    dxWatchdog.init();
    initialized = true;
    poweronByWatchdog = dxWatchdog.isPoweron();
    try {
        watchdogDriver.start();
    } catch (e) {
        dxWatchdog.deinit();
        initialized = false;
        throw e;
    }
};

watchdogDriver.start = function () {
    if (!initialized) {
        throw new Error('watchdog_driver.start: module is not initialized');
    }
    if (started) {
        return;
    }
    try {
        const startResult = dxWatchdog.start(config.timeoutMs);
        if (startResult === false) {
            throw new Error('watchdog_driver.start: native start failed');
        }
        channel = dxWatchdog.openChannel(config.channelId);
        const enableResult = channel.enable();
        if (enableResult === false) {
            throw new Error('watchdog_driver.start: channel enable failed');
        }
        channel.feed();
        feedTimer = dxStd.setInterval(function feedWatchdog() {
            channel.feed();
        }, config.feedIntervalMs);
        started = true;
    } catch (e) {
        if (feedTimer !== null) {
            dxStd.clearInterval(feedTimer);
            feedTimer = null;
        }
        if (channel) {
            try {
                channel.disable();
            } catch (_disableError) {}
            channel = null;
        }
        try {
            dxWatchdog.stop();
        } catch (_stopError) {}
        throw e;
    }
};

watchdogDriver.feed = function () {
    if (!started || !channel) {
        throw new Error('watchdog_driver.feed: watchdog is not started');
    }
    return channel.feed();
};

watchdogDriver.isPoweron = function () {
    if (!initialized) {
        throw new Error('watchdog_driver.isPoweron: module is not initialized');
    }
    return poweronByWatchdog;
};

watchdogDriver.isStarted = function () {
    return started;
};

watchdogDriver.stop = function () {
    if (!started) {
        return;
    }
    let firstError = null;
    if (feedTimer !== null) {
        try {
            dxStd.clearInterval(feedTimer);
        } catch (e) {
            firstError = e;
        }
        feedTimer = null;
    }
    if (channel) {
        try {
            channel.disable();
        } catch (e) {
            firstError = firstError || e;
        }
        channel = null;
    }
    try {
        dxWatchdog.stop();
    } catch (e) {
        firstError = firstError || e;
    }
    started = false;
    if (firstError) {
        throw firstError;
    }
};

watchdogDriver.updateConfig = async function (nextConfig) {
    const next = Object.assign({}, config, nextConfig || {});
    validateConfig(next);
    const restart = started;
    if (restart) {
        watchdogDriver.stop();
    }
    config = next;
    if (restart) {
        watchdogDriver.start();
    }
};

watchdogDriver.destroy = async function () {
    if (!initialized) {
        return;
    }
    let firstError = null;
    try {
        watchdogDriver.stop();
    } catch (e) {
        firstError = e;
    }
    try {
        dxWatchdog.deinit();
    } catch (e) {
        firstError = firstError || e;
    }
    initialized = false;
    if (firstError) {
        throw firstError;
    }
};

export default watchdogDriver;
