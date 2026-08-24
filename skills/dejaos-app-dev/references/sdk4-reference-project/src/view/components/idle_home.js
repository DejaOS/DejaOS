/**
 * @layer    view
 * @module   idle_home
 * @fires    none
 * @listens  none
 * @depends  dxUi,dxStd,router,keyboard,popup,result_popup,confirm,call_store,wecom_store
 *
 * 非主页无操作超时自动回主页。依赖 LVGL 空闲计时（触摸/点击会重置）。
 * 通话中（呼叫中 / 已接通）与首次初始化页豁免。
 * 企微未绑定时回 wecom_network，与旧 weComService 层级判断一致。
 */

import dxui from '../../../dxmodules/dxUi.js';
import dxStd from '../../../dxmodules/dxStd.js';
import router from '../router/core.js';
import keyboard from './keyboard.js';
import popup from './popup.js';
import resultPopup from './result_popup.js';
import confirm from './confirm.js';
import callStore from '../pages/call/call_store.js';
import wecomStore from '../pages/wecom/wecom_store.js';

/** 无操作阈值（ms） */
const IDLE_MS = 60 * 1000;
/** 轮询间隔（ms） */
const POLL_MS = 1000;

/** 不触发回主页的路由（企微未绑定引导/绑定中不应被打断） */
const EXEMPT_ROUTES = {
    home: true,
    init: true,
    wecom_network: true,
    wecom_bind: true,
    wecom_capture: true,
    // 指纹申请/录入有独立超时与中断；空闲踢回会留下挂起的远程 Promise 与串口锁。
    fingerprint_remote: true,
    fingerprint_enroll: true,
};

let initialized = false;
let pollTimer = null;
let returning = false;

/**
 * @returns {boolean}
 */
function shouldStay() {
    if (!router.isInitialized()) {
        return true;
    }
    const route = router.getCurrent();
    if (!route || EXEMPT_ROUTES[route]) {
        return true;
    }
    // 通话流程中不打断（呼叫中 / 通话中）
    if (callStore.isInCall()) {
        return true;
    }
    return false;
}

async function goHome() {
    if (returning) {
        return;
    }
    returning = true;
    try {
        try {
            keyboard.hideAll();
        } catch (_e) {}
        try {
            popup.hide();
        } catch (_e) {}
        try {
            resultPopup.hide();
        } catch (_e) {}
        try {
            confirm.hide();
        } catch (_e) {}

        // 企微未绑定不能进业务首页，与启动分流同一套判断。
        let target = 'home';
        try {
            const resolved = await wecomStore.resolveDefaultRoute();
            if (resolved.route === 'wecom_network') target = 'wecom_network';
        } catch (_e2) {}

        const stack = router.getStack();
        let ok = false;
        if (stack.indexOf(target) >= 0) {
            ok = router.backTo(target);
        }
        if (!ok) {
            router.replace(target);
        }
        // 自动返回主页不是用户活动，禁止重置LVGL空闲时间；否则屏保和息屏会被额外延后一轮。
    } finally {
        returning = false;
    }
}

function tick() {
    if (shouldStay()) {
        return;
    }
    let idleMs = 0;
    try {
        idleMs = Number(dxui.getIdleDuration());
    } catch (_e) {
        return;
    }
    if (!Number.isFinite(idleMs) || idleMs < IDLE_MS) {
        return;
    }
    goHome();
}

const idleHome = {};

/**
 * 启动全局空闲回主页轮询（全应用只调用一次）。
 */
idleHome.init = function () {
    if (initialized) {
        return;
    }
    pollTimer = dxStd.setInterval(tick, POLL_MS);
    initialized = true;
};

idleHome.destroy = function () {
    if (!initialized) {
        return;
    }
    if (pollTimer) {
        dxStd.clearInterval(pollTimer);
        pollTimer = null;
    }
    returning = false;
    initialized = false;
};

export default idleHome;
