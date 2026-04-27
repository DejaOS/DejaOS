import dxChannel from '../dxmodules/dxChannel.js'
import dxLogger from '../dxmodules/dxLogger.js'
import dxMap from '../dxmodules/dxMap.js'

const dxVgCode = {}

let handle_id = null

let g_callbacks = {
    onMessage: null
}

dxVgCode.init = function (path, rate = '115200-8-N-1') {
    if (!path) {
		throw new Error("'path' should not be null or empty")
	}
    const vgMap = dxMap.get('dxVgCodeMap')
    const inited = vgMap.get('inited')
    if (inited === true) {
        return
    }
    handle_id = dxChannel.open(dxChannel.TYPE.UART, path)
    dxChannel.ioctl(handle_id, dxChannel.IOC_SET_CMD.CHANNEL_IOC_SET_UART_PARAM, rate)
    vgMap.put('handle_id', handle_id)
    vgMap.put('inited', true)
}

dxVgCode.setCallbacks = function (callbacks) {
    if (!callbacks || typeof callbacks.onMessage !== 'function') {
        throw new Error('callbacks.onMessage must be a function')
    }
    g_callbacks.onMessage = callbacks.onMessage
}

function processCommonProtocol() {
    checkHandleId()
    if (handle_id == null || handle_id == undefined) {
        return
    }
    const header = dxChannel.receive(handle_id, 2, 100)
    if (!header || header.length !== 2) {
        return
    }
    if (header[0] !== 85 || header[1] !== 170) {
        return
    }
    const pack = {}
    const cmdBuf = dxChannel.receive(handle_id, 1, 100)
    if (!cmdBuf || cmdBuf.length !== 1) {
        return
    }
    pack.cmd = cmdBuf[0]
    const lenBuf = dxChannel.receive(handle_id, 2, 100)
    if (!lenBuf || lenBuf.length !== 2) {
        return
    }
    const length = lenBuf[0] | (lenBuf[1] << 8)
    pack.length = length
    if (length > 0) {
        const dataBuf = dxChannel.receive(handle_id, length, 500)
        if (!dataBuf || dataBuf.length !== length) {
            return
        }
        pack.data = Array.from(dataBuf)
    } else {
        pack.data = []
    }

    const bccBuf = dxChannel.receive(handle_id, 1, 100)
    if (!bccBuf || bccBuf.length !== 1) {
        return
    }
    const receivedBcc = bccBuf[0]
    const calculatedBcc = calculateBcc(pack.cmd, pack.length, pack.data)
    if (receivedBcc !== calculatedBcc) {
        return
    }

    pack.bcc = receivedBcc
    pack.cmd = int2hex(pack.cmd)
    if (typeof g_callbacks.onMessage === 'function') {
        try {
            g_callbacks.onMessage(pack)
        } catch (error) {
            dxLogger.error('dxVgCode callback error', error)
        }
    }

    return true
}

dxVgCode.loop = function () {
    processCommonProtocol()
}

function calculateBcc(cmd, length, data) {
    let bcc = 0x55
    bcc ^= 0xAA
    bcc ^= cmd
    bcc ^= (length & 0xFF)
    bcc ^= ((length >> 8) & 0xFF)
    if (data && data.length) {
        for (let i = 0; i < data.length; i++) {
            bcc ^= data[i]
        }
    }

    return bcc
}

function checkHandleId() {
    if (handle_id == null || handle_id == undefined) {
        handle_id = dxMap.get('dxVgCodeMap').get('handle_id')
    }
}

function int2hex(num) {
    return num.toString(16).padStart(2, '0')
}

export default dxVgCode;
