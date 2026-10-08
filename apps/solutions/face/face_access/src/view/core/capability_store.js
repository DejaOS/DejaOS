/**
 * @layer    view
 * @module   capability_store
 * @fires    none
 * @listens  none
 * @depends  event_bus,commands
 *
 * 硬件能力 UI 适配：跨页只读快照，只经 Command 查询。
 * nfc/finger/scanner/pwm 来自 /etc/app 标志；wifi/tamper 按板型。
 */

import eventBus from '../../core/event_bus.js';
import commands from '../../core/commands.js';

/** @type {object|null} */
let capabilities = null;

const capabilityStore = {};

capabilityStore.load = async function () {
    capabilities = await eventBus.execute(commands.GET_DEVICE_CAPABILITIES) || {
        nfc: false,
        finger: false,
        scanner: false,
        intercom: false,
        pwmWhite: false,
        pwmNir: false,
        wifi: true,
        tamper: true,
        model: '',
    };
    return capabilityStore.getCapabilities();
};

capabilityStore.getCapabilities = function () {
    if (!capabilities) {
        throw new Error('capability_store: capabilities is not loaded');
    }
    return Object.assign({}, capabilities);
};

capabilityStore.hasIntercom = function () {
    return !!(capabilities && capabilities.intercom);
};

capabilityStore.hasNfc = function () {
    return !!(capabilities && capabilities.nfc);
};

capabilityStore.hasFinger = function () {
    return !!(capabilities && capabilities.finger);
};

capabilityStore.hasScanner = function () {
    return !!(capabilities && capabilities.scanner);
};

capabilityStore.hasPwmWhite = function () {
    return !!(capabilities && capabilities.pwmWhite);
};

capabilityStore.hasPwmNir = function () {
    return !!(capabilities && capabilities.pwmNir);
};

capabilityStore.hasWifi = function () {
    return !capabilities || capabilities.wifi !== false;
};

capabilityStore.hasTamper = function () {
    return !capabilities || capabilities.tamper !== false;
};

export default capabilityStore;
