import pool from '../dxmodules/dxWorkerPool.js'
import dxNet from '../dxmodules/dxNet.js'
import dxUart from '../dxmodules/dxUart.js'
import uart485Service from './service/uart485Service.js'
import netService from './service/netService.js'
import logger from '../dxmodules/dxLogger.js'
import faceService from './service/faceService.js'
import dxFace from '../dxmodules/dxFace.js'
import driver from './driver.js'

pool.callback((data) => {
    let topic = data.topic
    let msg = data.data
    switch (topic) {
        case dxUart.VG.RECEIVE_MSG+driver.uart485.id:
            uart485Service.receive(msg)
            break;
        case dxUart.VG.RECEIVE_MSG+driver.uartCode.id:
            uart485Service.receive(msg)
            break;
        case dxNet.STATUS_CHANGE:
            netService.netStatusChanged(msg)
            break;
        case dxFace.RECEIVE_MSG:
            faceService.face(msg)
            break;
        default:
            logger.error("No such topic ", topic)
            break;
    }
})
