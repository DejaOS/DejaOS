import dxUi from '../../dxmodules/dxUi.js'
import std from '../../dxmodules/dxStd.js'
import viewUtils from "./viewUtils.js"
import topView from './topView.js'
import mainView from './mainView.js'
import i18n from './i18n.js'
import screen from '../screen.js'

const pwdView = {}
pwdView.init = function () {
    /************************************************** Create Screen *****************************************************/
    const screenMain = dxUi.View.build('pwdView', dxUi.Utils.LAYER.MAIN)
    pwdView.screenMain = screenMain
    screenMain.scroll(false)
    screenMain.bgColor(0xffffff)
    screenMain.on(dxUi.Utils.ENUM.LV_EVENT_SCREEN_LOADED, () => {
        topView.changeTheme(true)

        const configAll = screen.getConfig()
        pwdAccessBtn.disable(configAll['sys.pwd'] == 0)
        
        pwdView.timer = std.setInterval(() => {
            let count = dxUi.Utils.GG.NativeDisp.lvDispGetInactiveTime()
            if (count > 15 * 1000) {
                std.clearInterval(pwdView.timer)
                pwdView.timer = null
                dxUi.loadMain(mainView.screenMain)
            }
        }, 1000)

        pwdInput.send(dxUi.Utils.EVENT.CLICK)
        pwdInput.send(dxUi.Utils.EVENT.FOCUSED)
    })
    screenMain.on(dxUi.Utils.ENUM.LV_EVENT_SCREEN_UNLOADED, () => {
        if (pwdView.timer) {
            std.clearInterval(pwdView.timer)
        }
    })

    const titleBox = viewUtils.title(screenMain, mainView.screenMain, 'pwdViewTitle', 'pwdView.title')
    titleBox.align(dxUi.Utils.ALIGN.TOP_MID, 0, 70)

    const pwdInput = viewUtils.input(screenMain, 'pwdInput', 2, undefined, 'pwdView.pwd')
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

    const pwdAccessBtn = viewUtils.bottomBtn(screenMain, 'pwdAccessBtn', 'pwdView.pwdAccess', () => {
        // Confirm password
        screen.pwdAccess(pwdInput.text())
        dxUi.loadMain(mainView.screenMain)
    })
    pwdAccessBtn.align(dxUi.Utils.ALIGN.BOTTOM_MID, 0, -83)
}

export default pwdView