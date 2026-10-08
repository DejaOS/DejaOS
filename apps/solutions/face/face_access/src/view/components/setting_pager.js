/**
 * @layer    view
 * @module   setting_pager
 * @fires    none
 * @listens  none
 * @depends  dxUi,layout,font,theme,page_header
 *
 * 设置列表翻页组件（横屏）：一页按 5 条行高排布；超出时底栏居中翻页。
 * 另提供右上角保存按钮与设置行底部分割线样式。
 */

import dxui from '../../../dxmodules/dxUi.js';
import layout from './layout.js';
import font from './font.js';
import theme from './theme.js';
import pageHeader from './page_header.js';

/** 设置页一屏最多展示条数 */
export const SETTING_PAGE_SIZE = 5;

/** 底栏高度（设计稿 px），settingPageRowH 会预留，避免挡住第 5 行 */
export const SETTING_PAGER_H = 64;

/** 右上角保存按钮（对齐 faceRecognitionSettingView） */
export const SAVE_BTN_W = 195;
export const SAVE_BTN_H = 66;
export const SAVE_BTN_RADIUS = 30;
export const SAVE_BTN_RIGHT = 103;

const BTN_W = 88;
const BTN_H = 48;
const GROUP_W = 400;
const BTN_RADIUS = 12;
const BTN_BG = 0x1a1a1a;

/**
 * 构建右上角保存按钮，挂在 title bar 区域。
 * @param {object} parent
 * @param {string} id
 * @param {function(): void} onClick
 * @returns {{ button: object, label: object }}
 */
export function buildTopSaveButton(parent, id, onClick) {
    const button = dxui.Button.build(id, parent);
    button.setSize(layout.x(SAVE_BTN_W), layout.y(SAVE_BTN_H));
    button.bgColor(0x3d3d3d);
    button.radius(layout.x(SAVE_BTN_RADIUS));
    button.borderWidth(0);
    const saveY = pageHeader.contentTop() - pageHeader.barHeight()
        + Math.round((pageHeader.barHeight() - layout.y(SAVE_BTN_H)) / 2);
    button.align(dxui.Utils.ALIGN.TOP_RIGHT, -layout.x(SAVE_BTN_RIGHT), saveY);
    button.on(dxui.Utils.EVENT.CLICK, onClick);
    if (typeof button.moveForeground === 'function') {
        button.moveForeground();
    }

    const label = dxui.Label.build(id + '_lbl', button);
    label.textFont(font.get(layout.fontSize(28)));
    label.textColor(0xffffff);
    label.align(dxui.Utils.ALIGN.CENTER, 0, 0);
    return { button: button, label: label };
}

export function settingPagerBarH() {
    return layout.y(SETTING_PAGER_H);
}

/**
 * 按一页 5 条计算行高（不足 5 条也按 5 条占位），底部预留翻页栏。
 * @param {number} listH 列表区域屏像素高度
 * @returns {number}
 */
export function settingPageRowH(listH) {
    return Math.floor(Math.max(0, listH - settingPagerBarH()) / SETTING_PAGE_SIZE);
}

/**
 * @param {object} parent
 * @param {object} options
 * @param {string} [options.idPrefix]
 * @param {number} options.rowH
 * @param {function(): (object|{ box: object })[]} [options.getRows]
 * @param {(object|{ box: object })[]} [options.rows]
 * @param {number} [options.pageSize]
 * @param {object[]} [options.placeholders] 不足 5 条时的占位行（可选）
 * @returns {{ bar: object, preBtn: object, nextBtn: object, apply: Function, reset: Function, hide: Function, show: Function, getPageIndex: Function }}
 */
export function attachSettingPager(parent, options) {
    const opts = options || {};
    const pageSize = opts.pageSize || SETTING_PAGE_SIZE;
    const idPrefix = opts.idPrefix || 'settingPager';
    let pageIndex = 0;
    let suppressed = false;

    function getBoxes() {
        const rows = typeof opts.getRows === 'function' ? opts.getRows() : (opts.rows || []);
        const boxes = [];
        for (let i = 0; i < rows.length; i++) {
            const row = rows[i];
            const box = row && (row.box || row);
            if (box) {
                boxes.push(box);
            }
        }
        return boxes;
    }

    const barH = settingPagerBarH();
    const btnH = layout.y(BTN_H);
    const btnW = layout.x(BTN_W);

    const bar = dxui.View.build(idPrefix + '_pager', parent);
    bar.setSize(layout.width, barH);
    bar.align(dxui.Utils.ALIGN.BOTTOM_MID, 0, 0);
    layout.clearStyle(bar);
    bar.bgColor(theme.pageBg);
    bar.bgOpa(100);
    bar.scroll(false);

    const group = dxui.View.build(idPrefix + '_pager_group', bar);
    layout.clearStyle(group);
    group.setSize(layout.x(GROUP_W), btnH);
    group.align(dxui.Utils.ALIGN.CENTER, 0, 0);
    group.bgOpa(0);
    group.scroll(false);

    function buildNavBtn(id, text, onClick) {
        const btn = dxui.Button.build(id, group);
        btn.setSize(btnW, btnH);
        btn.bgColor(BTN_BG);
        btn.radius(layout.x(BTN_RADIUS));
        btn.borderWidth(0);
        btn.on(dxui.Utils.EVENT.CLICK, onClick);
        const label = dxui.Label.build(id + '_lbl', btn);
        label.text(text);
        label.textFont(font.get(layout.fontSize(28)));
        label.textColor(theme.textOnDark);
        label.align(dxui.Utils.ALIGN.CENTER, 0, 0);
        return { btn: btn, label: label };
    }

    const pager = { bar: bar };

    const prev = buildNavBtn(idPrefix + 'PagePreBtn', '‹', function () {
        if (pageIndex <= 0) {
            return;
        }
        pageIndex -= 1;
        apply();
    });
    prev.btn.align(dxui.Utils.ALIGN.LEFT_MID, 0, 0);

    const pageLabel = dxui.Label.build(idPrefix + '_page_lbl', group);
    pageLabel.setSize(layout.x(180), layout.y(32));
    pageLabel.align(dxui.Utils.ALIGN.CENTER, 0, 0);
    pageLabel.textFont(font.getDefault(layout.fontSize(24)));
    pageLabel.textColor(theme.textPrimary);
    pageLabel.textAlign(dxui.Utils.TEXT_ALIGN.CENTER);

    const next = buildNavBtn(idPrefix + 'PageNextBtn', '›', function () {
        if (pageIndex >= Math.ceil(getBoxes().length / pageSize) - 1) {
            return;
        }
        pageIndex += 1;
        apply();
    });
    next.btn.align(dxui.Utils.ALIGN.RIGHT_MID, 0, 0);

    pager.preBtn = prev.btn;
    pager.nextBtn = next.btn;

    function setBtnEnabled(nav, enabled) {
        nav.btn.bgColor(enabled ? BTN_BG : theme.disabledBg);
        nav.btn.clickable(enabled);
    }

    function apply() {
        const boxes = getBoxes();
        const total = boxes.length;
        const totalPages = Math.max(1, Math.ceil(total / pageSize));
        if (pageIndex >= totalPages) {
            pageIndex = totalPages - 1;
        }
        if (pageIndex < 0) {
            pageIndex = 0;
        }
        const start = pageIndex * pageSize;
        const rowH = opts.rowH || 0;
        let visibleOnPage = 0;
        for (let index = 0; index < boxes.length; index++) {
            const box = boxes[index];
            if (index >= start && index < start + pageSize) {
                box.show();
                box.align(dxui.Utils.ALIGN.TOP_LEFT, 0, (index - start) * rowH);
                visibleOnPage += 1;
            } else {
                box.hide();
            }
        }

        const placeholders = opts.placeholders || [];
        for (let p = 0; p < placeholders.length; p++) {
            const slot = placeholders[p];
            if (!slot) {
                continue;
            }
            if (p < pageSize - visibleOnPage) {
                slot.show();
                slot.align(dxui.Utils.ALIGN.TOP_LEFT, 0, (visibleOnPage + p) * rowH);
            } else {
                slot.hide();
            }
        }

        const needPaging = !suppressed && total > pageSize;
        pageLabel.text((pageIndex + 1) + ' / ' + totalPages);
        setBtnEnabled(prev, pageIndex > 0);
        setBtnEnabled(next, pageIndex < totalPages - 1);
        if (needPaging) {
            bar.show();
            if (typeof bar.moveForeground === 'function') {
                bar.moveForeground();
            }
        } else {
            bar.hide();
        }
    }

    pager.apply = apply;
    /** 回到第 0 页（仅在明确需要重置时用；返回列表页请用 apply 保留翻页位置）。 */
    pager.reset = function () {
        pageIndex = 0;
        apply();
    };
    pager.getPageIndex = function () {
        return pageIndex;
    };
    /** 弹层等场景强制藏起底栏；下次 apply/show 再按条数决定。 */
    pager.hide = function () {
        suppressed = true;
        bar.hide();
    };
    pager.show = function () {
        suppressed = false;
        apply();
    };

    apply();
    return pager;
}

/**
 * 设置行视觉：透明底 + 底部分割线（对齐 faceRecognitionSettingView）。
 * @param {object} row
 */
export function styleSettingRow(row) {
    if (!row) {
        return;
    }
    row.bgOpa(0);
    if (typeof row.radius === 'function') {
        row.radius(0);
    }
    row.borderWidth(1);
    row.setBorderColor(0xd8d8d8);
    if (row.obj && typeof row.obj.setStyleBorderSide === 'function') {
        row.obj.setStyleBorderSide(dxui.Utils.ENUM.LV_BORDER_SIDE_BOTTOM, 0);
    }
}
