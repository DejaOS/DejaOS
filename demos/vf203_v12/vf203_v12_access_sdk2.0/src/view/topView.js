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
    topView.topBox = topBox
    viewUtils._clearStyle(topBox)
    topBox.width(screen.screenSize.width)
    topBox.height(screen.screenSize.height * (70 / 1024))
    topBox.bgOpa(0)
    topBox.clickable(false)

    topBox.flexFlow(dxui.Utils.FLEX_FLOW.ROW)
    topBox.flexAlign(dxui.Utils.FLEX_ALIGN.SPACE_BETWEEN, dxui.Utils.FLEX_ALIGN.CENTER, dxui.Utils.FLEX_ALIGN.CENTER)

    const topBoxLeft = dxui.View.build('topBoxLeft', topBox)
    viewUtils._clearStyle(topBoxLeft)
    topBoxLeft.width(screen.screenSize.width / 2)
    topBoxLeft.height(screen.screenSize.height * (70 / 1024))
    topBoxLeft.padLeft(screen.screenSize.width * (38 / 600))
    topBoxLeft.bgOpa(0)
    topBoxLeft.clickable(false)
    topBoxLeft.flexFlow(dxui.Utils.FLEX_FLOW.ROW)
    topBoxLeft.flexAlign(dxui.Utils.FLEX_ALIGN.START, dxui.Utils.FLEX_ALIGN.CENTER, dxui.Utils.FLEX_ALIGN.CENTER)
    const dateLbl = dxui.Label.build('dateLbl', topBoxLeft)
    dateLbl.textFont(viewUtils.font(20))
    dateLbl.text("10:00:00")
    topView.dateLbl = dateLbl
    dateLbl.textColor(0x2e2e2e)
    std.setInterval(() => {
        const t = new Date()
        // 补零函数
        const pad = (n) => n < 10 ? `0${n}` : n;
        dateLbl.text(`${pad(t.getHours())}:${pad(t.getMinutes())}:${pad(t.getSeconds())}`)
    }, 1000, true)

    const topBoxRight = dxui.View.build('topBoxRight', topBox)
    viewUtils._clearStyle(topBoxRight)
    topBoxRight.width(screen.screenSize.width / 2)
    topBoxRight.height(screen.screenSize.height * (70 / 1024))
    topBoxRight.padRight(screen.screenSize.width * (23 / 600))
    topBoxRight.bgOpa(0)
    topBoxRight.clickable(false)
    topBoxRight.flexFlow(dxui.Utils.FLEX_FLOW.ROW)
    topBoxRight.flexAlign(dxui.Utils.FLEX_ALIGN.END, dxui.Utils.FLEX_ALIGN.CENTER, dxui.Utils.FLEX_ALIGN.CENTER)

    const ethShow = dxui.Image.build('ethShow', topBoxRight)
    topView.ethShow = ethShow
    ethShow.source(screen.resourcePath.imagePath + '/ethernet.png')
    ethShow.clickable(false)
    ethShow.hide()

    const wifiShow = dxui.Image.build('wifiShow', topBoxRight)
    topView.wifiShow = wifiShow
    wifiShow.source(screen.resourcePath.imagePath + '/wifi.png')
    wifiShow.clickable(false)
    wifiShow.hide()

    const _4gShow = dxui.Image.build('4gShow', topBoxRight)
    topView._4gShow = _4gShow
    _4gShow.source(screen.resourcePath.imagePath + '/4g.png')
    _4gShow.clickable(false)
    _4gShow.hide()

    const mqttShow = dxui.Image.build('mqttShow', topBoxRight)
    topView.mqttShow = mqttShow
    mqttShow.source(screen.resourcePath.imagePath + '/mqtt.png')
    mqttShow.clickable(false)
    mqttShow.hide()

}

// 切换主题，两套图标，一套白色，一套黑色
topView.changeTheme = function (dark) {
    if (dark) {
        topView.dateLbl.textColor(0x767676)
        topView.ethShow.source(screen.resourcePath.imagePath + '/ethernet_dark.png')
        topView.mqttShow.source(screen.resourcePath.imagePath + '/mqtt_dark.png')
        topView.wifiShow.source(screen.resourcePath.imagePath + '/wifi_dark.png')
        topView._4gShow.source(screen.resourcePath.imagePath + '/4g_dark.png')
    } else {
        topView.dateLbl.textColor(0x2e2e2e)
        topView.ethShow.source(screen.resourcePath.imagePath + '/ethernet.png')
        topView.mqttShow.source(screen.resourcePath.imagePath + '/mqtt.png')
        topView.wifiShow.source(screen.resourcePath.imagePath + '/wifi.png')
        topView._4gShow.source(screen.resourcePath.imagePath + '/4g.png')
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
            topView.ethShow.hide()
            topView.wifiShow.show()
            topView._4gShow.hide()
        } else if (type == 4) {
            topView.ethShow.hide()
            topView.wifiShow.hide()
            topView._4gShow.show()
        }
    } else {
        topView.ethShow.hide()
        topView.wifiShow.hide()
        topView._4gShow.hide()
    }
}
export default topView
