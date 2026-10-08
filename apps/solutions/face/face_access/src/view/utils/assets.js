/**
 * @layer    view
 * @module   assets
 * @fires    none
 * @listens  none
 * @depends  dxDriver
 *
 * 设备端静态资源路径。按 DRIVER.MODEL 选图包（分辨率对应图标已按 vf105 800×1280 比例生成）。
 * 调用方传文件名，如 asset('mqtt.png')。
 */

import dxDriver from '../../../dxmodules/dxDriver.js';

/** 设备端图片根目录（与 font 路径约定一致） */
export const IMAGE_DIR = '/app/code/resource/image/';

/**
 * 当前图包目录名。
 * @returns {'vf105'|'vf114'|'vf201'|'vf202'|'vf203'}
 */
export function imagePack() {
    const model = String(
        (dxDriver.DRIVER && dxDriver.DRIVER.MODEL) || ''
    ).toUpperCase();
    if (model.indexOf('VF201') >= 0) {
        return 'vf201';
    }
    if (model.indexOf('VF114') >= 0) {
        return 'vf114';
    }
    if (model.indexOf('VF202') >= 0) {
        return 'vf202';
    }
    if (model.indexOf('VF203') >= 0) {
        return 'vf203';
    }
    if (model.indexOf('VF105') >= 0) {
        return 'vf105';
    }
    return 'vf105';
}

/**
 * 拼图片绝对路径。
 * @param {string} fileName 文件名，如 'mqtt.png'
 * @returns {string}
 */
export function asset(fileName) {
    if (!fileName) {
        return IMAGE_DIR + imagePack() + '/';
    }
    return IMAGE_DIR + imagePack() + '/' + fileName;
}

export default {
    IMAGE_DIR: IMAGE_DIR,
    imagePack: imagePack,
    asset: asset,
};
