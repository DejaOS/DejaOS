import dxui from "../../../dxmodules/dxUi.js"
import viewUtils from "../viewUtils.js"
import topView from "../topView.js"
import screen from "../../screen.js"
import mainView from "../mainView.js"
import doorControlView from "./menu/doorControlView.js"
import cloudCertView from "./menu/cloudCertView.js"
import helpView from "./menu/helpView.js"
import networkSettingView from "./menu/networkSettingView.js"
import systemSettingView from "./menu/systemSettingView.js"
import deviceInfoView from "./menu/deviceInfoView.js"
import localUserView from "./menu/localUserView.js"
import recordQueryView from "./menu/recordQueryView.js"
import voiceBroadcastView from "./menu/voiceBroadcastView.js"
import developerView from "./menu/developerView.js"
import capcalView from "./menu/developer/capcalView.js"
import dxstd from "../../../dxmodules/dxStd.js"

const configView = {}
configView.init = function () {
    /**************************************************创建屏幕*****************************************************/
    const screenMain = dxui.View.build('configView', dxui.Utils.LAYER.MAIN)
    configView.screenMain = screenMain
    screenMain.scroll(false)
    screenMain.bgColor(0xffffff)
    screenMain.on(dxui.Utils.ENUM.LV_EVENT_SCREEN_LOADED, () => {
        topView.changeTheme(true)
        if (!configView.timer) {
            configView.timer = dxstd.setInterval(() => {
                let count = dxui.Utils.GG.NativeDisp.lvDispGetInactiveTime()
                if (count > 60 * 1000 && !capcalView.isRunning) {
                    dxstd.clearInterval(configView.timer)
                    configView.timer = null
                    dxui.loadMain(mainView.screenMain)
                }
            }, 1000)
        }
    })

    const titleBox = viewUtils.title(screenMain, undefined, 'configViewTitle', 'configView.title', () => {
        viewUtils.confirmOpen('configView.confirmExit', 'configView.confirmExitContent', () => {
            mainView.load()
        }, () => { })
    })
    titleBox.align(dxui.Utils.ALIGN.TOP_MID, 0, screen.screenSize.height * (70 / 1024))


    const menuBox = dxui.View.build('menuBox', screenMain)
    viewUtils._clearStyle(menuBox)
    menuBox.setSize(screen.screenSize.width * (600 / 600), screen.screenSize.height * (600 / 1024))
    menuBox.bgOpa(0)
    menuBox.align(dxui.Utils.ALIGN.TOP_MID, 0, screen.screenSize.height * (178 / 1024))
    menuBox.flexFlow(dxui.Utils.FLEX_FLOW.ROW_WRAP)
    menuBox.flexAlign(dxui.Utils.FLEX_ALIGN.START, dxui.Utils.FLEX_ALIGN.START, dxui.Utils.FLEX_ALIGN.START)
    menuBox.obj.lvObjSetStylePadGap(0, dxui.Utils.ENUM._LV_STYLE_STATE_CMP_SAME)

    configView.menuBtn('localUser', menuBox, screen.screenSize.width * (150 / 600), screen.screenSize.height * (150 / 1024), screen.resourcePath.imagePath + '/localUser.png', 'configView.localUser', () => {
        dxui.loadMain(localUserView.screenMain)
    })

    configView.menuBtn('networkSetting', menuBox, screen.screenSize.width * (150 / 600), screen.screenSize.height * (150 / 1024), screen.resourcePath.imagePath + '/networkSetting.png', 'configView.networkSetting', () => {
        dxui.loadMain(networkSettingView.screenMain)
    })

    configView.menuBtn('doorControl', menuBox, screen.screenSize.width * (150 / 600), screen.screenSize.height * (150 / 1024), screen.resourcePath.imagePath + '/doorControl.png', 'configView.doorControl', () => {
        dxui.loadMain(doorControlView.screenMain)
    })

    configView.menuBtn('systemSetting', menuBox, screen.screenSize.width * (150 / 600), screen.screenSize.height * (150 / 1024), screen.resourcePath.imagePath + '/systemSetting.png', 'configView.systemSetting', () => {
        dxui.loadMain(systemSettingView.screenMain)
    })

    configView.menuBtn('deviceInfo', menuBox, screen.screenSize.width * (150 / 600), screen.screenSize.height * (150 / 1024), screen.resourcePath.imagePath + '/deviceInfo.png', 'configView.deviceInfo', () => {
        dxui.loadMain(deviceInfoView.screenMain)
        deviceInfoView.refresh()
    })

    configView.menuBtn('recordQuery', menuBox, screen.screenSize.width * (150 / 600), screen.screenSize.height * (150 / 1024), screen.resourcePath.imagePath + '/recordQuery.png', 'configView.recordQuery', () => {
        dxui.loadMain(recordQueryView.screenMain)
    })

    configView.menuBtn('voiceBroadcast', menuBox, screen.screenSize.width * (150 / 600), screen.screenSize.height * (150 / 1024), screen.resourcePath.imagePath + '/voiceBroadcast.png', 'configView.voiceBroadcast', () => {
        dxui.loadMain(voiceBroadcastView.screenMain)
    })

    if (screen.getConfig()["base.showIdentityCard"] == 1) {
        configView.menuBtn('cloudCert', menuBox, screen.screenSize.width * (150 / 600), screen.screenSize.height * (150 / 1024), screen.resourcePath.imagePath + '/cloudCert.png', 'configView.cloudCert', () => {
            dxui.loadMain(cloudCertView.screenMain)
        })
    }

    // configView.menuBtn('help', menuBox, screen.screenSize.width * (150 / 600), screen.screenSize.height * (150 / 1024), screen.resourcePath.imagePath + '/help.png', 'configView.help', () => {
    //     dxui.loadMain(helpView.screenMain)
    // })

    configView.menuBtn('developer', menuBox, screen.screenSize.width * (150 / 600), screen.screenSize.height * (150 / 1024), screen.resourcePath.imagePath + '/developer.png', 'configView.developer', () => {
        dxui.loadMain(developerView.screenMain)
    })

}

configView.menuBtn = function (id, parent, width, height, src, dataI18n, callback = () => { }) {
    const box = dxui.View.build(id, parent)
    viewUtils._clearStyle(box)
    box.setSize(width, height)
    box.bgOpa(0)

    const zoom = 1.02

    const bg = dxui.View.build(id + 'bg', box)
    viewUtils._clearStyle(bg)
    bg.setSize(screen.screenSize.width * (100 / 600), screen.screenSize.height * (100 / 1024))
    bg.bgColor(0xf6f6f6)
    bg.radius(screen.screenSize.width * (20 / 600))
    bg.align(dxui.Utils.ALIGN.TOP_MID, 0, screen.screenSize.height * (10 / 1024))

    const image = dxui.Image.build(id + 'image', bg)
    image.source(src)
    image.align(dxui.Utils.ALIGN.CENTER, 0, 0)

    bg.on(dxui.Utils.ENUM.LV_EVENT_PRESSED, () => {
        bg.setSize(screen.screenSize.width * (100 / 600) * zoom, screen.screenSize.height * (100 / 1024) * zoom)
        image.obj.lvImgSetZoom(256 * zoom)
    })
    bg.on(dxui.Utils.ENUM.LV_EVENT_RELEASED, () => {
        bg.setSize(screen.screenSize.width * (100 / 600), screen.screenSize.height * (100 / 1024))
        image.obj.lvImgSetZoom(256)
    })

    bg.on(dxui.Utils.EVENT.CLICK, () => {
        callback()
    })

    const textLbl = dxui.Label.build(id + 'text', box)
    textLbl.textFont(viewUtils.font(22))
    textLbl.textColor(0x767676)
    textLbl.dataI18n = dataI18n
    textLbl.align(dxui.Utils.ALIGN.BOTTOM_MID, 0, 0)
    textLbl.width(width)
    textLbl.textAlign(dxui.Utils.TEXT_ALIGN.CENTER)
    textLbl.longMode(dxui.Utils.LABEL_LONG_MODE.SCROLL_CIRCULAR)


}


export default configView
