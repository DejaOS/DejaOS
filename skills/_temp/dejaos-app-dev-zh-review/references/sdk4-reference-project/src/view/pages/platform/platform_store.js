/** @layer view @module platform_store @depends event_bus,commands */

import eventBus from '../../../core/event_bus.js';
import commands from '../../../core/commands.js';

function messageOf(error, fallback) {
    return error && error.message ? error.message : fallback;
}

const platformStore = {};

platformStore.loadWebrtc = async function () {
    const result = await Promise.all([
        eventBus.execute(commands.GET_CONFIG, 'intercom'),
        eventBus.execute(commands.GET_WEBRTC_STATUS),
    ]);
    const config = result[0] && result[0].intercom ? result[0].intercom : {};
    return Object.assign({}, config, result[1] || {});
};

platformStore.saveWebrtc = async function (server, port) {
    const value = Number(port);
    if (!String(server || '').trim()) return { ok: false, message: 'WebRTC服务地址不能为空' };
    if (!Number.isInteger(value) || value < 1 || value > 65535) {
        return { ok: false, message: 'WebRTC端口必须为1~65535的整数' };
    }
    try {
        await eventBus.execute(commands.SET_CONFIG, {
            intercom: { server: String(server).trim(), port: value },
        });
        return { ok: true, data: await platformStore.loadWebrtc() };
    } catch (error) {
        return { ok: false, message: messageOf(error, 'WebRTC配置保存失败') };
    }
};

platformStore.ping = async function (target) {
    return await eventBus.execute(commands.PING_HOST, { target: String(target || '').trim() });
};

platformStore.diagnose = async function () {
    return await eventBus.execute(commands.RUN_NETWORK_DIAG);
};

export default platformStore;