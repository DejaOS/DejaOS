import log from '../dxmodules/dxLogger.js'
import std from '../dxmodules/dxStd.js'
import face from '../dxmodules/dxFace.js'
import bus from '../dxmodules/dxEventBus.js'
import driver from './driver.js'


function run() {
    std.setInterval(() => {
        try {
            driver.watchdog.feed("controller", 30)
            loop()
        } catch (error) {
            log.error(error)
        }
    }, 5)

    std.setInterval(() => {
        try {
            driver.watchdog.feed("controller1", 30)
            driver.net.loop()
        } catch (error) {
            log.error(error)
        }
    }, 500)
    std.setInterval(() => {
        try {
            driver.watchdog.feed("controller2", 30)
            driver.ntp.loop()
        } catch (error) {
            log.error(error)
        }
    }, 1000)
}

try {
    run()
} catch (error) {
    log.error(error)
}

function loop() {
    driver.capturer.loop()
    driver.face.loop()
    driver.nfc.loop()
    driver.mqtt.heartbeat()
    driver.gpiokey.loop()
}
