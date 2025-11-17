import log from '../dxmodules/dxLogger.js'
import bus from '../dxmodules/dxEventBus.js'
import pool from '../dxmodules/dxWorkerPool.js'
import config from '../dxmodules/dxConfig.js'
import faceService from './service/faceService.js'
import mqttService from './service/mqttService.js'
import accessService from './service/accessService.js'
import nfcService from './service/nfcService.js'
import gpiokeyService from './service/gpiokeyService.js'
import configService from './service/configService.js'
import driver from './driver.js'


pool.callback((data) => {
    try {
        let topic = data.topic
        let msg = data.data
        switch (topic) {
            case "recognition":
                faceService.receiveMsg(msg)
                break;
            case driver.gpiokey.RECEIVE_MSG:
                gpiokeyService.receiveMsg(msg)
                break;
            case "setConfig":
                configService.configVerifyAndSave(msg)
                break;
            case "access":
                accessService.access(msg.data, msg.fileName, msg.similarity)
                break;
            case driver.nfc.NFC_CARD_RECEIVE:
            case driver.nfc.EID_RECEIVE:
                if(config.get('sys.nfc')){
                    nfcService.receiveMsg(msg)
                }
                break;
            case driver.mqtt.CONNECTED_CHANGED:
                // TODO 最好不要在services内直接bus.fire,尝试简化链路
                bus.fire("mqttStatus", msg)
                if (msg == "connected") {
                    mqttService.report()
                }
                break;
            case driver.mqtt.RECEIVE_MSG:
                mqttService.receiveMsg(msg)
                break;
            default:
                log.error("No such topic ", topic)
                break;
        }
    } catch (error) {
        log.error(error)
    }
})

