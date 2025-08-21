import log from '../dxmodules/dxLogger.js'
import std from '../dxmodules/dxStd.js'
import bus from '../dxmodules/dxEventBus.js'
import screen from './screen.js'
import driver from './driver.js'



(function () {
    driver.config.init()

    screen.init()

    bus.newWorker('mqttService', '/app/code/src/service/mqttService.js')

    bus.newWorker('netService', '/app/code/src/service/netService.js')

    bus.newWorker('codeService', '/app/code/src/service/codeService.js')

    log.info("=================== run success ====================")
})();

std.setInterval(() => {
    try {
        screen.loop()
    } catch (error) {
        log.error(error)
    }
}, 30)
