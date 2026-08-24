/**
 * @layer    view
 * @module   capability_store
 * @fires    none
 * @listens  none
 * @depends  event_bus,commands
 *
 * 硬件能力 UI 适配：跨页只读快照，只经 Command 查询。
 */

import eventBus from '../../core/event_bus.js';
import commands from '../../core/commands.js';

/** @type {{ nfc: boolean, finger: boolean, scanner: boolean, intercom: boolean }|null} */
let capabilities = null;

const capabilityStore = {};

capabilityStore.load = async function () {
    capabilities = await eventBus.execute(commands.GET_DEVICE_CAPABILITIES) || {
        nfc: false,
        finger: false,
        scanner: false,
        intercom: false,
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

export default capabilityStore;
