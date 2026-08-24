/**
 * @layer    view
 * @module   fingerprint_store
 * @depends  event_bus,core/commands,router,AppError,datetime
 *
 * 指纹页只经 Command / 远程 Promise 适配；禁止直接访问 Driver。
 */

import eventBus from '../../../core/event_bus.js';
import commands from '../../../core/commands.js';
import router from '../../router/core.js';
import dxStd from '../../../../dxmodules/dxStd.js';
import { AppError } from '../../../core/error.js';
import { formatDateTime } from '../../utils/datetime.js';

/** @type {{ resolve: Function, reject: Function, extra: object }|null} */
let remotePending = null;
/** @type {number} 远程录入绝对截止时间（自申请页唤起起 60s）。 */
let remoteDeadline = 0;
/** @type {Function|null} */
let progressHandler = null;

/** 远程指纹 control：自申请页起 60s（与协议层 FINGER_CONTROL_TIMEOUT_MS 一致）。 */
const REMOTE_ENROLL_TIMEOUT_MS = 60000;

function clearRemotePending() {
    remotePending = null;
    remoteDeadline = 0;
}

function goHome() {
    const stack = router.getStack();
    if (stack.indexOf('home') >= 0) {
        router.backTo('home');
    } else {
        router.replace('home');
    }
}

/** 远程收尾：先让 control finally endEnrollSession，再进首页开通行。 */
function goHomeDeferred() {
    dxStd.setTimeout(goHome, 0);
}

const fingerprintStore = {};

fingerprintStore.setProgressHandler = function (handler) {
    progressHandler = typeof handler === 'function' ? handler : null;
};

fingerprintStore.notifyProgress = function (payload) {
    const data = payload || {};
    // 云端中断远程会话：关闭 Promise 并回主页（本地录入不走此分支）。
    if (data.phase === 'fail' && data.mode === 'interrupt' && remotePending) {
        fingerprintStore.cancelRemote();
        try {
            goHomeDeferred();
        } catch (_e) {}
    }
    if (!progressHandler) return;
    try {
        progressHandler(data);
    } catch (_e) {}
};

/**
 * ui_driver.enrollFinger → 打开远程申请页并等待整段录入结束。
 * @param {object} extra
 * @returns {Promise<{ fingerFeature: string }>}
 */
fingerprintStore.runRemoteEnroll = function (extra) {
    if (remotePending) {
        return Promise.reject(new AppError('300000', '远程指纹录入进行中'));
    }
    const opts = extra && typeof extra === 'object' ? extra : {};
    return new Promise(function (resolve, reject) {
        remotePending = { resolve: resolve, reject: reject, extra: opts };
        remoteDeadline = Date.now() + REMOTE_ENROLL_TIMEOUT_MS;
        try {
            router.navigate('fingerprint_remote', {
                name: opts.name || opts.userName || '',
                userId: opts.userId || '',
                time: opts.time || formatDateTime(new Date()),
                serialNo: opts.serialNo || '',
                isRemote: opts.isRemote !== false,
            });
        } catch (e) {
            clearRemotePending();
            reject(e);
        }
    });
};

fingerprintStore.getRemoteRemainSec = function () {
    if (!remotePending || !remoteDeadline) return 0;
    return Math.max(0, Math.ceil((remoteDeadline - Date.now()) / 1000));
};

fingerprintStore.hasRemotePending = function () {
    return !!remotePending;
};

fingerprintStore.getRemoteExtra = function () {
    return remotePending ? Object.assign({}, remotePending.extra) : {};
};

fingerprintStore.finishRemote = function (payload) {
    if (!remotePending) return;
    const done = remotePending;
    clearRemotePending();
    done.resolve(payload || {});
};

fingerprintStore.failRemote = function (reason) {
    if (!remotePending) return;
    const done = remotePending;
    clearRemotePending();
    done.reject(new AppError('300000', String(reason || '指纹录入失败')));
};

fingerprintStore.cancelRemote = function () {
    if (!remotePending) return;
    const done = remotePending;
    clearRemotePending();
    done.reject(new AppError('300000', '远程指纹录入已取消'));
};

fingerprintStore.enroll = function (option) {
    return eventBus.execute(commands.ENROLL_FINGER, option || {});
};

fingerprintStore.interrupt = function (option) {
    return eventBus.execute(commands.INTERRUPT_FINGER, option || {}).catch(function () {
        return false;
    });
};

fingerprintStore.goHome = goHome;
fingerprintStore.goHomeDeferred = goHomeDeferred;

export default fingerprintStore;
