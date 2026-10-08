/** @layer view @module diagnostics_store @depends event_bus,commands */

import eventBus from '../../../core/event_bus.js';
import commands from '../../../core/commands.js';

const diagnosticsStore = {};

diagnosticsStore.load = function () {
    return eventBus.execute(commands.GET_FACE_DIAG_STATUS);
};

diagnosticsStore.setFaceEnabled = function (enabled) {
    return eventBus.execute(commands.SET_FACE_DIAG_STATUS, { enabled: enabled === true });
};

export default diagnosticsStore;
