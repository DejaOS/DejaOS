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
import { isLandscape } from '../orientation.js';

const IMG_SUCCESS = asset('gradient_green_bottom.png');
const IMG_FAIL = asset('gradient_red_bottom.png');
const MAX_LINES = 3;

/** 结果条宽度跟设计稿宽；横屏高度收矮 */
function panelDesignSize() {
    const landscape = isLandscape();
    return {
        w: layout.getResolution().baseWidth,
        h: landscape ? 260 : 400,
        textW: landscape ? 1000 : 720,
        titleFont: landscape ? 34 : 40,
        nameFont: landscape ? 28 : 32,
        detailFont: landscape ? 22 : 24,
        msgH: landscape ? 80 : 120,
        msgY: landscape ? 24 : 40,
        lineH: landscape ? 36 : 48,
        lineStartY: landscape ? 36 : 48,
        lineGap: landscape ? 36 : 48,
    };
}
const DEFAULT_DURATION_MS = 2000;

let initialized = false;
let root = null;
let panel = null;
let bgImage = null;
let messageLabel = null;
let lineLabels = [];
let hideTimer = null;
/** @type {'success'|'fail'|''} */
let paintedKind = '';

function clearTimer() {
    if (hideTimer) {
        dxStd.clearTimeout(hideTimer);
        hideTimer = null;
    }
}

function normalizeLines(model) {
    const value = model || {};
    if (Array.isArray(value.lines)) {
        return value.lines.filter(function (item) {
            return item && String(item.text || '').trim();
        }).slice(0, MAX_LINES);
    }
    // 兼容旧调用：name / detail 两个固定槽位。
    const lines = [];
    if (value.name) lines.push({ key: 'name', text: String(value.name), emphasis: true });
    if (value.detail) lines.push({ key: 'detail', text: String(value.detail), emphasis: false });
    return lines;
}

/**
 * @param {'success'|'fail'} kind
 * @param {object} model
 * @param {{ duration?: number }|null|undefined} options
 * @returns {boolean}
 */
function showModel(kind, model, options) {
    if (!initialized || !panel || !bgImage || !messageLabel || lineLabels.length < MAX_LINES) {
        return false;
    }
    const next = options || {};
    const size = panelDesignSize();
    clearTimer();

    if (paintedKind !== kind) {
        bgImage.source(kind === 'success' ? IMG_SUCCESS : IMG_FAIL);
        paintedKind = kind;
    }
    const value = model || {};
    const lines = normalizeLines(value);
    messageLabel.text(String(value.title || ''));
    messageLabel.align(dxui.Utils.ALIGN.CENTER, 0, layout.y(lines.length ? -20 : 40));

    for (let i = 0; i < MAX_LINES; i++) {
        const label = lineLabels[i];
        const line = lines[i];
        if (!line) {
            label.hide();
            continue;
        }
        const emphasis = !!(line.emphasis || line.key === 'name');
        label.text(String(line.text));
        label.textFont(font.get(
            layout.fontSize(emphasis ? size.nameFont : size.detailFont),
            emphasis ? dxui.Utils.FONT_STYLE.BOLD : dxui.Utils.FONT_STYLE.NORMAL
        ));
        label.align(dxui.Utils.ALIGN.CENTER, 0, layout.y(size.lineStartY + i * size.lineGap));
        label.show();
    }
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

    const size = panelDesignSize();

    panel = dxui.View.build('ui_result_popup_panel', root);
    layout.clearStyle(panel);
    panel.setSize(layout.x(size.w), layout.y(size.h));
    panel.align(dxui.Utils.ALIGN.BOTTOM_MID, 0, 0);
    panel.bgOpa(0);
    panel.scroll(false);
    panel.clickable(false);

    bgImage = dxui.Image.build('ui_result_popup_bg', panel);
    bgImage.source(IMG_SUCCESS);
    // Image 按原图像素绘制、setSize 不会拉伸；矮于面板时贴底，避免底缝露出 SN/IP。
    bgImage.align(dxui.Utils.ALIGN.BOTTOM_MID, 0, 0);
    bgImage.clickable(false);
    paintedKind = 'success';

    messageLabel = dxui.Label.build('ui_result_popup_msg', panel);
    messageLabel.setSize(layout.x(size.textW), layout.y(size.msgH));
    messageLabel.align(dxui.Utils.ALIGN.CENTER, 0, layout.y(size.msgY));
    messageLabel.textFont(font.get(layout.fontSize(size.titleFont), dxui.Utils.FONT_STYLE.BOLD));
    messageLabel.textColor(0xffffff);
    messageLabel.textAlign(dxui.Utils.TEXT_ALIGN.CENTER);
    messageLabel.longMode(dxui.Utils.LABEL_LONG_MODE.WRAP);
    messageLabel.clickable(false);

    lineLabels = [];
    for (let i = 0; i < MAX_LINES; i++) {
        const label = dxui.Label.build('ui_result_popup_line_' + i, panel);
        label.setSize(layout.x(size.textW), layout.y(size.lineH));
        label.align(dxui.Utils.ALIGN.CENTER, 0, layout.y(size.lineStartY + i * size.lineGap));
        label.textFont(font.get(layout.fontSize(size.detailFont)));
        label.textColor(0xffffff);
        label.textAlign(dxui.Utils.TEXT_ALIGN.CENTER);
        label.longMode(dxui.Utils.LABEL_LONG_MODE.WRAP);
        label.clickable(false);
        label.hide();
        lineLabels.push(label);
    }

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

/** 结构化通行结果：标题 + 按配置顺序的信息行（姓名可强调字号，但不固定槽位）。 */
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
    lineLabels = [];
    paintedKind = '';
    initialized = false;
};

export default resultPopup;
