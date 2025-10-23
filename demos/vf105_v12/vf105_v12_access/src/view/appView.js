import dxUi from '../../dxmodules/dxUi.js'
import std from '../../dxmodules/dxStd.js'
import viewUtils from "./viewUtils.js"
import topView from './topView.js'
import mainView from './mainView.js'
import i18n from './i18n.js'
const appView = {}
appView.init = function () {
    /************************************************** Create Screen *****************************************************/
    const screenMain = dxUi.View.build('appView', dxUi.Utils.LAYER.MAIN)
    appView.screenMain = screenMain
    screenMain.scroll(false)
    screenMain.bgColor(0xffffff)
    screenMain.on(dxUi.Utils.ENUM.LV_EVENT_SCREEN_LOADED, () => {
        topView.changeTheme(true)
        appQrcode.source('/app/code/resource/image/app_qrcode.png')
        // Auto return after 10 seconds of no operation
        if (appView.timer) {
            std.clearInterval(appView.timer)
        }
        appView.timer = std.setInterval(() => {
            let count = dxUi.Utils.GG.NativeDisp.lvDispGetInactiveTime()
            if (count > 10 * 1000) {
                std.clearInterval(appView.timer)
                appView.timer = null
                dxUi.loadMain(mainView.screenMain)
            }
        }, 1000)
    })

    const appQrcode = dxUi.Image.build('appQrcode', screenMain)
    appQrcode.source('/app/code/resource/image/app_qrcode.png')
    appQrcode.align(dxUi.Utils.ALIGN.TOP_MID, 0, 206)

    const knowedBtn = viewUtils.bottomBtn(screenMain, 'knowedBtn', 'appView.knowed', () => {
        dxUi.loadMain(mainView.screenMain)
    })
    knowedBtn.align(dxUi.Utils.ALIGN.BOTTOM_MID, 0, -124)

    const appQrcodeLbl = dxUi.Label.build('appQrcodeLbl', screenMain)
    appQrcodeLbl.text('Convenient management with mini program')
    appQrcodeLbl.textFont(viewUtils.font(30))
    appQrcodeLbl.align(dxUi.Utils.ALIGN.BOTTOM_MID, 0, -403)
    appQrcodeLbl.dataI18n = 'appView.appQrcodeLbl'
}

export default appView