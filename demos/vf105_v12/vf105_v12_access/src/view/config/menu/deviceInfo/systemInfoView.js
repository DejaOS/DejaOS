import dxui from '../../../../../dxmodules/dxUi.js'
import viewUtils from "../../../viewUtils.js"
import topView from "../../../topView.js"
import deviceInfoView from '../deviceInfoView.js'
import i18n from "../../../i18n.js"
import screen from '../../../../screen.js'
const systemInfoView = {}
systemInfoView.init = function () {
    /**************************************************创建屏幕*****************************************************/
    const screenMain = dxui.View.build('systemInfoView', dxui.Utils.LAYER.MAIN)
    systemInfoView.screenMain = screenMain
    screenMain.scroll(false)
    screenMain.bgColor(0xffffff)
    screenMain.on(dxui.Utils.ENUM.LV_EVENT_SCREEN_LOADED, () => {
        topView.changeTheme(true)
        const config = screen.getConfig()
        systemInfoView.info[0].label.text(config["sys.sn"])
        systemInfoView.info[1].label.text(config["sys.appVersion"])
        systemInfoView.info[2].label.text(config["sys.releaseTime"])
    })

    const titleBox = viewUtils.title(screenMain, deviceInfoView.screenMain, 'systemInfoViewTitle', 'deviceInfoView.systemInfo')
    titleBox.align(dxui.Utils.ALIGN.TOP_MID, 0, 70)

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

    const settingInfoBox = dxui.View.build('settingInfoBox', screenMain)
    viewUtils._clearStyle(settingInfoBox)
    settingInfoBox.align(dxui.Utils.ALIGN.TOP_MID, 0, 140)
    settingInfoBox.setSize(screen.screenSize.width, 700)
    settingInfoBox.bgOpa(0)
    settingInfoBox.flexFlow(dxui.Utils.FLEX_FLOW.ROW_WRAP)
    settingInfoBox.flexAlign(dxui.Utils.FLEX_ALIGN.CENTER, dxui.Utils.FLEX_ALIGN.START, dxui.Utils.FLEX_ALIGN.START)
    settingInfoBox.obj.lvObjSetStylePadGap(0, dxui.Utils.ENUM._LV_STYLE_STATE_CMP_SAME)
    settingInfoBox.borderWidth(1)
    settingInfoBox.setBorderColor(0xDEDEDE)
    settingInfoBox.obj.setStyleBorderSide(dxui.Utils.ENUM.LV_BORDER_SIDE_TOP, 0)

    systemInfoView.info.forEach(item => {
        const itemBox = dxui.View.build(item.title, settingInfoBox)
        viewUtils._clearStyle(itemBox)
        itemBox.setSize(760, 76)
        itemBox.borderWidth(1)
        itemBox.setBorderColor(0xDEDEDE)
        itemBox.obj.setStyleBorderSide(dxui.Utils.ENUM.LV_BORDER_SIDE_BOTTOM, 0)

        const itemLabel = dxui.Label.build(item.title + 'Label', itemBox)
        itemLabel.dataI18n = item.title
        itemLabel.align(dxui.Utils.ALIGN.LEFT_MID, 0, 0)
        itemLabel.textFont(viewUtils.font(26))

        switch (item.type) {
            case 'label':
                const label = dxui.Label.build(item.title + 'label', itemBox)
                label.textFont(viewUtils.font(24))
                label.align(dxui.Utils.ALIGN.RIGHT_MID, 0, 0)
                label.text(item.value)
                label.textColor(0x767676)
                item.label = label
                break;
        }
    })

    const currentVersion = dxui.Label.build('deviceInfoView.currentVersion', screenMain)
    currentVersion.align(dxui.Utils.ALIGN.BOTTOM_MID, 0, -213)
    currentVersion.textFont(viewUtils.font(22))
    currentVersion.textColor(0x888888)
    currentVersion.dataI18n = 'deviceInfoView.currentVersion'
    currentVersion.textAlign(dxui.Utils.TEXT_ALIGN.CENTER, 0, 0)
    currentVersion.hide()

    const saveBtn = viewUtils.bottomBtn(screenMain, screenMain.id + 'saveBtn', 'deviceInfoView.updateDevice', () => {
    })
    saveBtn.align(dxui.Utils.ALIGN.BOTTOM_MID, 0, -83)
    saveBtn.hide()
}

export default systemInfoView
