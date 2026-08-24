/**
 * @layer    view
 * @module   font
 * @fires    none
 * @listens  none
 * @depends  dxUi
 */

import dxui from '../../../dxmodules/dxUi.js';

const FONT_PATH = '/app/code/resource/font/PangMenZhengDaoBiaoTiTi-1.ttf';
const cache = new Map();

const font = {};

font.get = function (size, style) {
    const normalizedSize = size === undefined ? 24 : size;
    const normalizedStyle = style === undefined ? dxui.Utils.FONT_STYLE.NORMAL : style;
    const key = normalizedSize + ':' + normalizedStyle;
    if (!cache.has(key)) {
        cache.set(key, dxui.Font.build(FONT_PATH, normalizedSize, normalizedStyle));
    }
    return cache.get(key);
};

export default font;
