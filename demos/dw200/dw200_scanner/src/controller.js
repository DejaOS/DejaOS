import log from '../dxmodules/dxLogger.js'
import std from '../dxmodules/dxStd.js'
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
}

try {
    run()
} catch (error) {
    log.error(error)
}

function loop() {
    driver.net.loop()
    driver.code.loop()
    driver.nfc.loop()
    driver.gpiokey.loop()
    driver.ntp.loop()
    driver.heartbeat.loop()
    driver.uart485.heartbeat()
}
