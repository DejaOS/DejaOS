/**
 * @layer    view
 * @module   orientation
 * @fires    none
 * @listens  none
 * @depends  dxDriver
 *
 * 按板级型号区分竖屏 / 横屏 UI。
 * VF201_V10 为横屏（1280×720）；其余型号沿用竖屏页面。
 */

import dxDriver from '../../dxmodules/dxDriver.js';

/** 横屏设备型号 */
const LANDSCAPE_MODEL = 'vf201';

/**
 * @returns {boolean}
 */
export function isLandscape() {
    const model = dxDriver.DRIVER && dxDriver.DRIVER.MODEL;
    return model === LANDSCAPE_MODEL;
}
