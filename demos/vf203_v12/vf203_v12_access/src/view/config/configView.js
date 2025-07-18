import dxui from "../../../dxmodules/dxUi.js"
import config from "../../../dxmodules/dxConfig.js"
import viewUtils from "../viewUtils.js"
import topView from "../topView.js"
import mainView from "../mainView.js"
import cloudCertView from "./menu/cloudCertView.js"
import doorControlView from "./menu/doorControlView.js"
import helpView from "./menu/helpView.js"
import networkSettingView from "./menu/networkSettingView.js"
import systemSettingView from "./menu/systemSettingView.js"
import deviceInfoView from "./menu/deviceInfoView.js"
import factoryTestView from "./menu/factoryTestView.js"
import localUserView from "./menu/localUserView.js"
import recordQueryView from "./menu/recordQueryView.js"
import voiceBroadcastView from "./menu/voiceBroadcastView.js"
const configView = {}
configView.init = function () {
    /**************************************************创建屏幕*****************************************************/
    const screenMain = dxui.View.build('configView', dxui.Utils.LAYER.MAIN)
    configView.screenMain = screenMain
    screenMain.scroll(false)
    screenMain.bgColor(0xffffff)
    screenMain.on(dxui.Utils.ENUM.LV_EVENT_SCREEN_LOADED, () => {
        topView.changeTheme(true)
    })

    // const confirm = viewUtils.confirmWin('configViewConfirm', 'configView.confirmExit', () => {
    //     dxui.loadMain(mainView.screenMain)
    // })

    const titleBox = viewUtils.title(screenMain, undefined, 'configViewTitle', 'configView.title', () => {
        viewUtils.confirmOpen('configView.confirmExit', 'configView.confirmExitContent', () => {
            dxui.loadMain(mainView.screenMain)
        }, () => { })
    })
    titleBox.align(dxui.Utils.ALIGN.TOP_MID, 0, 70)


    const menuBox = dxui.View.build('menuBox', screenMain)
    viewUtils._clearStyle(menuBox)
    menuBox.setSize(600, 600)
    menuBox.bgOpa(0)
    menuBox.align(dxui.Utils.ALIGN.TOP_MID, 0, 178)
    menuBox.flexFlow(dxui.Utils.FLEX_FLOW.ROW_WRAP)
    menuBox.flexAlign(dxui.Utils.FLEX_ALIGN.START, dxui.Utils.FLEX_ALIGN.START, dxui.Utils.FLEX_ALIGN.START)
    menuBox.obj.lvObjSetStylePadGap(0, dxui.Utils.ENUM._LV_STYLE_STATE_CMP_SAME)

    configView.menuBtn('localUser', menuBox, 600 / 4, 600 / 4, '/app/code/resource/image/localUser.png', 'configView.localUser', () => {
        dxui.loadMain(localUserView.screenMain)
    })

    configView.menuBtn('networkSetting', menuBox, 600 / 4, 600 / 4, '/app/code/resource/image/networkSetting.png', 'configView.networkSetting', () => {
        dxui.loadMain(networkSettingView.screenMain)
    })

    configView.menuBtn('doorControl', menuBox, 600 / 4, 600 / 4, '/app/code/resource/image/doorControl.png', 'configView.doorControl', () => {
        dxui.loadMain(doorControlView.screenMain)
    })

    configView.menuBtn('systemSetting', menuBox, 600 / 4, 600 / 4, '/app/code/resource/image/systemSetting.png', 'configView.systemSetting', () => {
        dxui.loadMain(systemSettingView.screenMain)
    })

    configView.menuBtn('deviceInfo', menuBox, 600 / 4, 600 / 4, '/app/code/resource/image/deviceInfo.png', 'configView.deviceInfo', () => {
        dxui.loadMain(deviceInfoView.screenMain)
        deviceInfoView.refresh()
    })

    configView.menuBtn('recordQuery', menuBox, 600 / 4, 600 / 4, '/app/code/resource/image/recordQuery.png', 'configView.recordQuery', () => {
        dxui.loadMain(recordQueryView.screenMain)
    })

    configView.menuBtn('voiceBroadcast', menuBox, 600 / 4, 600 / 4, '/app/code/resource/image/voiceBroadcast.png', 'configView.voiceBroadcast', () => {
        dxui.loadMain(voiceBroadcastView.screenMain)
    })

    if (config.get("base.showIdentityCard") == 1) {
        configView.menuBtn('cloudCert', menuBox, 600 / 4, 600 / 4, '/app/code/resource/image/cloudCert.png', 'configView.cloudCert', () => {
            dxui.loadMain(cloudCertView.screenMain)
        })
    }

    configView.menuBtn('factoryTest', menuBox, 600 / 4, 600 / 4, '/app/code/resource/image/factoryTest.png', 'configView.factoryTest', () => {
        dxui.loadMain(factoryTestView.screenMain)
    })

    configView.menuBtn('help', menuBox, 600 / 4, 600 / 4, '/app/code/resource/image/help.png', 'configView.help', () => {
        dxui.loadMain(helpView.screenMain)
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
    bg.setSize(100, 100)
    bg.bgColor(0xf6f6f6)
    bg.radius(20)
    bg.align(dxui.Utils.ALIGN.TOP_MID, 0, 10)

    const image = dxui.Image.build(id + 'image', bg)
    image.source(src)
    image.align(dxui.Utils.ALIGN.CENTER, 0, 0)

    bg.on(dxui.Utils.ENUM.LV_EVENT_PRESSED, () => {
        bg.setSize(100 * zoom, 100 * zoom)
        image.obj.lvImgSetZoom(256 * zoom)
    })
    bg.on(dxui.Utils.ENUM.LV_EVENT_RELEASED, () => {
        bg.setSize(100, 100)
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
