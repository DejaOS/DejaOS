/**
 * @layer    drivers
 * @module   capcal_driver
 * @fires    none
 * @listens  none
 * @depends  dxCapcal
 *
 * 摄像头双目标定驱动：封装 dxCapcal 的 init / calculate / getBox / deinit。
 * 调用前须已完成 capturer、ivcore 初始化，并由业务层暂停人脸识别。
 */

import dxCapcal from '../../dxmodules/dxCapcal.js';

let initialized = false;

function assertInitialized() {
    if (!initialized) {
        throw new Error('capcal_driver: module is not initialized');
    }
}

function assertStage(cnt) {
    if (cnt !== 0 && cnt !== 1) {
        throw new RangeError('capcal_driver: cnt must be 0 or 1');
    }
    return cnt;
}

const capcalDriver = {};

capcalDriver.init = function (options) {
    if (initialized) {
        return;
    }
    dxCapcal.init(options || {});
    initialized = true;
};

capcalDriver.deinit = function () {
    if (!initialized) {
        return;
    }
    dxCapcal.deinit();
    initialized = false;
};

/**
 * @param {0|1} cnt
 * @returns {Promise<boolean>}
 */
capcalDriver.calculate = function (cnt) {
    assertInitialized();
    return dxCapcal.calculate(assertStage(cnt));
};

/**
 * @param {0|1} cnt
 * @returns {{ x: number, y: number, w: number, h: number }}
 */
capcalDriver.getBox = function (cnt) {
    assertInitialized();
    return dxCapcal.getBox(assertStage(cnt));
};

capcalDriver.isInitialized = function () {
    return initialized;
};

export default capcalDriver;
