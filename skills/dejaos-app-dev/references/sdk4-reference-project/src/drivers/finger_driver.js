/**
 * @layer    drivers
 * @module   finger_driver
 * @fires    FINGER_TOUCHED
 * @listens  none
 * @depends  dxFingerMz,dxFingerZaz,dxDriver,dxStd,dxLogger,dxCommonUtils,event_bus,core/events
 *
 * 指纹硬件原子能力：对齐旧架构 driver.finger（0成功/非0失败）。
 * 模组类型由 /etc/app/.finger 正文决定（经 lifecycle 传入 model）。
 */

// import fingerMz from '../../dxmodules/dxFingerMz.js';
// import fingerZaz from '../../dxmodules/dxFingerZaz.js';
import dxDriver from '../../dxmodules/dxDriver.js';
import dxStd from '../../dxmodules/dxStd.js';
import dxLogger from '../../dxmodules/dxLogger.js';
import dxCommonUtils from '../../dxmodules/dxCommonUtils.js';
import eventBus from '../core/event_bus.js';
import events from '../core/events.js';

/** 与旧架构 driver.finger._total 一致，搜索/取空闲号范围 1..1024 */
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
 * /etc/app/.finger 正文 → 组件类型。
 * zaz5000 → ZAZ；MZ1021 → MZ。
 * @param {string} model
 * @returns {'zaz'|'mz'}
 */
function resolveType(model) {
    const id = String(model || '').trim().toLowerCase();
    if (id === 'zaz5000') return 'zaz';
    if (id === 'mz1021') return 'mz';
    throw new Error('finger_driver: unsupported finger model "' + model
        + '" (expect zaz5000 or MZ1021)');
}

function isNoFingerError(e) {
    if (!e || typeof e.code !== 'number') return false;
    if (type === 'zaz') {
        return e.code === fingerZaz.ERROR_CODE.NO_FINGER
            || e.code === fingerZaz.ERROR_CODE.TIMEOUT;
    }
    return e.code === fingerMz.ERROR_CODE.NO_FINGER
        || e.code === fingerMz.ERROR_CODE.TIMEOUT;
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

/** MZ 特征缓冲仅 1/2；录入第 3 次写入 buffer 2。 */
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
    // [对齐旧/组件 1-based] 有效编号从 1 起；-3 无匹配仍上报（旧 loop 同样 fire）。
    const matched = typeof index === 'number' && index >= 1;
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
    return new Promise(function (resolve) {
        dxStd.setTimeout(resolve, ms);
    });
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
    // 旧架构：search(bufferId-1, 1, 1024) → 应用层 search(1, 1, TOTAL)
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
    // 搜索窗口沿用旧架构 1024；模组 open 容量用板级/5000。
    capacity = TOTAL;
    fingerDriver.TOTAL = capacity;
    const moduleCapacity = Number(board.CAPACITY) > 0
        ? Number(board.CAPACITY)
        : ZAZ_MODULE_CAPACITY;

    if (type === 'zaz') {
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
            // 对齐旧 getEmptyId(1, 1024)
            const probe = await impl.getFreeId(1, TOTAL);
            dxLogger.info('finger_driver ZAZ ready freeId=' + probe);
        } catch (e) {
            try { impl.close(); } catch (_e) {}
            impl = null;
            throw new Error('finger_driver: ZAZ init failed: ' + e.message);
        }
    } else {
        impl = fingerMz.open({
            sourceId: 'finger_mz',
            path: board.UART_PATH || '/dev/ttySLB0',
            baudrate: board.BAUDRATE || 57600,
            databits: board.DATABITS || 8,
            parity: board.PARITY || 'N',
            stopbits: board.STOPBITS == null ? 2 : board.STOPBITS,
            capacity: moduleCapacity,
            timeoutMs: board.TIMEOUT_MS || 1000,
        });
        try {
            await impl.test();
        } catch (e) {
            try { impl.close(); } catch (_e) {}
            impl = null;
            throw new Error('finger_driver: MZ init failed: ' + e.message);
        }
    }

    initialized = true;
    dxLogger.info('finger_driver init ok type=' + type + ' model=' + String(opts.model || '')
        + ' total=' + capacity);
    // 与人脸一致：初始化后不轮询，等首页 CMD_START_FINGER_ACCESS 再开通行。
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
        // 旧架构：getEmptyId(1, _total) 且 _total=1024
        const id = type === 'zaz'
            ? await impl.getFreeId(1, TOTAL)
            : await impl.getFreeId(0, capacity - 1);
        return typeof id === 'number' ? id : -1;
    } catch (e) {
        dxLogger.error('finger_driver.getIndex fail: ' + e.message);
        await recoverAfterTimeout();
        try {
            const id = type === 'zaz'
                ? await impl.getFreeId(1, TOTAL)
                : await impl.getFreeId(0, capacity - 1);
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
            await impl.getImage(true);
            return 0;
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
        } else {
            await impl.generate(mzBufferId(bufferId));
        }
        return 0;
    } catch (e) {
        dxLogger.error('finger_driver.genChar fail: ' + e.message);
        return -1;
    }
};

/**
 * ZAZ 录入步间：等手指离开传感器（对齐 FingerZaz.enroll requireFingerLeave）。
 * @param {number} deadline 绝对截止时间 ms
 * @returns {Promise<number>} 0 已离开；-1 超时或检测失败
 */
fingerDriver.waitFingerLeave = async function (deadline) {
    assertInitialized();
    if (type !== 'zaz' || !impl || typeof impl.fingerDetect !== 'function') {
        return 0;
    }
    const pollMs = 200;
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
        } else {
            await impl.merge();
        }
        return 0;
    } catch (e) {
        dxLogger.error('finger_driver.regModel fail: ' + e.message);
        return -1;
    }
};

fingerDriver.search = async function (bufferId, index, num) {
    assertInitialized();
    try {
        if (type === 'zaz') {
            // 对齐旧 search(bufferId-1, 1, 1024)
            const startId = 1;
            const endId = TOTAL;
            const found = await impl.search(zazBufferId(bufferId), startId, endId);
            if (!found || typeof found.id !== 'number') {
                return { code: 1, pageIndex: -1, score: 0 };
            }
            return { code: 0, pageIndex: found.id, score: 100 };
        }
        const startId = index == null ? 0 : Number(index);
        const count = num == null ? capacity - startId : Number(num);
        const found = await impl.search(mzBufferId(bufferId), startId, count);
        if (!found || typeof found.id !== 'number') {
            return { code: 1, pageIndex: -1, score: 0 };
        }
        return { code: 0, pageIndex: found.id, score: found.score || 0 };
    } catch (e) {
        return { code: 1, pageIndex: -1, score: 0 };
    }
};

fingerDriver.storeChar = async function (index, bufferId) {
    assertInitialized();
    try {
        if (type === 'zaz') {
            await impl.store(index, zazBufferId(bufferId));
        } else {
            await impl.store(index, mzBufferId(bufferId));
        }
        return 0;
    } catch (e) {
        dxLogger.error('finger_driver.storeChar fail: ' + e.message);
        return -1;
    }
};

fingerDriver.loadChar = async function (index, bufferId) {
    assertInitialized();
    try {
        if (type === 'zaz') {
            await impl.load(index, zazBufferId(bufferId));
        } else {
            await impl.load(index, mzBufferId(bufferId));
        }
        return 0;
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
            bytes = await impl.uploadTemplate(mzBufferId(bufferId));
        }
        const buf = toArrayBuffer(bytes);
        if (!buf) {
            dxLogger.error('finger_driver.upChar: empty template');
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
        } else {
            await impl.downloadTemplate(mzBufferId(bufferId), bytes);
        }
        return 0;
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
        } else {
            await impl.delete(fingerId, num == null ? 1 : num);
        }
        return 0;
    } catch (e) {
        dxLogger.error('finger_driver.deleteChar fail: ' + e.message);
        return -1;
    }
};

/** 云端下发模板：下载特征并写入空闲索引，返回索引或 -1。调用方须已停通行或持有 exclusive。 */
fingerDriver.insertTemplate = async function (char) {
    assertInitialized();
    const wasPolling = polling;
    const wasExclusive = exclusive;
    if (!wasExclusive) {
        await pauseAccessExclusive();
    }
    try {
        if ((await fingerDriver.downChar(char, 1)) !== 0) return -1;
        const index = await fingerDriver.getIndex();
        if (typeof index !== 'number' || index < 1) return -1;
        if ((await fingerDriver.storeChar(index, 1)) !== 0) return -1;
        return index;
    } catch (e) {
        dxLogger.error('finger_driver.insertTemplate fail: ' + e.message);
        return -1;
    } finally {
        // 已在 Domain exclusive 会话内时，不擅自恢复轮询。
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
        await impl.clear();
        return 0;
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
    if (!initialized || type !== 'mz' || !impl) return;
    try {
        dxStd.sleep(50);
        const led = fingerMz.LED_COLOR[color];
        if (led == null) return;
        await impl.controlLed(led, fingerMz.LED_MODE.ON);
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
    if (impl && typeof impl.close === 'function') {
        try {
            impl.close();
        } catch (e) {
            dxLogger.error('finger_driver.destroy close fail: ' + e.message);
        }
    }
    initialized = false;
    type = null;
    impl = null;
    capacity = TOTAL;
    fingerDriver.TOTAL = TOTAL;
};

export default fingerDriver;
