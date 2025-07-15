import uartBleService from './service/uartBleService.js'
import codeService from './service/codeService.js'
import accessService from './service/accessService.js'
import gpioKeyService from './service/gpioKeyService.js'
import mqttService from './service/mqttService.js'
import nfcService from './service/nfcService.js'
import netService from './service/netService.js'
import log from '../dxmodules/dxLogger.js'
import pool from '../dxmodules/dxWorkerPool.js'
import driver from './driver.js'
import dxNet from '../dxmodules/dxNet.js'
import dxCode from '../dxmodules/dxCode.js'
import dxNfc from '../dxmodules/dxNfc.js'
import dxGpioKey from '../dxmodules/dxGpioKey.js'
import dxMqtt from '../dxmodules/dxMqtt.js'
import dxUart from '../dxmodules/dxUart.js'

pool.callback((data) => {
    let topic = data.topic
    let msg = data.data
    log.info("topic:"+topic)
    log.info("msg:"+msg)
    switch (topic) {
        case "code":
            codeService.code(msg)
            break;
        case "password":
            log.info("password:"+JSON.stringify(msg))
            accessService.access(msg)
            break;
        case dxNet.STATUS_CHANGE:
            netService.netStatusChanged(msg)
            break;
        case dxMqtt.CONNECTED_CHANGED + driver.mqtt.id:
            mqttService.connectedChanged(msg)
            break;
        case dxMqtt.RECEIVE_MSG + driver.mqtt.id:
            
            mqttService.receiveMsg(msg)
            break;
        case dxCode.RECEIVE_MSG:
            codeService.receiveMsg(msg)
            break;
        case dxNfc.RECEIVE_MSG:
            nfcService.receiveMsg(msg)
            break;
        case dxGpioKey.RECEIVE_MSG:
            gpioKeyService.receiveMsg(msg)
            break;
        case dxUart.VG.RECEIVE_MSG + driver.uartBle.id:
            uartBleService.receiveMsg(msg)
            break;
        case "bleupgrade":
            driver.uartBle.upgrade(msg)
            break;
        default:
            log.error("No such topic ", topic)
            break;
    }
})


