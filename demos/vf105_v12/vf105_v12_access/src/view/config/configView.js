import dxUi from "../../../dxmodules/dxUi.js"
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
import screen from '../../screen.js'
const configView = {}
configView.init = function () {
    /************************************************** Create Screen *****************************************************/
    const screenMain = dxUi.View.build('configView', dxUi.Utils.LAYER.MAIN)
    configView.screenMain = screenMain
    screenMain.scroll(false)
    screenMain.bgColor(0xffffff)
    screenMain.on(dxUi.Utils.ENUM.LV_EVENT_SCREEN_LOADED, () => {
        topView.changeTheme(true)
    })

    // const confirm = viewUtils.confirmWin('configViewConfirm', 'configView.confirmExit', () => {
    //     dxui.loadMain(mainView.screenMain)
    // })

    const titleBox = viewUtils.title(screenMain, undefined, 'configViewTitle', 'configView.title', () => {
        viewUtils.confirmOpen('configView.confirmExit', 'configView.confirmExitContent', () => {
            dxUi.loadMain(mainView.screenMain)
        }, () => { })
    })
    titleBox.align(dxUi.Utils.ALIGN.TOP_MID, 0, 70)


    const menuBox = dxUi.View.build('menuBox', screenMain)
    viewUtils._clearStyle(menuBox)
    menuBox.setSize(screen.screenSize.width, 800)
    menuBox.bgOpa(0)
    menuBox.align(dxUi.Utils.ALIGN.TOP_MID, 0, 178)
    menuBox.flexFlow(dxUi.Utils.FLEX_FLOW.ROW_WRAP)
    menuBox.flexAlign(dxUi.Utils.FLEX_ALIGN.START, dxUi.Utils.FLEX_ALIGN.START, dxUi.Utils.FLEX_ALIGN.START)
    menuBox.obj.lvObjSetStylePadGap(0, dxUi.Utils.ENUM._LV_STYLE_STATE_CMP_SAME)

    configView.menuBtn('localUser', menuBox, screen.screenSize.width / 4, screen.screenSize.width / 4, '/app/code/resource/image/localUser.png', 'configView.localUser', () => {
        dxUi.loadMain(localUserView.screenMain)
    })

    configView.menuBtn('networkSetting', menuBox, screen.screenSize.width / 4, screen.screenSize.width / 4, '/app/code/resource/image/networkSetting.png', 'configView.networkSetting', () => {
        dxUi.loadMain(networkSettingView.screenMain)
    })

    configView.menuBtn('doorControl', menuBox, screen.screenSize.width / 4, screen.screenSize.width / 4, '/app/code/resource/image/doorControl.png', 'configView.doorControl', () => {
        dxUi.loadMain(doorControlView.screenMain)
    })

    configView.menuBtn('systemSetting', menuBox, screen.screenSize.width / 4, screen.screenSize.width / 4, '/app/code/resource/image/systemSetting.png', 'configView.systemSetting', () => {
        dxUi.loadMain(systemSettingView.screenMain)
    })

    configView.menuBtn('deviceInfo', menuBox, screen.screenSize.width / 4, screen.screenSize.width / 4, '/app/code/resource/image/deviceInfo.png', 'configView.deviceInfo', () => {
        dxUi.loadMain(deviceInfoView.screenMain)
    })

    configView.menuBtn('recordQuery', menuBox, screen.screenSize.width / 4, screen.screenSize.width / 4, '/app/code/resource/image/recordQuery.png', 'configView.recordQuery', () => {
        dxUi.loadMain(recordQueryView.screenMain)
    })

    configView.menuBtn('voiceBroadcast', menuBox, screen.screenSize.width / 4, screen.screenSize.width / 4, '/app/code/resource/image/voiceBroadcast.png', 'configView.voiceBroadcast', () => {
        dxUi.loadMain(voiceBroadcastView.screenMain)
    })

    if (config.get("base.showIdentityCard") == 1) {
        configView.menuBtn('cloudCert', menuBox, screen.screenSize.width / 4, screen.screenSize.width / 4, '/app/code/resource/image/cloudCert.png', 'configView.cloudCert', () => {
            dxUi.loadMain(cloudCertView.screenMain)
        })
    }

    configView.menuBtn('help', menuBox, screen.screenSize.width / 4, screen.screenSize.width / 4, '/app/code/resource/image/help.png', 'configView.help', () => {
        dxUi.loadMain(helpView.screenMain)
    })
}

configView.menuBtn = function (id, parent, width, height, src, dataI18n, callback = () => { }) {
    const box = dxUi.View.build(id, parent)
    viewUtils._clearStyle(box)
    box.setSize(width, height)
    box.bgOpa(0)

    const zoom = 1.02

    const bg = dxUi.View.build(id + 'bg', box)
    viewUtils._clearStyle(bg)
    bg.setSize(140, 140)
    bg.bgColor(0xf6f6f6)
    bg.radius(30)
    bg.align(dxUi.Utils.ALIGN.TOP_MID, 0, 10)

    const image = dxUi.Image.build(id + 'image', bg)
    image.source(src)
    image.align(dxUi.Utils.ALIGN.CENTER, 0, 0)

    bg.on(dxUi.Utils.ENUM.LV_EVENT_PRESSED, () => {
        bg.setSize(140 * zoom, 140 * zoom)
        image.obj.lvImgSetZoom(256 * zoom)
    })
    bg.on(dxUi.Utils.ENUM.LV_EVENT_RELEASED, () => {
        bg.setSize(140, 140)
        image.obj.lvImgSetZoom(256)
    })

    bg.on(dxUi.Utils.EVENT.CLICK, () => {
        callback()
    })

    const textLbl = dxUi.Label.build(id + 'text', box)
    textLbl.textFont(viewUtils.font(22))
    textLbl.textColor(0x767676)
    textLbl.dataI18n = dataI18n
    textLbl.align(dxUi.Utils.ALIGN.BOTTOM_MID, 0, -10)
    textLbl.width(width)
    textLbl.textAlign(dxUi.Utils.TEXT_ALIGN.CENTER)
    textLbl.longMode(dxUi.Utils.LABEL_LONG_MODE.SCROLL_CIRCULAR)


}


export default configView
