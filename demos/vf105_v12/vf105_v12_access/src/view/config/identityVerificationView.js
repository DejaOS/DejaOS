import dxUi from '../../../dxmodules/dxUi.js'
import std from '../../../dxmodules/dxStd.js'
import viewUtils from "../viewUtils.js"
import topView from '../topView.js'
import mainView from '../mainView.js'
import configView from './configView.js'
import i18n from '../i18n.js'
import screen from '../../screen.js'
const identityVerificationView = {}
identityVerificationView.init = function () {
    /************************************************** Create Screen *****************************************************/
    const screenMain = dxUi.View.build('identityVerificationView', dxUi.Utils.LAYER.MAIN)
    identityVerificationView.screenMain = screenMain
    screenMain.scroll(false)
    screenMain.bgColor(0xffffff)
    screenMain.on(dxUi.Utils.ENUM.LV_EVENT_SCREEN_LOADED, () => {
        topView.changeTheme(true)
        toggleTab(0)

        // Auto return after 15 seconds of no operation
        if (identityVerificationView.timer) {
            std.clearInterval(identityVerificationView.timer)
        }
        identityVerificationView.timer = std.setInterval(() => {
            let count = dxUi.Utils.GG.NativeDisp.lvDispGetInactiveTime()
            if (count > 15 * 1000) {
                std.clearInterval(identityVerificationView.timer)
                identityVerificationView.timer = null
                dxUi.loadMain(mainView.screenMain)
            }
        }, 1000)
    })

    screenMain.on(dxUi.Utils.ENUM.LV_EVENT_SCREEN_UNLOADED, () => {
        // Face authentication ended
        if (identityVerificationView.timer) {
            std.clearInterval(identityVerificationView.timer)
        }
        if (!faceRec.isHide()) {
            screen.faceAuthEnd()
        }
    })

    const titleBoxBg = dxUi.View.build('titleBoxBg', screenMain)
    viewUtils._clearStyle(titleBoxBg)
    titleBoxBg.setSize(screen.screenSize.width, 70)
    titleBoxBg.align(dxUi.Utils.ALIGN.TOP_MID, 0, 0)
    titleBoxBg.bgColor(0xffffff)

    const titleBox = viewUtils.title(screenMain, mainView.screenMain, 'identityVerificationViewTitle', 'identityVerificationView.title')
    titleBox.align(dxUi.Utils.ALIGN.TOP_MID, 0, 70)

    const tab = dxUi.View.build('tab', screenMain)
    viewUtils._clearStyle(tab)
    tab.setSize(screen.screenSize.width, 80)
    tab.alignTo(titleBox, dxUi.Utils.ALIGN.OUT_BOTTOM_MID, 0, 0)
    tab.flexFlow(dxUi.Utils.FLEX_FLOW.ROW)
    tab.flexAlign(dxUi.Utils.FLEX_ALIGN.SPACE_AROUND, dxUi.Utils.FLEX_ALIGN.CENTER, dxUi.Utils.FLEX_ALIGN.CENTER)

    const pwdLogBox = dxUi.View.build('pwdLogBox', tab)
    viewUtils._clearStyle(pwdLogBox)
    const pwdLogLbl = dxUi.Label.build('pwdLogLbl', pwdLogBox)
    pwdLogLbl.textFont(viewUtils.font(28))
    pwdLogLbl.textColor(0x888888)
    pwdLogLbl.text('Password Login')
    pwdLogLbl.dataI18n = 'identityVerificationView.pwdLog'
    const pwdLogText = pwdLogLbl.text
    pwdLogLbl.text = (data) => {
        pwdLogText.call(pwdLogLbl, data)
        pwdLogLbl.update()
        pwdLogBox.setSize(pwdLogLbl.width() + 8, 80)
    }
    pwdLogLbl.align(dxUi.Utils.ALIGN.CENTER, 0, 0)
    pwdLogLbl.update()
    pwdLogBox.setSize(pwdLogLbl.width() + 8, 80)
    pwdLogBox.borderWidth(4)
    pwdLogBox.obj.setStyleBorderSide(dxUi.Utils.ENUM.LV_BORDER_SIDE_BOTTOM, 0)
    pwdLogBox.setBorderColor(0x0836C)
    pwdLogBox.on(dxUi.Utils.EVENT.CLICK, () => {
        toggleTab(0)
    })

    const faceLogBox = dxUi.View.build('faceLogBox', tab)
    viewUtils._clearStyle(faceLogBox)
    const faceLogLbl = dxUi.Label.build('faceLogLbl', faceLogBox)
    faceLogLbl.textFont(viewUtils.font(28))
    faceLogLbl.textColor(0x888888)
    faceLogLbl.text('Face Login')
    faceLogLbl.dataI18n = 'identityVerificationView.faceLog'
    const faceLogText = faceLogLbl.text
    faceLogLbl.text = (data) => {
        faceLogText.call(faceLogLbl, data)
        faceLogLbl.update()
        faceLogBox.setSize(faceLogLbl.width() + 8, 80)
    }
    faceLogLbl.align(dxUi.Utils.ALIGN.CENTER, 0, 0)
    faceLogLbl.update()
    faceLogBox.setSize(faceLogLbl.width() + 8, 80)
    faceLogBox.borderWidth(4)
    faceLogBox.obj.setStyleBorderSide(dxUi.Utils.ENUM.LV_BORDER_SIDE_BOTTOM, 0)
    faceLogBox.setBorderColor(0x0836C)
    faceLogBox.on(dxUi.Utils.EVENT.CLICK, () => {
        toggleTab(1)
    })

    const pwdInput = viewUtils.input(screenMain, screenMain.id + 'pwdInput', undefined, undefined, 'identityVerificationView.pwd')
    pwdInput.align(dxUi.Utils.ALIGN.TOP_MID, 0, 263)
    pwdInput.setPasswordMode(true)

    const eyeFill = viewUtils.imageBtn(screenMain, screenMain.id + 'eye_fill', '/app/code/resource/image/eye-fill.png')
    eyeFill.alignTo(pwdInput, dxUi.Utils.ALIGN.RIGHT_MID, 0, 0)
    eyeFill.on(dxUi.Utils.EVENT.CLICK, () => {
        pwdInput.setPasswordMode(true)
        eyeFill.hide()
        eyeOff.show()
    })
    eyeFill.hide()

    const eyeOff = viewUtils.imageBtn(screenMain, screenMain.id + 'eye_off', '/app/code/resource/image/eye-off.png')
    eyeOff.alignTo(pwdInput, dxUi.Utils.ALIGN.RIGHT_MID, 0, 0)
    eyeOff.on(dxUi.Utils.EVENT.CLICK, () => {
        pwdInput.setPasswordMode(false)
        eyeFill.show()
        eyeOff.hide()
    })

    const pwdAccessBtn = viewUtils.bottomBtn(screenMain, screenMain.id + 'pwdAccessBtn', 'identityVerificationView.pwdAccess', () => {
        if (screen.getConfig()['base.password'] === pwdInput.text()) {
            // Enter settings menu
            std.clearInterval(identityVerificationView.timer)
            dxUi.loadMain(configView.screenMain)
        } else {
            if (faceRec.isHide()) {
                // Password incorrect
                identityVerificationView.statusPanel.fail('identityVerificationView.pwdFail')
            } else {
                // Face authentication failed
                identityVerificationView.statusPanel.fail('identityVerificationView.fail')
            }
        }
    })
    pwdAccessBtn.align(dxUi.Utils.ALIGN.BOTTOM_MID, 0, -83)

    const faceRec = dxUi.Image.build('faceRec', screenMain)
    faceRec.source('/app/code/resource/image/faceRec.png')
    faceRec.alignTo(tab, dxUi.Utils.ALIGN.OUT_BOTTOM_MID, 0, 70)

    identityVerificationView.statusPanel = viewUtils.statusPanel(screenMain, 'identityVerificationView.success', 'identityVerificationView.fail')

    function toggleTab(index) {
        screenMain.send(dxUi.Utils.EVENT.CLICK)
        if (index == 0) {
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

            // Face authentication ended
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

            // Face authentication started
            screen.faceAuthStart()
        }
    }
    toggleTab(0)
}

export default identityVerificationView