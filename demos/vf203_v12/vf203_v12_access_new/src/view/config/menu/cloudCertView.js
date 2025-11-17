import dxui from '../../../../dxmodules/dxUi.js'
import viewUtils from "../../viewUtils.js"
import topView from "../../topView.js"
import configView from '../configView.js'
import screen from '../../../screen.js'
const cloudCertView = {}
cloudCertView.init = function () {
    /**************************************************创建屏幕*****************************************************/
    const screenMain = dxui.View.build('cloudCertView', dxui.Utils.LAYER.MAIN)
    cloudCertView.screenMain = screenMain
    screenMain.scroll(false)
    screenMain.bgColor(0xffffff)
    screenMain.on(dxui.Utils.ENUM.LV_EVENT_SCREEN_LOADED, () => {
        topView.changeTheme(true)
    })

    const titleBox = viewUtils.title(screenMain, configView.screenMain, 'cloudCertViewTitle', 'cloudCertView.cloudCertActive')
    titleBox.align(dxui.Utils.ALIGN.TOP_MID, 0, screen.screenSize.height * (70 / 1024))

    const inputBox = viewUtils.input(screenMain, 'cloudCertViewInput', undefined, () => {
    }, 'cloudCertView.inputKey')
    inputBox.align(dxui.Utils.ALIGN.TOP_LEFT, screen.screenSize.width * (109 / 600), screen.screenSize.height * (179 / 1024))
    inputBox.width(screen.screenSize.width * (454 / 600))

    const keyLbl = dxui.Label.build('cloudCertViewKey', screenMain)
    keyLbl.dataI18n = 'cloudCertView.key'
    keyLbl.textFont(viewUtils.font(26))
    keyLbl.align(dxui.Utils.ALIGN.TOP_LEFT, screen.screenSize.width * (43 / 600), screen.screenSize.height * (201 / 1024))

    const tipLbl = dxui.Label.build('cloudCertViewTip', screenMain)
    tipLbl.dataI18n = 'cloudCertView.tip'
    tipLbl.textFont(viewUtils.font(22))
    tipLbl.textColor(0x888888)
    tipLbl.align(dxui.Utils.ALIGN.TOP_MID, 0, screen.screenSize.height * (650 / 1024))

    const saveBtn = viewUtils.bottomBtn(screenMain, screenMain.id + 'saveBtn', 'cloudCertView.save', () => {
        if(inputBox.text()) {
            screen.nfcIdentityCardActivation(inputBox.text())
        }

    })
    saveBtn.align(dxui.Utils.ALIGN.BOTTOM_MID, 0, -screen.screenSize.height * (40 / 1024))
}

export default cloudCertView 
