import logger from '../dxmodules/dxLogger.js'
import std from '../dxmodules/dxStd.js'
import driver from './driver.js'


function run() {
    initController()
    std.setInterval(() => {
        try {
            loop()
        } catch (error) {
            logger.error(error)
        }
    }, 5)
}


try {
    run()
} catch (error) {
    logger.error(error)
}


function initController() {
    driver.gpio.init()
    driver.alsa.init()
    driver.nfc.init()
    driver.code.init()
    driver.net.init()
}

function loop() {
    driver.nfc.loop()
    driver.net.loop()
    driver.code.loop()
}