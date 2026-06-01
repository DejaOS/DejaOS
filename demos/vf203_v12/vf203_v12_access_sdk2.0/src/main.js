import log from '../dxmodules/dxLogger.js'
import std from '../dxmodules/dxStd.js'
import dxCommon from '../dxmodules/dxCommon.js'
import bus from '../dxmodules/dxEventBus.js'
import driver from './driver.js'
import pool from '../dxmodules/dxWorkerPool.js'
import config from '../dxmodules/dxConfig.js'
import * as os from "os"
import dxDriver from '../dxmodules/dxDriver.js'

let topics = [
    "recognition",
    "bleCallback",
    driver.gpiokey.RECEIVE_MSG,
    "access",
    "setConfig",
    driver.nfc.NFC_CARD_RECEIVE,
    driver.nfc.EID_RECEIVE,
    driver.mqtt.CONNECTED_CHANGED,
    driver.mqtt.RECEIVE_MSG,
    driver.uartCode.RECEIVE_MSG,
    "code",
    driver.finger.RECEIVE_MSG
]

function initController() {
    driver.config.init()
    driver.gpio.init()
    driver.watchdog.init()
    driver.audio.init()
    driver.gpiokey.init()
    if (dxDriver.DRIVER.MODEL == "vf202") {
        driver.uartBle.init()
    }
    if (!driver.device.finger && (dxDriver.DRIVER.MODEL == "vf105" || dxDriver.DRIVER.MODEL == "vf114")) {
        driver.uartCode.init()
    }
    driver.net.init()
    driver.sqlite.init()
    if (dxDriver.DRIVER.MODEL != "vf105" || std.loadFile('/etc/app/nfc.conf') || std.loadFile('/etc/app/.nfc')) {
        driver.nfc.init()
        driver.nfc.eidInit()
    } 
    driver.pwm.init()
    driver.mqtt.init()
    driver.ntp.init()
}

(function () {
    bus.newWorker('screen', '/app/code/src/worker/screenWorker.js')
    initController()
    // 通行记录上报独立线程（依赖 sqlite/mqtt 初始化完成）
    bus.newWorker('passRecord', '/app/code/src/worker/passRecordWorker.js')
    bus.newWorker('controller', '/app/code/src/controller.js')
    bus.newWorker('httpServer', '/app/code/src/service/httpService.js')
    bus.newWorker('fingerWorker', '/app/code/src/worker/fingerWorker.js')
    pool.init('/app/code/src/services.js', bus, topics, 6, 1000)

    let appVersion
    let releaseTime
    if (dxDriver.DRIVER.MODEL == "vf202") {
        appVersion = 'vf202_v12_access_2.0.2'
        releaseTime = '2026-01-09 13:00:00'
    } else if (dxDriver.DRIVER.MODEL == "vf203") {
        appVersion = 'vf203_v14_access_2.0.3'
        releaseTime = '2026-05-07 20:00:00'
    } else if (dxDriver.DRIVER.MODEL == "vf114") {
        appVersion = 'vf114_v12_access_2.0.2'
        releaseTime = '2026-05-27 09:50:00'
    } else if (dxDriver.DRIVER.MODEL == "vf105") {
        appVersion = 'vf105_v12_access_2.0.3'
        releaseTime = '2026-06-01 10:00:00'
    }
    config.setAndSave('sys.appVersion', appVersion)
    config.setAndSave('sys.releaseTime', releaseTime)
    log.info("=================== version:" + appVersion + " ====================")
})();

std.setInterval(() => {
    try {
        driver.watchdog.restart(driver.watchdog.MAIN_WORKER)
    } catch (error) {
        log.error(error)
    }
}, 3000)

// std.setInterval(() => {
//     os.exec(["free", "-k"])
//     os.exec(["uptime"])
// }, 6000);
