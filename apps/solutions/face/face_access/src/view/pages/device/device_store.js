/**
 * @layer    view
 * @module   device_store
 * @fires    none
 * @listens  none
 * @depends  event_bus,commands
 *
 * 设备信息 UI 适配：只经 Command 查询，不直连 Domain/Driver/Storage。
 * 容量类字段单位均为 MB。
 */

import eventBus from '../../../core/event_bus.js';
import commands from '../../../core/commands.js';

/** @type {DeviceInfo|null} */
let info = null;

const deviceStore = {};

/**
 * 每次进入设备信息页应重新查询，避免沿用过期缓存。
 * @returns {Promise<DeviceInfo>}
 */
deviceStore.load = async function () {
    info = await eventBus.execute(commands.GET_DEVICE_INFO);
    return deviceStore.getInfo();
};

/**
 * @returns {DeviceInfo}
 */
deviceStore.getInfo = function () {
    if (!info) throw new Error('device_store: info is not loaded');
    return Object.assign({}, info);
};

export default deviceStore;
