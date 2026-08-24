/**
 * @layer    view
 * @module   wecom_store
 * @depends  dxStd,event_bus,commands,router,core/error,i18n
 *
 * 企微页会话：定时刷新 UI、跳转。业务经 Command → wecom_service。
 */

import dxStd from '../../../../dxmodules/dxStd.js';
import eventBus from '../../../core/event_bus.js';
import commands from '../../../core/commands.js';
import router from '../../router/core.js';
import { AppError } from '../../../core/error.js';
import { t } from '../../i18n/index.js';

const NET_POLL_MS = 500;
const BIND_POLL_MS = 1000;

/** @type {number|null} */
let netTimer = null;
/** @type {number|null} */
let bindTimer = null;
/** @type {boolean} */
let bindFetching = false;
/** @type {boolean} */
let qrReady = false;
/** @type {object|null} */
let netPage = null;
/** @type {object|null} */
let bindPage = null;
/** @type {{ resolve: Function, reject: Function }|null} */
let capturePending = null;
/** @type {boolean} */
let activated = false;

function clearTimer(handle) {
    if (handle !== null) dxStd.clearInterval(handle);
    return null;
}

async function panelStatus() {
    try {
        return await eventBus.execute(commands.GET_WECOM_PANEL_STATUS);
    } catch (_e) {
        return { connected: false, mqttConnected: false };
    }
}

const wecomStore = {};

/** ui_driver 推送 SN/IP → 企微引导/绑定页底栏（样式由各页自行绘制）。 */
wecomStore.applyDevicePanel = function (snap) {
    const network = router.getView('wecom_network');
    const bind = router.getView('wecom_bind');
    if (network && typeof network.applyStatus === 'function') {
        network.applyStatus(snap);
    }
    if (bind && typeof bind.applyStatus === 'function') {
        bind.applyStatus(snap);
    }
    return true;
};

/**
 * - 未激活 → init
 * - 企微且未绑定（weComStatus===0）→ wecom_network
 * - 其余 → home
 * @returns {Promise<{ route: string, status: object }>}
 */
wecomStore.resolveDefaultRoute = async function () {
    let status = { productType: 'none', region: 'CN', weComStatus: 0 };
    try {
        status = await eventBus.execute(commands.GET_PRODUCT_STATUS) || status;
    } catch (_e) {}
    let route = 'home';
    if (status.productType === 'none') {
        route = 'init';
    } else if (status.productType === 'wecom' && Number(status.weComStatus) !== 1) {
        route = 'wecom_network';
    }
    return { route: route, status: status };
};

/**
 * 幂等：已激活则直接返回；未激活时必须带明确 productType（通常仅 init 首次确认调用）。
 * @param {{ productType?: string, region?: string }} params
 */
wecomStore.ensureActivated = async function (params) {
    if (activated) return { ok: true };
    try {
        const status = await eventBus.execute(commands.GET_PRODUCT_STATUS) || {};
        if (status.productType && status.productType !== 'none') {
            activated = true;
            return { ok: true };
        }
        const data = params || {};
        if (!data.productType) {
            return { ok: false, error: '缺少产品类型' };
        }
        const region = data.region === 'international' || data.region === 'INTL' ? 'INTL' : 'CN';
        await eventBus.execute(commands.ACTIVATE_PRODUCT_MODE, {
            productType: data.productType,
            region: region,
            language: region === 'INTL' ? 'EN' : 'CN',
        });
        activated = true;
        return { ok: true };
    } catch (e) {
        return { ok: false, error: e && e.message ? String(e.message) : '激活失败' };
    }
};

/** @param {{ setHint: Function }} page */
wecomStore.startNetworkGuide = function (page) {
    netTimer = clearTimer(netTimer);
    netPage = page;
    const tick = async function () {
        if (!netPage) return;
        const status = await panelStatus();
        if (!netPage) return;
        if (!status.connected) {
            netPage.setHint(t('wecom.network.hint'));
            return;
        }
        if (!status.mqttConnected) {
            netPage.setHint(t('wecom.network.waitingMqtt'));
            return;
        }
        netPage.setHint(t('wecom.network.connected'));
        wecomStore.stopNetworkGuide();
        router.replace('wecom_bind');
    };
    netTimer = dxStd.setInterval(tick, NET_POLL_MS);
    tick();
};

wecomStore.stopNetworkGuide = function () {
    netTimer = clearTimer(netTimer);
    netPage = null;
};

/** @param {{ showLoading: Function, showQr: Function }} page */
wecomStore.startBindGuide = function (page) {
    bindTimer = clearTimer(bindTimer);
    bindPage = page;
    qrReady = false;
    bindFetching = false;
    page.showLoading();

    const tick = async function () {
        if (!bindPage || bindFetching) return;
        const status = await panelStatus();
        if (!bindPage) return;
        if (!status.connected || !status.mqttConnected) {
            wecomStore.stopBindGuide();
            router.replace('wecom_network');
            return;
        }
        if (qrReady) return;

        bindFetching = true;
        try {
            const data = await eventBus.execute(commands.FETCH_WECOM_BIND_QR);
            if (!bindPage) return;
            // 本地已绑定（例如冷启动误入）直接进首页，不依赖再等一次 control。
            if (data && Number(data.status) === 1) {
                wecomStore.stopBindGuide();
                router.replace('home');
                return;
            }
            if (data && data.bindQr) {
                bindPage.showQr(String(data.bindQr));
                qrReady = true;
            }
        } catch (_e) {
            // 下轮重试
        } finally {
            bindFetching = false;
        }
    };
    bindTimer = dxStd.setInterval(tick, BIND_POLL_MS);
    tick();
};

wecomStore.stopBindGuide = function () {
    bindTimer = clearTimer(bindTimer);
    bindPage = null;
    bindFetching = false;
    qrReady = false;
};

/** uiDriver.captureFace → 打开抓拍页并等待回包 */
wecomStore.runCapture = function (extra) {
    if (capturePending) {
        return Promise.reject(new AppError('300000', '远程抓拍进行中'));
    }
    const opts = extra && typeof extra === 'object' ? extra : {};
    return new Promise(function (resolve, reject) {
        capturePending = { resolve: resolve, reject: reject };
        try {
            router.navigate('wecom_capture', { keyId: opts.keyId, type: opts.type });
        } catch (e) {
            capturePending = null;
            reject(e);
        }
    });
};

wecomStore.finishCapture = function (payload) {
    if (!capturePending) return;
    const done = capturePending;
    capturePending = null;
    done.resolve(payload || {});
};

wecomStore.failCapture = function (reason) {
    if (!capturePending) return;
    const done = capturePending;
    capturePending = null;
    done.reject(new AppError('300000', String(reason || '抓拍失败')));
};

wecomStore.cancelCapture = function () {
    if (!capturePending) return;
    const done = capturePending;
    capturePending = null;
    done.reject(new AppError('300000', '远程抓拍已取消'));
};

/** 抓拍页调用：经 Command → wecom_service */
wecomStore.captureForReply = async function (option) {
    try {
        const payload = await eventBus.execute(commands.CAPTURE_WECOM_FACE, option || {});
        return { ok: true, payload: payload };
    } catch (e) {
        return { ok: false, error: e && e.message ? String(e.message) : 'capture_failed' };
    }
};

export default wecomStore;
