import log from '../dxmodules/dxLogger.js'
import std from '../dxmodules/dxStd.js'
import mainview from './view/mainview.js'
import driver from './driver.js'
import bus from '../dxmodules/dxEventBus.js'
import toast from './view/toast.js'
(function () {//init
    driver.initMain()
    bus.newWorker('service', '/app/code/src/service.js')
    mainview.init()
    toast.init()
})();

bus.on('ui.toast', (data) => {
    toast.error(data)
})
std.setInterval(() => {
    try {
        mainview.loop()
    } catch (err) {
        log.error(err)
    }
}, 5)   