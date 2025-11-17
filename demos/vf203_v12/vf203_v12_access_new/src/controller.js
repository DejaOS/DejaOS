import logger from '../dxmodules/dxLogger.js'
import std from '../dxmodules/dxStd.js'
import driver from './driver.js'
import bus from '../dxmodules/dxEventBus.js'

function run() {
    driver.face.init()
    setCallbacks()
    events()
    std.setInterval(() => {
        try {
            driver.watchdog.feed("controller", 30)
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
    driver.nfc.loop()
    driver.gpiokey.loop()
    driver.face.loop()
    getTrackingBox()
}

let oldData = ''
function getTrackingBox() {
    let event = driver.face.getTrackingBox();
    if (event && event.length > 0) {
        let newData = JSON.stringify(event)
        if (newData !== oldData) {
            oldData = newData
            bus.fire("trackingBox", newData)
        }
    }
}

function setCallbacks() {
    driver.nfc.setCallbacks({
        onCardDetected: (cardInfo) => {
            bus.fire(driver.nfc.NFC_CARD_RECEIVE, cardInfo)
        },
        onEidDetected: (eidinfo) => {
            bus.fire(driver.nfc.EID_RECEIVE, eidinfo)
        }
    });
    driver.gpiokey.setCallbacks({
        onKeyEvent: (event) => {
            bus.fire(driver.gpiokey.RECEIVE_MSG, event)
        }
    });
}

driver.face.setCallbacks({
    onRecognition: (event) => {
        bus.fire("recognition", event)
    }
})


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


// std.setInterval(() => {
//     logger.info("--------------------testRegister start--------------------")
//     driver.face.testRegister()
//     logger.info("--------------------testRegister end--------------------")
// }, 1000)