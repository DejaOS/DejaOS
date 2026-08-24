/**
 * @layer    domain
 * @module   finger_domain
 * @depends  finger_driver,ui_domain,audio_domain,dxStd,dxLogger,dxCommonUtils,core/error
 *
 * 指纹模块语义：通行/录入场景、三次采指编排、模板增删。
 * 不监听、不 fire EventBus；进度经 ui_domain → ui_driver 下发（长操作 UI 侧信道）。
 *
 * 并发约定（两层，禁止嵌套抢锁）：
 * - uiSession：远程申请页，只停通行，不占 exclusive。
 * - busOwner：采指/写库独占串口；acquire 同步占位，仅持有方在 finally 释放。
 * interrupt：作废 token + cancel，等待放锁（超时则强制释放），再通知 UI。
 * 首页 START 只看 busOwner。
 */

import fingerDriver from '../drivers/finger_driver.js';
import uiDomain from './ui_domain.js';
import audioDomain from './audio_domain.js';
import dxStd from '../../dxmodules/dxStd.js';
import dxLogger from '../../dxmodules/dxLogger.js';
import dxCommonUtils from '../../dxmodules/dxCommonUtils.js';
import { AppError } from '../core/error.js';

const TOTAL_STEPS = 3;
const DEFAULT_TIMEOUT_SEC = 60;
const INTERRUPT_WAIT_MS = 5000;
const FINGER_TYPE = '500';

const SCENE = Object.freeze({
    ACCESS: 'access',
    ENROLL: 'enroll',
    OFF: '',
});

let enrollToken = 0;
/** 远程申请/录入 UI 是否进行中（与 bus 分离）。 */
let uiSession = false;
/** @type {null|'enroll'|'write'} 串口独占方。 */
let busOwner = null;
/** write 释放时是否恢复通行；enroll 释放后一律 OFF。 */
let savedAccess = false;

function sleep(ms) {
    return new Promise(function (resolve) {
        dxStd.setTimeout(resolve, ms);
    });
}

function ensureReady() {
    if (!fingerDriver.isInitialized()) {
        throw new AppError('200000', '指纹功能未启用');
    }
}

function busyError() {
    return new AppError('200000', '指纹模块忙（' + (busOwner || 'session') + '），请稍后再试');
}

function notifyProgress(payload) {
    try {
        uiDomain.notifyFingerEnroll(payload);
    } catch (e) {
        dxLogger.error('finger_domain progress notify failed: ' + e.message);
    }
}

function playFingerCue(name) {
    return audioDomain.playFinger(name).catch(function (e) {
        dxLogger.info('finger_domain audio skipped: ' + e.message);
    });
}

function isAlive(token) {
    return token === enrollToken;
}

function setOff() {
    if (!fingerDriver.isInitialized()) return;
    fingerDriver.setEventScene(SCENE.OFF);
    fingerDriver.setAccessEnabled(false);
}

/**
 * 独占串口。同步占位后再 await，避免 TOCTOU。
 * @param {'enroll'|'write'} owner
 */
async function acquireBus(owner) {
    ensureReady();
    if (busOwner) {
        throw busyError();
    }
    savedAccess = fingerDriver.getEventScene() === SCENE.ACCESS;
    busOwner = owner;
    try {
        await fingerDriver.beginExclusive();
        if (owner === 'enroll') {
            fingerDriver.setEventScene(SCENE.ENROLL);
        } else {
            fingerDriver.setEventScene(SCENE.OFF);
        }
    } catch (e) {
        busOwner = null;
        savedAccess = false;
        if (fingerDriver.isInitialized()) {
            try { fingerDriver.endExclusive(); } catch (_e) {}
        }
        throw e;
    }
}

/**
 * @param {'enroll'|'write'} owner
 */
function releaseBus(owner) {
    if (busOwner !== owner) {
        return;
    }
    const restoreAccess = owner === 'write' && savedAccess;
    busOwner = null;
    savedAccess = false;
    if (!fingerDriver.isInitialized()) {
        return;
    }
    fingerDriver.endExclusive();
    if (restoreAccess) {
        fingerDriver.setEventScene(SCENE.ACCESS);
        fingerDriver.setAccessEnabled(true);
    } else {
        setOff();
    }
}

/**
 * @returns {'ok'|'abort'|'timeout'}
 */
async function captureStep(token, bufferId, deadline) {
    while (isAlive(token)) {
        if (Date.now() > deadline) return 'timeout';
        const img = await fingerDriver.getEnrollImage();
        if (!isAlive(token)) return 'abort';
        if (img === 0) {
            const gen = await fingerDriver.genChar(bufferId);
            if (!isAlive(token)) return 'abort';
            if (gen === 0) return 'ok';
        }
        await sleep(200);
    }
    return 'abort';
}

/**
 * ZAZ 步间等手指离开；未离开则 merge 会报 0x1a MERGE_FAILED。
 * @returns {'ok'|'abort'|'timeout'}
 */
async function waitFingerLeaveStep(token, deadline) {
    while (isAlive(token)) {
        if (Date.now() > deadline) return 'timeout';
        const leave = await fingerDriver.waitFingerLeave(deadline);
        if (!isAlive(token)) return 'abort';
        if (leave === 0) return 'ok';
        if (Date.now() >= deadline) return 'timeout';
        await sleep(200);
    }
    return 'abort';
}

async function runEnroll(options) {
    ensureReady();
    const opts = options || {};
    const mode = opts.mode === 'remote' ? 'remote' : 'local';
    const timeoutSec = Number(opts.timeout) > 0 ? Number(opts.timeout) : DEFAULT_TIMEOUT_SEC;
    const token = ++enrollToken;
    const deadline = Date.now() + timeoutSec * 1000;

    await acquireBus('enroll');
    try {
        if (!isAlive(token)) {
            throw new AppError('200000', '指纹录入已中断');
        }

        notifyProgress({ phase: 'collecting', step: 0, total: TOTAL_STEPS, mode: mode });
        await playFingerCue('fingerInput1');

        for (let bufferId = 1; bufferId <= TOTAL_STEPS; bufferId++) {
            if (!isAlive(token)) {
                notifyProgress({ phase: 'fail', step: bufferId - 1, total: TOTAL_STEPS, mode: mode });
                await playFingerCue('fingerF');
                throw new AppError('200000', '指纹录入已中断');
            }
            notifyProgress({
                phase: 'collecting',
                step: bufferId - 1,
                total: TOTAL_STEPS,
                mode: mode,
            });
            const wait = await captureStep(token, bufferId, deadline);
            if (wait === 'timeout') {
                notifyProgress({ phase: 'timeout', step: bufferId - 1, total: TOTAL_STEPS, mode: mode });
                await playFingerCue('fingerT');
                throw new AppError('200000', '指纹录入超时');
            }
            if (wait === 'abort') {
                notifyProgress({ phase: 'fail', step: bufferId - 1, total: TOTAL_STEPS, mode: mode });
                await playFingerCue('fingerF');
                throw new AppError('200000', '指纹录入已中断');
            }
            notifyProgress({
                phase: 'collecting',
                step: bufferId,
                total: TOTAL_STEPS,
                mode: mode,
            });
            if (bufferId < TOTAL_STEPS) {
                // ZAZ：必须先等手指离开再播放下一步提示，否则用户会一直按着导致 merge 0x1a。
                const leave = await waitFingerLeaveStep(token, deadline);
                if (leave === 'timeout') {
                    notifyProgress({ phase: 'timeout', step: bufferId, total: TOTAL_STEPS, mode: mode });
                    await playFingerCue('fingerT');
                    throw new AppError('200000', '指纹录入超时');
                }
                if (leave === 'abort') {
                    notifyProgress({ phase: 'fail', step: bufferId, total: TOTAL_STEPS, mode: mode });
                    await playFingerCue('fingerF');
                    throw new AppError('200000', '指纹录入已中断');
                }
                await playFingerCue('fingerInput' + (bufferId + 1));
            }
        }

        if (!isAlive(token)) {
            await playFingerCue('fingerF');
            throw new AppError('200000', '指纹录入已中断');
        }

        if ((await fingerDriver.regModel()) !== 0) {
            dxLogger.error('finger_domain enroll regModel failed (ZAZ 0x1a=三次采指不一致，请抬指后重按)');
            notifyProgress({ phase: 'fail', step: TOTAL_STEPS, total: TOTAL_STEPS, mode: mode });
            await playFingerCue('fingerF');
            throw new AppError('200000', '指纹模板合并失败');
        }

        const buf = await fingerDriver.upChar(1);
        if (!buf || !(buf instanceof ArrayBuffer) || buf.byteLength < 64) {
            dxLogger.error('finger_domain enroll upChar failed size='
                + (buf && buf.byteLength));
            notifyProgress({ phase: 'fail', step: TOTAL_STEPS, total: TOTAL_STEPS, mode: mode });
            await playFingerCue('fingerF');
            throw new AppError('200000', '指纹特征读取失败');
        }
        const fingerChar = dxCommonUtils.codec.arrayBufferToHex(buf);

        notifyProgress({
            phase: 'success',
            step: TOTAL_STEPS,
            total: TOTAL_STEPS,
            mode: mode,
        });
        await playFingerCue('fingerS');

        return {
            index: null,
            fingerFeature: fingerChar,
            type: FINGER_TYPE,
        };
    } finally {
        releaseBus('enroll');
    }
}

const fingerDomain = {};

fingerDomain.SCENE = SCENE;
fingerDomain.TYPE = FINGER_TYPE;

fingerDomain.isActive = function () {
    return fingerDriver.isInitialized();
};

fingerDomain.isBusy = function () {
    return busOwner != null;
};

/** 远程 control 申请/录入 UI 会话是否进行中（未占串口）。 */
fingerDomain.isUiSession = function () {
    return uiSession === true;
};

/**
 * 远程 UI 会话开始：停通行，不占 exclusive。
 */
fingerDomain.beginEnrollSession = async function () {
    ensureReady();
    if (uiSession || busOwner) {
        throw busyError();
    }
    uiSession = true;
    try {
        await fingerDriver.pauseAccess();
        fingerDriver.setEventScene(SCENE.ENROLL);
        fingerDriver.setAccessEnabled(false);
    } catch (e) {
        uiSession = false;
        throw e;
    }
    return true;
};

/** 远程 UI 会话结束；采指锁只由 enroll.finally 释放。通行恢复由首页 START_FINGER_ACCESS 负责。 */
fingerDomain.endEnrollSession = function () {
    uiSession = false;
    return true;
};

fingerDomain.setScene = function (scene) {
    ensureReady();
    if (scene !== SCENE.ACCESS && scene !== SCENE.ENROLL && scene !== SCENE.OFF) {
        throw new TypeError('finger_domain.setScene: unsupported scene');
    }
    if (scene === SCENE.ACCESS && busOwner) {
        throw new AppError('200000', '指纹模块忙，无法开启通行');
    }
    fingerDriver.setEventScene(scene);
    fingerDriver.setAccessEnabled(scene === SCENE.ACCESS);
    return scene;
};

fingerDomain.restoreAccessScene = function () {
    if (!fingerDriver.isInitialized()) return;
    if (busOwner) {
        dxLogger.info('finger_domain restoreAccess skipped, busy=' + busOwner);
        return;
    }
    uiSession = false;
    fingerDriver.setEventScene(SCENE.ACCESS);
    fingerDriver.setAccessEnabled(true);
};

fingerDomain.enroll = async function (data) {
    return await runEnroll(data || {});
};

/**
 * 中断：作废 token + cancel → 等 enroll 放锁（超时强制释放）→ 再通知 UI。
 */
fingerDomain.interrupt = async function (data) {
    enrollToken += 1;
    uiSession = false;
    if (fingerDriver.isInitialized()) {
        try {
            await fingerDriver.pauseAccess();
        } catch (e) {
            dxLogger.error('finger_domain interrupt pause failed: ' + e.message);
        }
    }
    const deadline = Date.now() + INTERRUPT_WAIT_MS;
    while (busOwner === 'enroll' && Date.now() < deadline) {
        await sleep(50);
    }
    if (busOwner === 'enroll') {
        dxLogger.error('finger_domain interrupt: enroll did not release, force unlock');
        releaseBus('enroll');
    }
    notifyProgress({ phase: 'fail', step: 0, total: TOTAL_STEPS, mode: 'interrupt' });
    return true;
};

fingerDomain.insertTemplate = async function (hex) {
    ensureReady();
    if (typeof hex !== 'string' || !hex) {
        throw new AppError('200000', '指纹特征格式错误');
    }
    await acquireBus('write');
    try {
        const index = await fingerDriver.insertTemplate(hex);
        if (typeof index !== 'number' || index < 1) {
            throw new AppError('200000', '指纹模板写入失败');
        }
        return index;
    } finally {
        releaseBus('write');
    }
};

fingerDomain.deleteIndex = async function (index) {
    ensureReady();
    const id = Number(index);
    if (!Number.isInteger(id) || id < 1) {
        throw new AppError('200000', '指纹索引无效');
    }
    await acquireBus('write');
    try {
        if ((await fingerDriver.deleteChar(id, 1)) !== 0) {
            throw new AppError('200000', '指纹删除失败');
        }
        return true;
    } finally {
        releaseBus('write');
    }
};

fingerDomain.clear = async function () {
    ensureReady();
    await acquireBus('write');
    try {
        if ((await fingerDriver.clear()) !== 0) {
            throw new AppError('200000', '清空指纹库失败');
        }
        return true;
    } finally {
        releaseBus('write');
    }
};

export default fingerDomain;
