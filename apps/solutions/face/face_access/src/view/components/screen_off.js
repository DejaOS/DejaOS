/**
 * @layer    view
 * @module   screen_off
 * @fires    none
 * @executes CMD_SET_DISPLAY_AWAKE
 * @listens  none
 * @depends  dxUi,dxStd,dxLogger,event_bus,commands,layout,system_store,call_store,screensaver
 *
 * 根据LVGL全局空闲时间控制背光。透明SYS遮罩拦截息屏后的第一次触摸，
 * 避免用户在看不见页面时误触底层按钮；该次触摸只负责唤醒。
 */

import dxui from '../../../dxmodules/dxUi.js';
import dxStd from '../../../dxmodules/dxStd.js';
import logger from '../../../dxmodules/dxLogger.js';
import eventBus from '../../core/event_bus.js';
import commands from '../../core/commands.js';
import layout from './layout.js';
import systemStore from '../pages/system/system_store.js';
import callStore from '../pages/call/call_store.js';
import screensaver from './screensaver.js';

const POLL_MS = 1000;

let initialized = false;
let root = null;
let pollTimer = null;
let sleeping = false;
let changing = false;
let timeoutMinutes = 0;
let activityGeneration = 0;

function getTimeoutMs() {
    return timeoutMinutes > 0 ? timeoutMinutes * 60 * 1000 : 0;
}

function applyAwakeUi() {
    sleeping = false;
    if (root) root.hide();
    if (screensaver.isVisible()) screensaver.hide();
    if (typeof dxui.trigActivity === 'function') dxui.trigActivity();
}

async function setAwake(awake) {
    const requestedAwake = awake === true;
    if (changing || sleeping === !requestedAwake) return;
    const generation = activityGeneration;
    changing = true;
    try {
        await eventBus.execute(commands.SET_DISPLAY_AWAKE, { awake: requestedAwake });
        if (!initialized) {
            // 销毁期间完成的旧息屏请求不能把下一次启动留在黑屏状态。
            if (!requestedAwake) {
                await eventBus.execute(commands.SET_DISPLAY_AWAKE, { awake: true });
            }
            return;
        }
        if (!requestedAwake && generation !== activityGeneration) {
            // 息屏命令等待期间发生了新活动，旧结果失效，立即恢复背光。
            await eventBus.execute(commands.SET_DISPLAY_AWAKE, { awake: true });
            applyAwakeUi();
            return;
        }
        if (requestedAwake) {
            applyAwakeUi();
            return;
        }
        sleeping = true;
        logger.info('screen_off entered');
        if (root) {
            root.show();
            if (typeof root.moveForeground === 'function') root.moveForeground();
        }
    } catch (e) {
        logger.error('screen_off setAwake failed: ' + e.message);
    } finally {
        changing = false;
    }
}

function pollIdle() {
    if (changing) return;
    const inCall = callStore.isInCall();
    const timeoutMs = getTimeoutMs();
    // 来电/通话以及外部把息屏时间改为0时，必须主动唤醒，不能等待触摸。
    if (sleeping) {
        if (inCall || timeoutMs <= 0) setAwake(true);
        return;
    }
    if (inCall) return;
    if (timeoutMs <= 0) return;
    let idleMs;
    try {
        idleMs = Number(dxui.getIdleDuration());
    } catch (_e) {
        return;
    }
    if (Number.isFinite(idleMs) && idleMs >= timeoutMs) setAwake(false);
}

const screenOff = {};

screenOff.setTimeoutMinutes = function (minutes) {
    const value = Number(minutes);
    timeoutMinutes = Number.isFinite(value) && value > 0 ? Math.round(value) : 0;
    if (sleeping && timeoutMinutes === 0) setAwake(true);
    return true;
};

/** Driver事件已经点亮背光后，同步退出屏保/息屏遮罩并重置LVGL空闲计时。 */
screenOff.notifyActivity = function () {
    if (!initialized) return false;
    activityGeneration++;
    applyAwakeUi();
    return true;
};

screenOff.isSleeping = function () {
    return sleeping;
};

screenOff.init = function () {
    if (initialized) return;
    activityGeneration++;
    try {
        screenOff.setTimeoutMinutes(systemStore.getConfig().screenOff);
    } catch (_e) {
        timeoutMinutes = 0;
    }
    root = dxui.View.build('ui_screen_off_guard', dxui.Utils.LAYER.SYS);
    root.setSize(layout.width, layout.height);
    root.setPos(0, 0);
    root.bgOpa(0);
    root.borderWidth(0);
    root.padAll(0);
    root.scroll(false);
    root.clickable(true);
    root.on(dxui.Utils.EVENT.CLICK, function () { setAwake(true); });
    root.hide();
    pollTimer = dxStd.setInterval(pollIdle, POLL_MS);
    initialized = true;
};

screenOff.destroy = function () {
    if (!initialized) return;
    initialized = false;
    activityGeneration++;
    if (pollTimer) {
        dxStd.clearInterval(pollTimer);
        pollTimer = null;
    }
    if (sleeping) {
        // UI销毁前恢复背光，避免应用重启阶段保持黑屏。
        eventBus.execute(commands.SET_DISPLAY_AWAKE, { awake: true }).catch(function () {});
    }
    if (root) dxui.del(root);
    root = null;
    sleeping = false;
    changing = false;
    timeoutMinutes = 0;
};

export default screenOff;
