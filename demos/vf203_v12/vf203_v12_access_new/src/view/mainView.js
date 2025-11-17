import dxui from '../../dxmodules/dxUi.js'
import std from '../../dxmodules/dxStd.js'
import v from "./viewUtils.js"
import appView from './appView.js'
import topView from './topView.js'
import pwdView from './pwdView.js'
import newPwdView from './config/newPwdView.js'
import configView from './config/configView.js'
import screen from '../screen.js'
const mainView = {}

let screenMain
mainView.init = function () {
    /**************************************************创建屏幕*****************************************************/
    screenMain = v.create('act')
    mainView.screenMain = screenMain
    v.chain(screenMain)
        .scroll(false)
        .bgOpa(0)
        .load(() => {
            std.setTimeout(() => topView.changeTheme(false), 0)

            std.setTimeout(() => {
                screen.faceRecgStart()
            }, 0)

            let config = screen.getConfig()
            if (config["sys.pwd"] == 0) {
                pwdBtnBox.hide()
            } else {
                pwdBtnBox.show()
            }

            let sn = config["sys.sn"]
            if (sn) {
                if (sn.length >= 8) {
                    sn = sn.substring(0, 8)
                    sn = sn + "..."
                }
                snLbl.text("SN:" + sn)
            }
            qrcodeObj.text("SN:" + config["sys.sn"])

            // ipLbl.text("IP:" + config["net.ip"])

            let showSn = config["base.showSn"]
            let showIp = config["base.showIp"]
            screen.hideSn(showSn == 1)
            screen.hideIp(showIp == 1)
            screen.hideBottomBox(showSn == 0 && showIp == 0)
            screen.appMode(screen.getConfig()["base.appMode"])

            if (configView.timer) {
                std.clearInterval(configView.timer)
                configView.timer = null
            }
        })
        .unload(screen.faceRecgPause)

    mainView.trackFaces = []
    for (let i = 0; i < 10; i++) {
        let item = {}
        const trackFace = v.create(screenMain)
        item.trackFace = trackFace
        v.chain(trackFace)
            .radius(0)
            .borderWidth(0)
            .padAll(0)
            .setSize(200, 200)
            .borderWidth(5)
            .setBorderColor(0xffffff)
            .bgOpa(0)
            .hide()

        const trackFaceName = v.create(trackFace, "Label")
        item.trackFaceName = trackFaceName
        v.chain(trackFaceName)
            .textFont(v.font(30))
            .textColor(0xffffff)
            .text(" ")
            .bottom_mid(0, 0)

        mainView.trackFaces.push(item)
    }

    const bottomBox = v.create(screenMain, "Image")
    mainView.bottomBox = bottomBox
    v.chain(bottomBox)
        .source(screen.resourcePath.imagePath + '/rectangle.png')
        .bottom_mid(0, 0)

    const bottomSnBtn = v.create(screenMain, "Button")
    mainView.bottomSnBtn = bottomSnBtn
    v.chain(bottomSnBtn)
        .bgColor(0xffffff)
        .bgOpa(20)
        .setSize(screen.screenSize.width * (157 / 600), screen.screenSize.height * (36 / 1024))
        .shadow(0, 0, 0, 0, 0xffffff, 100)
        .bottom_left(screen.screenSize.width * (13 / 600), screen.screenSize.height * (-8 / 1024))
        .click(() => {
            qrcodeMask.show()
            qrcodeMask.moveForeground()
            showSnQrcode.show()
        })
        .flex({ flow: "ROW", align: ['CENTER'] })
        .padGap(5)

    const bottomQrcode = v.create(bottomSnBtn, "Image")
    v.chain(bottomQrcode)
        .source(screen.resourcePath.imagePath + '/qrcode_small.png')

    const snLbl = v.create(bottomSnBtn, "Label")
    v.chain(snLbl)
        .text("SN:")
        .textFont(v.font(15))
        .textColor(0xffffff)
        .width(screen.screenSize.width * (120 / 600))
        .longMode(dxui.Utils.LABEL_LONG_MODE.SCROLL_CIRCULAR)

    const ipLbl = v.create(bottomBox, "Label")
    mainView.ipLbl = ipLbl
    v.chain(ipLbl)
        .text("IP:")
        .textFont(v.font(15))
        .textColor(0xffffff)
        .bottom_right(screen.screenSize.width * (-20 / 600), screen.screenSize.height * (-8 / 1024))

    // 菜单按钮
    const menuBtnBox = v.create(screenMain)
    mainView.menuBtnBox = menuBtnBox
    v.chain(menuBtnBox)
        .clearStyle()
        .moveForeground()
        .setSize(screen.screenSize.width * (550 / 600), screen.screenSize.height * (140 / 1024))
        .bottom_mid(0, screen.screenSize.height * (-100 / 1024))
        .bgOpa(0)
        .flex({
            flow: 'ROW',
            align: ['SPACE_AROUND', 'CENTER']
        })

    /******************************************app版&&普通版UI设计******************************************/
    // 配置按钮
    const configBtnBox = v.imageBtn(menuBtnBox, 'configBtnBox', screen.resourcePath.imagePath + '/menu_btn.png')
    mainView.configBtnBox = configBtnBox
    configBtnBox.on(dxui.Utils.EVENT.CLICK, () => {
        dxui.loadMain(newPwdView.screenMain)
    })
    const configLbl = dxui.Label.build('configLbl', configBtnBox)
    configLbl.text("配置")
    configLbl.dataI18n = 'mainView.config'
    configLbl.textFont(v.font(18))
    configLbl.textColor(0xffffff)
    configLbl.align(dxui.Utils.ALIGN.CENTER, 0, screen.screenSize.height * (30 / 1024))
    const configBtnImg = dxui.Image.build('configBtnImg', configBtnBox)
    configBtnImg.source(screen.resourcePath.imagePath + '/config_btn.png')
    configBtnImg.align(dxui.Utils.ALIGN.CENTER, 0, screen.screenSize.height * (-10 / 1024))

    // 密码按钮
    const pwdBtnBox = v.imageBtn(menuBtnBox, 'pwdBtnBox', screen.resourcePath.imagePath + '/menu_btn.png')
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
    pwdLbl.textFont(v.font(18))
    pwdLbl.textColor(0xffffff)
    pwdLbl.align(dxui.Utils.ALIGN.CENTER, 0, screen.screenSize.height * (30 / 1024))
    const pwdBtnImg = dxui.Image.build('pwdBtnImg', pwdBtnBox)
    pwdBtnImg.source(screen.resourcePath.imagePath + '/pwd_btn.png')
    pwdBtnImg.align(dxui.Utils.ALIGN.CENTER, 0, screen.screenSize.height * (-10 / 1024))

    // 小程序码按钮 暂时隐藏小程序按钮
    /* const appBtnBox = v.imageBtn(menuBtnBox, 'appBtnBox', screen.resourcePath.imagePath + '/menu_btn.png')
    mainView.appBtnBox = appBtnBox
    appBtnBox.on(dxui.Utils.EVENT.CLICK, () => {
        dxui.loadMain(appView.screenMain)
    })
    const appLbl = dxui.Label.build('appLbl', appBtnBox)
    appLbl.text("小程序码")
    appLbl.dataI18n = 'mainView.app'
    appLbl.textFont(v.font(18))
    appLbl.textColor(0xffffff)
    appLbl.align(dxui.Utils.ALIGN.CENTER, 0, screen.screenSize.height * (30 / 1024))
    if (screen.getConfig()["base.language"] == "EN") {
        appLbl.width(120)
        appLbl.longMode(dxui.Utils.LABEL_LONG_MODE.SCROLL_CIRCULAR)
    }
    
    const appBtnImg = dxui.Image.build('appBtnImg', appBtnBox)
    appBtnImg.source(screen.resourcePath.imagePath + '/app_btn.png')
    appBtnImg.align(dxui.Utils.ALIGN.CENTER, 0, screen.screenSize.height * (-10 / 1024)) */

    // 二维码弹窗背景遮罩
    const qrcodeMask = v.create(screenMain, "View")
    v.chain(qrcodeMask)
        .clearStyle()
        .align(dxui.Utils.ALIGN.TOP_LEFT, 0, 0)
        .moveForeground()
        .setSize(screen.screenSize.width, screen.screenSize.height * (984 / 1024))
        .borderWidth(0)
        .bgOpa(0)
        .hide()
        .click(() => {
            showSnQrcode.hide()
            qrcodeMask.hide()
        })
    // 二维码
    const showSnQrcode = dxui.View.build('showSnQrcode', qrcodeMask)
    showSnQrcode.setSize(screen.screenSize.width, screen.screenSize.height * (680 / 1024))
    showSnQrcode.align(dxui.Utils.ALIGN.BOTTOM_MID, 0, 0)
    showSnQrcode.bgColor(0xffffff)
    showSnQrcode.radius(screen.screenSize.width * (40 / 600))
    showSnQrcode.hide()

    const closeSnQrcodeBox = dxui.View.build('closeSnQrcodeBox', showSnQrcode)
    closeSnQrcodeBox.setSize(screen.screenSize.width * (60 / 600), screen.screenSize.width * (60 / 600))
    v._clearStyle(closeSnQrcodeBox)
    closeSnQrcodeBox.align(dxui.Utils.ALIGN.TOP_RIGHT, 0, 0)
    closeSnQrcodeBox.bgOpa(0)
    closeSnQrcodeBox.on(dxui.Utils.EVENT.CLICK, () => {
        showSnQrcode.hide()
        qrcodeMask.hide()
    })
    const closeSnQrcode = dxui.Image.build('closeSnQrcode', closeSnQrcodeBox)
    closeSnQrcode.source(screen.resourcePath.imagePath + '/close.png')

    const qrcode = dxui.View.build(showSnQrcode.id + 'qrcode', showSnQrcode)
    v._clearStyle(qrcode)
    qrcode.setSize(screen.screenSize.width * (320 / 600), screen.screenSize.width * (320 / 600))
    qrcode.align(dxui.Utils.ALIGN.CENTER, 0, 0);

    const qrcodeObj = v.create(qrcode, "Qrcode").side(screen.screenSize.width * (320 / 600)).color(0x000000, 0xffffff)
    qrcodeObj.text(snLbl.text())

    // const qrcodeObj = dxui.Utils.GG.NativeBasicComponent.lvQrcodeCreate(qrcode.obj, 320, 0x000000, 0xffffff)
    // dxui.Utils.GG.NativeBasicComponent.lvQrcodeUpdate(qrcodeObj, snLbl.text())

    // 菜单按钮
    const menu_btn = dxui.Button.build('menu_btn', screenMain)
    mainView.menu_btn = menu_btn
    menu_btn.setSize(screen.screenSize.width * (80 / 600), screen.screenSize.width * (80 / 600))
    v._clearStyle(menu_btn)
    menu_btn.align(dxui.Utils.ALIGN.TOP_RIGHT, screen.screenSize.width * (-30 / 600), screen.screenSize.height * (250 / 1024))
    menu_btn.bgColor(0x000000)
    menu_btn.bgOpa(20)
    menu_btn.radius(screen.screenSize.width * (80 / 600) / 2)
    menu_btn.on(dxui.Utils.EVENT.CLICK, () => {
        dxui.loadMain(newPwdView.screenMain)
    })
    menu_btn.hide()

    const setting32 = dxui.Image.build('setting32', menu_btn)
    setting32.source(screen.resourcePath.imagePath + '/setting32.png')
    setting32.align(dxui.Utils.ALIGN.CENTER, 0, 0)



    /******************************************极简版UI设计******************************************/
    // 极简版本-按钮背景
    const miniBkgBox = dxui.Image.build('miniBkgBox', screenMain)
    mainView.miniBkgBox = miniBkgBox
    v._clearStyle(miniBkgBox)
    miniBkgBox.moveForeground()
    let header = dxui.Utils.GG.NativeDraw.lvImgDecoderGetInfo(screen.resourcePath.imagePath + '/mini_background.png')
    miniBkgBox.setSize(header.w, header.h)
    miniBkgBox.source(screen.resourcePath.imagePath + '/mini_background.png')
    miniBkgBox.hide()
    miniBkgBox.bgOpa(0)
    miniBkgBox.align(dxui.Utils.ALIGN.CENTER, screen.screenSize.width * (210 / 600), 0)
    miniBkgBox.flexFlow(dxui.Utils.FLEX_FLOW.COLUMN)
    miniBkgBox.flexAlign(dxui.Utils.FLEX_ALIGN.SPACE_AROUND, dxui.Utils.FLEX_ALIGN.CENTER, dxui.Utils.FLEX_ALIGN.CENTER)

    const minConfigBtnImg = v.imageBtn(miniBkgBox, 'minConfigBtnImg', screen.resourcePath.imagePath + '/mini_config.png')
    mainView.minConfigBtnImg = minConfigBtnImg
    minConfigBtnImg.setSize(screen.screenSize.width * (60 / 600), screen.screenSize.width * (60 / 600))
    minConfigBtnImg.on(dxui.Utils.EVENT.CLICK, () => {
        dxui.loadMain(newPwdView.screenMain)
    })

    const minPwdBtnImg = v.imageBtn(miniBkgBox, 'minPwdBtnImg', screen.resourcePath.imagePath + '/mini_password.png')
    mainView.minPwdBtnImg = minPwdBtnImg
    minPwdBtnImg.setSize(screen.screenSize.width * (60 / 600), screen.screenSize.width * (60 / 600))
    minPwdBtnImg.on(dxui.Utils.EVENT.CLICK, () => {
        let passwordAccess = screen.getConfig()["sys.pwd"]
        if (!passwordAccess) {
            return mainView.statusPanel.fail("mainView.passwordDisabled")
        }
        pwdView.startCountdown()
        dxui.loadMain(pwdView.screenMain)
    })

    /* 暂时隐藏小程序按钮
    const minAppBtnImg = v.imageBtn(miniBkgBox, 'minAppBtnImg', screen.resourcePath.imagePath + '/mini_app.png')
    mainView.minAppBtnImg = minAppBtnImg
    minAppBtnImg.setSize(screen.screenSize.width * (60 / 600), screen.screenSize.width * (60 / 600))
    minAppBtnImg.on(dxui.Utils.EVENT.CLICK, () => {
        dxui.loadMain(appView.screenMain)
    }) */

    mainView.statusPanel = v.statusPanel(screenMain, 'mainView.success', 'mainView.fail')
}

mainView.load = () => {
    dxui.loadMain(screenMain)
}

export default mainView
