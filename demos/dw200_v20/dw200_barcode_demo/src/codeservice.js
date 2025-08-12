import log from '../dxmodules/dxLogger.js'
import std from '../dxmodules/dxStd.js'
import dxBarcode from '../dxmodules/dxBarcode.js'
import center from '../dxmodules/dxEventBus.js'

dxBarcode.init()
dxBarcode.setCallbacks({
    onBarcodeDetected: function (barcode, type, quality, timestamp) {
        log.info('barcode detected', barcode, type, quality, timestamp)
        center.fire('code', {
            type: 'barcode',
            data: barcode
        })
    }
})
std.setInterval(() => {
    try {
        dxBarcode.loop()
    } catch (error) {
        log.error(error)
    }
}, 50)
