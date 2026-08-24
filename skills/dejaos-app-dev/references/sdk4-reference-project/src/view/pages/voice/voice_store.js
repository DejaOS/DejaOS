/** @layer view @module voice_store @depends event_bus,commands */

import eventBus from '../../../core/event_bus.js';
import commands from '../../../core/commands.js';

let config = null;

function mapConfig(result) {
    const face = result && result.face ? result.face : {};
    const base = result && result.base ? result.base : {};
    return {
        stranger: String(face.stranger == null ? 0 : face.stranger),
        voiceMode: String(face.voiceMode == null ? 0 : face.voiceMode),
        greeting: face.voiceModeDate || '',
        volume: base.volume,
    };
}

const voiceStore = {};

voiceStore.load = async function () {
    config = mapConfig(await eventBus.execute(commands.GET_CONFIG, ['face', 'base']));
    return voiceStore.getConfig();
};

voiceStore.getConfig = function () {
    if (!config) throw new Error('voice_store: config is not loaded');
    return Object.assign({}, config);
};

voiceStore.save = async function (patch) {
    const next = patch || {};
    const stranger = Number(next.stranger);
    const voiceMode = Number(next.voiceMode);
    const greeting = String(next.greeting || '').trim();
    const volume = Math.max(0, Math.min(10, Math.round(Number(next.volume))));
    if (voiceMode === 2 && !greeting) return { ok: false, error: 'greetingRequired' };
    try {
        const result = await eventBus.execute(commands.SET_CONFIG, {
            face: { stranger: stranger, voiceMode: voiceMode, voiceModeDate: greeting },
            base: { volume: volume },
        });
        config = mapConfig(result);
        return { ok: true };
    } catch (error) {
        return {
            ok: false,
            error: error && error.code === '300000' ? 'pending' : 'service',
            message: error && error.message ? error.message : '语音配置操作失败',
        };
    }
};

export default voiceStore;