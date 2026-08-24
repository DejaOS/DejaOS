/**
 * @layer    drivers
 * @module   gpio_driver
 * @fires    none
 * @listens  none
 * @depends  dxGpio,dxDriver
 */

import dxGpio from '../../dxmodules/dxGpio.js';
import dxDriver from '../../dxmodules/dxDriver.js';

let initialized = false;
const resources = new Map();

function assertInitialized() {
    if (!initialized) {
        throw new Error('gpio_driver: module is not initialized');
    }
}

function getResource(id) {
    assertInitialized();
    const resource = resources.get(id);
    if (!resource) {
        throw new Error('gpio_driver: gpio is not open, id=' + id);
    }
    return resource;
}

const gpioDriver = {
    GPIO: dxDriver.GPIO,
    MODE: dxGpio.MODE,
};

gpioDriver.init = async function () {
    if (initialized) {
        return;
    }
    const ok = dxGpio.init();
    if (!ok) {
        throw new Error('gpio_driver.init failed');
    }
    initialized = true;
};

gpioDriver.open = function (id, options) {
    assertInitialized();
    if (resources.has(id)) {
        throw new Error('gpio_driver.open: gpio already open, id=' + id);
    }
    const resource = dxGpio.open(id);
    try {
        const opts = options || {};
        if (opts.mode !== undefined) {
            resource.setMode(opts.mode);
        }
        if (opts.pull !== undefined) {
            resource.setPull(opts.pull);
        }
        if (opts.value !== undefined) {
            resource.setValue(opts.value);
        }
    } catch (e) {
        resource.close();
        throw e;
    }
    resources.set(id, resource);
    return resource;
};

gpioDriver.close = function (id) {
    const resource = getResource(id);
    resource.close();
    resources.delete(id);
};

gpioDriver.setMode = function (id, mode) {
    return getResource(id).setMode(mode);
};

gpioDriver.setPull = function (id, state) {
    return getResource(id).setPull(state);
};

gpioDriver.setValue = function (id, value) {
    return getResource(id).setValue(value);
};

gpioDriver.getValue = function (id) {
    return getResource(id).getValue();
};

gpioDriver.toggle = function (id) {
    return getResource(id).toggle();
};

gpioDriver.isOpen = function (id) {
    return resources.has(id);
};

gpioDriver.isInitialized = function () {
    return initialized;
};

gpioDriver.destroy = async function () {
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
    try {
        dxGpio.deinit();
    } catch (e) {
        firstError = firstError || e;
    }
    initialized = false;
    if (firstError) {
        throw firstError;
    }
};

export default gpioDriver;
