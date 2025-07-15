import pool from '../dxmodules/dxWorkerPool.js'
import dxCode from '../dxmodules/dxCode.js'
import dxNfc from '../dxmodules/dxNfc.js'
import dxNet from '../dxmodules/dxNet.js'
import dxUart from '../dxmodules/dxUart.js'
import uart485Service from './service/uart485Service.js'
import nfcService from './service/nfcService.js'
import codeService from './service/codeService.js'
import netService from './service/netService.js'
import logger from '../dxmodules/dxLogger.js'

pool.callback((data) => {
    let topic = data.topic
    let msg = data.data
    switch (topic) {
        case dxCode.RECEIVE_MSG:
            codeService.code(msg)
            break;
        case dxNfc.RECEIVE_MSG:
            nfcService.nfc(msg)
            break;
        case dxUart.VG.RECEIVE_MSG:
            uart485Service.receive(msg)
            break;
        case dxNet.STATUS_CHANGE:
            netService.netStatusChanged(msg)
            break;
        default:
            logger.error("No such topic ", topic)
            break;
    }
})
