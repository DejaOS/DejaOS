/**
 * @layer    drivers
 * @module   audio_driver
 * @fires    none
 * @listens  none
 * @depends  dxAudio
 */

import dxAudio from '../../dxmodules/dxAudio.js';

const DEFAULT_CONFIG = {
    volume: 8,
    playback: undefined,
};

let config = Object.assign({}, DEFAULT_CONFIG);
let initialized = false;

function validateConfig(value) {
    if (!Number.isInteger(value.volume) || value.volume < 0 || value.volume > 10) {
        throw new RangeError('audio_driver: volume must be an integer in range [0, 10]');
    }
    if (value.playback !== undefined && (!value.playback || typeof value.playback !== 'object')) {
        throw new TypeError('audio_driver: playback must be an object');
    }
}

function assertInitialized() {
    if (!initialized) {
        throw new Error('audio_driver: module is not initialized');
    }
}

const audioDriver = {};

audioDriver.init = async function (nextConfig) {
    if (initialized) {
        return;
    }
    const next = Object.assign({}, DEFAULT_CONFIG, nextConfig || {});
    validateConfig(next);
    dxAudio.init(next.playback === undefined ? {} : { playback: next.playback });
    try {
        dxAudio.setVolume(next.volume);
    } catch (e) {
        dxAudio.deinit();
        throw e;
    }
    config = next;
    initialized = true;
};

audioDriver.updateConfig = async function (nextConfig) {
    const next = Object.assign({}, config, nextConfig || {});
    validateConfig(next);
    if (
        initialized &&
        nextConfig &&
        Object.prototype.hasOwnProperty.call(nextConfig, 'playback') &&
        next.playback !== config.playback
    ) {
        await audioDriver.destroy();
        await audioDriver.init(next);
        return;
    }
    if (initialized && next.volume !== config.volume) {
        dxAudio.setVolume(next.volume);
    }
    config = next;
};

audioDriver.playWav = function (path) {
    assertInitialized();
    return dxAudio.playWav(path);
};

audioDriver.playWavData = function (data) {
    assertInitialized();
    return dxAudio.playWavData(data);
};

audioDriver.playTts = function (text, options) {
    assertInitialized();
    return dxAudio.playTts(text, options);
};

audioDriver.setVolume = function (volume) {
    assertInitialized();
    const next = Object.assign({}, config, { volume: volume });
    validateConfig(next);
    dxAudio.setVolume(volume);
    config = next;
};

audioDriver.stop = function () {
    assertInitialized();
    return dxAudio.stop();
};

audioDriver.isInitialized = function () {
    return initialized;
};

audioDriver.destroy = async function () {
    if (!initialized) {
        return;
    }
    let firstError = null;
    try {
        dxAudio.stop();
    } catch (e) {
        firstError = e;
    }
    try {
        dxAudio.deinit();
    } catch (e) {
        firstError = firstError || e;
    }
    initialized = false;
    if (firstError) {
        throw firstError;
    }
};

export default audioDriver;
