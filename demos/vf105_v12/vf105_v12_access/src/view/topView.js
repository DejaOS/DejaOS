import dxUi from '../../dxmodules/dxUi.js'
import std from '../../dxmodules/dxStd.js'
import viewUtils from './viewUtils.js'
import screen from '../screen.js'
import logger from '../../dxmodules/dxLogger.js'

// Mainly displays system time and status icons
const topView = {}
topView.init = function () {
    const screenMain = dxUi.View.build('topView', dxUi.Utils.LAYER.TOP)
    topView.screenMain = screenMain
    viewUtils._clearStyle(screenMain)
    screenMain.scroll(false)
    logger.info('topView init', screen.screenSize.width, screen.screenSize.height)
    screenMain.width(screen.screenSize.width)
    screenMain.height(screen.screenSize.height)
    screenMain.bgOpa(0)
    screenMain.clickable(false)

    const topBox = dxUi.View.build('topBox', screenMain)
    viewUtils._clearStyle(topBox)
    topBox.width(screen.screenSize.width)
    topBox.height(70)
    topBox.bgOpa(0)
    topBox.clickable(false)

    topBox.flexFlow(dxUi.Utils.FLEX_FLOW.ROW)
    topBox.flexAlign(dxUi.Utils.FLEX_ALIGN.SPACE_BETWEEN, dxUi.Utils.FLEX_ALIGN.CENTER, dxUi.Utils.FLEX_ALIGN.CENTER)

    const topBoxLeft = dxUi.View.build('topBoxLeft', topBox)
    viewUtils._clearStyle(topBoxLeft)
    topBoxLeft.width(400)
    topBoxLeft.height(70)
    topBoxLeft.padLeft(38)
    topBoxLeft.bgOpa(0)
    topBoxLeft.clickable(false)
    topBoxLeft.flexFlow(dxUi.Utils.FLEX_FLOW.ROW)
    topBoxLeft.flexAlign(dxUi.Utils.FLEX_ALIGN.START, dxUi.Utils.FLEX_ALIGN.CENTER, dxUi.Utils.FLEX_ALIGN.CENTER)
    const dateLbl = dxUi.Label.build('dateLbl', topBoxLeft)
    dateLbl.textFont(viewUtils.font(20))
    dateLbl.text("2025-01-16 10:00:00")
    topView.dateLbl = dateLbl
    dateLbl.textColor(0xffffff)
    std.setInterval(() => {
        const t = new Date()
        // Pad zero function
        const pad = (n) => n < 10 ? `0${n}` : n;
        dateLbl.text(`${t.getFullYear()}-${pad(t.getMonth() + 1)}-${pad(t.getDate())} ${pad(t.getHours())}:${pad(t.getMinutes())}:${pad(t.getSeconds())}`)
    }, 1000, true)

    const topBoxRight = dxUi.View.build('topBoxRight', topBox)
    viewUtils._clearStyle(topBoxRight)
    topBoxRight.width(400)
    topBoxRight.height(70)
    topBoxRight.padRight(38)
    topBoxRight.bgOpa(0)
    topBoxRight.clickable(false)
    topBoxRight.flexFlow(dxUi.Utils.FLEX_FLOW.ROW)
    topBoxRight.flexAlign(dxUi.Utils.FLEX_ALIGN.END, dxUi.Utils.FLEX_ALIGN.CENTER, dxUi.Utils.FLEX_ALIGN.CENTER)

    const ethShow = dxUi.Image.build('ethShow', topBoxRight)
    topView.ethShow = ethShow
    ethShow.source('/app/code/resource/image/ethernet.png')
    ethShow.clickable(false)
    ethShow.hide()

    const wifiShow = dxUi.Image.build('wifiShow', topBoxRight)
    topView.wifiShow = wifiShow
    wifiShow.source('/app/code/resource/image/wifi.png')
    wifiShow.clickable(false)
    wifiShow.hide()

    const _4gShow = dxUi.Image.build('4gShow', topBoxRight)
    topView._4gShow = _4gShow
    _4gShow.source('/app/code/resource/image/4g.png')
    _4gShow.clickable(false)
    _4gShow.hide()

    const mqttShow = dxUi.Image.build('mqttShow', topBoxRight)
    topView.mqttShow = mqttShow
    mqttShow.source('/app/code/resource/image/mqtt.png')
    mqttShow.clickable(false)
    mqttShow.hide()

}

// Switch theme, two sets of icons, one white, one black
topView.changeTheme = function (dark) {
    if (dark) {
        topView.dateLbl.textColor(0x767676)
        topView.ethShow.source('/app/code/resource/image/ethernet_dark.png')
        topView.mqttShow.source('/app/code/resource/image/mqtt_dark.png')
        topView.wifiShow.source('/app/code/resource/image/wifi_dark.png')
        topView._4gShow.source('/app/code/resource/image/4g_dark.png')
    } else {
        topView.dateLbl.textColor(0xffffff)
        topView.ethShow.source('/app/code/resource/image/ethernet.png')
        topView.mqttShow.source('/app/code/resource/image/mqtt.png')
        topView.wifiShow.source('/app/code/resource/image/wifi.png')
        topView._4gShow.source('/app/code/resource/image/4g.png')
    }
}

// MQTT connection state
topView.mqttConnectState = function (connected) {
    if (connected) {
        topView.mqttShow.show()
    } else {
        topView.mqttShow.hide()
    }
}

// Ethernet connection state
topView.ethConnectState = function (connected, type) {
    if (connected) {
        if (type == 1) {
            topView.ethShow.show()
            topView.wifiShow.hide()
            topView._4gShow.hide()
        } else if (type == 2) {
            topView.wifiShow.show()
            topView.ethShow.hide()
            topView._4gShow.hide()
        } else if (type == 4) {
            topView._4gShow.show()
            topView.ethShow.hide()
            topView.wifiShow.hide()
        }
    } else {
        topView.ethShow.hide()
        topView.wifiShow.hide()
        topView._4gShow.hide()
    }
}
export default topView
