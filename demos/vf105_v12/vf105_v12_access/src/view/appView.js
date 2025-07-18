import dxui from '../../dxmodules/dxUi.js'
import std from '../../dxmodules/dxStd.js'
import viewUtils from "./viewUtils.js"
import topView from './topView.js'
import mainView from './mainView.js'
import i18n from './i18n.js'
const appView = {}
appView.init = function () {
    /**************************************************创建屏幕*****************************************************/
    const screenMain = dxui.View.build('appView', dxui.Utils.LAYER.MAIN)
    appView.screenMain = screenMain
    screenMain.scroll(false)
    screenMain.bgColor(0xffffff)
    screenMain.on(dxui.Utils.ENUM.LV_EVENT_SCREEN_LOADED, () => {
        topView.changeTheme(true)
        appQrcode.source('/app/code/resource/image/app_qrcode.png')
        // 无操作10秒自动返回
        if (appView.timer) {
            std.clearInterval(appView.timer)
        }
        appView.timer = std.setInterval(() => {
            let count = dxui.Utils.GG.NativeDisp.lvDispGetInactiveTime()
            if (count > 10 * 1000) {
                std.clearInterval(appView.timer)
                appView.timer = null
                dxui.loadMain(mainView.screenMain)
            }
        }, 1000)
    })

    const appQrcode = dxui.Image.build('appQrcode', screenMain)
    appQrcode.source('/app/code/resource/image/app_qrcode.png')
    appQrcode.align(dxui.Utils.ALIGN.TOP_MID, 0, 206)

    const knowedBtn = viewUtils.bottomBtn(screenMain, 'knowedBtn', 'appView.knowed', () => {
        dxui.loadMain(mainView.screenMain)
    })
    knowedBtn.align(dxui.Utils.ALIGN.BOTTOM_MID, 0, -124)

    const appQrcodeLbl = dxui.Label.build('appQrcodeLbl', screenMain)
    appQrcodeLbl.text('使用小程序便捷管理')
    appQrcodeLbl.textFont(viewUtils.font(30))
    appQrcodeLbl.align(dxui.Utils.ALIGN.BOTTOM_MID, 0, -403)
    appQrcodeLbl.dataI18n = 'appView.appQrcodeLbl'
}

export default appView