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
import dxUart from '../dxmodules/dxUart.js'
import common from '../dxmodules/dxCommon.js'
import utils from './common/utils/utils.js'
let topics = [dxNet.STATUS_CHANGE, "code", dxGpioKey.RECEIVE_MSG, dxUart.VG.RECEIVE_MSG + driver.uartBle.id, dxTcp.VG.CONNECTED_CHANGED + driver.tcp.id, dxTcp.VG.RECEIVE_MSG + driver.tcp.id, dxCode.RECEIVE_MSG, dxNfc.RECEIVE_MSG, dxUart.VG.RECEIVE_MSG + driver.uart485.id]
function initController() {
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
}

(function () {
    initController()
    const appVersion = 'dw200_v20_scanner_v2.0.1'
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
        driver.watchdog.feed("main", 30)
        driver.watchdog.loop()
        screen.loop()
    } catch (error) {
        log.error(error)
    }
}, 5)
