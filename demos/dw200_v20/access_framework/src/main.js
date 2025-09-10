// Responsible for application startup, various initializations and event forwarding, the main thread does not do any logical processing
import log from '../dxmodules/dxLogger.js'
import std from '../dxmodules/dxStd.js'
import bus from '../dxmodules/dxEventBus.js'
import dxos from '../dxmodules/dxOs.js'
import dxpwm from '../dxmodules/dxPwm.js'
import config from './service/config.js'
import * as os from "os"
import blecontroller from './service/ble.js'

function init() {
    try {
        config.init()
        dxpwm.init()
    } catch (error) {
        log.error('main.init', error)
    }
}

function initWorkers() {
    bus.newWorker('uicontroller', '/app/code/src/controller/uiController.js')
    bus.newWorker('devicecontroller', '/app/code/src/controller/deviceController.js')
    bus.newWorker('mqttcontroller', '/app/code/src/controller/mqttController.js')
    bus.newWorker('deviceworker', '/app/code/src/worker/deviceWorker.js')
    bus.newWorker('mqttworker', '/app/code/src/worker/mqttWorker.js')
    blecontroller.init()
}
(function () {
    init()
    initWorkers()
    const appVersion = 'dw200_v20_access_2.1.0.0'
    config.set('sysInfo.appVersion', appVersion)
    config.set('sysInfo.sn', dxos.getSn())
    log.info("=================== version:" + appVersion + " ====================")
})();

std.setInterval(() => {
    try {
        os.exec(["free", "-k"])
        os.exec(["uptime"])
    } catch (error) {
        log.error('main.loop', error)
    }
}, 30000)
