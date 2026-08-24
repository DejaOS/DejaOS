/**
 * @layer    view
 * @module   page_header
 * @fires    none
 * @listens  none
 * @depends  dxUi,router,font,layout,theme,assets,status_bar,i18n
 *
 * 页面二级顶栏：贴在全局 status_bar 下方，左返回图标 + 居中标题。
 */

import dxui from '../../../dxmodules/dxUi.js';
import router from '../router/core.js';
import font from './font.js';
import layout from './layout.js';
import theme from './theme.js';
import statusBar from './status_bar.js';
import { asset } from '../utils/assets.js';
import { t } from '../i18n/index.js';

const IMG_BACK = asset('1x/back-filled.png');
/** 标题栏设计稿高度 */
const TITLE_BAR_H = 80;
/** 返回按钮按下加深底色 */
const BACK_BG_PRESSED = 0xe0e0e0;

const pageHeader = {};

/**
 * @returns {number} 标题栏屏像素高度
 */
pageHeader.barHeight = function () {
    return layout.y(TITLE_BAR_H);
};

/**
 * 内容区起始 Y（status_bar + 标题栏）。
 * @returns {number}
 */
pageHeader.contentTop = function () {
    return statusBar.height() + pageHeader.barHeight();
};

/**
 * 在 parent 上构建返回 + 标题栏。
 *
 * @param {object} parent dxUi 父节点
 * @param {object} options
 * @param {string} options.idPrefix 控件 id 前缀，须全局唯一
 * @param {string} options.titleKey i18n key
 * @param {Function} [options.onBack] 默认 router.back
 * @param {number} [options.bgOpa] 标题栏背景不透明度，0–100；默认 100
 * @returns {{ titleLabel: object, setTitle: Function, refresh: Function }}
 */
pageHeader.build = function (parent, options) {
    const idPrefix = options.idPrefix;
    const titleKey = options.titleKey;
    const onBack = typeof options.onBack === 'function'
        ? options.onBack
        : function () { router.back(); };
    const barBgOpa = options.bgOpa == null ? 100 : Number(options.bgOpa);

    const bar = dxui.View.build(idPrefix + '_title_bar', parent);
    bar.setSize(layout.width, pageHeader.barHeight());
    bar.setPos(0, statusBar.height());
    layout.clearStyle(bar);
    bar.bgColor(theme.pageBg);
    bar.bgOpa(barBgOpa);
    bar.scroll(false);

    const backHit = dxui.View.build(idPrefix + '_back_hit', bar);
    backHit.setSize(layout.x(72), layout.y(72));
    layout.clearStyle(backHit);
    backHit.align(dxui.Utils.ALIGN.LEFT_MID, layout.x(12), 0);
    backHit.radius(layout.x(16));
    backHit.bgColor(theme.pageBg);
    backHit.bgOpa(0);
    backHit.bgColor(BACK_BG_PRESSED, dxui.Utils.STATE.PRESSED);
    backHit.bgOpa(100, dxui.Utils.STATE.PRESSED);
    backHit.clickable(true);
    backHit.on(dxui.Utils.EVENT.CLICK, onBack);

    const backImg = dxui.Image.build(idPrefix + '_back_img', backHit);
    backImg.source(IMG_BACK);
    backImg.align(dxui.Utils.ALIGN.CENTER, 0, 0);
    backImg.clickable(false);

    const titleLabel = dxui.Label.build(idPrefix + '_title', bar);
    titleLabel.setSize(layout.x(480), layout.y(50));
    titleLabel.align(dxui.Utils.ALIGN.CENTER, 0, 0);
    titleLabel.text(t(titleKey));
    titleLabel.textFont(font.get(layout.fontSize(32), dxui.Utils.FONT_STYLE.BOLD));
    titleLabel.textColor(theme.textPrimary);
    titleLabel.textAlign(dxui.Utils.TEXT_ALIGN.CENTER);

    function setTitle(text) {
        titleLabel.text(text || '');
    }

    function refresh() {
        setTitle(t(titleKey));
    }

    return {
        titleLabel: titleLabel,
        setTitle: setTitle,
        refresh: refresh,
    };
};

export default pageHeader;
