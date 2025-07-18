import dxui from '../../dxmodules/dxUi.js'
import viewUtils from "./viewUtils.js"
import appView from './appView.js'
import topView from './topView.js'
import pwdView from './pwdView.js'
import newPwdView from './config/newPwdView.js'
import screen from '../screen.js'
import logger from '../../dxmodules/dxLogger.js'
const mainView = {}
mainView.init = function () {
    /**************************************************创建屏幕*****************************************************/
    const screenMain = dxui.View.build('mainView', dxui.Utils.LAYER.MAIN)
    mainView.screenMain = screenMain
    screenMain.scroll(false)
    screenMain.bgOpa(0)

    screenMain.on(dxui.Utils.ENUM.LV_EVENT_SCREEN_LOADED, () => {
        topView.changeTheme(false)

        screen.faceRecgStart()
        let config = screen.getConfig()
        snLbl.text("SN:" + config["sys.sn"])
        ipLbl.text("IP:" + config["net.ip"])
        dxui.Utils.GG.NativeBasicComponent.lvQrcodeUpdate(qrcodeObj, snLbl.text())
        let showSn = config["base.showSn"]
        let showIp = config["base.showIp"]
        screen.hideSn(showSn == 1)
        screen.hideIp(showIp == 1)
        screen.hideBottomBox(showSn == 0 && showIp == 0)

        // screen.trackUpdate()
        screen.appMode(screen.getConfig()["base.appMode"])
    })

    screenMain.on(dxui.Utils.ENUM.LV_EVENT_SCREEN_UNLOADED, () => {
        screen.faceRecgPause()
    })

    mainView.trackFaces = []
    for (let i = 0; i < 10; i++) {
        let item = {}
        const trackFace = dxui.View.build('trackFace' + i, screenMain)
        item.trackFace = trackFace
        viewUtils._clearStyle(trackFace)
        trackFace.setSize(200, 200)
        trackFace.borderWidth(5)
        trackFace.setBorderColor(0xffffff)
        trackFace.bgOpa(0)
        trackFace.hide()

        const trackFaceName = dxui.Label.build('trackFaceName' + i, trackFace)
        item.trackFaceName = trackFaceName
        trackFaceName.textFont(viewUtils.font(30))
        trackFaceName.textColor(0xffffff)
        trackFaceName.text(" ")
        trackFaceName.align(dxui.Utils.ALIGN.BOTTOM_MID, 0, 0)
        // trackFaceName.hide()


        mainView.trackFaces.push(item)
    }

    // const trackFace = dxui.View.build('trackFace', screenMain)
    // mainView.trackFace = trackFace
    // viewUtils._clearStyle(trackFace)
    // trackFace.setSize(200, 200)
    // trackFace.borderWidth(5)
    // trackFace.bgOpa(0)
    // trackFace.hide()

    // const trackFaceName = dxui.Label.build('trackFaceName', trackFace)
    // mainView.trackFaceName = trackFaceName
    // trackFaceName.textFont(viewUtils.font(30))
    // trackFaceName.textColor(0xffffff)
    // trackFaceName.text(" ")
    // trackFaceName.align(dxui.Utils.ALIGN.BOTTOM_MID, 0, 0)

    const bottomBox = dxui.Image.build('bottomBox', screenMain)
    mainView.bottomBox = bottomBox
    bottomBox.source('/app/code/resource/image/rectangle.png')
    bottomBox.align(dxui.Utils.ALIGN.BOTTOM_MID, 0, 0)
    const bottomSnBtn = dxui.Button.build('bottomSnBtn', bottomBox)
    mainView.bottomSnBtn = bottomSnBtn
    bottomSnBtn.bgColor(0xffffff)
    bottomSnBtn.bgOpa(20)
    bottomSnBtn.setSize(204, 36)
    bottomSnBtn.shadow(0, 0, 0, 0, 0xffffff, 100)
    bottomSnBtn.align(dxui.Utils.ALIGN.BOTTOM_LEFT, 13, -18)
    bottomSnBtn.on(dxui.Utils.EVENT.CLICK, () => {
        showSnQrcode.show()
    })
    bottomSnBtn.flexFlow(dxui.Utils.FLEX_FLOW.ROW)
    bottomSnBtn.flexAlign(dxui.Utils.FLEX_ALIGN.CENTER, dxui.Utils.FLEX_ALIGN.CENTER, dxui.Utils.FLEX_ALIGN.CENTER)
    bottomSnBtn.obj.lvObjSetStylePadGap(5, dxui.Utils.ENUM._LV_STYLE_STATE_CMP_SAME)

    const bottomQrcode = dxui.Image.build('bottomQrcode', bottomSnBtn)
    bottomQrcode.source('/app/code/resource/image/qrcode_small.png')

    const snLbl = dxui.Label.build('snLbl', bottomSnBtn)
    snLbl.text("SN:")
    snLbl.textFont(viewUtils.font(15))
    snLbl.textColor(0xffffff)
    snLbl.width(156)
    snLbl.longMode(dxui.Utils.LABEL_LONG_MODE.SCROLL_CIRCULAR)

    const ipLbl = dxui.Label.build('ipLbl', bottomBox)
    mainView.ipLbl = ipLbl
    ipLbl.text("IP:")
    ipLbl.textFont(viewUtils.font(15))
    ipLbl.textColor(0xffffff)
    ipLbl.align(dxui.Utils.ALIGN.BOTTOM_RIGHT, -20, -16)

    // 菜单按钮
    const menuBtnBox = dxui.View.build('menuBtnBox', screenMain)
    mainView.menuBtnBox = menuBtnBox
    viewUtils._clearStyle(menuBtnBox)
    menuBtnBox.setSize(750, 180)
    menuBtnBox.align(dxui.Utils.ALIGN.BOTTOM_MID, 0, -100)
    menuBtnBox.bgOpa(0)
    menuBtnBox.flexFlow(dxui.Utils.FLEX_FLOW.ROW)
    menuBtnBox.flexAlign(dxui.Utils.FLEX_ALIGN.SPACE_AROUND, dxui.Utils.FLEX_ALIGN.CENTER, dxui.Utils.FLEX_ALIGN.CENTER)
    /******************************************app版&&普通版UI设计******************************************/
    // 配置按钮
    const configBtnBox = viewUtils.imageBtn(menuBtnBox, 'configBtnBox', '/app/code/resource/image/menu_btn.png')
    mainView.configBtnBox = configBtnBox
    configBtnBox.on(dxui.Utils.EVENT.CLICK, () => {
        dxui.loadMain(newPwdView.screenMain)
    })
    const configLbl = dxui.Label.build('configLbl', configBtnBox)
    configLbl.text("配置")
    configLbl.dataI18n = 'mainView.config'
    configLbl.textFont(viewUtils.font(18))
    configLbl.textColor(0xffffff)
    configLbl.align(dxui.Utils.ALIGN.CENTER, 0, 40)
    const configBtnImg = dxui.Image.build('configBtnImg', configBtnBox)
    configBtnImg.source('/app/code/resource/image/config_btn.png')
    configBtnImg.align(dxui.Utils.ALIGN.CENTER, 0, -10)
    // 密码按钮
    const pwdBtnBox = viewUtils.imageBtn(menuBtnBox, 'pwdBtnBox', '/app/code/resource/image/menu_btn.png')
    mainView.pwdBtnBox = pwdBtnBox
    pwdBtnBox.on(dxui.Utils.EVENT.CLICK, () => {
        let passwordAccess = screen.getConfig()["sys.pwd"]
        if (!passwordAccess) {
            return mainView.statusPanel.fail("mainView.passwordDisabled")
        }
        dxui.loadMain(pwdView.screenMain)
    })
    const pwdLbl = dxui.Label.build('pwdLbl', pwdBtnBox)
    pwdLbl.text("密码")
    pwdLbl.dataI18n = 'mainView.pwd'
    pwdLbl.textFont(viewUtils.font(18))
    pwdLbl.textColor(0xffffff)
    pwdLbl.align(dxui.Utils.ALIGN.CENTER, 0, 40)
    const pwdBtnImg = dxui.Image.build('pwdBtnImg', pwdBtnBox)
    pwdBtnImg.source('/app/code/resource/image/pwd_btn.png')
    pwdBtnImg.align(dxui.Utils.ALIGN.CENTER, 0, -10)
    // 小程序码按钮
    const appBtnBox = viewUtils.imageBtn(menuBtnBox, 'appBtnBox', '/app/code/resource/image/menu_btn.png')
    mainView.appBtnBox = appBtnBox
    appBtnBox.on(dxui.Utils.EVENT.CLICK, () => {
        dxui.loadMain(appView.screenMain)
    })
    const appLbl = dxui.Label.build('appLbl', appBtnBox)
    appLbl.text("小程序码")
    appLbl.dataI18n = 'mainView.app'
    appLbl.textFont(viewUtils.font(18))
    appLbl.textColor(0xffffff)
    appLbl.align(dxui.Utils.ALIGN.CENTER, 0, 40)
    const appBtnImg = dxui.Image.build('appBtnImg', appBtnBox)
    appBtnImg.source('/app/code/resource/image/app_btn.png')
    appBtnImg.align(dxui.Utils.ALIGN.CENTER, 0, -10)

    // 二维码
    const showSnQrcode = dxui.View.build('showSnQrcode', screenMain)
    showSnQrcode.moveForeground()
    showSnQrcode.setSize(screen.screenSize.width, 880)
    showSnQrcode.align(dxui.Utils.ALIGN.BOTTOM_MID, 0, 40)
    showSnQrcode.bgColor(0xffffff)
    showSnQrcode.radius(40)
    showSnQrcode.hide()

    const closeSnQrcodeBox = dxui.View.build('closeSnQrcodeBox', showSnQrcode)
    closeSnQrcodeBox.setSize(60, 60)
    viewUtils._clearStyle(closeSnQrcodeBox)
    closeSnQrcodeBox.align(dxui.Utils.ALIGN.TOP_RIGHT, 0, 0)
    closeSnQrcodeBox.bgOpa(0)
    closeSnQrcodeBox.on(dxui.Utils.EVENT.CLICK, () => {
        showSnQrcode.hide()
    })
    const closeSnQrcode = dxui.Image.build('closeSnQrcode', closeSnQrcodeBox)
    closeSnQrcode.source('/app/code/resource/image/close.png')

    const qrcode = dxui.View.build(showSnQrcode.id + 'qrcode', showSnQrcode)
    viewUtils._clearStyle(qrcode)
    qrcode.setSize(520, 520)
    qrcode.align(dxui.Utils.ALIGN.CENTER, 0, 0);
    const qrcodeObj = dxui.Utils.GG.NativeBasicComponent.lvQrcodeCreate(qrcode.obj, 520, 0x000000, 0xffffff)
    dxui.Utils.GG.NativeBasicComponent.lvQrcodeUpdate(qrcodeObj, snLbl.text())
    /******************************************极简版UI设计******************************************/
    const miniBkgBox = dxui.Image.build('miniBkgBox', screenMain)
    miniBkgBox.moveBackground()
    mainView.miniBkgBox = miniBkgBox
    viewUtils._clearStyle(miniBkgBox)
    miniBkgBox.setSize(120, 320)
    miniBkgBox.source('/app/code/resource/image/mini_background.png')
    miniBkgBox.hide()
    miniBkgBox.bgOpa(0)
    miniBkgBox.align(dxui.Utils.ALIGN.CENTER, 280, 0)
    miniBkgBox.flexFlow(dxui.Utils.FLEX_FLOW.COLUMN)
    miniBkgBox.flexAlign(dxui.Utils.FLEX_ALIGN.SPACE_AROUND, dxui.Utils.FLEX_ALIGN.CENTER, dxui.Utils.FLEX_ALIGN.CENTER)
    const minConfigBtnImg = viewUtils.imageBtn(miniBkgBox, 'minConfigBtnImg', '/app/code/resource/image/mini_config.png')
    mainView.minConfigBtnImg = minConfigBtnImg
    minConfigBtnImg.setSize(60, 60)
    minConfigBtnImg.on(dxui.Utils.EVENT.CLICK, () => {
        dxui.loadMain(newPwdView.screenMain)
    })

    const minPwdBtnImg = viewUtils.imageBtn(miniBkgBox, 'minPwdBtnImg', '/app/code/resource/image/mini_password.png')
    mainView.minPwdBtnImg = minPwdBtnImg
    minPwdBtnImg.setSize(60, 60)
    minPwdBtnImg.on(dxui.Utils.EVENT.CLICK, () => {
        let passwordAccess = screen.getConfig()["sys.pwd"]
        if (!passwordAccess) {
            return mainView.statusPanel.fail("mainView.passwordDisabled")
        }
        dxui.loadMain(pwdView.screenMain)
    })

    const minAppBtnImg = viewUtils.imageBtn(miniBkgBox, 'minAppBtnImg', '/app/code/resource/image/mini_app.png')
    mainView.minAppBtnImg = minAppBtnImg
    minAppBtnImg.setSize(60, 60)
    minAppBtnImg.on(dxui.Utils.EVENT.CLICK, () => {
        dxui.loadMain(appView.screenMain)
    })

    mainView.statusPanel = viewUtils.statusPanel(screenMain, 'mainView.success', 'mainView.fail')

}

export default mainView
