import dxui from '../../../dxmodules/dxUi.js'
import std from '../../../dxmodules/dxStd.js'
import viewUtils from "../viewUtils.js"
import topView from '../topView.js'
import mainView from '../mainView.js'
import configView from './configView.js'
import screen from '../../screen.js'
import logger from '../../../dxmodules/dxLogger.js'
const identityVerificationView = {}

let hasInit = false
identityVerificationView.init = function () {
    /**************************************************创建屏幕*****************************************************/
    const screenMain = dxui.View.build('identityVerificationView', dxui.Utils.LAYER.MAIN)
    identityVerificationView.screenMain = screenMain
    screenMain.scroll(false)
    screenMain.bgColor(0xffffff)
    screenMain.on(dxui.Utils.ENUM.LV_EVENT_SCREEN_LOADED, () => {
        hasInit = true
        topView.changeTheme(true)
        toggleTab(0)

        let startfaceflag = false
        // 无操作15秒自动返回
        if (identityVerificationView.timer) {
            std.clearInterval(identityVerificationView.timer)
        }
        identityVerificationView.timer = std.setInterval(() => {
            let count = dxui.Utils.GG.NativeDisp.lvDispGetInactiveTime()
            if (count > 15 * 1000) {
                std.clearInterval(identityVerificationView.timer)
                identityVerificationView.timer = null
                mainView.load()
            }

            // mainview 的 unload时间点晚于 当前页面的load事件，复用定时器的延时开启人脸识别
            if (!startfaceflag) {
                // 人脸认证开始
                screen.faceAuthStart()
                startfaceflag = true
            }
        }, 1000)
    })

    screenMain.on(dxui.Utils.ENUM.LV_EVENT_SCREEN_UNLOADED, () => {
        // 人脸认证结束
        if (identityVerificationView.timer) {
            std.clearInterval(identityVerificationView.timer)
        }
        screen.faceAuthEnd()

    })

    const titleBoxBg = dxui.View.build('titleBoxBg', screenMain)
    viewUtils._clearStyle(titleBoxBg)
    titleBoxBg.setSize(screen.screenSize.width * (600 / 600), screen.screenSize.height * (70 / 1024))
    titleBoxBg.align(dxui.Utils.ALIGN.TOP_MID, 0, 0)
    titleBoxBg.bgColor(0xffffff)

    const titleBox = viewUtils.title(screenMain, mainView.load, 'identityVerificationViewTitle', 'identityVerificationView.title')
    titleBox.align(dxui.Utils.ALIGN.TOP_MID, 0, screen.screenSize.height * (70 / 1024))

    const tab = dxui.View.build('tab', screenMain)
    viewUtils._clearStyle(tab)
    tab.setSize(screen.screenSize.width * (600 / 600), screen.screenSize.height * (80 / 1024))
    tab.alignTo(titleBox, dxui.Utils.ALIGN.OUT_BOTTOM_MID, 0, 0)
    tab.flexFlow(dxui.Utils.FLEX_FLOW.ROW)
    tab.flexAlign(dxui.Utils.FLEX_ALIGN.SPACE_AROUND, dxui.Utils.FLEX_ALIGN.CENTER, dxui.Utils.FLEX_ALIGN.CENTER)

    const faceLogBox = dxui.View.build('faceLogBox', tab)
    viewUtils._clearStyle(faceLogBox)
    const faceLogLbl = dxui.Label.build('faceLogLbl', faceLogBox)
    faceLogLbl.textFont(viewUtils.font(28))
    faceLogLbl.textColor(0x888888)
    faceLogLbl.text('人脸登录')
    faceLogLbl.dataI18n = 'identityVerificationView.faceLog'
    const faceLogText = faceLogLbl.text
    faceLogLbl.text = (data) => {
        faceLogText.call(faceLogLbl, data)
        faceLogLbl.update()
        faceLogBox.setSize(faceLogLbl.width() + screen.screenSize.width * (8 / 600), screen.screenSize.height * (80 / 1024))
    }
    faceLogLbl.align(dxui.Utils.ALIGN.CENTER, 0, 0)
    faceLogLbl.update()
    faceLogBox.setSize(faceLogLbl.width() + screen.screenSize.width * (8 / 600), screen.screenSize.height * (80 / 1024))
    faceLogBox.borderWidth(4)
    faceLogBox.obj.setStyleBorderSide(dxui.Utils.ENUM.LV_BORDER_SIDE_BOTTOM, 0)
    faceLogBox.setBorderColor(0x0836C)
    faceLogBox.on(dxui.Utils.EVENT.CLICK, () => {
        screen.faceAuthStart()
        toggleTab(0)
    })
    faceLogBox.scroll(false)

    const pwdLogBox = dxui.View.build('pwdLogBox', tab)
    viewUtils._clearStyle(pwdLogBox)
    const pwdLogLbl = dxui.Label.build('pwdLogLbl', pwdLogBox)
    pwdLogLbl.textFont(viewUtils.font(28))
    pwdLogLbl.textColor(0x888888)
    pwdLogLbl.text('密码登录')
    pwdLogLbl.dataI18n = 'identityVerificationView.pwdLog'
    const pwdLogText = pwdLogLbl.text
    pwdLogLbl.text = (data) => {
        pwdLogText.call(pwdLogLbl, data)
        pwdLogLbl.update()
        pwdLogBox.setSize(pwdLogLbl.width() + screen.screenSize.width * (8 / 600), screen.screenSize.height * (80 / 1024))
    }
    pwdLogLbl.align(dxui.Utils.ALIGN.CENTER, 0, 0)
    pwdLogLbl.update()
    pwdLogBox.setSize(pwdLogLbl.width() + screen.screenSize.width * (8 / 600), screen.screenSize.height * (80 / 1024))
    pwdLogBox.borderWidth(4)
    pwdLogBox.obj.setStyleBorderSide(dxui.Utils.ENUM.LV_BORDER_SIDE_BOTTOM, 0)
    pwdLogBox.setBorderColor(0x0836C)
    pwdLogBox.on(dxui.Utils.EVENT.CLICK, () => {
        toggleTab(1)
    })
    pwdLogBox.scroll(false)

    const pwdInput = viewUtils.input(screenMain, screenMain.id + 'pwdInput', undefined, undefined, 'identityVerificationView.pwd')
    pwdInput.align(dxui.Utils.ALIGN.TOP_MID, 0, screen.screenSize.height * (263 / 1024))
    pwdInput.setPasswordMode(true)

    const eyeFill = viewUtils.imageBtn(screenMain, screenMain.id + 'eye_fill', screen.resourcePath.imagePath + '/eye-fill.png')
    eyeFill.alignTo(pwdInput, dxui.Utils.ALIGN.RIGHT_MID, 0, 0)
    eyeFill.on(dxui.Utils.EVENT.CLICK, () => {
        pwdInput.setPasswordMode(true)
        eyeFill.hide()
        eyeOff.show()
    })
    eyeFill.hide()

    const eyeOff = viewUtils.imageBtn(screenMain, screenMain.id + 'eye_off', screen.resourcePath.imagePath + '/eye-off.png')
    eyeOff.alignTo(pwdInput, dxui.Utils.ALIGN.RIGHT_MID, 0, 0)
    eyeOff.on(dxui.Utils.EVENT.CLICK, () => {
        pwdInput.setPasswordMode(false)
        eyeFill.show()
        eyeOff.hide()
    })

    const pwdAccessBtn = viewUtils.bottomBtn(screenMain, screenMain.id + 'pwdAccessBtn', 'identityVerificationView.pwdAccess', () => {
        if (screen.getConfig()['base.password'] === pwdInput.text()) {
            // 进入设置菜单
            std.clearInterval(identityVerificationView.timer)
            dxui.loadMain(configView.screenMain)

        } else {
            if (faceRec.isHide()) {
                // 密码错误
                identityVerificationView.statusPanel.fail('identityVerificationView.pwdFail')
            } else {
                // 人脸认证失败
                identityVerificationView.statusPanel.fail('identityVerificationView.fail')
            }
        }
    })
    pwdAccessBtn.align(dxui.Utils.ALIGN.BOTTOM_MID, 0, -screen.screenSize.height * (40 / 1024))

    const faceRec = dxui.Image.build('faceRec', screenMain)
    faceRec.source(screen.resourcePath.imagePath + '/faceRec.png')
    faceRec.alignTo(tab, dxui.Utils.ALIGN.OUT_BOTTOM_MID, 0, screen.screenSize.height * (70 / 1024))

    identityVerificationView.statusPanel = viewUtils.statusPanel(screenMain, 'identityVerificationView.success', 'identityVerificationView.fail')

    function toggleTab(index) {
        screenMain.send(dxui.Utils.EVENT.CLICK)
        if (index == 1) {
            pwdLogLbl.textColor(0x0836C)
            faceLogLbl.textColor(0x888888)
            pwdLogBox.setBorderColor(0x0836C)
            faceLogBox.setBorderColor(0xffffff)
            pwdInput.show()
            eyeFill.show()
            eyeOff.show()
            pwdAccessBtn.show()
            screenMain.bgOpa(100)
            faceRec.hide()

            // 人脸认证结束
            screen.faceAuthEnd()
        } else {
            pwdLogLbl.textColor(0x888888)
            faceLogLbl.textColor(0x0836C)
            pwdLogBox.setBorderColor(0xffffff)
            faceLogBox.setBorderColor(0x0836C)
            pwdInput.hide()
            eyeFill.hide()
            eyeOff.hide()
            pwdAccessBtn.hide()
            screenMain.bgOpa(0)
            faceRec.show()
        }
    }
    toggleTab(0)
}

export default identityVerificationView