/**
 * @layer    view
 * @module   confirm
 * @fires    none
 * @listens  none
 * @depends  dxUi,font,layout,theme
 *
 * 二次确认弹窗：与 toast 型 popup 分离。
 * 半透明遮罩挡住背后页面，用户必须点「确认」或「取消」才关闭。
 */

import dxui from '../../../dxmodules/dxUi.js';
import font from './font.js';
import layout from './layout.js';
import theme from './theme.js';

let initialized = false;
let root = null;
let card = null;
let titleLabel = null;
let messageLabel = null;
let cancelBtn = null;
let cancelLabel = null;
let confirmBtn = null;
let confirmLabel = null;

/** 当前一次 show 的回调；hide 后清空，避免过期闭包被误触发 */
let pendingOnConfirm = null;
let pendingOnCancel = null;

/**
 * 安全调用回调：业务侧异常不影响弹窗关闭与组件状态。
 * @param {Function|null|undefined} fn
 */
function invokeCallback(fn) {
    if (typeof fn !== 'function') {
        return;
    }
    try {
        fn();
    } catch (_e) {
        // 回调异常由业务侧自行处理；confirm 只保证 UI 能关干净
    }
}

/**
 * 关闭弹窗并清空回调引用。
 * @param {'confirm'|'cancel'|null} reason — 触发来源；null 表示仅 hide，不回调
 */
function closeWith(reason) {
    const onConfirm = pendingOnConfirm;
    const onCancel = pendingOnCancel;
    pendingOnConfirm = null;
    pendingOnCancel = null;

    if (root) {
        root.hide();
    }

    if (reason === 'confirm') {
        invokeCallback(onConfirm);
    } else if (reason === 'cancel') {
        invokeCallback(onCancel);
    }
}

const confirm = {};

/**
 * 构建 SYS 层确认框（全应用生命周期只调用一次）。
 * 遮罩可点：挡住背后页面；点遮罩本身不关闭，避免误触。
 */
confirm.init = function () {
    if (initialized) {
        return;
    }

    // SYS 层始终在普通页面之上；与 popup 同层时后 init 的节点更靠上。
    root = dxui.View.build('ui_confirm_root', dxui.Utils.LAYER.SYS);
    root.setSize(layout.width, layout.height);
    root.bgColor(0x000000);
    root.bgOpa(theme.maskOpa);
    // 遮罩必须直角铺满全屏；不设的话会吃到 LVGL 默认主题圆角。
    root.radius(0);
    root.borderWidth(0);
    root.padAll(0);
    layout.disableScroll(root);
    root.clickable(true);

    card = dxui.View.build('ui_confirm_card', root);
    card.setSize(layout.x(560), layout.y(320));
    card.align(dxui.Utils.ALIGN.CENTER, 0, layout.y(-40));
    card.bgColor(theme.pageBg);
    card.bgOpa(100);
    card.radius(layout.x(20));
    card.borderWidth(0);
    card.padAll(0);
    layout.disableScroll(card);
    // 阻止点击穿透到遮罩（若后续给遮罩加关闭逻辑，卡片区域仍不会误关）
    card.clickable(true);

    titleLabel = dxui.Label.build('ui_confirm_title', card);
    titleLabel.setSize(layout.x(500), layout.y(55));
    titleLabel.setPos(layout.x(30), layout.y(30));
    titleLabel.text('确认');
    titleLabel.textFont(font.get(layout.fontSize(28), dxui.Utils.FONT_STYLE.BOLD));
    titleLabel.textAlign(dxui.Utils.TEXT_ALIGN.CENTER);
    titleLabel.textColor(theme.textPrimary);

    messageLabel = dxui.Label.build('ui_confirm_message', card);
    messageLabel.setSize(layout.x(500), layout.y(110));
    messageLabel.setPos(layout.x(30), layout.y(95));
    messageLabel.text('');
    messageLabel.textFont(font.get(layout.fontSize(24)));
    messageLabel.textAlign(dxui.Utils.TEXT_ALIGN.CENTER);
    messageLabel.textColor(0x444444);
    messageLabel.longMode(dxui.Utils.LABEL_LONG_MODE.WRAP);

    // 左：取消（灰） / 右：确认（蓝）
    cancelBtn = dxui.Button.build('ui_confirm_cancel_btn', card);
    cancelBtn.setSize(layout.x(220), layout.y(70));
    cancelBtn.setPos(layout.x(40), layout.y(220));
    cancelBtn.bgColor(0xeeeeee);
    cancelBtn.radius(layout.x(12));
    cancelBtn.borderWidth(0);
    cancelBtn.on(dxui.Utils.EVENT.CLICK, function () {
        closeWith('cancel');
    });

    cancelLabel = dxui.Label.build('ui_confirm_cancel_label', cancelBtn);
    cancelLabel.text('取消');
    cancelLabel.textFont(font.get(layout.fontSize(26)));
    cancelLabel.textColor(0x555555);
    cancelLabel.align(dxui.Utils.ALIGN.CENTER, 0, 0);

    confirmBtn = dxui.Button.build('ui_confirm_ok_btn', card);
    confirmBtn.setSize(layout.x(220), layout.y(70));
    confirmBtn.setPos(layout.x(300), layout.y(220));
    confirmBtn.bgColor(theme.accent);
    confirmBtn.radius(layout.x(12));
    confirmBtn.borderWidth(0);
    confirmBtn.on(dxui.Utils.EVENT.CLICK, function () {
        closeWith('confirm');
    });

    confirmLabel = dxui.Label.build('ui_confirm_ok_label', confirmBtn);
    confirmLabel.text('确认');
    confirmLabel.textFont(font.get(layout.fontSize(26)));
    confirmLabel.textColor(theme.textOnDark);
    confirmLabel.align(dxui.Utils.ALIGN.CENTER, 0, 0);

    root.hide();
    initialized = true;
};

/**
 * 显示确认框。若已有弹窗在显示，会替换文案与回调（不堆叠）。
 *
 * @param {object} [options]
 * @param {string} [options.title='确认']
 * @param {string} [options.message='']
 * @param {string} [options.confirmText='确认']
 * @param {string} [options.cancelText='取消']
 * @param {boolean} [options.showCancel=true] — false 时只显示确认键（告警类）
 * @param {Function} [options.onConfirm]
 * @param {Function} [options.onCancel]
 * @returns {boolean} 未 init 时返回 false
 */
confirm.show = function (options) {
    if (!initialized) {
        return false;
    }
    const next = options || {};

    pendingOnConfirm = next.onConfirm;
    pendingOnCancel = next.onCancel;

    titleLabel.text(next.title || '确认');
    messageLabel.text(next.message || '');
    confirmLabel.text(next.confirmText || '确认');
    cancelLabel.text(next.cancelText || '取消');

    const showCancel = next.showCancel !== false;
    if (showCancel) {
        cancelBtn.show();
        // 双按钮：取消左、确认右
        cancelBtn.setPos(layout.x(40), layout.y(220));
        confirmBtn.setPos(layout.x(300), layout.y(220));
        confirmBtn.setSize(layout.x(220), layout.y(70));
    } else {
        cancelBtn.hide();
        // 仅确认：居中加宽，降低误触成本
        confirmBtn.setPos(layout.x(120), layout.y(220));
        confirmBtn.setSize(layout.x(320), layout.y(70));
    }

    root.show();
    return true;
};

/**
 * 仅关闭 UI，不触发 onConfirm / onCancel。
 * 适用于路由切换、页面销毁等强制收起场景。
 * @returns {boolean}
 */
confirm.hide = function () {
    if (!initialized) {
        return false;
    }
    closeWith(null);
    return true;
};

confirm.destroy = function () {
    if (!initialized) {
        return;
    }
    pendingOnConfirm = null;
    pendingOnCancel = null;
    dxui.del(root);
    root = null;
    card = null;
    titleLabel = null;
    messageLabel = null;
    cancelBtn = null;
    cancelLabel = null;
    confirmBtn = null;
    confirmLabel = null;
    initialized = false;
};

export default confirm;
