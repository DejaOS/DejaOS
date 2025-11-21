import logger from '../dxmodules/dxLogger.js'
import bus from '../dxmodules/dxEventBus.js'
import pool from '../dxmodules/dxWorkerPool.js'
import driver from './driver.js'
import dxNet from '../dxmodules/dxNet.js'
import dxUart from '../dxmodules/dxUart.js'

let topics = [
    dxUart.VG.RECEIVE_MSG + driver.uart4850.id,
    dxUart.VG.RECEIVE_MSG + driver.uart4851.id,
    dxUart.VG.RECEIVE_MSG + driver.uart4852.id,
    dxNet.STATUS_CHANGE
]

function startWorkers() {
    // Can only create child threads in the main thread
    driver.uart4850.init()
    driver.uart4851.init()
    driver.uart4852.init()
}

(function () {

    startWorkers()

    bus.newWorker('controller', '/app/code/src/controller.js')

    pool.init('/app/code/src/services.js', bus, topics, 3, 100)

    const appVersion = 'cc104_project_template_1.0.0'
    logger.info("=================== version:" + appVersion + " ====================")
})();






