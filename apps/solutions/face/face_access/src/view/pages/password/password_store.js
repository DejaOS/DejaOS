/**
 * @layer    view
 * @module   password_store
 * @fires    CMD_PASSWORD_ACCESS
 * @listens  none
 * @depends  system_store,event_bus,commands
 *
 * 密码页只负责采集输入；真实鉴权与通行流程统一交给 access_service。
 */

import eventBus from '../../../core/event_bus.js';
import commands from '../../../core/commands.js';
import systemStore from '../system/system_store.js';

const passwordStore = {};

passwordStore.getLength = function () {
    const value = Number(systemStore.getConfig().passwordLength);
    return [4, 6, 8].indexOf(value) >= 0 ? value : 6;
};

/** 外部协议可能修改配置；进入密码页时主动刷新UI配置快照。 */
passwordStore.refreshLength = async function () {
    await systemStore.load();
    return passwordStore.getLength();
};

passwordStore.isEnabled = function () {
    return !!systemStore.getConfig().passwordOpen;
};

passwordStore.verify = async function (password) {
    const pwd = String(password == null ? '' : password);
    const length = passwordStore.getLength();
    if (!(new RegExp('^\\d{' + length + '}$')).test(pwd)) {
        return { ok: false, error: 'invalid' };
    }
    const result = await eventBus.execute(commands.PASSWORD_ACCESS, {
        password: pwd,
        ts: Date.now(),
    });
    if (result && result.disabled) {
        return { ok: false, error: 'disabled', result: result };
    }
    return {
        ok: !!(result && result.allowed),
        error: result && result.allowed ? undefined : 'fail',
        result: result,
    };
};

export default passwordStore;
