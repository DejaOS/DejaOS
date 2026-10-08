/**
 * @layer    view
 * @module   layout
 * @fires    none
 * @listens  none
 * @depends  dxDriver,orientation
 *
 * 设计稿基准：竖屏 800×1280，横屏（VF201_V10）1280×720。
 * 页面用 layout.x/y 做坐标缩放，fontSize 做字号缩放。
 * 有效分辨率唯一来源：dxDriver.DISPLAY。
 * 换分辨率：改 dxDriver 后同步到设备并重启应用，不做运行期覆盖。
 */

import dxDriver from '../../../dxmodules/dxDriver.js';
import { isLandscape } from '../orientation.js';

/** 设计稿宽（px），与坐标/字号缩放分母一致 */
const BASE_WIDTH = isLandscape() ? 1280 : 800;
/** 设计稿高（px） */
const BASE_HEIGHT = isLandscape() ? 720 : 1280;

const layout = {
    width: dxDriver.DISPLAY.WIDTH,
    height: dxDriver.DISPLAY.HEIGHT,
};

/**
 * 设计稿 X → 当前屏宽像素。
 * @param {number} value
 * @returns {number}
 */
layout.x = function (value) {
    return Math.round(value * layout.width / BASE_WIDTH);
};

/**
 * 设计稿 Y → 当前屏高像素。
 * @param {number} value
 * @returns {number}
 */
layout.y = function (value) {
    return Math.round(value * layout.height / BASE_HEIGHT);
};

/**
 * 设计稿字号 → 当前分辨率字号。
 * 取宽高缩放比的较小值，避免宽高比变化时文字被单向拉扁。
 * @param {number} designPx
 * @returns {number}
 */
layout.fontSize = function (designPx) {
    const scale = Math.min(layout.width / BASE_WIDTH, layout.height / BASE_HEIGHT);
    return Math.max(1, Math.round(designPx * scale));
};

/**
 * @returns {{ width: number, height: number, baseWidth: number, baseHeight: number }}
 */
layout.getResolution = function () {
    return {
        width: layout.width,
        height: layout.height,
        baseWidth: BASE_WIDTH,
        baseHeight: BASE_HEIGHT,
    };
};

/**
 * 禁止对象滚动（含超出物理屏时）。
 * 逻辑区大于真屏时 LVGL 默认 SCROLLABLE 会拖出滚动，外层必须关掉。
 * @param {object} obj dxUi 控件
 */
layout.disableScroll = function (obj) {
    if (!obj) {
        return;
    }
    if (typeof obj.scroll === 'function') {
        obj.scroll(false);
    }
    if (typeof obj.scrollbarMode === 'function') {
        obj.scrollbarMode(false);
    }
};

/**
 * 去掉 View/容器默认主题样式：圆角、内边距、边框。
 * @param {object} obj dxUi 控件
 */
layout.clearStyle = function (obj) {
    if (!obj) {
        return;
    }
    if (typeof obj.radius === 'function') {
        obj.radius(0);
    }
    if (typeof obj.padAll === 'function') {
        obj.padAll(0);
    }
    if (typeof obj.borderWidth === 'function') {
        obj.borderWidth(0);
    }
};

export default layout;
