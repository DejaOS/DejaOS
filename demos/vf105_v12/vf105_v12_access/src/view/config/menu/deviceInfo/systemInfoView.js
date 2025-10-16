import dxUi from '../../../../../dxmodules/dxUi.js'
import viewUtils from "../../../viewUtils.js"
import topView from "../../../topView.js"
import deviceInfoView from '../deviceInfoView.js'
import i18n from "../../../i18n.js"
import screen from '../../../../screen.js'
const systemInfoView = {}
systemInfoView.init = function () {
    /************************************************** Create Screen *****************************************************/
    const screenMain = dxUi.View.build('systemInfoView', dxUi.Utils.LAYER.MAIN)
    systemInfoView.screenMain = screenMain
    screenMain.scroll(false)
    screenMain.bgColor(0xffffff)
    screenMain.on(dxUi.Utils.ENUM.LV_EVENT_SCREEN_LOADED, () => {
        topView.changeTheme(true)
        const config = screen.getConfig()
        systemInfoView.info[0].label.text(config["sys.sn"])
        systemInfoView.info[1].label.text(config["sys.appVersion"])
        systemInfoView.info[2].label.text(config["sys.releaseTime"])
    })

    const titleBox = viewUtils.title(screenMain, deviceInfoView.screenMain, 'systemInfoViewTitle', 'deviceInfoView.systemInfo')
    titleBox.align(dxUi.Utils.ALIGN.TOP_MID, 0, 70)

    systemInfoView.info = [
        {
            title: "deviceInfoView.deviceSN",
            type: 'label',
            value: 'G2440288881',
        },
        {
            title: "deviceInfoView.firmwareVersion",
            type: 'label',
            value: 'VF203-v1.1.36.3a885-240611',
        },
        {
            title: "deviceInfoView.firmwareReleaseDate",
            type: 'label',
            value: '2024-06-11 18:00:00',
        },
    ]

    const settingInfoBox = dxUi.View.build('settingInfoBox', screenMain)
    viewUtils._clearStyle(settingInfoBox)
    settingInfoBox.align(dxUi.Utils.ALIGN.TOP_MID, 0, 140)
    settingInfoBox.setSize(screen.screenSize.width, 700)
    settingInfoBox.bgOpa(0)
    settingInfoBox.flexFlow(dxUi.Utils.FLEX_FLOW.ROW_WRAP)
    settingInfoBox.flexAlign(dxUi.Utils.FLEX_ALIGN.CENTER, dxUi.Utils.FLEX_ALIGN.START, dxUi.Utils.FLEX_ALIGN.START)
    settingInfoBox.obj.lvObjSetStylePadGap(0, dxUi.Utils.ENUM._LV_STYLE_STATE_CMP_SAME)
    settingInfoBox.borderWidth(1)
    settingInfoBox.setBorderColor(0xDEDEDE)
    settingInfoBox.obj.setStyleBorderSide(dxUi.Utils.ENUM.LV_BORDER_SIDE_TOP, 0)

    systemInfoView.info.forEach(item => {
        const itemBox = dxUi.View.build(item.title, settingInfoBox)
        viewUtils._clearStyle(itemBox)
        itemBox.setSize(760, 76)
        itemBox.borderWidth(1)
        itemBox.setBorderColor(0xDEDEDE)
        itemBox.obj.setStyleBorderSide(dxUi.Utils.ENUM.LV_BORDER_SIDE_BOTTOM, 0)

        const itemLabel = dxUi.Label.build(item.title + 'Label', itemBox)
        itemLabel.dataI18n = item.title
        itemLabel.align(dxUi.Utils.ALIGN.LEFT_MID, 0, 0)
        itemLabel.textFont(viewUtils.font(26))

        switch (item.type) {
            case 'label':
                const label = dxUi.Label.build(item.title + 'label', itemBox)
                label.textFont(viewUtils.font(24))
                label.align(dxUi.Utils.ALIGN.RIGHT_MID, 0, 0)
                label.text(item.value)
                label.textColor(0x767676)
                item.label = label
                break;
        }
    })

    const currentVersion = dxUi.Label.build('deviceInfoView.currentVersion', screenMain)
    currentVersion.align(dxUi.Utils.ALIGN.BOTTOM_MID, 0, -213)
    currentVersion.textFont(viewUtils.font(22))
    currentVersion.textColor(0x888888)
    currentVersion.dataI18n = 'deviceInfoView.currentVersion'
    currentVersion.textAlign(dxUi.Utils.TEXT_ALIGN.CENTER, 0, 0)
    currentVersion.hide()

    const saveBtn = viewUtils.bottomBtn(screenMain, screenMain.id + 'saveBtn', 'deviceInfoView.updateDevice', () => {
    })
    saveBtn.align(dxUi.Utils.ALIGN.BOTTOM_MID, 0, -83)
    saveBtn.hide()
}

export default systemInfoView
