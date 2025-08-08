import pool from '../dxmodules/dxWorkerPool.js'
import mqtt from '../dxmodules/dxMqtt.js'
import mqttService from './service/mqttService.js'
import codeService from './service/codeService.js'
import log from '../dxmodules/dxLogger.js'
import dxCode from '../dxmodules/dxCode.js'
import common from '../dxmodules/dxCommon.js'

pool.callback((data) => {
    try {
        let topic = data.topic
        let msg = data.data
       log.info("-----------3---------"+common.arrayBufferToHexString(msg));
        switch (topic) {
            case mqtt.RECEIVE_MSG:
                mqttService.receiveMsg(msg)
                break;
            case dxCode.RECEIVE_MSG:
                codeService.receiveMsg(msg)
                break;
            default:
                log.error("No such topic ", topic)
                break;
        }
    } catch (error) {
        log.error(error)
    }
})

