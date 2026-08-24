/**
 * @layer    view
 * @module   text_metrics
 * @fires    none
 * @listens  none
 * @depends  none
 *
 * 文本像素宽度：按字体 lvFontGetGlyphDsc 累加 adv_w（DejaOS 标准写法）。
 */

/**
 * 按字体度量累加 adv_w，得到文本像素宽度（布局自适应用）。
 * @param {string} text
 * @param {object} fontRef dxui.Font 实例（需有 .obj.lvFontGetGlyphDsc）
 * @returns {number}
 */
export function getTextWidth(text, fontRef) {
    if (!text || !fontRef || !fontRef.obj || typeof fontRef.obj.lvFontGetGlyphDsc !== 'function') {
        return 0;
    }
    let w = 0;
    for (let i = 0; i < text.length; i++) {
        const nextCode = i + 1 < text.length ? text.charCodeAt(i + 1) : 0;
        const dsc = fontRef.obj.lvFontGetGlyphDsc(text.charCodeAt(i), nextCode);
        if (dsc && dsc.adv_w) {
            w += dsc.adv_w;
        }
    }
    return w;
}

export default {
    getTextWidth: getTextWidth,
};
