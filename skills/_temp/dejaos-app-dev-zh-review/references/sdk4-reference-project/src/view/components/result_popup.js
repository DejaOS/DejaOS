/**
 * @layer    view
 * @module   result_popup
 * @fires    none
 * @listens  none
 * @depends  dxUi,dxStd,font,layout,assets
 *
 * 底部渐变结果弹层：绿色成功 / 红色失败 + 居中白字。
 * 用于通行等结果反馈；设置页小 toast 仍用 popup。
 */

import dxui from '../../../dxmodules/dxUi.js';
import dxStd from '../../../dxmodules/dxStd.js';
import font from './font.js';
import layout from './layout.js';
import { asset } from '../utils/assets.js';

const IMG_SUCCESS = asset('1x/gradient_green_bottom.png');
const IMG_FAIL = asset('1x/gradient_red_bottom.png');

const PANEL_W = 800;
const PANEL_H = 400;
const DEFAULT_DURATION_MS = 2000;

let initialized = false;
let root = null;
let panel = null;
let bgImage = null;
let messageLabel = null;
let nameLabel = null;
let detailLabel = null;
let hideTimer = null;
/** @type {'success'|'fail'|''} */
let paintedKind = '';

function clearTimer() {
    if (hideTimer) {
        dxStd.clearTimeout(hideTimer);
        hideTimer = null;
    }
}

/**
 * @param {'success'|'fail'} kind
 * @param {string} message
 * @param {{ duration?: number }|null|undefined} options
 * @returns {boolean}
 */
function showModel(kind, model, options) {
    if (!initialized || !panel || !bgImage || !messageLabel || !nameLabel || !detailLabel) {
        return false;
    }
    const next = options || {};
    clearTimer();

    if (paintedKind !== kind) {
        bgImage.source(kind === 'success' ? IMG_SUCCESS : IMG_FAIL);
        paintedKind = kind;
    }
    const value = model || {};
    const name = String(value.name || '');
    const detail = String(value.detail || '');
    messageLabel.text(String(value.title || ''));
    messageLabel.align(dxui.Utils.ALIGN.CENTER, 0, layout.y(name || detail ? -20 : 40));
    if (name) { nameLabel.text(name); nameLabel.show(); } else nameLabel.hide();
    if (detail) { detailLabel.text(detail); detailLabel.show(); } else detailLabel.hide();
    panel.show();
    if (typeof panel.moveForeground === 'function') {
        panel.moveForeground();
    }
    root.show();

    const duration = next.duration === undefined ? DEFAULT_DURATION_MS : Number(next.duration);
    if (duration > 0) {
        hideTimer = dxStd.setTimeout(function () {
            resultPopup.hide();
        }, duration);
    }
    return true;
}

function showKind(kind, message, options) {
    return showModel(kind, { title: String(message == null ? '' : message) }, options);
}

const resultPopup = {};

/**
 * 构建 SYS 层底部结果条（全应用只调用一次）。
 */
resultPopup.init = function () {
    if (initialized) {
        return;
    }

    root = dxui.View.build('ui_result_popup_root', dxui.Utils.LAYER.SYS);
    root.setSize(layout.width, layout.height);
    layout.clearStyle(root);
    root.bgOpa(0);
    root.scroll(false);
    root.clickable(false);

    panel = dxui.View.build('ui_result_popup_panel', root);
    layout.clearStyle(panel);
    panel.setSize(layout.x(PANEL_W), layout.y(PANEL_H));
    panel.align(dxui.Utils.ALIGN.BOTTOM_MID, 0, 0);
    panel.bgOpa(0);
    panel.scroll(false);
    panel.clickable(false);

    bgImage = dxui.Image.build('ui_result_popup_bg', panel);
    bgImage.source(IMG_SUCCESS);
    bgImage.setSize(layout.x(PANEL_W), layout.y(PANEL_H));
    bgImage.align(dxui.Utils.ALIGN.CENTER, 0, 0);
    bgImage.clickable(false);
    paintedKind = 'success';

    messageLabel = dxui.Label.build('ui_result_popup_msg', panel);
    messageLabel.setSize(layout.x(720), layout.y(120));
    messageLabel.align(dxui.Utils.ALIGN.CENTER, 0, layout.y(40));
    messageLabel.textFont(font.get(layout.fontSize(40), dxui.Utils.FONT_STYLE.BOLD));
    messageLabel.textColor(0xffffff);
    messageLabel.textAlign(dxui.Utils.TEXT_ALIGN.CENTER);
    messageLabel.longMode(dxui.Utils.LABEL_LONG_MODE.WRAP);
    messageLabel.clickable(false);

    nameLabel = dxui.Label.build('ui_result_popup_name', panel);
    nameLabel.setSize(layout.x(720), layout.y(60));
    nameLabel.align(dxui.Utils.ALIGN.CENTER, 0, layout.y(48));
    nameLabel.textFont(font.get(layout.fontSize(32), dxui.Utils.FONT_STYLE.BOLD));
    nameLabel.textColor(0xffffff);
    nameLabel.textAlign(dxui.Utils.TEXT_ALIGN.CENTER);
    nameLabel.longMode(dxui.Utils.LABEL_LONG_MODE.WRAP);
    nameLabel.clickable(false);
    nameLabel.hide();

    detailLabel = dxui.Label.build('ui_result_popup_detail', panel);
    detailLabel.setSize(layout.x(720), layout.y(48));
    detailLabel.align(dxui.Utils.ALIGN.CENTER, 0, layout.y(100));
    detailLabel.textFont(font.get(layout.fontSize(24)));
    detailLabel.textColor(0xffffff);
    detailLabel.textAlign(dxui.Utils.TEXT_ALIGN.CENTER);
    detailLabel.longMode(dxui.Utils.LABEL_LONG_MODE.WRAP);
    detailLabel.clickable(false);
    detailLabel.hide();

    panel.hide();
    root.hide();
    initialized = true;
};

/**
 * @param {string} message
 * @param {{ duration?: number }=} options
 * @returns {boolean}
 */
resultPopup.showSuccess = function (message, options) {
    return showKind('success', message, options);
};

/**
 * @param {string} message
 * @param {{ duration?: number }=} options
 * @returns {boolean}
 */
resultPopup.showError = function (message, options) {
    return showKind('fail', message, options);
};

/** 结构化通行结果：标题、姓名和扩展信息分别布局，避免拼接长文本挤压。 */
resultPopup.showAccess = function (kind, model, options) {
    return showModel(kind === 'success' ? 'success' : 'fail', model || {}, options);
};

resultPopup.hide = function () {
    clearTimer();
    if (!initialized) {
        return false;
    }
    if (panel) {
        panel.hide();
    }
    if (root) {
        root.hide();
    }
    return true;
};

resultPopup.destroy = function () {
    if (!initialized) {
        return;
    }
    clearTimer();
    dxui.del(root);
    root = null;
    panel = null;
    bgImage = null;
    messageLabel = null;
    nameLabel = null;
    detailLabel = null;
    paintedKind = '';
    initialized = false;
};

export default resultPopup;
