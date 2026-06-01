import logger from '../dxmodules/dxLogger.js'
import std from '../dxmodules/dxStd.js'
import driver from './driver.js'
import dxDriver from '../dxmodules/dxDriver.js'
import dxMap from '../dxmodules/dxMap.js'
import bus from '../dxmodules/dxEventBus.js'

function run() {
    driver.face.init()
    driver.watchdog.enable(driver.watchdog.CONTROLLER_WORKER, true)
    setCallbacks()
    events()
    std.setInterval(() => {
        try {
            driver.watchdog.restart(driver.watchdog.CONTROLLER_WORKER)
            loop()
        } catch (error) {
            logger.error(error)
        }
    }, 20)
}

try {
    run()
} catch (error) {
    logger.error(error)
}

function loop() {
    if (dxDriver.DRIVER.MODEL != "vf105" || std.loadFile('/etc/app/nfc.conf') || std.loadFile('/etc/app/.nfc')) {
        driver.nfc.loop()
    }
    driver.gpiokey.loop()
    driver.face.loop()
    if (!driver.device.finger && (dxDriver.DRIVER.MODEL == "vf105" || dxDriver.DRIVER.MODEL == "vf114")) {
        driver.uartCode.loop()
    }
    if (dxDriver.DRIVER.MODEL == "vf202") {
        driver.uartBle.loop()
    }
    getTrackingBox()
}

let oldData = ''
function getTrackingBox() {
    let event = driver.face.getTrackingBox();
    const mapUI = dxMap.get("UI")
    if (event && event.length > 0) {
        let newData = JSON.stringify(event)
        if (newData !== oldData) {
            oldData = newData
            bus.fire("trackingBox", newData)
            if (mapUI.get("isScreenOff") || mapUI.get("isScreenSaver")) {
                bus.fire("resetTimers")
            }
        }
    }
}

function setCallbacks() {
    if (dxDriver.DRIVER.MODEL != "vf105" || std.loadFile('/etc/app/nfc.conf') || std.loadFile('/etc/app/.nfc')) {
        driver.nfc.setCallbacks({
            onCardDetected: (cardInfo) => {
                bus.fire(driver.nfc.NFC_CARD_RECEIVE, cardInfo)
            },
            onEidDetected: (eidinfo) => {
                bus.fire(driver.nfc.EID_RECEIVE, eidinfo)
            }
        });
    }
    
    driver.gpiokey.setCallbacks({
        onKeyEvent: (event) => {
            bus.fire(driver.gpiokey.RECEIVE_MSG, event)
        }
    });
    if (!driver.device.finger && (dxDriver.DRIVER.MODEL == "vf105" || dxDriver.DRIVER.MODEL == "vf114")) {
        driver.uartCode.setCallbacks({
            onMessage: (event) => {
                bus.fire(driver.uartCode.RECEIVE_MSG, event)
            }
        });
    }
    driver.face.setCallbacks({
        onRecognition: (event) => {
            bus.fire("recognition", event)
        }
    });
    if (dxDriver.DRIVER.MODEL == "vf202") {
        driver.uartBle.setCallbacks({
            //透传数据回调
            onMessage: (event) => {
                bus.fire("bleCallback", event)
            },
            //连接成功回调
            onConnectSuccess: function (connId) {
                let map = dxMap.get("connId")
                map.put("connId", connId)
            }
        })
    }
}

function events() {
    // 监听获取特征值事件
    bus.on("getFeaByCapStart", (timeout) => {
        try {
            std.setTimeout(() => {
                driver.face.status(1)
                let res = driver.face.getFeaByCap(timeout)
                driver.face.status(0)
                if (res) {
                    bus.fire("getFeaByCapEnd", res)
                }
            }, 1500);
        } catch (error) {
            logger.error(error)
            bus.fire("getFeaByCapEnd", null)
            driver.face.status(0)
        }
    })
}

