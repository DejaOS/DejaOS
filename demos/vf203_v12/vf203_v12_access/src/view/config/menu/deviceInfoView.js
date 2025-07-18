import dxui from '../../../../dxmodules/dxUi.js'
import config from '../../../../dxmodules/dxConfig.js'
import viewUtils from "../../viewUtils.js"
import topView from "../../topView.js"
import configView from '../configView.js'
import systemInfoView from './deviceInfo/systemInfoView.js'
import dataCapacityInfoView from './deviceInfo/dataCapacityInfoView.js'
import i18n from "../../i18n.js"
import screen from '../../../screen.js'

const deviceInfoView = {}
deviceInfoView.init = function () {
    /**************************************************创建屏幕*****************************************************/
    const screenMain = dxui.View.build('deviceInfoView', dxui.Utils.LAYER.MAIN)
    deviceInfoView.screenMain = screenMain
    screenMain.scroll(false)
    screenMain.bgColor(0xffffff)
    screenMain.on(dxui.Utils.ENUM.LV_EVENT_SCREEN_LOADED, () => {
        topView.changeTheme(true)

        let config = screen.getConfig()
        dxui.Utils.GG.NativeBasicComponent.lvQrcodeUpdate(deviceInfoView.sysInfo[2].qrcodeObj, config["sys.sn"])
        deviceInfoView.qrcodeImage.source('/app/code/resource/image/app_qrcode.png')
    })

    const titleBox = viewUtils.title(screenMain, configView.screenMain, 'deviceInfoViewTitle', 'deviceInfoView.title')
    titleBox.align(dxui.Utils.ALIGN.TOP_MID, 0, 70)

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


    const deviceInfoBox = dxui.View.build('deviceInfoBox', screenMain)
    viewUtils._clearStyle(deviceInfoBox)
    deviceInfoBox.setSize(screen.screenSize.width, screen.screenSize.height - 140)
    deviceInfoBox.align(dxui.Utils.ALIGN.TOP_MID, 0, 140)
    deviceInfoBox.bgColor(0xf7f7f7)
    deviceInfoBox.flexFlow(dxui.Utils.FLEX_FLOW.ROW_WRAP)
    deviceInfoBox.flexAlign(dxui.Utils.FLEX_ALIGN.CENTER, dxui.Utils.FLEX_ALIGN.START, dxui.Utils.FLEX_ALIGN.START)
    deviceInfoBox.obj.lvObjSetStylePadGap(10, dxui.Utils.ENUM._LV_STYLE_STATE_CMP_SAME)
    deviceInfoBox.padTop(10)
    deviceInfoBox.padBottom(10)

    deviceInfoView.sysInfo.forEach(item => {

        item.obj = dxui.View.build(item.title, deviceInfoBox)
        viewUtils._clearStyle(item.obj)
        item.obj.setSize(560, 76)
        item.obj.bgColor(0xffffff)
        item.obj.radius(10)
        item.obj.on(dxui.Utils.ENUM.LV_EVENT_PRESSED, () => {
            item.obj.bgColor(0xEAEAEA)
        })
        item.obj.on(dxui.Utils.ENUM.LV_EVENT_RELEASED, () => {
            item.obj.bgColor(0xffffff)
        })

        const titleLbl = dxui.Label.build(item.title + 'Label', item.obj)
        titleLbl.dataI18n = item.title
        titleLbl.align(dxui.Utils.ALIGN.LEFT_MID, 20, 0)
        titleLbl.textFont(viewUtils.font(26))

        switch (item.type) {
            case 'menu':
                const image = dxui.Image.build(item.title + 'Image', item.obj)
                image.align(dxui.Utils.ALIGN.RIGHT_MID, -15, 0)
                image.source('/app/code/resource/image/right.png')
                item.obj.on(dxui.Utils.EVENT.CLICK, () => {
                    dxui.loadMain(item.view.screenMain)
                })
                break
            case 'qrcode':
                item.obj.height(270)

                if (item.title == "deviceInfoView.miniProgramCode") {
                    const qrcodeImage = dxui.Image.build(item.title + 'qrcodeImage', item.obj)
                    deviceInfoView.qrcodeImage = qrcodeImage
                    qrcodeImage.source('/app/code/resource/image/app_qrcode.png')
                    qrcodeImage.obj.lvImgSetZoom(256 * 0.6)
                    qrcodeImage.obj.lvImgSetSizeMode(dxui.Utils.ENUM.LV_IMG_SIZE_MODE_REAL)

                    // qrcodeImage.setSize(170, 170)
                    qrcodeImage.align(dxui.Utils.ALIGN.RIGHT_MID, -20, 0)

                } else {
                    const qrcodeBox = dxui.View.build(item.title + 'QrCode', item.obj)
                    viewUtils._clearStyle(qrcodeBox)
                    qrcodeBox.setSize(170, 170)
                    qrcodeBox.align(dxui.Utils.ALIGN.RIGHT_MID, -20, 0)

                    const qrcodeObj = dxui.Utils.GG.NativeBasicComponent.lvQrcodeCreate(qrcodeBox.obj, 160, 0x000000, 0xffffff)
                    dxui.Utils.GG.NativeBasicComponent.lvQrcodeUpdate(qrcodeObj, item.value)
                    item.qrcodeObj = qrcodeObj
                }
                break
        }
    })

}

deviceInfoView.refresh = function () {
    deviceInfoView.sysInfo.forEach(item => {
        // 如果配置中不显示小程序二维码，则隐藏
        if (!config.get("base.showProgramCode") && item.title == "deviceInfoView.miniProgramCode") {
            item.obj.hide()
        }else{
            item.obj.show()
        }
    })
}

export default deviceInfoView
