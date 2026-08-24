/** SYS层屏保：无广告时显示时钟，有广告时按清单轮播。 */
import dxui from '../../../dxmodules/dxUi.js';
import dxStd from '../../../dxmodules/dxStd.js';
import font from './font.js';
import layout from './layout.js';
import theme from './theme.js';
import { t } from '../i18n/index.js';
import router from '../router/core.js';
import systemStore from '../pages/system/system_store.js';
import callStore from '../pages/call/call_store.js';
import eventBus from '../../core/event_bus.js';
import commands from '../../core/commands.js';

const POLL_MS = 1000;
const CLOCK_MS = 1000;
const BG_COLOR = 0x0d1117;
const EMPTY = { enabled: false, intervalSec: 10, showClock: false, items: [] };
let initialized = false;
let root = null;
let bgImg = null;
let clockLbl = null;
let dateLbl = null;
let clockTimer = null;
let advertTimer = null;
let pollTimer = null;
let visible = false;
let advertIndex = 0;
let advertisements = EMPTY;
let timeoutMinutes = 0;

function pad2(n) { return n < 10 ? '0' + n : String(n); }
function paintClock(date) {
    if (!clockLbl || !dateLbl) return;
    clockLbl.text(pad2(date.getHours()) + ':' + pad2(date.getMinutes()) + ':' + pad2(date.getSeconds()));
    dateLbl.text(date.getFullYear() + '-' + pad2(date.getMonth() + 1) + '-' + pad2(date.getDate())
        + '  ' + t('screensaver.weekday.' + date.getDay()));
}
function tickClock() { paintClock(new Date()); }
function stopClock() {
    if (clockTimer) dxStd.clearInterval(clockTimer);
    clockTimer = null;
}
function stopAdvert() {
    if (advertTimer) dxStd.clearInterval(advertTimer);
    advertTimer = null;
}
function hasAds() { return advertisements.enabled && advertisements.items.length > 0; }
function applyClockVisibility() {
    const show = !hasAds() || advertisements.showClock;
    if (show) {
        clockLbl.show();
        dateLbl.show();
        tickClock();
        stopClock();
        clockTimer = dxStd.setInterval(tickClock, CLOCK_MS);
    } else {
        stopClock();
        clockLbl.hide();
        dateLbl.hide();
    }
}
function applyAdvert() {
    if (!bgImg || !hasAds()) {
        if (bgImg) bgImg.hide();
        return;
    }
    const item = advertisements.items[advertIndex % advertisements.items.length];
    try {
        bgImg.source(item.path);
        bgImg.show();
    } catch (_e) {
        bgImg.hide();
    }
}
function startAdvert() {
    stopAdvert();
    applyAdvert();
    if (hasAds() && advertisements.items.length > 1) {
        advertTimer = dxStd.setInterval(function () {
            advertIndex = (advertIndex + 1) % advertisements.items.length;
            applyAdvert();
        }, advertisements.intervalSec * 1000);
    }
}
function normalize(state) {
    const value = state && typeof state === 'object' ? state : EMPTY;
    const items = Array.isArray(value.items) ? value.items.filter(function (item) {
        return item && typeof item.path === 'string'
            && item.path.indexOf('/data/face_app/advert/active/') === 0;
    }).slice(0, 10) : [];
    const interval = Number(value.intervalSec);
    return {
        enabled: value.enabled === true && items.length > 0,
        intervalSec: Number.isInteger(interval) && interval >= 3 && interval <= 300 ? interval : 10,
        showClock: value.showClock === true,
        items: items,
    };
}
function getTimeoutMs() {
    return timeoutMinutes > 0 ? timeoutMinutes * 60 * 1000 : 0;
}
function canAutoShow() {
    return router.isInitialized() && !callStore.isInCall() && router.getCurrent() === 'home';
}
function pollIdle() {
    if (visible || !canAutoShow()) return;
    const timeoutMs = getTimeoutMs();
    if (timeoutMs <= 0) return;
    let idleMs;
    try { idleMs = Number(dxui.getIdleDuration()); } catch (_e) { return; }
    if (Number.isFinite(idleMs) && idleMs >= timeoutMs) screensaver.show();
}

const screensaver = {};
screensaver.init = async function () {
    if (initialized) return;
    try {
        screensaver.setTimeoutMinutes(systemStore.getConfig().screensaver);
    } catch (_e) {
        timeoutMinutes = 0;
    }
    root = dxui.View.build('ui_screensaver_root', dxui.Utils.LAYER.SYS);
    root.setSize(layout.width, layout.height);
    root.setPos(0, 0);
    layout.clearStyle(root);
    root.bgColor(BG_COLOR);
    root.bgOpa(100);
    root.radius(0);
    root.borderWidth(0);
    root.padAll(0);
    layout.disableScroll(root);
    root.clickable(true);
    root.on(dxui.Utils.EVENT.CLICK, function () { screensaver.hide(); });

    bgImg = dxui.Image.build('ui_screensaver_bg', root);
    layout.clearStyle(bgImg);
    bgImg.setSize(layout.width, layout.height);
    bgImg.align(dxui.Utils.ALIGN.CENTER, 0, 0);
    bgImg.clickable(false);
    bgImg.hide();

    clockLbl = dxui.Label.build('ui_screensaver_clock', root);
    clockLbl.setSize(layout.x(720), layout.y(140));
    clockLbl.align(dxui.Utils.ALIGN.CENTER, 0, layout.y(-40));
    clockLbl.textFont(font.get(layout.fontSize(96), dxui.Utils.FONT_STYLE.BOLD));
    clockLbl.textColor(theme.textOnDark);
    clockLbl.textAlign(dxui.Utils.TEXT_ALIGN.CENTER);
    clockLbl.clickable(false);

    dateLbl = dxui.Label.build('ui_screensaver_date', root);
    dateLbl.setSize(layout.x(720), layout.y(56));
    dateLbl.align(dxui.Utils.ALIGN.CENTER, 0, layout.y(80));
    dateLbl.textFont(font.get(layout.fontSize(28)));
    dateLbl.textColor(0xcccccc);
    dateLbl.textAlign(dxui.Utils.TEXT_ALIGN.CENTER);
    dateLbl.clickable(false);

    root.hide();
    initialized = true;
    pollTimer = dxStd.setInterval(pollIdle, POLL_MS);
    try { advertisements = normalize(await eventBus.execute(commands.GET_ADVERTISEMENTS, {})); }
    catch (_e) { advertisements = EMPTY; }
};
screensaver.show = function () {
    if (!initialized || !root) return false;
    advertIndex = 0;
    startAdvert();
    applyClockVisibility();
    root.show();
    if (typeof root.moveForeground === 'function') root.moveForeground();
    visible = true;
    return true;
};
screensaver.hide = function () {
    if (!initialized || !root) return false;
    stopAdvert();
    stopClock();
    root.hide();
    visible = false;
    if (typeof dxui.trigActivity === 'function') dxui.trigActivity();
    return true;
};
screensaver.isVisible = function () { return visible; };

/**
 * 更新自动屏保时间。配置可能来自设备UI、WebServer或MQTT，不能只依赖
 * View Store的启动快照，否则外部修改已经落库但当前进程仍使用旧值。
 */
screensaver.setTimeoutMinutes = function (minutes) {
    const value = Number(minutes);
    timeoutMinutes = Number.isFinite(value) && value > 0 ? Math.round(value) : 0;
    if (visible && timeoutMinutes === 0) screensaver.hide();
    return true;
};

screensaver.setAdvertisements = function (state) {
    advertisements = normalize(state);
    advertIndex = 0;
    if (visible) {
        startAdvert();
        applyClockVisibility();
    }
    return true;
};
screensaver.destroy = function () {
    if (!initialized) return;
    stopAdvert();
    stopClock();
    if (pollTimer) dxStd.clearInterval(pollTimer);
    pollTimer = null;
    if (root) dxui.del(root);
    root = bgImg = clockLbl = dateLbl = null;
    advertisements = EMPTY;
    timeoutMinutes = 0;
    visible = false;
    initialized = false;
};
export default screensaver;
