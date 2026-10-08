/**
 * @layer    drivers
 * @module   scanner_driver
 * @fires    CODE_SCANNED
 * @listens  none
 * @depends  dxChannel,dxBarcodeAd331,dxDriver,dxCommonUtils,dxLogger,event_bus,core/events
 *
 * UART 扫码头。型号由 /etc/app/.scanner 正文决定（lifecycle 传入 model）：
 * - vg：55AA 帧协议，cmd=0x30 为条码数据（竖屏既有逻辑）
 * - ad331：dxBarcodeAd331 协议模式 03|len_be|data（横屏 AD331）
 * 组件按型号在 init 时动态加载，无扫码型号不会因静态 import 报错。
 */

import dxDriver from '../../dxmodules/dxDriver.js';
import dxCommonUtils from '../../dxmodules/dxCommonUtils.js';
import dxLogger from '../../dxmodules/dxLogger.js';
import eventBus from '../core/event_bus.js';
import events from '../core/events.js';

/** @type {object|null} */
let dxChannel = null;
/** @type {object|null} */
let dxBarcodeAd331 = null;

const SOURCE_ID = 'scannerUart';
const SCAN_CMD = 0x30;
const VG_BAUDRATE = 115200;

/** VG 机型串口；未命中时回退板级 CHANNEL.UART_PATH。 */
const VG_UART_PATH_BY_MODEL = {
    VF105_V12: '/dev/ttySLB1',
    vf114: '/dev/ttySLB3',
};

/** @type {'vg'|'ad331'|null} */
let vendor = null;
/** @type {object|null} */
let channel = null;
let initialized = false;
let buffer = new Uint8Array(0);

/**
 * /etc/app/.scanner 正文 → 扫码模组类型。
 * vg → 微光 55AA；ad331 → AD331。空正文兼容旧设备，按 vg 处理。
 * @param {string} model
 * @returns {'vg'|'ad331'}
 */
function resolveVendor(model) {
    const id = String(model || '').trim().toLowerCase();
    if (!id || id === 'vg') {
        return 'vg';
    }
    if (id === 'ad331') {
        return 'ad331';
    }
    throw new Error('scanner_driver: unsupported scanner model "' + model
        + '" (expect vg or ad331)');
}

function resolveVgPath() {
    const model = dxDriver.DRIVER && dxDriver.DRIVER.MODEL;
    if (model && VG_UART_PATH_BY_MODEL[model]) {
        return VG_UART_PATH_BY_MODEL[model];
    }
    return dxDriver.CHANNEL && dxDriver.CHANNEL.UART_PATH;
}

function resolveAd331Options() {
    const barcode = dxDriver.BARCODE || {};
    const path = barcode.UART_PATH;
    const baud = Number(barcode.BAUDRATE) || 9600;
    const databits = Number(barcode.DATABITS) || 8;
    const parity = barcode.PARITY || 'N';
    const stopbits = Number(barcode.STOPBITS) || 1;
    return {
        path: path,
        baudrate: baud + '-' + databits + '-' + parity + '-' + stopbits,
    };
}

function concatBytes(left, right) {
    if (!left || left.length === 0) {
        return right;
    }
    if (!right || right.length === 0) {
        return left;
    }
    const next = new Uint8Array(left.length + right.length);
    next.set(left, 0);
    next.set(right, left.length);
    return next;
}

function calculateBcc(cmd, length, data) {
    let bcc = 0x55 ^ 0xaa;
    bcc ^= cmd & 0xff;
    bcc ^= length & 0xff;
    bcc ^= (length >> 8) & 0xff;
    if (data && data.length) {
        for (let i = 0; i < data.length; i++) {
            bcc ^= data[i];
        }
    }
    return bcc & 0xff;
}

function decodePayload(bytes) {
    if (!bytes || bytes.length === 0) {
        return '';
    }
    const hex = dxCommonUtils.codec.uint8ArrayToHex(bytes);
    try {
        return dxCommonUtils.codec.utf8HexToStr(hex);
    } catch (_error) {
        return hex;
    }
}

function fireScanned(code) {
    if (!code) {
        return;
    }
    // 只上报业务事实；协议帧细节留在 Driver / dxmodules 内。
    eventBus.fire(events.CODE_SCANNED, {
        credential: code,
        ts: Date.now(),
    }).catch(function (e) {
        dxLogger.error('scanner_driver event dispatch failed: ' + e.message);
    });
}

function tryConsumeVgFrame() {
    while (buffer.length >= 2) {
        let start = -1;
        for (let i = 0; i < buffer.length - 1; i++) {
            if (buffer[i] === 0x55 && buffer[i + 1] === 0xaa) {
                start = i;
                break;
            }
        }
        if (start < 0) {
            buffer = new Uint8Array(0);
            return;
        }
        if (start > 0) {
            buffer = buffer.subarray(start);
        }
        if (buffer.length < 5) {
            return;
        }
        const cmd = buffer[2];
        const length = buffer[3] | (buffer[4] << 8);
        const frameSize = 5 + length + 1;
        if (length < 0 || length > 4096) {
            buffer = buffer.subarray(2);
            continue;
        }
        if (buffer.length < frameSize) {
            return;
        }

        const data = length > 0 ? buffer.subarray(5, 5 + length) : new Uint8Array(0);
        const bcc = buffer[5 + length];
        const expected = calculateBcc(cmd, length, data);
        buffer = buffer.subarray(frameSize);
        if (bcc !== expected) {
            continue;
        }
        if (cmd !== SCAN_CMD || length <= 0) {
            continue;
        }

        const code = decodePayload(data).replace(/[\r\n\0]+$/g, '');
        fireScanned(code);
    }
}

function onVgChannelData(chunk) {
    if (!chunk || chunk.length === 0) {
        return;
    }
    buffer = concatBytes(buffer, chunk instanceof Uint8Array ? chunk : new Uint8Array(chunk));
    try {
        tryConsumeVgFrame();
    } catch (e) {
        dxLogger.error('scanner_driver frame parse failed: ' + e.message);
        buffer = new Uint8Array(0);
    }
}

function onAd331Code(bytes) {
    const code = decodePayload(bytes).replace(/[\r\n\0]+$/g, '');
    fireScanned(code);
}

async function initVg() {
    const path = resolveVgPath();
    if (typeof path !== 'string' || !path) {
        throw new TypeError('scanner_driver: VG UART path unresolved for model');
    }
    const mod = await import('../../dxmodules/dxChannel.js');
    dxChannel = mod.default;
    channel = dxChannel.open(SOURCE_ID, dxChannel.TYPE.UART, path);
    try {
        channel.setUartParam(VG_BAUDRATE, 8, 'N', 1);
        channel.on('data', onVgChannelData);
        initialized = true;
        vendor = 'vg';
        dxLogger.info('scanner_driver init vendor=vg path=' + path);
    } catch (e) {
        try {
            channel.close();
        } catch (_cleanup) {}
        channel = null;
        dxChannel = null;
        throw e;
    }
}

async function initAd331() {
    const opts = resolveAd331Options();
    if (typeof opts.path !== 'string' || !opts.path) {
        throw new TypeError('scanner_driver: AD331 UART path unresolved (dxDriver.BARCODE)');
    }
    const mod = await import('../../dxmodules/dxBarcodeAd331.js');
    dxBarcodeAd331 = mod.default;
    dxBarcodeAd331.setCallbacks({ onCode: onAd331Code });
    await dxBarcodeAd331.init({
        id: SOURCE_ID,
        path: opts.path,
        baudrate: opts.baudrate,
    });
    initialized = true;
    vendor = 'ad331';
    dxLogger.info('scanner_driver init vendor=ad331 path=' + opts.path);
}

const scannerDriver = {};

/**
 * @param {{ model?: string }} [options] lifecycle 传入 /etc/app/.scanner 正文
 */
scannerDriver.init = async function (options) {
    if (initialized) {
        return;
    }
    const next = resolveVendor(options && options.model);
    if (next === 'ad331') {
        await initAd331();
        return;
    }
    await initVg();
};

scannerDriver.updateConfig = async function () {};

scannerDriver.isInitialized = function () {
    return initialized;
};

/** @returns {'vg'|'ad331'|null} */
scannerDriver.getVendor = function () {
    return vendor;
};

scannerDriver.destroy = async function () {
    if (!initialized) {
        return;
    }
    let firstError = null;
    if (vendor === 'ad331' && dxBarcodeAd331) {
        try {
            await dxBarcodeAd331.deinit();
        } catch (e) {
            firstError = e;
        }
        dxBarcodeAd331 = null;
    } else {
        try {
            if (channel) {
                channel.off('data', onVgChannelData);
            }
        } catch (e) {
            firstError = e;
        }
        try {
            if (channel) {
                channel.close();
            }
        } catch (e) {
            firstError = firstError || e;
        }
        channel = null;
        dxChannel = null;
    }
    buffer = new Uint8Array(0);
    vendor = null;
    initialized = false;
    if (firstError) {
        throw firstError;
    }
};

export default scannerDriver;
