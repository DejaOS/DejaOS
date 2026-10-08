/** @layer view @module capcal_store @depends event_bus,commands */

import eventBus from '../../../core/event_bus.js';
import commands from '../../../core/commands.js';

const capcalStore = {};

capcalStore.begin = async function () {
    return await eventBus.execute(commands.START_CAMERA_CALIBRATION);
};

capcalStore.stop = async function () {
    return await eventBus.execute(commands.STOP_CAMERA_CALIBRATION);
};

/**
 * @param {0|1} stage
 * @returns {Promise<{ ok: boolean, durationMs: number }>}
 */
capcalStore.calculate = async function (stage) {
    return await eventBus.execute(commands.CALCULATE_CAMERA_CALIBRATION, { stage: stage });
};

capcalStore.playStageOneDone = async function () {
    return await eventBus.execute(commands.PLAY_CAMERA_CALIBRATION_STAGE_AUDIO);
};

capcalStore.complete = async function () {
    return await eventBus.execute(commands.COMPLETE_CAMERA_CALIBRATION);
};

export default capcalStore;
