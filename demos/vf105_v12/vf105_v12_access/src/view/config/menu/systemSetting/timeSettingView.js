import dxUi from '../../../../../dxmodules/dxUi.js'
import std from '../../../../../dxmodules/dxStd.js'
import dxMap from '../../../../../dxmodules/dxMap.js'
import viewUtils from "../../../viewUtils.js"
import topView from "../../../topView.js"
import systemSettingView from '../systemSettingView.js'
import i18n from "../../../i18n.js"
import screen from '../../../../screen.js'
const timeSettingView = {}
timeSettingView.init = function () {
    /************************************************** Create Screen *****************************************************/
    const screenMain = dxUi.View.build('timeSettingView', dxUi.Utils.LAYER.MAIN)
    timeSettingView.screenMain = screenMain
    screenMain.scroll(false)
    screenMain.bgColor(0xffffff)
    screenMain.on(dxUi.Utils.ENUM.LV_EVENT_SCREEN_LOADED, () => {
        topView.changeTheme(true)

        const configAll = screen.getConfig()
        timeSettingView.info[0].input.text(configAll['ntp.gmt'] + '')
        timeSettingView.info[1].input.text(configAll['ntp.server'] + '')

        const syncTime = dxMap.get("NTP_SYNC").get("syncTime")
        if (syncTime) {
            msgLabel.text(new Date(syncTime).toLocaleString())
        }
    })

    const titleBox = viewUtils.title(screenMain, systemSettingView.screenMain, 'timeSettingViewTitle', 'systemSettingView.timeSetting')
    titleBox.align(dxUi.Utils.ALIGN.TOP_MID, 0, 70)

    timeSettingView.info = [
        {
            title: "systemSettingView.syncMode",
            type: 'input',
        },
        {
            title: "systemSettingView.ntpAddress",
            type: 'input',
        }
    ]

    const timeSettingBox = dxUi.View.build('timeSettingBox', screenMain)
    viewUtils._clearStyle(timeSettingBox)
    timeSettingBox.align(dxUi.Utils.ALIGN.TOP_MID, 0, 140)
    timeSettingBox.setSize(screen.screenSize.width, 300)
    timeSettingBox.bgOpa(0)
    timeSettingBox.flexFlow(dxUi.Utils.FLEX_FLOW.ROW_WRAP)
    timeSettingBox.flexAlign(dxUi.Utils.FLEX_ALIGN.CENTER, dxUi.Utils.FLEX_ALIGN.START, dxUi.Utils.FLEX_ALIGN.START)
    timeSettingBox.obj.lvObjSetStylePadGap(0, dxUi.Utils.ENUM._LV_STYLE_STATE_CMP_SAME)
    timeSettingBox.borderWidth(1)
    timeSettingBox.setBorderColor(0xDEDEDE)
    timeSettingBox.obj.setStyleBorderSide(dxUi.Utils.ENUM.LV_BORDER_SIDE_TOP, 0)

    timeSettingView.info.forEach(item => {
        const itemBox = dxUi.View.build(item.title, timeSettingBox)
        viewUtils._clearStyle(itemBox)
        itemBox.setSize(760, 76)
        itemBox.borderWidth(1)
        itemBox.setBorderColor(0xDEDEDE)
        itemBox.obj.setStyleBorderSide(dxUi.Utils.ENUM.LV_BORDER_SIDE_BOTTOM, 0)

        const itemLabel = dxUi.Label.build(item.title + 'Label', itemBox)
        itemLabel.dataI18n = item.title
        itemLabel.align(dxUi.Utils.ALIGN.LEFT_MID, 0, 0)
        itemLabel.textFont(viewUtils.font(26))

        if (item.unit) {
            const unitLabel = dxUi.Label.build(item.title + 'UnitLabel', itemBox)
            unitLabel.text(item.unit)
            unitLabel.align(dxUi.Utils.ALIGN.RIGHT_MID, 0, 0)
            unitLabel.textFont(viewUtils.font(26))
        }

        switch (item.type) {
            case 'input':
                const input = viewUtils.input(itemBox, item.title + 'input', undefined, undefined, undefined)
                input.align(dxUi.Utils.ALIGN.RIGHT_MID, 0, 0)
                if (item.title == "systemSettingView.ntpAddress") {
                    input.setSize(300, 55)
                } else {
                    input.setSize(150, 55)
                }
                item.input = input
                break;
        }
    })

    const msgLabel = dxUi.Label.build('msgLabel', screenMain)
    msgLabel.align(dxUi.Utils.ALIGN.TOP_MID, 0, 662)
    msgLabel.textFont(viewUtils.font(22))
    msgLabel.text('2024/02/12 19:07')
    msgLabel.textColor(0x888888)

    const msgLabel2 = dxUi.Label.build('msgLabel2', screenMain)
    msgLabel2.align(dxUi.Utils.ALIGN.TOP_MID, 0, 690)
    msgLabel2.textFont(viewUtils.font(22))
    msgLabel2.textColor(0x888888)
    msgLabel2.dataI18n = 'systemSettingView.timeSyncSuccess'


    const saveBtn = viewUtils.bottomBtn(screenMain, screenMain.id + 'saveBtn', 'systemSettingView.save', () => {
        const saveConfigData = {
            ntp: {
                gmt: parseInt(timeSettingView.info[0].input.text()),
                server: timeSettingView.info[1].input.text(),
            }
        }
        const res = screen.saveConfig(saveConfigData)
        if (res === true) {
            timeSettingView.statusPanel.success()
            std.setTimeout(() => {
                // Success, return to previous screen
                dxUi.loadMain(systemSettingView.screenMain)
            }, 500)
        } else {
            timeSettingView.statusPanel.fail()
        }
    })
    saveBtn.align(dxUi.Utils.ALIGN.BOTTOM_MID, 0, -83)
    timeSettingView.statusPanel = viewUtils.statusPanel(screenMain, 'systemSettingView.success', 'systemSettingView.fail')
}

export default timeSettingView
