/**
 * @layer    drivers
 * @module   scanner_driver
 * @fires    CODE_SCANNED
 * @listens  none
 * @depends  dxChannel,dxDriver,dxCommonUtils,dxLogger,event_bus,core/events
 *
 * UART 扫码头：55AA 帧协议，cmd=0x30 为条码数据。
 */

import dxChannel from '../../dxmodules/dxChannel.js';
import dxDriver from '../../dxmodules/dxDriver.js';
import dxCommonUtils from '../../dxmodules/dxCommonUtils.js';
import dxLogger from '../../dxmodules/dxLogger.js';
import eventBus from '../core/event_bus.js';
import events from '../core/events.js';

const SOURCE_ID = 'scannerUart';
const SCAN_CMD = 0x30;
const BAUDRATE = 115200;

// 机型串口；未命中时回退板级 CHANNEL.UART_PATH。
const UART_PATH_BY_MODEL = {
    VF105_V12: '/dev/ttySLB1',
    vf114: '/dev/ttySLB3',
};

let channel = null;
let initialized = false;
let buffer = new Uint8Array(0);

function resolvePath() {
    const model = dxDriver.DRIVER && dxDriver.DRIVER.MODEL;
    if (model && UART_PATH_BY_MODEL[model]) return UART_PATH_BY_MODEL[model];
    return (dxDriver.CHANNEL && dxDriver.CHANNEL.UART_PATH);
}

function concatBytes(left, right) {
    if (!left || left.length === 0) return right;
    if (!right || right.length === 0) return left;
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
        for (let i = 0; i < data.length; i++) bcc ^= data[i];
    }
    return bcc & 0xff;
}

function decodePayload(bytes) {
    if (!bytes || bytes.length === 0) return '';
    const hex = dxCommonUtils.codec.uint8ArrayToHex(bytes);
    try {
        return dxCommonUtils.codec.utf8HexToStr(hex);
    } catch (_error) {
        return hex;
    }
}

function fireScanned(code) {
    if (!code) return;
    // 只上报业务事实；协议帧细节留在 Driver 内，不泄漏给 Service。
    eventBus.fire(events.CODE_SCANNED, {
        credential: code,
        ts: Date.now(),
    }).catch(function (e) {
        dxLogger.error('scanner_driver event dispatch failed: ' + e.message);
    });
}

function tryConsumeFrame() {
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
        if (start > 0) buffer = buffer.subarray(start);
        if (buffer.length < 5) return;
        const cmd = buffer[2];
        const length = buffer[3] | (buffer[4] << 8);
        const frameSize = 5 + length + 1;
        if (length < 0 || length > 4096) {
            buffer = buffer.subarray(2);
            continue;
        }
        if (buffer.length < frameSize) return;

        const data = length > 0 ? buffer.subarray(5, 5 + length) : new Uint8Array(0);
        const bcc = buffer[5 + length];
        const expected = calculateBcc(cmd, length, data);
        buffer = buffer.subarray(frameSize);
        if (bcc !== expected) continue;
        if (cmd !== SCAN_CMD || length <= 0) continue;

        const code = decodePayload(data).replace(/[\r\n\0]+$/g, '');
        fireScanned(code);
    }
}

function onChannelData(chunk) {
    if (!chunk || chunk.length === 0) return;
    buffer = concatBytes(buffer, chunk instanceof Uint8Array ? chunk : new Uint8Array(chunk));
    try {
        tryConsumeFrame();
    } catch (e) {
        dxLogger.error('scanner_driver frame parse failed: ' + e.message);
        buffer = new Uint8Array(0);
    }
}

const scannerDriver = {};

scannerDriver.init = async function () {
    if (initialized) return;
    const path = resolvePath();
    if (typeof path !== 'string' || !path) {
        throw new TypeError('scanner_driver: UART path unresolved for model');
    }
    channel = dxChannel.open(SOURCE_ID, dxChannel.TYPE.UART, path);
    try {
        channel.setUartParam(BAUDRATE, 8, 'N', 1);
        channel.on('data', onChannelData);
        initialized = true;
    } catch (e) {
        try { channel.close(); } catch (_cleanup) {}
        channel = null;
        throw e;
    }
};

scannerDriver.updateConfig = async function () {};

scannerDriver.isInitialized = function () {
    return initialized;
};

scannerDriver.destroy = async function () {
    if (!initialized) return;
    let firstError = null;
    try {
        if (channel) channel.off('data', onChannelData);
    } catch (e) {
        firstError = e;
    }
    try {
        if (channel) channel.close();
    } catch (e) {
        firstError = firstError || e;
    }
    channel = null;
    buffer = new Uint8Array(0);
    initialized = false;
    if (firstError) throw firstError;
};

export default scannerDriver;
