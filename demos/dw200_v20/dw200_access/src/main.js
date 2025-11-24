import log from '../dxmodules/dxLogger.js'
log.setDebug(false)
import std from '../dxmodules/dxStd.js'
import config from '../dxmodules/dxConfig.js'
import pool from '../dxmodules/dxWorkerPool.js'
import bus from '../dxmodules/dxEventBus.js'
import driver from './driver.js'
import sqlite from './service/sqliteService.js'
import dxNet from '../dxmodules/dxNet.js'
import dxCode from '../dxmodules/dxCode.js'
import dxNfc from '../dxmodules/dxNfc.js'
import dxGpioKey from '../dxmodules/dxGpioKey.js'
import dxUart from '../dxmodules/dxUart.js'
import utils from './common/utils/utils.js'
import * as os from 'os'
let topics = [dxCode.RECEIVE_MSG, "code", "password", "bleupgrade", dxNfc.RECEIVE_MSG, dxGpioKey.RECEIVE_MSG, dxUart.VG.RECEIVE_MSG + driver.uartBle.id, dxNet.STATUS_CHANGE, driver.mqtt.CONNECTED_CHANGED, driver.mqtt.RECEIVE_MSG
]

function startWorkers() {
    // Initialize the configuration file first, as it may be needed for component initialization later on
    driver.config.init()
    // Only sub threads can be opened in the main thread
    driver.uartBle.init()
    driver.mqtt.init()
    sqlite.init()
}

(function () {
    startWorkers()
    const appVersion = 'dw200_v20_access_2.0.5'
    config.setAndSave('sysInfo.appVersion', appVersion)
    log.info("=================== version:" + appVersion + " ====================")


    bus.newWorker('screen', '/app/code/src/worker/uiWorker.js')
    bus.newWorker('controller', '/app/code/src/controller.js')
    pool.init('/app/code/src/services.js', bus, topics, 3, 100)
    let autoRestart = utils.isEmpty(config.get("sysInfo.autoRestart")) ? -1 : config.get("sysInfo.autoRestart")
    if (autoRestart != -1) {
        log.info("autoRestart:" + autoRestart)
        driver.autoRestart.init()
    }
})();
std.setInterval(() => {
    try {
        driver.watchdog.feed("main", 30 * 1000)
        driver.watchdog.loop()
    } catch (error) {
        log.error(error)
    }
}, 5000);

std.setInterval(() => {
    try {
        os.exec(["free", "-k"])
        os.exec(["uptime"])
    } catch (error) {
        log.error('main.loop', error)
    }
}, 30000)
