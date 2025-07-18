import dxui from '../../../dxmodules/dxUi.js'
import config from '../../../dxmodules/dxConfig.js'
import std from '../../../dxmodules/dxStd.js'
import viewUtils from "../viewUtils.js"
import topView from '../topView.js'
import mainView from '../mainView.js'
import identityVerificationView from './identityVerificationView.js'
import screen from '../../screen.js'
const newPwdView = {}
newPwdView.init = function () {
    /**************************************************创建屏幕*****************************************************/
    const screenMain = dxui.View.build('newPwdView', dxui.Utils.LAYER.MAIN)
    newPwdView.screenMain = screenMain
    screenMain.scroll(false)
    screenMain.bgColor(0xffffff)
    screenMain.on(dxui.Utils.ENUM.LV_EVENT_SCREEN_LOADED, () => {
        topView.changeTheme(true)
        // 无操作10秒自动返回

        newPwdView.timer = std.setInterval(() => {
            let count = dxui.Utils.GG.NativeDisp.lvDispGetInactiveTime()
            if (count > 15 * 1000) {
                std.clearInterval(newPwdView.timer)
                newPwdView.timer = null
                dxui.loadMain(mainView.screenMain)
            }
        }, 1000)
        //如果管理员密码为空,则弹出此界面,否则直接进入认证界面
        if (screen.getConfig()['base.firstLogin'] == 1) {
            std.clearInterval(newPwdView.timer)
            dxui.loadMain(identityVerificationView.screenMain)
        }


    })
    screenMain.on(dxui.Utils.ENUM.LV_EVENT_SCREEN_UNLOADED, () => {
        if (newPwdView.timer) {
            std.clearInterval(newPwdView.timer)
        }
    })

    const titleBox = viewUtils.title(screenMain, mainView.screenMain, 'newPwdViewTitle', 'newPwdView.title')
    titleBox.align(dxui.Utils.ALIGN.TOP_MID, 0, 70)

    const pwdInput = viewUtils.input(screenMain, 'newPwdInput', undefined, undefined, 'newPwdView.pwd')
    pwdInput.align(dxui.Utils.ALIGN.TOP_MID, 0, 211)
    pwdInput.setPasswordMode(true)

    const eyeFill = viewUtils.imageBtn(screenMain, screenMain.id + 'eye_fill', '/app/code/resource/image/eye-fill.png')
    eyeFill.alignTo(pwdInput, dxui.Utils.ALIGN.RIGHT_MID, 0, 0)
    eyeFill.on(dxui.Utils.EVENT.CLICK, () => {
        pwdInput.setPasswordMode(true)
        eyeFill.hide()
        eyeOff.show()
    })
    eyeFill.hide()

    const eyeOff = viewUtils.imageBtn(screenMain, screenMain.id + 'eye_off', '/app/code/resource/image/eye-off.png')
    eyeOff.alignTo(pwdInput, dxui.Utils.ALIGN.RIGHT_MID, 0, 0)
    eyeOff.on(dxui.Utils.EVENT.CLICK, () => {
        pwdInput.setPasswordMode(false)
        eyeFill.show()
        eyeOff.hide()
    })

    const confirmPwdInput = viewUtils.input(screenMain, 'confirmPwdInput', undefined, undefined, 'newPwdView.confirmPwd')
    confirmPwdInput.alignTo(pwdInput, dxui.Utils.ALIGN.OUT_BOTTOM_MID, 0, 30)
    confirmPwdInput.setPasswordMode(true)

    const eyeFill2 = viewUtils.imageBtn(screenMain, screenMain.id + 'eye_fill2', '/app/code/resource/image/eye-fill.png')
    eyeFill2.alignTo(confirmPwdInput, dxui.Utils.ALIGN.RIGHT_MID, 0, 0)
    eyeFill2.on(dxui.Utils.EVENT.CLICK, () => {
        confirmPwdInput.setPasswordMode(true)
        eyeFill2.hide()
        eyeOff2.show()
    })
    eyeFill2.hide()

    const eyeOff2 = viewUtils.imageBtn(screenMain, screenMain.id + 'eye_off2', '/app/code/resource/image/eye-off.png')
    eyeOff2.alignTo(confirmPwdInput, dxui.Utils.ALIGN.RIGHT_MID, 0, 0)
    eyeOff2.on(dxui.Utils.EVENT.CLICK, () => {
        confirmPwdInput.setPasswordMode(false)
        eyeFill2.show()
        eyeOff2.hide()
    })

    const tipLbl = dxui.Label.build('newPwdViewTip', screenMain)
    tipLbl.textFont(viewUtils.font(22))
    tipLbl.textColor(0x888888)
    tipLbl.dataI18n = 'newPwdView.tip'
    tipLbl.width(400)
    tipLbl.longMode(dxui.Utils.LABEL_LONG_MODE.WRAP)
    tipLbl.align(dxui.Utils.ALIGN.TOP_MID, 0, 431)
    if(config.get("base.language") == "EN"){
        tipLbl.width(500)
        tipLbl.longMode(dxui.Utils.LABEL_LONG_MODE.SCROLL_CIRCULAR)
    }

    const skipView = dxui.View.build('skipView', screenMain)
    viewUtils._clearStyle(skipView)
    const skipLbl = dxui.Label.build('skipLbl', skipView)
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
    skipLbl.obj.setStyleBorderSide(dxui.Utils.ENUM.LV_BORDER_SIDE_BOTTOM, 0)
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

            dxui.loadMain(identityVerificationView.screenMain)
        } else {
            newPwdView.statusPanel.fail()
        }
    })
    pwdAccessBtn.align(dxui.Utils.ALIGN.BOTTOM_MID, 0, -83)

    skipView.setSize(skipLbl.width(), skipLbl.height())
    skipView.align(dxui.Utils.ALIGN.BOTTOM_MID, 0, -217)
    skipView.on(dxui.Utils.EVENT.CLICK, () => {
        //修改状态
        screen.saveConfig({ base: { firstLogin: 1 } })
        std.clearInterval(newPwdView.timer)
        dxui.loadMain(identityVerificationView.screenMain)
    })

    newPwdView.statusPanel = viewUtils.statusPanel(screenMain, 'newPwdView.success', 'newPwdView.fail')
}

export default newPwdView