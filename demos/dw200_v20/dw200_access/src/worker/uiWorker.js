import log from '../../dxmodules/dxLogger.js'
import std from '../../dxmodules/dxStd.js'
import screen from '../screen.js'
log.info("uiWorker init..............................")
try {
   screen.init()
} catch (error) {
    log.error("uiWorker init error", error)
}

std.setInterval(() => {
    try {
        screen.loop()
    } catch (error) {
        log.error(error)
    }
}, 20)