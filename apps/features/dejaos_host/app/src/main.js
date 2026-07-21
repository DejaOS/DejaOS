import bus from '../dxmodules/dxEventBus.js'
import log from '../dxmodules/dxLogger.js'

try {
    log.info('dejaos_host starting')
    bus.newWorker('networkWorker', '/app/code/src/networkWorker.js')
    bus.newWorker('uiWorker', '/app/code/src/uiWorker.js')
} catch (e) {
    log.error('dejaos_host startup failed', e)
}
