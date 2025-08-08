import bus from '../dxmodules/dxEventBus.js'
import dxui from '../dxmodules/dxUi.js'
import mainView from './view/page/mainView.js'
import net from '../dxmodules/dxNet.js'
import mqtt from '../dxmodules/dxMqtt.js'
import logger from '../dxmodules/dxLogger.js'
import pinyin from './view/pinyin/pinyin.js'

const screen = {}

let context = {}

screen.fontPath = '/app/code/resource/font/AlibabaPuHuiTi-2-65-Medium.ttf'

screen.init = function () {
    dxui.init({ orientation: 1 }, context);
    pinyin.init(480, 150)  // 调整为适合320x480屏幕的尺寸
    pinyin.hide(true)
    mainView.init()
    dxui.loadMain(mainView.main)
    subscribe()
}

function subscribe() {
    bus.on(net.STATUS_CHANGE, screen.netStatusChange)
    bus.on(mqtt.CONNECTED_CHANGED, screen.mqttStatusChange)
}

screen.netStatusChange = function (data) {
    logger.info('net status change:' + JSON.stringify(data))
    if (data.status >= 4) {
        if(data.type == 1){
            mainView.ethItemImg.show()
        }else{ 
            mainView.wifiItemImg.show()
        }
    }else{ 
        mainView.ethItemImg.hide()
        mainView.wifiItemImg.hide()
    }
}

screen.mqttStatusChange = function (data) {
    logger.info('mqtt status change:' + JSON.stringify(data))
    if (data == "connected") {
        mainView.mqttShow.show()
    }else{ 
        mainView.mqttShow.hide()
    }
}


screen.loop = function () {
    return dxui.handler()
}

export default screen
