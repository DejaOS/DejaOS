/**
 * @layer view
 * @module face_box
 * @depends dxUi,font,layout,theme,i18n
 *
 * 全局人脸跟踪框。固定对象池避免检测帧内反复创建LVGL对象；四角框比整圆
 * 更贴近真实人脸矩形，也为诊断分数和后续人员扩展信息预留独立文本区。
 */

import dxui from '../../../dxmodules/dxUi.js';
import font from './font.js';
import layout from './layout.js';
import theme from './theme.js';
import { t } from '../i18n/index.js';

const MAX_BOXES = 8;
const CORNER_LEN = 34;
const BAR_W = 4;
const PADDING = 8;

const STATE_COLOR = {
    detecting: theme.faceBoxDetecting,
    live: theme.faceBoxLive,
    matched: theme.faceBoxMatched,
    failed: theme.faceBoxFailed,
    stranger: theme.faceBoxFailed,
};

let initialized = false;
let root = null;
let pool = [];
let visible = true;

function colorOf(state) {
    return STATE_COLOR[state] || STATE_COLOR.detecting;
}

function setBar(bar, x, y, w, h, color) {
    bar.setPos(x, y);
    bar.setSize(w, h);
    bar.bgColor(color);
    bar.show();
}

function numberText(value) {
    const n = Number(value);
    if (!Number.isFinite(n)) return '-';
    return Math.abs(n) >= 10 ? n.toFixed(1) : n.toFixed(2);
}

function diagnosticTextOf(face) {
    if (typeof face.diagnosticText === 'string') return face.diagnosticText;
    const d = face.diagnostic;
    if (!d || typeof d !== 'object') return '';
    const lines = [];
    if (d.livenessEnabled && d.livenessScore !== null && d.livenessScore !== undefined) {
        lines.push(t('faceBox.liveness') + ' ' + numberText(d.livenessScore)
            + ' / ' + numberText(d.livenessThreshold));
    }
    if (d.compareScore !== null && d.compareScore !== undefined) {
        lines.push(t('faceBox.compare') + ' ' + numberText(d.compareScore)
            + ' / ' + numberText(d.compareThreshold));
    }
    return lines.join('  ');
}

function paintText(panel, label, text, x, y, w, h, color) {
    if (!text) {
        panel.hide();
        return;
    }
    panel.setPos(x, y);
    panel.setSize(w, h);
    panel.show();
    label.setSize(w - layout.x(16), h);
    label.align(dxui.Utils.ALIGN.LEFT_MID, layout.x(8), 0);
    label.text(text);
    label.textColor(color);
}

function paintItem(face, item) {
    const rawX = Math.round(Number(face.x) || 0) - layout.x(PADDING);
    const rawY = Math.round(Number(face.y) || 0) - layout.y(PADDING);
    const rawW = Math.max(1, Math.round(Number(face.w) || 0)) + layout.x(PADDING * 2);
    const rawH = Math.max(1, Math.round(Number(face.h) || 0)) + layout.y(PADDING * 2);
    const x = Math.max(0, Math.min(layout.width - 1, rawX));
    const y = Math.max(0, Math.min(layout.height - 1, rawY));
    const w = Math.min(layout.width - x, rawW);
    const h = Math.min(layout.height - y, rawH);
    const len = Math.min(layout.x(CORNER_LEN), Math.floor(Math.min(w, h) / 2));
    const bar = Math.max(2, layout.x(BAR_W));
    const color = colorOf(face.state);
    const b = item.bars;

    setBar(b[0], x, y, len, bar, color);
    setBar(b[1], x, y, bar, len, color);
    setBar(b[2], x + w - len, y, len, bar, color);
    setBar(b[3], x + w - bar, y, bar, len, color);
    setBar(b[4], x, y + h - bar, len, bar, color);
    setBar(b[5], x, y + h - len, bar, len, color);
    setBar(b[6], x + w - len, y + h - bar, len, bar, color);
    setBar(b[7], x + w - bar, y + h - len, bar, len, color);

    const textW = Math.min(layout.width - x, Math.max(layout.x(180), w));
    const primary = face.primaryText || '';
    const diagnostic = diagnosticTextOf(face);
    const primaryH = layout.y(34);
    const diagH = layout.y(42);
    const primaryY = y >= primaryH + layout.y(4) ? y - primaryH - layout.y(4) : y + layout.y(4);
    const diagY = y + h + diagH <= layout.height ? y + h + layout.y(4) : y + h - diagH - layout.y(4);
    paintText(item.primaryPanel, item.primaryLabel, primary, x, primaryY, textW, primaryH, color);
    paintText(item.diagPanel, item.diagLabel, diagnostic, x, diagY, textW, diagH, color);
}

function hideItem(item) {
    for (let i = 0; i < item.bars.length; i++) item.bars[i].hide();
    item.primaryPanel.hide();
    item.diagPanel.hide();
}

function buildTextPanel(id, height, fontSize) {
    const panel = dxui.View.build(id + '_panel', root);
    layout.clearStyle(panel);
    panel.bgColor(0x000000);
    panel.bgOpa(58);
    panel.radius(layout.x(5));
    panel.scroll(false);
    panel.clickable(false);
    panel.hide();
    const label = dxui.Label.build(id + '_label', panel);
    label.textFont(font.get(layout.fontSize(fontSize)));
    label.textColor(theme.textOnDark);
    label.textAlign(dxui.Utils.TEXT_ALIGN.LEFT);
    label.longMode(dxui.Utils.LABEL_LONG_MODE.SCROLL_CIRCULAR);
    label.clickable(false);
    panel.setSize(layout.x(180), layout.y(height));
    return { panel: panel, label: label };
}

const faceBox = {};

faceBox.init = function () {
    if (initialized) return;
    root = dxui.View.build('ui_face_box', dxui.Utils.LAYER.TOP);
    root.setSize(layout.width, layout.height);
    root.setPos(0, 0);
    layout.clearStyle(root);
    root.bgOpa(0);
    root.scroll(false);
    root.clickable(false);

    pool = [];
    for (let i = 0; i < MAX_BOXES; i++) {
        const bars = [];
        for (let j = 0; j < 8; j++) {
            const bar = dxui.View.build('ui_face_box_' + i + '_bar_' + j, root);
            layout.clearStyle(bar);
            bar.bgColor(STATE_COLOR.detecting);
            bar.bgOpa(100);
            bar.radius(layout.x(2));
            bar.clickable(false);
            bar.hide();
            bars.push(bar);
        }
        const primary = buildTextPanel('ui_face_box_' + i + '_primary', 34, 18);
        const diagnostic = buildTextPanel('ui_face_box_' + i + '_diag', 42, 17);
        pool.push({
            bars: bars,
            primaryPanel: primary.panel,
            primaryLabel: primary.label,
            diagPanel: diagnostic.panel,
            diagLabel: diagnostic.label,
        });
    }
    root.show();
    initialized = true;
};

faceBox.applyFaces = function (faces) {
    if (!initialized) return false;
    if (!visible) return faceBox.clear();
    const list = Array.isArray(faces) ? faces : [];
    const count = Math.min(list.length, pool.length);
    for (let i = 0; i < count; i++) {
        if (list[i] && typeof list[i] === 'object') paintItem(list[i], pool[i]);
        else hideItem(pool[i]);
    }
    for (let i = count; i < pool.length; i++) hideItem(pool[i]);
    return true;
};

faceBox.clear = function () {
    if (!initialized) return false;
    for (let i = 0; i < pool.length; i++) hideItem(pool[i]);
    return true;
};

faceBox.setVisible = function (nextVisible) {
    visible = nextVisible === true;
    if (!visible) return faceBox.clear();
    return true;
};

faceBox.destroy = function () {
    if (!initialized) return;
    dxui.del(root);
    root = null;
    pool = [];
    visible = true;
    initialized = false;
};

export default faceBox;
