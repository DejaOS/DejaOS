/**
 * @layer    domain
 * @module   capcal_domain
 * @depends  capcal_driver,face_driver,dxLogger
 *
 * 摄像头标定会话能力：init / calculate / 写入标定路径 / deinit。
 * 跨模块编排（暂停识别、临时红外、播音、恢复）由 capcal_service 负责。
 */

import dxLogger from '../../dxmodules/dxLogger.js';
import capcalDriver from '../drivers/capcal_driver.js';
import faceDriver from '../drivers/face_driver.js';

const CAPCAL_PATH = '/etc/.cameraCalibration';

/** 标定会话是否可 calculate / applyResult（init 成功后才为 true）。 */
let sessionActive = false;
/** 进行中的 calculate Promise；deinit 前必须等它结束，否则会抛错。 */
let calculatePromise = null;
let ending = false;

function needsCleanup() {
    return sessionActive
        || capcalDriver.isInitialized()
        || calculatePromise !== null;
}

async function waitCalculateSettled() {
    if (!calculatePromise) {
        return;
    }
    try {
        await calculatePromise;
    } catch (e) {
        dxLogger.error('capcal_domain wait calculate failed: ' + (e && e.message ? e.message : e));
    }
}

const capcalDomain = {};

/**
 * 初始化标定驱动并返回两档引导框。
 * 调用前须由 Service 完成暂停识别、临时红外等环境准备。
 * @returns {{ box0: object, box1: object }}
 */
capcalDomain.initSession = function () {
    if (sessionActive || capcalDriver.isInitialized()) {
        throw new Error('capcal_domain: session already active');
    }
    capcalDriver.init();
    sessionActive = true;
    return {
        box0: capcalDriver.getBox(0),
        box1: capcalDriver.getBox(1),
    };
};

/**
 * @param {0|1} stage
 * @returns {Promise<{ ok: boolean, durationMs: number }>}
 */
capcalDomain.calculate = async function (stage) {
    if (!sessionActive) {
        throw new Error('capcal_domain: session is not active');
    }
    if (ending) {
        throw new Error('capcal_domain: session is ending');
    }
    const started = Date.now();
    const pending = capcalDriver.calculate(stage);
    calculatePromise = pending;
    try {
        const ok = await pending;
        return {
            ok: ok === true,
            durationMs: Date.now() - started,
        };
    } finally {
        if (calculatePromise === pending) {
            calculatePromise = null;
        }
    }
};

/**
 * 两档完成后写入人脸标定路径（仅驱动运行时配置，不落业务配置库）。
 * @returns {{ path: string }}
 */
capcalDomain.applyResult = function () {
    if (!sessionActive) {
        throw new Error('capcal_domain: session is not active');
    }
    if (faceDriver.isInitialized()) {
        faceDriver.setConfig({ capcal_path: CAPCAL_PATH });
    }
    return { path: CAPCAL_PATH };
};

/**
 * 结束会话：先等 calculate 再 deinit。
 * @returns {Promise<boolean>} true 表示清理完成；false 表示 deinit 仍失败
 */
capcalDomain.deinitSession = async function () {
    if (ending) {
        return !capcalDriver.isInitialized() && !needsCleanup();
    }
    if (!needsCleanup()) {
        return true;
    }

    ending = true;
    let cleaned = true;
    try {
        await waitCalculateSettled();

        try {
            if (capcalDriver.isInitialized()) {
                capcalDriver.deinit();
            }
        } catch (e) {
            cleaned = false;
            dxLogger.error('capcal_domain deinit failed: ' + e.message);
        }

        // 即使 deinit 失败也结束 session，避免继续 calculate。
        sessionActive = false;
        return cleaned;
    } finally {
        ending = false;
    }
};

capcalDomain.isActive = function () {
    return sessionActive;
};

export default capcalDomain;
