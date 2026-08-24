/**
 * @layer    view
 * @module   auth_store
 * @fires    none
 * @listens  none
 * @depends  event_bus,commands,system_store
 *
 * 进入设置前的身份验证。密码沿用本地配置校验；人脸通过Command等待管理员识别结果。
 */

import eventBus from '../../../core/event_bus.js';
import commands from '../../../core/commands.js';
import systemStore from '../system/system_store.js';

const authStore = {};

/**
 * @param {string} password
 * @returns {{ ok: boolean, error?: string }}
 */
authStore.verifyPassword = function (password) {
    const pwd = String(password == null ? '' : password);
    if (!pwd) {
        return { ok: false, error: 'passwordRequired' };
    }
    const expected = String(systemStore.getConfig().loginPassword || '');
    if (pwd !== expected) {
        return { ok: false, error: 'passwordWrong' };
    }
    return { ok: true };
};

/** 等待一次配置页管理员人脸识别结果。 */
authStore.startFaceAuth = async function () {
    try {
        return await eventBus.execute(commands.START_CONFIG_FACE_AUTH, {});
    } catch (e) {
        return { ok: false, error: e && e.message ? e.message : 'faceFailed' };
    }
};

authStore.cancelFaceAuth = function () {
    return eventBus.execute(commands.CANCEL_CONFIG_FACE_AUTH, {}).catch(function () {});
};

export default authStore;
