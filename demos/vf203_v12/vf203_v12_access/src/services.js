import pool from '../dxmodules/dxWorkerPool.js'
import face from '../dxmodules/dxFace.js'
import std from '../dxmodules/dxStd.js'
import driver from './driver.js'
import bus from '../dxmodules/dxEventBus.js'
import faceService from './service/faceService.js'
import net from '../dxmodules/dxNet.js'
import config from '../dxmodules/dxConfig.js'
import nfc from '../dxmodules/dxNfc.js'
import mqtt from '../dxmodules/dxMqtt.js'
import map from '../dxmodules/dxMap.js'
import cameraCalibration from '../dxmodules/dxCameraCalibration.js'
import mqttService from './service/mqttService.js'
import accessService from './service/accessService.js'
import nfcService from './service/nfcService.js'
import common from '../dxmodules/dxCommon.js'
import log from '../dxmodules/dxLogger.js'
import dxGpioKey from '../dxmodules/dxGpioKey.js'
import uart from '../dxmodules/dxUart.js'
import uart485Service from './service/uart485Service.js'
import configService from './service/configService.js'
import gpiokeyService from './service/gpiokeyService.js'
pool.callback((data) => {
    try {
        let topic = data.topic
        let msg = data.data
        switch (topic) {
            case face.RECEIVE_MSG:
                faceService.receiveMsg(msg)
                break;
            case dxGpioKey.RECEIVE_MSG:
                gpiokeyService.receiveMsg(msg)
                break;
            case "netGetWifiSsidList":
                let wifiList = driver.net.netGetWifiSsidList()
                bus.fire("netWifiSsidList", wifiList)
                break;
            case "switchNetworkType":
                config.setAndSave("net.type", msg)
                driver.net.changeNetType()
                break;
            case "setConfig":
                configService.configVerifyAndSave(msg)
                break;
            case "access":
                accessService.access(msg.data, msg.fileName, msg.similarity)
                break;
            case nfc.RECEIVE_MSG:
                nfcService.receiveMsg(msg)
                break;
            case net.STATUS_CHANGE:
                if (msg.type != config.get("net.type")) {
                    break
                }
                map.get("NET").del("changeType")
                // 网络状态上报会上报过多脏数据，上报的与主动查询的状态不匹配，以主动查询的为准
                msg.connected = net.getStatus().connected
                bus.fire("netStatus", msg)
                break;
            case mqtt.CONNECTED_CHANGED:
                bus.fire("mqttStatus", msg)
                // mqtt连接上报
                if (msg == "connected") {
                    mqttService.report()
                }
                break;
            case mqtt.RECEIVE_MSG:
                mqttService.receiveMsg(msg)
                break;
            case uart.VG.RECEIVE_MSG + driver.uart485.id:
                uart485Service.receive(msg)
                break;
            case cameraCalibration.RECEIVE_MSG:
                // 摄像头标定
                if (msg == "success0") {
                    driver.alsa.ttsPlay("标定成功")
                } else if (msg == "success1") {
                    driver.alsa.ttsPlay("标定成功")
                    bus.fire("calibrationStatus", "stop")
                    // common.asyncReboot(2)
                }
                break;
            default:
                log.error("No such topic ", topic)
                break;
        }
    } catch (error) {
        log.error(error)
    }
})

