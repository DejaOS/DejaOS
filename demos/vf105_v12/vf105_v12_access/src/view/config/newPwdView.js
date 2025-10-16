import dxUi from '../../../dxmodules/dxUi.js'
import std from '../../../dxmodules/dxStd.js'
import viewUtils from "../viewUtils.js"
import topView from '../topView.js'
import mainView from '../mainView.js'
import identityVerificationView from './identityVerificationView.js'
import screen from '../../screen.js'
const newPwdView = {}
newPwdView.init = function () {
    /************************************************** Create Screen *****************************************************/
    const screenMain = dxUi.View.build('newPwdView', dxUi.Utils.LAYER.MAIN)
    newPwdView.screenMain = screenMain
    screenMain.scroll(false)
    screenMain.bgColor(0xffffff)
    screenMain.on(dxUi.Utils.ENUM.LV_EVENT_SCREEN_LOADED, () => {
        topView.changeTheme(true)

        newPwdView.timer = std.setInterval(() => {
            let count = dxUi.Utils.GG.NativeDisp.lvDispGetInactiveTime()
            if (count > 15 * 1000) {
                std.clearInterval(newPwdView.timer)
                newPwdView.timer = null
                dxUi.loadMain(mainView.screenMain)
            }
        }, 1000)
        // If admin password is empty, show this screen, otherwise go directly to authentication screen
        if (screen.getConfig()['base.firstLogin'] == 1) {
            std.clearInterval(newPwdView.timer)
            dxUi.loadMain(identityVerificationView.screenMain)
        }
    })
    screenMain.on(dxUi.Utils.ENUM.LV_EVENT_SCREEN_UNLOADED, () => {
        if (newPwdView.timer) {
            std.clearInterval(newPwdView.timer)
        }
    })

    const titleBox = viewUtils.title(screenMain, mainView.screenMain, 'newPwdViewTitle', 'newPwdView.title')
    titleBox.align(dxUi.Utils.ALIGN.TOP_MID, 0, 70)

    const pwdInput = viewUtils.input(screenMain, 'newPwdInput', undefined, undefined, 'newPwdView.pwd')
    pwdInput.align(dxUi.Utils.ALIGN.TOP_MID, 0, 211)
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

    const confirmPwdInput = viewUtils.input(screenMain, 'confirmPwdInput', undefined, undefined, 'newPwdView.confirmPwd')
    confirmPwdInput.alignTo(pwdInput, dxUi.Utils.ALIGN.OUT_BOTTOM_MID, 0, 30)
    confirmPwdInput.setPasswordMode(true)

    const eyeFill2 = viewUtils.imageBtn(screenMain, screenMain.id + 'eye_fill2', '/app/code/resource/image/eye-fill.png')
    eyeFill2.alignTo(confirmPwdInput, dxUi.Utils.ALIGN.RIGHT_MID, 0, 0)
    eyeFill2.on(dxUi.Utils.EVENT.CLICK, () => {
        confirmPwdInput.setPasswordMode(true)
        eyeFill2.hide()
        eyeOff2.show()
    })
    eyeFill2.hide()

    const eyeOff2 = viewUtils.imageBtn(screenMain, screenMain.id + 'eye_off2', '/app/code/resource/image/eye-off.png')
    eyeOff2.alignTo(confirmPwdInput, dxUi.Utils.ALIGN.RIGHT_MID, 0, 0)
    eyeOff2.on(dxUi.Utils.EVENT.CLICK, () => {
        confirmPwdInput.setPasswordMode(false)
        eyeFill2.show()
        eyeOff2.hide()
    })

    const tipLbl = dxUi.Label.build('newPwdViewTip', screenMain)
    tipLbl.textFont(viewUtils.font(22))
    tipLbl.textColor(0x888888)
    tipLbl.dataI18n = 'newPwdView.tip'
    tipLbl.align(dxUi.Utils.ALIGN.TOP_MID, 0, 530)

    const skipView = dxUi.View.build('skipView', screenMain)
    viewUtils._clearStyle(skipView)
    const skipLbl = dxUi.Label.build('skipLbl', skipView)
    skipLbl.textFont(viewUtils.font(24))
    skipLbl.textColor(0x767676)
    skipLbl.dataI18n = 'newPwdView.skip'
    const skipText = skipLbl.text
    skipLbl.text = (data) => {
        skipText.call(skipLbl, data)
        skipLbl.update()
        skipView.setSize(skipLbl.width(), skipLbl.height())
    }
    skipLbl.borderWidth(2)
    skipLbl.obj.setStyleBorderSide(dxUi.Utils.ENUM.LV_BORDER_SIDE_BOTTOM, 0)
    skipLbl.setBorderColor(0x767676)

    const pwdAccessBtn = viewUtils.bottomBtn(screenMain, screenMain.id + 'pwdAccessBtn', 'newPwdView.pwdAccess', () => {
        if (pwdInput.text() != confirmPwdInput.text()) {
            newPwdView.statusPanel.fail("newPwdView.pwdNotMatch")
            return
        }
        const res = screen.saveConfig({
            base: {
                password: pwdInput.text()
            }
        })
        if (res === true) {
            newPwdView.statusPanel.success()
            std.clearInterval(newPwdView.timer)
            dxUi.loadMain(identityVerificationView.screenMain)
        } else {
            newPwdView.statusPanel.fail()
        }
    })
    pwdAccessBtn.align(dxUi.Utils.ALIGN.BOTTOM_MID, 0, -83)

    skipView.setSize(skipLbl.width(), skipLbl.height())
    skipView.align(dxUi.Utils.ALIGN.BOTTOM_MID, 0, -217)
    skipView.on(dxUi.Utils.EVENT.CLICK, () => {
        // Modify status
        screen.saveConfig({ base: { firstLogin: 1 } })
        std.clearInterval(newPwdView.timer)
        dxUi.loadMain(identityVerificationView.screenMain)
    })

    newPwdView.statusPanel = viewUtils.statusPanel(screenMain, 'newPwdView.success', 'newPwdView.fail')
}

export default newPwdView