import log from '../dxmodules/dxLogger.js'
import std from '../dxmodules/dxStd.js'
import bus from '../dxmodules/dxEventBus.js'
import screen from './screen.js'
import driver from './driver.js'
import pool from '../dxmodules/dxWorkerPool.js'
import mqtt from '../dxmodules/dxMqtt.js'
import dxCode from '../dxmodules/dxCode.js'

let topics = [dxCode.RECEIVE_MSG,mqtt.RECEIVE_MSG]

function initController() {
    driver.net.init()
    driver.mqtt.init()
    driver.code.init()
}

(function () {
    driver.config.init()
    initController()
    screen.init()
    bus.newWorker('controller', '/app/code/src/controller.js')
    pool.init('/app/code/src/services.js', bus, topics, 5, 100)
    log.info("=================== run success ====================")
})();

std.setInterval(() => {
    try {
        screen.loop()
        driver.code.loop()
    } catch (error) {
        log.error(error)
    }
}, 30)
