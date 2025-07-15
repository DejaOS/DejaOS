import log from '../dxmodules/dxLogger.js'
import std from '../dxmodules/dxStd.js'
import config from '../dxmodules/dxConfig.js'
import pool from '../dxmodules/dxWorkerPool.js'
import bus from '../dxmodules/dxEventBus.js'
import screen from './screen.js'
import driver from './driver.js'
import sqlite from './service/sqliteService.js'
import dxNet from '../dxmodules/dxNet.js'
import dxCode from '../dxmodules/dxCode.js'
import dxNfc from '../dxmodules/dxNfc.js'
import dxGpioKey from '../dxmodules/dxGpioKey.js'
import dxMqtt from '../dxmodules/dxMqtt.js'
import dxUart from '../dxmodules/dxUart.js'
import common from '../dxmodules/dxCommon.js'
import utils from './common/utils/utils.js'

let topics = [dxCode.RECEIVE_MSG, "code", "password", "bleupgrade", dxNfc.RECEIVE_MSG, dxGpioKey.RECEIVE_MSG, dxUart.VG.RECEIVE_MSG + driver.uartBle.id, dxNet.STATUS_CHANGE, dxMqtt.CONNECTED_CHANGED + driver.mqtt.id, dxMqtt.RECEIVE_MSG + driver.mqtt.id]

function startWorkers () {
    // 配置文件先初始化，因为后面的组件初始化中可能要用到配置文件
    driver.config.init()
    // 只能在主线程开辟子线程
    driver.uartBle.init()
    driver.mqtt.init()
    sqlite.init('/app/data/db/app.db')
}

(function () {
    startWorkers()
    const appVersion = 'dw200_v20_access_2.0.0.2'
    config.setAndSave('sysInfo.appVersion', appVersion)
    log.info("=================== version:" + appVersion + " ====================")

    screen.init()
    bus.newWorker('controller', '/app/code/src/controller.js')
    pool.init('/app/code/src/services.js', bus, topics, 3, 100)
    let autoRestart = utils.isEmpty(config.get("sysInfo.autoRestart")) ? -1 : config.get("sysInfo.autoRestart")
    if (autoRestart != -1) {
        driver.autoRestart.init()
    }
})();
std.setInterval(() => {
    try {
        driver.watchdog.feed("main", 30 * 1000)
        driver.watchdog.loop()
        screen.loop()
    } catch (error) {
        log.error(error)
    }
}, 5)