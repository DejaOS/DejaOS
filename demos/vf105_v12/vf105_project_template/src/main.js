import logger from '../dxmodules/dxLogger.js'
import bus from '../dxmodules/dxEventBus.js'
import std from '../dxmodules/dxStd.js'
import pool from '../dxmodules/dxWorkerPool.js'
import screen from './screen.js'
import driver from './driver.js'
import dxFace from '../dxmodules/dxFace.js'
import dxNet from '../dxmodules/dxNet.js'
import dxUart from '../dxmodules/dxUart.js'

let topics = [
    dxFace.RECEIVE_MSG, 
    dxUart.VG.RECEIVE_MSG+driver.uart485.id, 
    dxUart.VG.RECEIVE_MSG+driver.uartCode.id, 
    dxNet.STATUS_CHANGE
]

function startWorkers() {
    // 只能在主线程创建子线程
    driver.uart485.init()
    driver.uartCode.init()
}

(function () {

    screen.init()

    initController()

    bus.newWorker('controller', '/app/code/src/controller.js')
    
    pool.init('/app/code/src/services.js', bus, topics, 3, 100)
    
    const appVersion = 'vf205_project_template_1.0.0'
    logger.info("=================== version:" + appVersion + " ====================")
})();


std.setInterval(() => {
    screen.loop()
}, 5)




