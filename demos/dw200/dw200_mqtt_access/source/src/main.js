import log from '../dxmodules/dxLogger.js'
import std from '../dxmodules/dxStd.js'
import mainview from './view/mainview.js'
import driver from './driver.js'
import config from '../dxmodules/dxConfig.js'
import common from '../dxmodules/dxCommon.js'
import bus from '../dxmodules/dxEventBus.js'
(function () {//init
    config.init()
    driver.initMain()
    bus.newWorker('service', '/app/code/src/service.js')
    mainview.init()
})();

std.setInterval(() => {
    try {
        common.logMem(log)
        mainview.loop()
        driver.watchdog.loop()
    } catch (err) {
        log.error(err)
    }
}, 5)   