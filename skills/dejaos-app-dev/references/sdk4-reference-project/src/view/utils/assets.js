/**
 * @layer    view
 * @module   assets
 * @fires    none
 * @listens  none
 * @depends  none
 *
 * 设备端静态资源路径。页面与键盘等统一经此拼绝对路径。
 */

/** 设备端图片根目录（与 font 路径约定一致） */
export const IMAGE_DIR = '/app/code/resource/image/';

/**
 * 拼图片绝对路径。
 * @param {string} relativePath 相对 IMAGE_DIR，如 '1x/mqtt.png' 或 'backspace.png'
 * @returns {string}
 */
export function asset(relativePath) {
    if (!relativePath) {
        return IMAGE_DIR;
    }
    if (relativePath.charAt(0) === '/') {
        return relativePath;
    }
    return IMAGE_DIR + relativePath;
}

export default {
    IMAGE_DIR: IMAGE_DIR,
    asset: asset,
};
