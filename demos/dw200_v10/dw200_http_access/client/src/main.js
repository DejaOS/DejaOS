import log from '../dxmodules/dxLogger.js'
import std from '../dxmodules/dxStd.js'
import mainview from './view/mainview.js'
import driver from './driver.js'
import bus from '../dxmodules/dxEventBus.js'
(function () {//init
    driver.initMain()
    bus.newWorker('service', '/app/code/src/service.js')
    mainview.init()
})();

std.setInterval(() => {
    try {
        mainview.loop()
    } catch (err) {
        log.error(err)
    }
}, 5)   