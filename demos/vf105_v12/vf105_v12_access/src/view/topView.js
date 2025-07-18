import dxui from '../../dxmodules/dxUi.js'
import std from '../../dxmodules/dxStd.js'
import viewUtils from './viewUtils.js'
import screen from '../screen.js'

// 主要显示系统时间和状态图标
const topView = {}
topView.init = function () {
    const screenMain = dxui.View.build('topView', dxui.Utils.LAYER.TOP)
    topView.screenMain = screenMain
    viewUtils._clearStyle(screenMain)
    screenMain.scroll(false)
    screenMain.width(screen.screenSize.width)
    screenMain.height(screen.screenSize.height)
    screenMain.bgOpa(0)
    screenMain.clickable(false)

    const topBox = dxui.View.build('topBox', screenMain)
    viewUtils._clearStyle(topBox)
    topBox.width(screen.screenSize.width)
    topBox.height(70)
    topBox.bgOpa(0)
    topBox.clickable(false)

    topBox.flexFlow(dxui.Utils.FLEX_FLOW.ROW)
    topBox.flexAlign(dxui.Utils.FLEX_ALIGN.SPACE_BETWEEN, dxui.Utils.FLEX_ALIGN.CENTER, dxui.Utils.FLEX_ALIGN.CENTER)

    const topBoxLeft = dxui.View.build('topBoxLeft', topBox)
    viewUtils._clearStyle(topBoxLeft)
    topBoxLeft.width(400)
    topBoxLeft.height(70)
    topBoxLeft.padLeft(38)
    topBoxLeft.bgOpa(0)
    topBoxLeft.clickable(false)
    topBoxLeft.flexFlow(dxui.Utils.FLEX_FLOW.ROW)
    topBoxLeft.flexAlign(dxui.Utils.FLEX_ALIGN.START, dxui.Utils.FLEX_ALIGN.CENTER, dxui.Utils.FLEX_ALIGN.CENTER)
    const dateLbl = dxui.Label.build('dateLbl', topBoxLeft)
    dateLbl.textFont(viewUtils.font(20))
    dateLbl.text("2025-01-16 10:00:00")
    topView.dateLbl = dateLbl
    dateLbl.textColor(0xffffff)
    std.setInterval(() => {
        const t = new Date()
        // 补零函数
        const pad = (n) => n < 10 ? `0${n}` : n;
        dateLbl.text(`${t.getFullYear()}-${pad(t.getMonth() + 1)}-${pad(t.getDate())} ${pad(t.getHours())}:${pad(t.getMinutes())}:${pad(t.getSeconds())}`)
    }, 1000, true)

    const topBoxRight = dxui.View.build('topBoxRight', topBox)
    viewUtils._clearStyle(topBoxRight)
    topBoxRight.width(400)
    topBoxRight.height(70)
    topBoxRight.padRight(38)
    topBoxRight.bgOpa(0)
    topBoxRight.clickable(false)
    topBoxRight.flexFlow(dxui.Utils.FLEX_FLOW.ROW)
    topBoxRight.flexAlign(dxui.Utils.FLEX_ALIGN.END, dxui.Utils.FLEX_ALIGN.CENTER, dxui.Utils.FLEX_ALIGN.CENTER)

    const ethShow = dxui.Image.build('ethShow', topBoxRight)
    topView.ethShow = ethShow
    ethShow.source('/app/code/resource/image/ethernet.png')
    ethShow.clickable(false)
    ethShow.hide()

    const wifiShow = dxui.Image.build('wifiShow', topBoxRight)
    topView.wifiShow = wifiShow
    wifiShow.source('/app/code/resource/image/wifi.png')
    wifiShow.clickable(false)
    wifiShow.hide()

    const _4gShow = dxui.Image.build('4gShow', topBoxRight)
    topView._4gShow = _4gShow
    _4gShow.source('/app/code/resource/image/4g.png')
    _4gShow.clickable(false)
    _4gShow.hide()

    const mqttShow = dxui.Image.build('mqttShow', topBoxRight)
    topView.mqttShow = mqttShow
    mqttShow.source('/app/code/resource/image/mqtt.png')
    mqttShow.clickable(false)
    mqttShow.hide()

}

// 切换主题，两套图标，一套白色，一套黑色
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

// mqtt连接状态
topView.mqttConnectState = function (connected) {
    if (connected) {
        topView.mqttShow.show()
    } else {
        topView.mqttShow.hide()
    }
}

// eth连接状态
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
