import dxUi from '../../../../dxmodules/dxUi.js'
import viewUtils from "../../viewUtils.js"
import topView from "../../topView.js"
import configView from '../configView.js'
import i18n from "../../i18n.js"
const helpView = {}
helpView.init = function () {
    /************************************************** Create Screen *****************************************************/
    const screenMain = dxUi.View.build('helpView', dxUi.Utils.LAYER.MAIN)
    helpView.screenMain = screenMain
    screenMain.scroll(false)
    screenMain.bgColor(0xffffff)
    screenMain.on(dxUi.Utils.ENUM.LV_EVENT_SCREEN_LOADED, () => {
        topView.changeTheme(true)
    })

    const titleBox = viewUtils.title(screenMain, configView.screenMain, 'helpViewTitle', 'helpView.title')
    titleBox.align(dxUi.Utils.ALIGN.TOP_MID, 0, 70)

    // QR code
    const helpQrcode = dxUi.View.build('helpQrcode', screenMain)
    viewUtils._clearStyle(helpQrcode)
    helpQrcode.setSize(344, 344)
    helpQrcode.align(dxUi.Utils.ALIGN.TOP_MID, 0, 170)
    helpQrcode.bgOpa(0)

    const qrcode = dxUi.View.build(helpQrcode.id + 'qrcode', helpQrcode)
    viewUtils._clearStyle(qrcode)
    qrcode.setSize(320, 320)
    qrcode.align(dxUi.Utils.ALIGN.CENTER, 0, 0);
    const qrcodeObj = dxUi.Utils.GG.NativeBasicComponent.lvQrcodeCreate(qrcode.obj, 320, 0x000000, 0xffffff)
    dxUi.Utils.GG.NativeBasicComponent.lvQrcodeUpdate(qrcodeObj, 'WeChat does not currently support displaying text content in QR codes')


    const helpLabel = dxUi.Label.build('helpLabel', screenMain)
    helpLabel.dataI18n='helpView.scanCode'
    helpLabel.align(dxUi.Utils.ALIGN.TOP_MID, 0, 541)
    helpLabel.textFont(viewUtils.font(26))
}

export default helpView
