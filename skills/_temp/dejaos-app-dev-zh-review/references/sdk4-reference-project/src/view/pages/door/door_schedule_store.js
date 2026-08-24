/** @layer view @module door_schedule_store @depends event_bus,commands */

import eventBus from '../../../core/event_bus.js';
import commands from '../../../core/commands.js';

const store = {};

store.load = async function () {
    return await eventBus.execute(commands.GET_DOOR_SCHEDULES, {});
};

store.save = async function (items) {
    try {
        const data = await eventBus.execute(commands.SET_DOOR_SCHEDULES, { items: items });
        return { ok: true, data: data };
    } catch (error) {
        return {
            ok: false,
            message: error && error.message ? error.message : '时段保存失败',
        };
    }
};

export default store;
