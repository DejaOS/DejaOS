import bus from '../dxmodules/dxEventBus.js'
import dxui from '../dxmodules/dxUi.js'
import mainView from './view/page/mainView.js'
import logger from '../dxmodules/dxLogger.js'
import pinyin from './view/pinyin/pinyin.js'
import std from '../dxmodules/dxStd.js'
import common from '../dxmodules/dxCommon.js'
import dxntp from '../dxmodules/dxNtp.js'
import ntp from '../dxmodules/dxNtp.js'

const screen = {}
let mqttStatus = 0
let context = {}


screen.init = function () {
    dxui.init({ orientation: 1 }, context);
    pinyin.init(480, 150)
    pinyin.hide(true)
    mainView.init()
    dxui.loadMain(mainView.main)
    subscribe()
}

function subscribe() {
    bus.on("network_status_change", screen.netStatusChange)
    bus.on("mqtt_connected", screen.mqttStatusChange)
}

screen.netStatusChange = function (data) {
    logger.info('net status change:' + JSON.stringify(data))
    if (data.net_status >= 4) {
        if (data.net_type == 1) {
            mainView.ethItemImg.show()
        } else {
            mainView.wifiItemImg.show()
        }
        //联网成功后，发送mqtt连接请求
        bus.fire('mqtt_to_connect', 0)
        //矫正时间
        ntp.startSync()


    } else {
        mainView.ethItemImg.hide()
        mainView.wifiItemImg.hide()
    }
}

screen.mqttStatusChange = function (data) {
    logger.info('mqtt status change:' + JSON.stringify(data))
    if (data == "0") {
        mainView.mqttShow.show()
        mqttStatus = 1
        run()
    } else {
        mqttStatus = 0
        mainView.mqttShow.hide()
    }
}


function run() {
    std.setInterval(() => {
        try {
            mqttHeartBeat()
        } catch (error) {
            logger.error(error)
        }
    }, 10000)
}

function mqttHeartBeat() {
    if (mqttStatus == 1) {
        let msg = { uuid: common.getSn(), timestamp: Math.floor(new Date().getTime() / 1000) }
        logger.info('send heart beat:', msg)
        bus.fire("mqtt_publish", { topic: "base_upgrade/v1/event/heart", payload: JSON.stringify(msg) })
    }
}


screen.loop = function () {
    return dxui.handler()
}

export default screen
