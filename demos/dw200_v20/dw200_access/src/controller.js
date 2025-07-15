import log from '../dxmodules/dxLogger.js'
import std from '../dxmodules/dxStd.js'
import driver from './driver.js'

function run() {
    initController()
    std.setInterval(() => {
        try {
            driver.watchdog.feed("controller", 30 * 1000)
            loop()
        } catch (error) {
            log.error(error)
        }
    }, 5)
}

try {
    run()
} catch (error) {
    log.error(error)
}


function initController() {
    driver.gpio.init()
    driver.gpiokey.init()
    driver.watchdog.init()
    driver.pwm.init()
    driver.audio.init()
    driver.nfc.init()
    driver.nfc.eidInit()
    driver.code.init()
    driver.net.init()
}


function loop() {
    driver.net.loop()
    driver.code.loop()
    driver.nfc.loop()
    driver.gpiokey.loop()
    driver.ntp.loop()
    driver.mqtt.heartbeat()
}
