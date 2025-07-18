import dxui from '../../../../dxmodules/dxUi.js'
import viewUtils from "../../viewUtils.js"
import topView from "../../topView.js"
import configView from '../configView.js'
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
    titleBox.align(dxui.Utils.ALIGN.TOP_MID, 0, 70)

    const inputBox = viewUtils.input(screenMain, 'cloudCertViewInput', undefined, () => {
        console.log('cloudCertViewInput')
    }, 'cloudCertView.inputKey')
    inputBox.align(dxui.Utils.ALIGN.TOP_LEFT, 109, 179)
    inputBox.width(654)

    const keyLbl = dxui.Label.build('cloudCertViewKey', screenMain)
    keyLbl.dataI18n = 'cloudCertView.key'
    keyLbl.textFont(viewUtils.font(26))
    keyLbl.align(dxui.Utils.ALIGN.TOP_LEFT, 43, 201)

    const tipLbl = dxui.Label.build('cloudCertViewTip', screenMain)
    tipLbl.dataI18n = 'cloudCertView.tip'
    tipLbl.textFont(viewUtils.font(22))
    tipLbl.textColor(0x888888)
    tipLbl.align(dxui.Utils.ALIGN.TOP_MID, 0, 650)


    const saveBtn = viewUtils.bottomBtn(screenMain, screenMain.id + 'saveBtn', 'cloudCertView.save', () => {
    })
    saveBtn.align(dxui.Utils.ALIGN.BOTTOM_MID, 0, -83)
}

export default cloudCertView 
