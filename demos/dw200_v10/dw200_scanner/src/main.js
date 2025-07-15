import log from '../dxmodules/dxLogger.js'
import std from '../dxmodules/dxStd.js'
import config from '../dxmodules/dxConfig.js'
import screen from './screen.js'
import driver from './driver.js'
import bus from '../dxmodules/dxEventBus.js'
import pool from '../dxmodules/dxWorkerPool.js'
import dxNet from '../dxmodules/dxNet.js'
import dxCode from '../dxmodules/dxCode.js'
import dxNfc from '../dxmodules/dxNfc.js'
import dxTcp from '../dxmodules/dxTcp.js'
import dxGpioKey from '../dxmodules/dxGpioKey.js'
import ota from '../dxmodules/dxOta.js'
import utils from './common/utils/utils.js'
import dxUart from '../dxmodules/dxUart.js'
import common from '../dxmodules/dxCommon.js'
let topics = [dxNet.STATUS_CHANGE, "code", dxGpioKey.RECEIVE_MSG, dxUart.VG.RECEIVE_MSG + driver.uartBle.id, dxTcp.VG.CONNECTED_CHANGED + driver.tcp.id, dxTcp.VG.RECEIVE_MSG + driver.tcp.id, dxCode.RECEIVE_MSG, dxNfc.RECEIVE_MSG, dxUart.VG.RECEIVE_MSG + driver.uart485.id]
function initController() {
    // if (std.exist("/app/code/os/S999")) {
    //     //如果存在代表升级os
    //     common.systemBrief("cp /app/code/os/S999 /etc/init.d/")
    //     common.systemBrief("chmod 777 /etc/init.d/S999")
    //     common.systemBrief("reboot")
    // }
    // if (std.exist("/app/data/config/config.json") && !std.loadFile("/app/data/config/config.json").includes("dw200_scanner_v2.0.3")) {
    //     common.systemBrief("rm -rf /app/data/config/config.json")
    // }



    // 配置文件先初始化，因为后面的组件初始化中可能要用到配置文件
    driver.config.init()
    driver.gpio.init()
    driver.gpiokey.init()
    driver.watchdog.init()
    driver.pwm.init()
    driver.audio.init()
    driver.nfc.init()
    std.Worker('/app/code/src/code.js')
    driver.uart485.init()
    driver.uartBle.init()
    driver.net.init()
    driver.tcp.init()
    // driver.autoRestart.init()
}

(function () {
    initController()
    const appVersion = 'dw200_scanner_v2.0.3'
    config.setAndSave('sysInfo.version', appVersion)
    log.info("=================== version:" + appVersion + " ====================")

    screen.init()
    bus.newWorker('controller', '/app/code/src/controller.js')
    pool.init('/app/code/src/services.js', bus, topics, 3, 100)
    driver.pwm.success()
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

// std.setInterval(() => {
//     common.systemBrief("free -b && uptime")
// }, 4000)
