import dxUi from '../../../../dxmodules/dxUi.js'
import viewUtils from "../../viewUtils.js"
import topView from "../../topView.js"
import configView from '../configView.js'
import systemInfoView from './deviceInfo/systemInfoView.js'
import dataCapacityInfoView from './deviceInfo/dataCapacityInfoView.js'
import i18n from "../../i18n.js"
import screen from '../../../screen.js'

const deviceInfoView = {}
deviceInfoView.init = function () {
    /************************************************** Create Screen *****************************************************/
    const screenMain = dxUi.View.build('deviceInfoView', dxUi.Utils.LAYER.MAIN)
    deviceInfoView.screenMain = screenMain
    screenMain.scroll(false)
    screenMain.bgColor(0xffffff)
    screenMain.on(dxUi.Utils.ENUM.LV_EVENT_SCREEN_LOADED, () => {
        topView.changeTheme(true)
        let config = screen.getConfig()
        dxUi.Utils.GG.NativeBasicComponent.lvQrcodeUpdate(deviceInfoView.sysInfo[2].qrcodeObj, config["sys.sn"])
        deviceInfoView.qrcodeImage.source('/app/code/resource/image/app_qrcode.png')
    })

    const titleBox = viewUtils.title(screenMain, configView.screenMain, 'deviceInfoViewTitle', 'deviceInfoView.title')
    titleBox.align(dxUi.Utils.ALIGN.TOP_MID, 0, 70)

    deviceInfoView.sysInfo = [
        {
            title: 'deviceInfoView.systemInfo',
            type: 'menu',
            view: systemInfoView,
            obj: null,
        },
        {
            title: 'deviceInfoView.dataCapacityInfo',
            type: 'menu',
            view: dataCapacityInfoView,
            obj: null,
        },
        {
            title: 'deviceInfoView.deviceQrCode',
            value: '123',
            type: 'qrcode',
            obj: null,
        },
        {
            title: 'deviceInfoView.miniProgramCode',
            value: '123',
            type: 'qrcode',
            obj: null,
        },
    ]


    const deviceInfoBox = dxUi.View.build('deviceInfoBox', screenMain)
    viewUtils._clearStyle(deviceInfoBox)
    deviceInfoBox.setSize(screen.screenSize.width, screen.screenSize.height - 140)
    deviceInfoBox.align(dxUi.Utils.ALIGN.TOP_MID, 0, 140)
    deviceInfoBox.bgColor(0xf7f7f7)
    deviceInfoBox.flexFlow(dxUi.Utils.FLEX_FLOW.ROW_WRAP)
    deviceInfoBox.flexAlign(dxUi.Utils.FLEX_ALIGN.CENTER, dxUi.Utils.FLEX_ALIGN.START, dxUi.Utils.FLEX_ALIGN.START)
    deviceInfoBox.obj.lvObjSetStylePadGap(10, dxUi.Utils.ENUM._LV_STYLE_STATE_CMP_SAME)
    deviceInfoBox.padTop(10)
    deviceInfoBox.padBottom(10)

    deviceInfoView.sysInfo.forEach(item => {
        item.obj = dxUi.View.build(item.title, deviceInfoBox)
        viewUtils._clearStyle(item.obj)
        item.obj.setSize(760, 76)
        item.obj.bgColor(0xffffff)
        item.obj.radius(10)
        item.obj.on(dxUi.Utils.ENUM.LV_EVENT_PRESSED, () => {
            item.obj.bgColor(0xEAEAEA)
        })
        item.obj.on(dxUi.Utils.ENUM.LV_EVENT_RELEASED, () => {
            item.obj.bgColor(0xffffff)
        })

        const titleLbl = dxUi.Label.build(item.title + 'Label', item.obj)
        titleLbl.dataI18n = item.title
        titleLbl.align(dxUi.Utils.ALIGN.LEFT_MID, 20, 0)
        titleLbl.textFont(viewUtils.font(26))

        switch (item.type) {
            case 'menu':
                const image = dxUi.Image.build(item.title + 'Image', item.obj)
                image.align(dxUi.Utils.ALIGN.RIGHT_MID, -15, 0)
                image.source('/app/code/resource/image/right.png')
                item.obj.on(dxUi.Utils.EVENT.CLICK, () => {
                    dxUi.loadMain(item.view.screenMain)
                })
                break
            case 'qrcode':
                item.obj.height(350)
                if (item.title == "deviceInfoView.miniProgramCode") {
                    const qrcodeImage = dxUi.Image.build(item.title + 'qrcodeImage', item.obj)
                    deviceInfoView.qrcodeImage = qrcodeImage
                    qrcodeImage.source('/app/code/resource/image/app_qrcode.png')
                    qrcodeImage.obj.lvImgSetZoom(256 * 0.6)
                    qrcodeImage.obj.lvImgSetSizeMode(dxUi.Utils.ENUM.LV_IMG_SIZE_MODE_REAL)
                    qrcodeImage.align(dxUi.Utils.ALIGN.RIGHT_MID, -20, 0)
                } else {
                    const qrcodeBox = dxUi.View.build(item.title + 'QrCode', item.obj)
                    viewUtils._clearStyle(qrcodeBox)
                    qrcodeBox.setSize(220, 220)
                    qrcodeBox.align(dxUi.Utils.ALIGN.RIGHT_MID, -20, 0)
                    const qrcodeObj = dxUi.Utils.GG.NativeBasicComponent.lvQrcodeCreate(qrcodeBox.obj, 220, 0x000000, 0xffffff)
                    dxUi.Utils.GG.NativeBasicComponent.lvQrcodeUpdate(qrcodeObj, item.value)
                    item.qrcodeObj = qrcodeObj
                }
                break
        }
    })

}

export default deviceInfoView
