import dxVgCode from './codeUtils.js'
import std from '../dxmodules/dxStd.js'
import logger from '../dxmodules/dxLogger.js'
const driver = {}

driver.uartCode = {
    init: function () {
        // Update serial path and baud settings based on your wiring.
        dxVgCode.init('/dev/ttySLB1', '115200-8-N-1')
    },
    setCallbacks: function (callbacks) {
        dxVgCode.setCallbacks(callbacks)
    },
    loop: function () {
        dxVgCode.loop()
    }
}

function bytesToString(bytes) {
    if (!bytes || !bytes.length) {
        return ''
    }
    // Scanner data is returned as bytes; convert it to readable text.
    return String.fromCharCode.apply(null, bytes)
}

driver.uartCode.init()
driver.uartCode.setCallbacks({
    onMessage: (event) => {
        const codeText = bytesToString(event.data)
        logger.info('Scan result: ', codeText)
        logger.info('Raw frame: ', event)
    }
})

// Poll UART periodically; a larger interval increases scan latency.
std.setInterval(() => {
    driver.uartCode.loop()
}, 20)

export default driver
