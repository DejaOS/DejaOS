import log from '../dxmodules/dxLogger.js'
import std from '../dxmodules/dxStd.js'
import bus from '../dxmodules/dxEventBus.js'
import driver from './driver.js'
import pool from '../dxmodules/dxWorkerPool.js'
import config from '../dxmodules/dxConfig.js'
import * as os from "os"
import dxDriver from '../dxmodules/dxDriver.js'


let topics = [
    "recognition", 
    driver.gpiokey.RECEIVE_MSG, 
    "access", 
    "setConfig", 
    driver.nfc.NFC_CARD_RECEIVE, 
    driver.nfc.EID_RECEIVE,
    driver.mqtt.CONNECTED_CHANGED, 
    driver.mqtt.RECEIVE_MSG
]

function initController() {
    driver.config.init()
    driver.gpio.init()
    driver.watchdog.init()
    driver.audio.init()
    driver.gpiokey.init()
    driver.net.init()
    driver.sqlite.init()
    if(dxDriver.DRIVER.MODEL != "vf114"){
        driver.nfc.init()
        driver.nfc.eidInit()
    }
    driver.pwm.init()
    driver.mqtt.init()
    driver.autoRestart.init()
    driver.ntp.init()//放到controller试试，或者注释调，写个脚本加快切换时间
}

(function () {
    bus.newWorker('screen', '/app/code/src/worker/screenWorker.js')
    initController()
    bus.newWorker('controller', '/app/code/src/controller.js')
    bus.newWorker('httpServer', '/app/code/src/service/httpService.js')
    pool.init('/app/code/src/services.js', bus, topics, 5, 100)
    
    let appVersion
    let releaseTime
    if(dxDriver.DRIVER.MODEL == "vf203"){
        appVersion = 'vf203_v14_access_2.0.0.0'
        releaseTime = '2025-11-11 15:00:00'
    }else if(dxDriver.DRIVER.MODEL == "vf202"){
        appVersion = 'vf202_v12_access_2.0.0.3'
        releaseTime = '2025-11-11 15:00:00'
    }else if(dxDriver.DRIVER.MODEL == "vf114"){
        appVersion = 'vf114_v12_access_2.0.0.0'
        releaseTime = '2025-11-11 15:00:00'
    }else if(dxDriver.DRIVER.MODEL == "vf105"){
        appVersion = 'vf105_v12_access_2.0.0.0'
        releaseTime = '2025-11-14 11:00:00'
    }
    config.setAndSave('sys.version', appVersion)
    config.setAndSave('sys.appVersion', appVersion)
    config.setAndSave('sys.releaseTime', releaseTime)
    log.info("=================== version:" + appVersion + " ====================")
})();

std.setInterval(() => {
    try {
        // TODO 尝试把看门狗改成多通道
        driver.watchdog.feed("main", 30)
        driver.watchdog.loop()
    } catch (error) {
        log.error(error)
    }
}, 3000)

std.setInterval(() => {
    os.exec(["free", "-k"])
    os.exec(["uptime"])
}, 6000);
