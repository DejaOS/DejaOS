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

let topics = ["bleupgrade", dxCode.RECEIVE_MSG, "code", "password", dxNfc.RECEIVE_MSG, dxGpioKey.RECEIVE_MSG, dxUart.VG.RECEIVE_MSG + driver.uartBle.id, dxNet.STATUS_CHANGE, dxMqtt.CONNECTED_CHANGED + driver.mqtt.id, dxMqtt.RECEIVE_MSG + driver.mqtt.id]




function startWorkers() {
    // if (std.exist("/app/code/os/S999")) {
    //     //如果存在代表升级os
    //     common.systemBrief("cp /app/code/os/S999 /etc/init.d/")
    //     common.systemBrief("chmod 777 /etc/init.d/S999")
    //     common.systemBrief("reboot")
    // }
    // if (std.exist("/app/data/config/config.json") && !std.loadFile("/app/data/config/config.json").includes("dw200_v10_access_v2.0.2.1")) {
    //     common.systemBrief("rm -rf /app/data/config/config.json")
    // }


    // 配置文件先初始化，因为后面的组件初始化中可能要用到配置文件 
    driver.config.init()
    // 只能在主线程开辟子线程
    driver.uartBle.init()
    driver.mqtt.init()

    sqlite.init('/app/data/db/app.db')
}

(function () {
    startWorkers()
    const appVersion = 'dw200_v10_access_v2.0.2.3'
    config.setAndSave('sysInfo.appVersion', appVersion)
    log.info("=================== version:" + appVersion + " ====================")

    screen.init()
    bus.newWorker('controller', '/app/code/src/controller.js')
    pool.init('/app/code/src/services.js', bus, topics, 3, 100)
    if (config.get("sysInfo.autoRestart") || -1 != -1) {
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

// std.setInterval(() => {
//     common.systemBrief("free -b && uptime")
// }, 4000)