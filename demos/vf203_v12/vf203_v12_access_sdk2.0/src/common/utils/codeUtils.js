/**
 * dxVgCode Module.
 * - UART based communication for Barcode Scanner device.
 * - Encapsulates barcode scanner serial communication with a simple API interface.
 * - Parses barcode scanner protocol frames (55AA...) and provides callback mechanism.
 */
// import dxChannel from './dxChannel.js'
// import dxLogger from './dxLogger.js'
// import dxDriver from './dxDriver.js'
// import dxMap from './dxMap.js'

import dxChannel from '../../../dxmodules/dxChannel.js'
import dxLogger from '../../../dxmodules/dxLogger.js'
import dxDriver from '../../../dxmodules/dxDriver.js'
import dxMap from '../../../dxmodules/dxMap.js'

const dxVgCode = {}

let handle_id = null

// Global callback functions
let g_callbacks = {
    onMessage: null  // Data reception callback
}

/**
 * Initialize UART channel and store handle into dxMap (idempotent across threads).
 * @param {string} options.path Serial port path
 * @param {string} options.rate Baud rate configuration, e.g., '115200-8-N-1'
 */
dxVgCode.init = function (path, rate = '115200-8-N-1') {
    if (!path) {
		throw new Error("'path' should not be null or empty")
	}
    const vgMap = dxMap.get("dxVgCodeMap");
    const inited = vgMap.get("inited");
    if (inited === true) {
        return;
    }
    handle_id = dxChannel.open(dxChannel.TYPE.UART, path);
    dxChannel.ioctl(handle_id, dxChannel.IOC_SET_CMD.CHANNEL_IOC_SET_UART_PARAM, rate);
    vgMap.put("handle_id", handle_id);
    vgMap.put("inited", true);
}

/**
 * Set callback functions
 * @param {Object} callbacks Callback object
 * @param {Function} callbacks.onMessage Data reception callback, receives barcode data
 */
dxVgCode.setCallbacks = function (callbacks) {
    if (!callbacks || typeof callbacks.onMessage !== 'function') {
        throw new Error('Callbacks must be an object with onMessage functions');
    }
    g_callbacks.onMessage = callbacks.onMessage;
}

/**
 * Barcode scanner typically uses 55AA protocol frame format
 */
function processCommonProtocol() {
    checkHandleId();
    if (handle_id == null || handle_id == undefined) {
        return;
    }
    
    // Read header (2 bytes)
    const header = dxChannel.receive(handle_id, 2, 100);
    if (!header || header.length !== 2) {
        return;
    }
    
    // Check for 0x55 0xAA header
    if (header[0] !== 85 || header[1] !== 170) {
        // Not a valid header, ignore this byte sequence
        return;
    }
    
    let pack = {};
    
    // Read command byte (1 byte)
    const cmdBuf = dxChannel.receive(handle_id, 1, 100);
    if (!cmdBuf || cmdBuf.length !== 1) {
        return;
    }
    pack.cmd = cmdBuf[0];
    
    // Read length bytes (2 bytes, little-endian)
    const lenBuf = dxChannel.receive(handle_id, 2, 100);
    if (!lenBuf || lenBuf.length !== 2) {
        return;
    }
    const length = lenBuf[0] | (lenBuf[1] << 8);
    pack.length = length;
    
    // Read data field
    if (length > 0) {
        const dataBuf = dxChannel.receive(handle_id, length, 500);
        if (!dataBuf || dataBuf.length !== length) {
            return;
        }
        pack.data = Array.from(dataBuf);
    }

    // Read BCC checksum (1 byte)
    const bccBuf = dxChannel.receive(handle_id, 1, 100);
    if (!bccBuf || bccBuf.length !== 1) {
        return;
    }
    const receivedBcc = bccBuf[0];

    // Calculate and verify BCC
    const calculatedBcc = calculateBcc(pack.cmd, pack.length, pack.data);
    if (receivedBcc !== calculatedBcc) {
        return;
    }

    pack.bcc = receivedBcc
    pack.cmd = int2hex(pack.cmd)
    
    // Call callback function to process data
    if (typeof g_callbacks.onMessage === 'function') {
        try {
            g_callbacks.onMessage(pack);
        } catch (error) {
            dxLogger.error('dxVgCode: callback error', error);
        }
    }
    
    return true;
}

/**
 * Polling handler function, should be called periodically in main loop
 */
dxVgCode.loop = function () {
    processCommonProtocol();
}

/**
 * Calculate BCC checksum
 * @param {number} cmd Command byte
 * @param {number} length Data length
 * @param {Array} data Data array
 * @returns {number} BCC value
 */
function calculateBcc(cmd, length, data) {
    let bcc = 0x55;
    bcc ^= 0xAA;
    bcc ^= cmd;
    bcc ^= (length & 0xFF);
    bcc ^= ((length >> 8) & 0xFF);
    
    if (data && data.length) {
        for (let i = 0; i < data.length; i++) {
            bcc ^= data[i];
        }
    }
    
    return bcc;
}

/**
 * Check and get handle ID
 */
function checkHandleId() {
    if (handle_id == null || handle_id == undefined) {
        handle_id = dxMap.get("dxVgCodeMap").get("handle_id");
    }
}

/**
 * Convert integer to hex string with 2-digit padding
 * @param {number} num Integer to convert
 * @returns {string} Hex string representation
 */
function int2hex(num) {
    return num.toString(16).padStart(2, '0');
}

export default dxVgCode;