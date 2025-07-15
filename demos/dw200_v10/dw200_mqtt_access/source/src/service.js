import log from '../dxmodules/dxLogger.js'
import driver from './driver.js'
import std from '../dxmodules/dxStd.js'
import mqtthandler from './mqtthandler.js'
import codehandler from './codehandler.js'
const worker = 'service'
function run() {
    driver.initService()
    driver.mqtt.on(function (data) { mqtthandler.invoke(data) })
    driver.mqtt.onConnectChanged(function (data) { mqtthandler.connectChanged(data) })
    driver.code.on(function (data) { codehandler.invoke(data) })
    driver.net.on(function (data) { mqtthandler.netInvoke(data) })

    std.setInterval(() => {
        try {
            driver.loop()
            driver.code.loop()
            driver.watchdog.feed(worker, 30)
        } catch (error) {
            log.error(error)
        }
    }, 10)
}


try {
    run()
} catch (error) {
    log.error(error)
}