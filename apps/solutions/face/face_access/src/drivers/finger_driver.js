/**
 * @layer    drivers
 * @module   finger_driver
 * @fires    FINGER_TOUCHED
 * @listens  none
 * @depends  dxFingerMz,dxFingerZaz,dxDriver,dxStd,dxLogger,dxCommonUtils,event_bus,core/events
 *
 * 指纹硬件原子能力：对齐旧架构 driver.finger（0成功/非0失败）。
 * 模组类型由 /etc/app/.finger 正文决定（经 lifecycle 传入 model）。
 * dxFingerMz / dxFingerZaz 按型号在 init 时动态加载，无指纹型号不会因静态 import 报错。
 *
 * MZ（dxFingerMz 4.0）：单例 init/deinit；命令返回确认码 data[0]==0 为成功。
 * ZAZ：实例 open/close；抛错即失败。
 */

import dxDriver from '../../dxmodules/dxDriver.js';
import dxStd from '../../dxmodules/dxStd.js';
import dxLogger from '../../dxmodules/dxLogger.js';
import dxCommonUtils from '../../dxmodules/dxCommonUtils.js';
import eventBus from '../core/event_bus.js';
import events from '../core/events.js';

/** @type {object|null} */
let fingerMz = null;
/** @type {object|null} */
let fingerZaz = null;

/** 与旧架构 driver.finger._total 一致，搜索/取空闲号范围 */
const TOTAL = 1024;
const POLL_MS = 1000;
const FINGER_TYPE = '500';
const ZAZ_HOST_TIMEOUT_MS = 2500;
/** 模组物理容量（板级 CAPACITY），与搜索窗口 TOTAL 区分 */
const ZAZ_MODULE_CAPACITY = 5000;

let initialized = false;
let type = null; // 'mz' | 'zaz'
let impl = null;
let capacity = TOTAL;
let eventScene = 'access';
let pollTimer = null;
let polling = false;
let comparing = false;
/** 录入/写库独占串口：为 true 时即使 polling 也为真也不跑比对。 */
let exclusive = false;

/**
 * /etc/app/.finger 正文 → 组件类型（子串匹配）。
 * 含 zaz5000 → ZAZ；含 mz1021 → MZ（如 MZ1021-VF201 / MZ1021-VF124）。
 * @param {string} model
 * @returns {'zaz'|'mz'}
 */
function resolveType(model) {
    const id = String(model || '').trim().toLowerCase();
    if (id.indexOf('zaz5000') >= 0) return 'zaz';
    if (id.indexOf('mz1021') >= 0) return 'mz';
    throw new Error('finger_driver: unsupported finger model "' + model
        + '" (expect containing zaz5000 or mz1021)');
}

function isNoFingerError(e) {
    if (!e || typeof e.code !== 'number') return false;
    if (type === 'zaz') {
        return e.code === fingerZaz.ERROR_CODE.NO_FINGER
            || e.code === fingerZaz.ERROR_CODE.TIMEOUT;
    }
    // SDK 4.0 dxFingerMz 无 ERROR_CODE，无指靠返回确认码处理。
    if (!fingerMz || !fingerMz.ERROR_CODE) return false;
    return e.code === fingerMz.ERROR_CODE.NO_FINGER
        || e.code === fingerMz.ERROR_CODE.TIMEOUT;
}

/**
 * dxFingerMz：成功为 0，或 Uint8Array/类数组且 data[0]==0。
 * @param {*} result
 * @returns {boolean}
 */
function mzConfirmOk(result) {
    if (result === 0) return true;
    if (result != null && typeof result === 'object' && typeof result[0] === 'number') {
        return (result[0] & 0xff) === 0;
    }
    return false;
}

/** 空闲轮询/录入等待时，无手指或主机侧等应答超时属正常，不打 ERROR。 */
function isIdleCaptureError(e) {
    if (!e) return false;
    if (isNoFingerError(e)) return true;
    const msg = String(e.message || '');
    return msg.indexOf('timeout after') >= 0
        || msg.indexOf('NO_FINGER') >= 0;
}

function toArrayBuffer(bytes) {
    if (bytes instanceof ArrayBuffer) return bytes;
    if (bytes instanceof Uint8Array) {
        return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
    }
    return null;
}

function toUint8Array(char) {
    if (typeof char === 'string') return dxCommonUtils.codec.hexToUint8Array(char);
    if (char instanceof Uint8Array) return char;
    if (char instanceof ArrayBuffer) return new Uint8Array(char);
    return new Uint8Array(char);
}

/** MZ 特征缓冲仅 1/2；录入三次按 1→2→1。 */
function mzBufferId(bufferId) {
    const id = bufferId == null ? 1 : Number(bufferId);
    if (id < 1) return 1;
    return id > 2 ? 2 : id;
}

/** ZAZ RamBuffer 0/1/2；对外仍用 1-based bufferId。 */
function zazBufferId(bufferId) {
    const id = bufferId == null ? 1 : Number(bufferId);
    const zeroBased = id - 1;
    if (zeroBased < 0) return 0;
    return zeroBased > 2 ? 2 : zeroBased;
}

function assertInitialized() {
    if (!initialized || !impl) {
        throw new Error('finger_driver: module is not initialized');
    }
}

function fireTouched(index) {
    // ZAZ：有效编号从 1 起（与改前一致）；MZ：0-based。
    const matched = typeof index === 'number'
        && (type === 'mz' ? index >= 0 : index >= 1);
    eventBus.fire(events.FINGER_TOUCHED, {
        type: FINGER_TYPE,
        index: index,
        code: matched ? String(index) : (index === -3 ? '-3' : ''),
        matched: matched,
        scene: eventScene,
        ts: Date.now(),
    }).catch(function (e) {
        dxLogger.error('finger_driver event dispatch failed: ' + e.message);
    });
}

function sleep(ms) {
    return dxStd.sleepAsync(ms);
}

/** 主机先超时后模组可能仍在等指，必须 cancel 才能恢复轮询。 */
async function recoverAfterTimeout() {
    if (!impl || typeof impl.cancel !== 'function') return;
    try {
        await impl.cancel();
    } catch (_e) {}
}

/**
 * 停止通行轮询，等待进行中的比对结束，并 cancel 悬挂命令。
 * 录入/写库前必须调用，否则会与 getIndex 等命令抢串口并整链超时。
 */
async function pauseAccessExclusive() {
    polling = false;
    stopPoll();
    const deadline = Date.now() + ZAZ_HOST_TIMEOUT_MS + 1000;
    while (comparing && Date.now() < deadline) {
        await sleep(50);
    }
    comparing = false;
    await recoverAfterTimeout();
}

/**
 * 对齐旧架构 driver.finger.compare：getImage → genChar(1) → search。
 * 无手指 -1；特征失败 -2；未匹配 -3；命中返回索引（ZAZ 为 1-based）。
 */
async function compareOnce() {
    const res = await fingerDriver.getImage();
    if (res !== 0) return -1;
    const gen = await fingerDriver.genChar(1);
    if (gen !== 0) {
        dxLogger.info('finger_driver: genChar failed');
        return -2;
    }
    if (type === 'mz') {
        // MZ：从 0 起搜 TOTAL 条（对齐旧 compare(0, 1024)）
        const found = await fingerDriver.search(1, 0, TOTAL);
        if (found && found.code === 0 && typeof found.pageIndex === 'number'
            && found.pageIndex >= 0) {
            return found.pageIndex;
        }
        return -3;
    }
    // ZAZ（保持改前逻辑）：search(1, 1, TOTAL)，有效号 >= 1
    const found = await fingerDriver.search(1, 1, TOTAL);
    if (found && found.code === 0 && typeof found.pageIndex === 'number' && found.pageIndex >= 1) {
        return found.pageIndex;
    }
    return -3;
}

async function pollTick() {
    // exclusive：录入/写库占用串口，禁止通行比对并行。
    if (exclusive || !polling || eventScene !== 'access' || comparing) return;
    comparing = true;
    try {
        const index = await compareOnce();
        if (type === 'mz') {
            if (typeof index === 'number' && index >= 0) {
                dxLogger.info('finger_driver: matched index=' + index);
                fireTouched(index);
            } else if (index === -3) {
                dxLogger.info('finger_driver: captured but no match code=' + index);
                fireTouched(-3);
            } else if (index === -2) {
                dxLogger.info('finger_driver: genChar failed code=' + index);
            }
            return;
        }
        // ZAZ（保持改前逻辑）
        if (typeof index === 'number' && index >= 1) {
            dxLogger.info('finger_driver: matched index=' + index);
            fireTouched(index);
        } else if (index === -3) {
            // 对齐旧架构 loop：compare 返回 -3 仍上报，走通行失败语音/UI。
            dxLogger.info('finger_driver: captured but no match code=' + index);
            fireTouched(-3);
        } else if (index === -2) {
            dxLogger.info('finger_driver: genChar failed code=' + index);
        }
    } catch (e) {
        dxLogger.error('finger_driver.poll fail: ' + e.message);
    } finally {
        comparing = false;
    }
}

function startPoll() {
    if (pollTimer !== null) return;
    pollTimer = dxStd.setInterval(function () {
        pollTick();
    }, POLL_MS);
}

function stopPoll() {
    if (pollTimer === null) return;
    dxStd.clearInterval(pollTimer);
    pollTimer = null;
}

const fingerDriver = {};

fingerDriver.TYPE = FINGER_TYPE;
fingerDriver.TOTAL = TOTAL;

fingerDriver.init = async function (options) {
    if (initialized) return;
    const opts = options && typeof options === 'object' ? options : {};
    type = resolveType(opts.model);
    const board = dxDriver.FINGER || {};
    capacity = TOTAL;
    fingerDriver.TOTAL = capacity;
    const moduleCapacity = Number(board.CAPACITY) > 0
        ? Number(board.CAPACITY)
        : ZAZ_MODULE_CAPACITY;

    if (type === 'zaz') {
        const mod = await import('../../dxmodules/dxFingerZaz.js');
        fingerZaz = mod.default;
        impl = fingerZaz.open({
            path: board.UART_PATH || '/dev/ttySLB1',
            baudrate: board.BAUDRATE || 115200,
            databits: board.DATABITS || 8,
            parity: board.PARITY || 'N',
            stopbits: board.STOPBITS == null ? 1 : board.STOPBITS,
            capacity: moduleCapacity,
            timeoutMs: board.TIMEOUT_MS || ZAZ_HOST_TIMEOUT_MS,
        });
        try {
            await impl.test();
            const probe = await impl.getFreeId(1, TOTAL);
            dxLogger.info('finger_driver ZAZ ready freeId=' + probe);
        } catch (e) {
            try { impl.close(); } catch (_e) {}
            impl = null;
            fingerZaz = null;
            throw new Error('finger_driver: ZAZ init failed: ' + e.message);
        }
    } else {
        // dxFingerMz 4.0：单例 init，无 open/test/close。
        const mod = await import('../../dxmodules/dxFingerMz.js');
        fingerMz = mod.default;
        const path = board.UART_PATH || '/dev/ttySLB1';
        const baudrate = '57600-8-N-2';
        try {
            dxLogger.info('finger_driver MZ init path=' + path + ' baudrate=' + baudrate);
            await fingerMz.init({
                id: 'finger_mz',
                path: path,
                baudrate: baudrate,
                total: moduleCapacity,
                timeout: 500,
            });
            impl = fingerMz;
        } catch (e) {
            try {
                if (fingerMz && typeof fingerMz.deinit === 'function') {
                    await fingerMz.deinit();
                }
            } catch (_e) {}
            impl = null;
            fingerMz = null;
            throw new Error('finger_driver: MZ init failed: ' + e.message);
        }
    }

    initialized = true;
    dxLogger.info('finger_driver init ok type=' + type + ' model=' + String(opts.model || '')
        + ' total=' + capacity);
    eventScene = '';
    polling = false;
    await fingerDriver.controlLed('BLUE');
};

fingerDriver.isInitialized = function () {
    return initialized;
};

fingerDriver.getType = function () {
    return type;
};

/**
 * @param {string} scene access | enroll | ''
 * enroll/空场景不向通行链路上报触摸事件。
 */
fingerDriver.setEventScene = function (scene) {
    assertInitialized();
    eventScene = scene == null ? '' : String(scene);
};

fingerDriver.getEventScene = function () {
    return eventScene;
};

/** 通行比对轮询开关；录入前请用 pauseAccess()，确保等完当前比对并 cancel。 */
fingerDriver.setAccessEnabled = function (enabled) {
    assertInitialized();
    polling = enabled === true;
    if (polling && !exclusive) startPoll();
    else stopPoll();
};

/**
 * 串口独占：停轮询、等比对结束、cancel。
 * 占用期间 pollTick 不会再发比对命令。
 */
fingerDriver.beginExclusive = async function () {
    assertInitialized();
    await pauseAccessExclusive();
    exclusive = true;
    polling = false;
    stopPoll();
};

fingerDriver.endExclusive = function () {
    exclusive = false;
};

fingerDriver.isExclusive = function () {
    return exclusive === true;
};

/** 录入/独占写库：停轮询 + 等比对结束 + cancel。 */
fingerDriver.pauseAccess = async function () {
    assertInitialized();
    await pauseAccessExclusive();
};

fingerDriver.getIndex = async function () {
    assertInitialized();
    try {
        // ZAZ：getFreeId(1, 1024)；MZ：getIndex()，0-based。
        const id = type === 'zaz'
            ? await impl.getFreeId(1, TOTAL)
            : await impl.getIndex();
        return typeof id === 'number' ? id : -1;
    } catch (e) {
        dxLogger.error('finger_driver.getIndex fail: ' + e.message);
        await recoverAfterTimeout();
        try {
            const id = type === 'zaz'
                ? await impl.getFreeId(1, TOTAL)
                : await impl.getIndex();
            return typeof id === 'number' ? id : -1;
        } catch (e2) {
            dxLogger.error('finger_driver.getIndex retry fail: ' + e2.message);
            return -1;
        }
    }
};

fingerDriver.getEnrollImage = async function () {
    assertInitialized();
    try {
        if (type === 'mz') {
            return mzConfirmOk(await impl.getEnrollImage()) ? 0 : -1;
        }
        await impl.getImage();
        return 0;
    } catch (e) {
        if (isIdleCaptureError(e)) {
            if (String(e.message || '').indexOf('timeout after') >= 0) {
                await recoverAfterTimeout();
            }
            return -1;
        }
        dxLogger.error('finger_driver.getEnrollImage fail: ' + e.message);
        return -1;
    }
};

fingerDriver.getImage = async function () {
    assertInitialized();
    try {
        if (type === 'mz') {
            return mzConfirmOk(await impl.getImage()) ? 0 : -1;
        }
        await impl.getImage();
        return 0;
    } catch (e) {
        if (isIdleCaptureError(e)) {
            if (String(e.message || '').indexOf('timeout after') >= 0) {
                await recoverAfterTimeout();
            }
            return -1;
        }
        dxLogger.error('finger_driver.getImage fail: ' + e.message);
        return -1;
    }
};

fingerDriver.genChar = async function (bufferId) {
    assertInitialized();
    try {
        if (type === 'zaz') {
            await impl.generate(zazBufferId(bufferId));
            return 0;
        }
        // MZ：仅 buffer 1/2（DejaOS 文档）；上层 enrollBufferId 已映射。
        return mzConfirmOk(await impl.genChar(mzBufferId(bufferId))) ? 0 : -1;
    } catch (e) {
        dxLogger.error('finger_driver.genChar fail: ' + e.message);
        return -1;
    }
};

/**
 * ZAZ 录入步间：等手指离开传感器（对齐 FingerZaz.enroll requireFingerLeave）。
 * MZ：SDK 无 fingerDetect，用 getImage 确认码判断（无指时非 0）。
 * @param {number} deadline 绝对截止时间 ms
 * @returns {Promise<number>} 0 已离开；-1 超时或检测失败
 */
fingerDriver.waitFingerLeave = async function (deadline) {
    assertInitialized();
    const pollMs = 200;
    if (type === 'mz') {
        // 以前 MZ 直接 return 0，导致手指未抬起就采下一次 → UI 一次按压跳两步。
        while (Date.now() < deadline) {
            const res = await fingerDriver.getImage();
            if (res !== 0) {
                // 无指/采图失败：视为已离开；稍等防抖再进入下一步。
                await sleep(300);
                return 0;
            }
            await sleep(pollMs);
        }
        return -1;
    }
    if (!impl || typeof impl.fingerDetect !== 'function') {
        return 0;
    }
    while (Date.now() < deadline) {
        try {
            const present = await impl.fingerDetect();
            if (!present) {
                return 0;
            }
        } catch (e) {
            dxLogger.error('finger_driver.waitFingerLeave fail: ' + e.message);
            return -1;
        }
        await sleep(pollMs);
    }
    return -1;
};

fingerDriver.regModel = async function () {
    assertInitialized();
    try {
        if (type === 'zaz') {
            await impl.merge(3, 0);
            return 0;
        }
        return mzConfirmOk(await impl.regModel()) ? 0 : -1;
    } catch (e) {
        dxLogger.error('finger_driver.regModel fail: ' + e.message);
        return -1;
    }
};

fingerDriver.search = async function (bufferId, index, num) {
    assertInitialized();
    try {
        if (type === 'zaz') {
            const startId = 1;
            const endId = TOTAL;
            const found = await impl.search(zazBufferId(bufferId), startId, endId);
            if (!found || typeof found.id !== 'number') {
                dxLogger.info('finger_driver.search zaz miss bufferId=' + bufferId
                    + ' raw=' + (found == null ? 'null' : JSON.stringify(found)));
                return { code: 1, pageIndex: -1, score: 0 };
            }
            dxLogger.info('finger_driver.search zaz hit bufferId=' + bufferId
                + ' id=' + found.id);
            return { code: 0, pageIndex: found.id, score: 100 };
        }
        // dxFingerMz.search(bufferId, startPage, pageNum) → { code, pageIndex, score }
        const startId = index == null ? 0 : Number(index);
        const count = num == null ? TOTAL : Number(num);
        const mzBuf = mzBufferId(bufferId);
        const found = await impl.search(mzBuf, startId, count);
        // 诊断：无论命中与否都打原始返回（code=0 命中，常见 9=库中无匹配）
        dxLogger.info('finger_driver.search mz bufferId=' + bufferId
            + ' mzBuf=' + mzBuf + ' start=' + startId + ' count=' + count
            + ' raw=' + (found == null ? 'null' : ('code=' + found.code
                + ' pageIndex=' + found.pageIndex + ' score=' + found.score)));
        if (!found || found.code !== 0 || typeof found.pageIndex !== 'number') {
            return { code: 1, pageIndex: -1, score: 0 };
        }
        return { code: 0, pageIndex: found.pageIndex, score: found.score || 0 };
    } catch (e) {
        dxLogger.error('finger_driver.search fail bufferId=' + bufferId
            + ' type=' + type + ' err=' + (e && e.message));
        return { code: 1, pageIndex: -1, score: 0 };
    }
};

fingerDriver.storeChar = async function (index, bufferId) {
    assertInitialized();
    try {
        if (type === 'zaz') {
            await impl.store(index, zazBufferId(bufferId));
            return 0;
        }
        // dxFingerMz.storeChar(bufferId, pageIndex)
        const resp = await impl.storeChar(mzBufferId(bufferId), index);
        if (mzConfirmOk(resp)) return 0;
        const code = resp != null && typeof resp === 'object' ? resp[0] : resp;
        dxLogger.error('finger_driver.storeChar reject index=' + index
            + ' bufferId=' + bufferId + ' code=' + code);
        return -1;
    } catch (e) {
        // ZAZ：模组开启重复检查时，重复指纹返回 0x18（DUPLICATE_FINGER）。
        if (type === 'zaz' && fingerZaz && e && e.code === fingerZaz.ERROR_CODE.DUPLICATE_FINGER) {
            dxLogger.info('finger_driver.storeChar duplicate index=' + index);
            return -2;
        }
        dxLogger.error('finger_driver.storeChar fail: ' + e.message);
        return -1;
    }
};

fingerDriver.loadChar = async function (index, bufferId) {
    assertInitialized();
    try {
        if (type === 'zaz') {
            await impl.load(index, zazBufferId(bufferId));
            return 0;
        }
        return mzConfirmOk(await impl.loadChar(mzBufferId(bufferId), index)) ? 0 : -1;
    } catch (e) {
        dxLogger.error('finger_driver.loadChar fail: ' + e.message);
        return -1;
    }
};

fingerDriver.upChar = async function (bufferId) {
    assertInitialized();
    try {
        let bytes;
        if (type === 'zaz') {
            bytes = await impl.uploadTemplate(zazBufferId(bufferId));
        } else {
            bytes = await impl.upChar(mzBufferId(bufferId));
        }
        const buf = toArrayBuffer(bytes);
        if (!buf) {
            dxLogger.error('finger_driver.upChar: empty template');
        } else if (type === 'mz') {
            dxLogger.info('finger_driver.upChar size=' + buf.byteLength
                + ' type=mz bufferId=' + bufferId);
        }
        return buf;
    } catch (e) {
        dxLogger.error('finger_driver.upChar fail: ' + e.message);
        return null;
    }
};

fingerDriver.downChar = async function (char, bufferId) {
    assertInitialized();
    try {
        const bytes = toUint8Array(char);
        if (type === 'zaz') {
            await impl.downloadTemplate(zazBufferId(bufferId), bytes);
            return 0;
        }
        const resp = await impl.downChar(mzBufferId(bufferId), bytes);
        if (mzConfirmOk(resp)) return 0;
        const code = resp != null && typeof resp === 'object' ? resp[0] : resp;
        dxLogger.error('finger_driver.downChar reject bufferId=' + bufferId
            + ' featureBytes=' + (bytes ? bytes.length : 0) + ' code=' + code);
        return -1;
    } catch (e) {
        dxLogger.error('finger_driver.downChar fail: ' + e.message);
        return -1;
    }
};

fingerDriver.deleteChar = async function (fingerId, num) {
    assertInitialized();
    try {
        if (type === 'zaz') {
            await impl.delete(fingerId, fingerId);
            return 0;
        }
        return mzConfirmOk(await impl.deletChar(fingerId, num == null ? 1 : num)) ? 0 : -1;
    } catch (e) {
        dxLogger.error('finger_driver.deleteChar fail: ' + e.message);
        return -1;
    }
};

/** 云端/本地保存：特征写入模组空闲索引，返回索引或 -1。调用方须已停通行或持有 exclusive。 */
fingerDriver.insertTemplate = async function (char) {
    assertInitialized();
    const wasPolling = polling;
    const wasExclusive = exclusive;
    if (!wasExclusive) {
        await pauseAccessExclusive();
    }
    try {
        if (type === 'mz') {
            const bytes = toUint8Array(char);
            const index = await fingerDriver.getIndex();
            if (typeof index !== 'number' || index < 0) {
                dxLogger.error('finger_driver.insertTemplate getIndex fail index=' + index);
                return -1;
            }
            // 本地录入：合并结果在 buffer2，直接 store；失败再 downChar→buffer1。
            if ((await fingerDriver.storeChar(index, 2)) === 0) {
                dxLogger.info('finger_driver.insertTemplate ok index=' + index + ' via=buffer2');
                return index;
            }
            dxLogger.info('finger_driver.insertTemplate buffer2 fail, fallback downChar index=' + index);
            await recoverAfterTimeout();
            if ((await fingerDriver.downChar(bytes, 1)) !== 0) {
                dxLogger.error('finger_driver.insertTemplate downChar fail');
                return -1;
            }
            if ((await fingerDriver.storeChar(index, 1)) !== 0) {
                dxLogger.error('finger_driver.insertTemplate storeChar fail index=' + index);
                return -1;
            }
            dxLogger.info('finger_driver.insertTemplate ok index=' + index + ' via=downChar');
            return index;
        }
        // ZAZ：downChar → getIndex → storeChar（模组重复检查失败返回 -2）
        if ((await fingerDriver.downChar(char, 1)) !== 0) return -1;
        const index = await fingerDriver.getIndex();
        if (typeof index !== 'number' || index < 1) return -1;
        const storeRet = await fingerDriver.storeChar(index, 1);
        if (storeRet === -2) return -2;
        if (storeRet !== 0) return -1;
        return index;
    } catch (e) {
        dxLogger.error('finger_driver.insertTemplate fail: ' + e.message);
        return -1;
    } finally {
        if (!wasExclusive) {
            fingerDriver.setAccessEnabled(wasPolling);
        }
    }
};

fingerDriver.clear = async function () {
    assertInitialized();
    const wasPolling = polling;
    const wasExclusive = exclusive;
    if (!wasExclusive) {
        await pauseAccessExclusive();
    }
    try {
        if (type === 'zaz') {
            const count = await impl.getCount(1, TOTAL);
            if (!count) return 0;
            return (await impl.delete(1, TOTAL)) ? 0 : -1;
        }
        return mzConfirmOk(await impl.clearChar()) ? 0 : -1;
    } catch (e) {
        dxLogger.error('finger_driver.clear fail: ' + e.message);
        return -1;
    } finally {
        if (!wasExclusive) {
            fingerDriver.setAccessEnabled(wasPolling);
        }
    }
};

fingerDriver.controlLed = async function (color) {
    if (!initialized || type !== 'mz' || !impl || !fingerMz) return;
    // 录入/写库独占期间不控灯，避免 CONTROL_BLN 与采指/downChar/storeChar 抢串口。
    if (exclusive || eventScene === 'enroll') return;
    try {
        await dxStd.sleepAsync(50);
        const led = fingerMz.LED_COLOR[color];
        if (led == null) return;
        await impl.controlLed(led, fingerMz.LED_FUNCTION_CODE.CONSTANT_ON);
    } catch (e) {
        dxLogger.info('finger_driver.controlLed: ' + e.message);
    }
};

fingerDriver.destroy = async function () {
    stopPoll();
    polling = false;
    comparing = false;
    exclusive = false;
    eventScene = '';
    if (type === 'zaz' && impl && typeof impl.close === 'function') {
        try {
            impl.close();
        } catch (e) {
            dxLogger.error('finger_driver.destroy close fail: ' + e.message);
        }
    } else if (type === 'mz' && fingerMz && typeof fingerMz.deinit === 'function') {
        try {
            await fingerMz.deinit();
        } catch (e) {
            dxLogger.error('finger_driver.destroy deinit fail: ' + e.message);
        }
    }
    initialized = false;
    type = null;
    impl = null;
    fingerMz = null;
    fingerZaz = null;
    capacity = TOTAL;
    fingerDriver.TOTAL = TOTAL;
};

export default fingerDriver;
