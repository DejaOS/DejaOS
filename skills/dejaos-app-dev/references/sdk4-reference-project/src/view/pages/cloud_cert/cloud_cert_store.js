/** @layer view @module cloud_cert_store @depends event_bus,commands */

import eventBus from '../../../core/event_bus.js';
import commands from '../../../core/commands.js';

const cloudCertStore = {};

/**
 * 页面进入时密钥框留空：激活码为一次性输入，不落本地配置。
 * @returns {{ secretKey: string }}
 */
cloudCertStore.getConfig = function () {
    return { secretKey: '' };
};

/**
 * 提交云证激活码。
 * @param {{ secretKey?: string }} patch
 * @returns {Promise<{ ok: boolean, error?: string, message?: string }>}
 */
cloudCertStore.activate = async function (patch) {
    const code = String(patch && patch.secretKey != null ? patch.secretKey : '').trim();
    if (!code) {
        return { ok: false, error: 'keyRequired' };
    }
    try {
        await eventBus.execute(commands.ACTIVATE_EID, { code: code });
        return { ok: true };
    } catch (error) {
        const message = error && error.message ? String(error.message) : '云证激活失败';
        // 格式错误归业务输入；其余多为驱动/硬件失败。
        if (error && String(error.code) === '200000') {
            return { ok: false, error: 'keyInvalid', message: message };
        }
        return { ok: false, error: 'service', message: message };
    }
};

export default cloudCertStore;
