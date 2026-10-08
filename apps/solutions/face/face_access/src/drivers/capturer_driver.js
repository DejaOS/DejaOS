/**
 * @layer    drivers
 * @module   capturer_driver
 * @fires    none
 * @listens  none
 * @depends  dxCapturer
 */

import dxCapturer from '../../dxmodules/dxCapturer.js';

const DEFAULT_CONFIG = {
    channelMax: 2,
    dump: false,
};

let config = Object.assign({}, DEFAULT_CONFIG);
let initialized = false;

function validateConfig(value) {
    if (!Number.isInteger(value.channelMax) || value.channelMax < 1 || value.channelMax > 255) {
        throw new RangeError('capturer_driver: channelMax must be an integer in range [1, 255]');
    }
    if (typeof value.dump !== 'boolean') {
        throw new TypeError('capturer_driver: dump must be a boolean');
    }
}

function isSameConfig(left, right) {
    return left.channelMax === right.channelMax && left.dump === right.dump;
}

const capturerDriver = {};

capturerDriver.init = async function (nextConfig) {
    if (initialized) {
        return;
    }
    const next = Object.assign({}, DEFAULT_CONFIG, nextConfig || {});
    validateConfig(next);
    dxCapturer.init(next);
    config = next;
    initialized = true;
};

capturerDriver.updateConfig = async function (nextConfig) {
    const next = Object.assign({}, config, nextConfig || {});
    validateConfig(next);
    if (initialized && !isSameConfig(config, next)) {
        throw new Error('capturer_driver: configuration change requires application restart');
    }
    config = next;
};

capturerDriver.isInitialized = function () {
    return initialized;
};

capturerDriver.destroy = async function () {
    if (!initialized) {
        return;
    }
    dxCapturer.deinit();
    initialized = false;
};

export default capturerDriver;
