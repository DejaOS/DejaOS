/**
 * @layer    drivers
 * @module   ivcore_driver
 * @fires    none
 * @listens  none
 * @depends  dxIvcore
 */

import dxIvcore from '../../dxmodules/dxIvcore.js';

const DEFAULT_CONFIG = {
    maxPipelineNum: 8,
    g2dDevPath: '/dev/dri/card0',
};

let config = Object.assign({}, DEFAULT_CONFIG);
let initialized = false;

function validateConfig(value) {
    if (!Number.isInteger(value.maxPipelineNum) || value.maxPipelineNum < 1 || value.maxPipelineNum > 255) {
        throw new RangeError('ivcore_driver: maxPipelineNum must be an integer in range [1, 255]');
    }
    if (typeof value.g2dDevPath !== 'string' || value.g2dDevPath.length === 0) {
        throw new TypeError('ivcore_driver: g2dDevPath must be a non-empty string');
    }
}

function isSameConfig(left, right) {
    return left.maxPipelineNum === right.maxPipelineNum && left.g2dDevPath === right.g2dDevPath;
}

const ivcoreDriver = {};

ivcoreDriver.init = async function (nextConfig) {
    if (initialized) {
        return;
    }
    const next = Object.assign({}, DEFAULT_CONFIG, nextConfig || {});
    validateConfig(next);
    dxIvcore.init(next);
    config = next;
    initialized = true;
};

ivcoreDriver.updateConfig = async function (nextConfig) {
    const next = Object.assign({}, config, nextConfig || {});
    validateConfig(next);
    if (initialized && !isSameConfig(config, next)) {
        throw new Error('ivcore_driver: configuration change requires application restart');
    }
    config = next;
};

ivcoreDriver.isInitialized = function () {
    return initialized;
};

ivcoreDriver.destroy = async function () {
    if (!initialized) {
        return;
    }
    dxIvcore.deinit();
    initialized = false;
};

export default ivcoreDriver;
