import dxui from '../../../../../dxmodules/dxUi.js'
import std from '../../../../../dxmodules/dxStd.js'
import dxMap from '../../../../../dxmodules/dxMap.js'
import viewUtils from "../../../viewUtils.js"
import topView from "../../../topView.js"
import systemSettingView from '../systemSettingView.js'
import i18n from "../../../i18n.js"
import screen from '../../../../screen.js'
const timeSettingView = {}
timeSettingView.init = function () {
    /**************************************************创建屏幕*****************************************************/
    const screenMain = dxui.View.build('timeSettingView', dxui.Utils.LAYER.MAIN)
    timeSettingView.screenMain = screenMain
    screenMain.scroll(false)
    screenMain.bgColor(0xffffff)
    screenMain.on(dxui.Utils.ENUM.LV_EVENT_SCREEN_LOADED, () => {
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
    titleBox.align(dxui.Utils.ALIGN.TOP_MID, 0, screen.screenSize.height * (70 / 1024))

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

    const timeSettingBox = dxui.View.build('timeSettingBox', screenMain)
    viewUtils._clearStyle(timeSettingBox)
    timeSettingBox.align(dxui.Utils.ALIGN.TOP_MID, 0, screen.screenSize.height * (140 / 1024))
    timeSettingBox.setSize(screen.screenSize.width * (600 / 600), screen.screenSize.height * (300 / 1024))
    timeSettingBox.bgOpa(0)
    timeSettingBox.flexFlow(dxui.Utils.FLEX_FLOW.ROW_WRAP)
    timeSettingBox.flexAlign(dxui.Utils.FLEX_ALIGN.CENTER, dxui.Utils.FLEX_ALIGN.START, dxui.Utils.FLEX_ALIGN.START)
    timeSettingBox.obj.lvObjSetStylePadGap(screen.screenSize.width * (0 / 600), dxui.Utils.ENUM._LV_STYLE_STATE_CMP_SAME)
    timeSettingBox.borderWidth(screen.screenSize.width * (1 / 600))
    timeSettingBox.setBorderColor(0xDEDEDE)
    timeSettingBox.obj.setStyleBorderSide(dxui.Utils.ENUM.LV_BORDER_SIDE_TOP, 0)

    timeSettingView.info.forEach(item => {
        const itemBox = dxui.View.build(item.title, timeSettingBox)
        viewUtils._clearStyle(itemBox)
        itemBox.setSize(screen.screenSize.width * (560 / 600), screen.screenSize.height * (76 / 1024))
        itemBox.borderWidth(screen.screenSize.width * (1 / 600))
        itemBox.setBorderColor(0xDEDEDE)
        itemBox.obj.setStyleBorderSide(dxui.Utils.ENUM.LV_BORDER_SIDE_BOTTOM, 0)

        const itemLabel = dxui.Label.build(item.title + 'Label', itemBox)
        itemLabel.dataI18n = item.title
        itemLabel.align(dxui.Utils.ALIGN.LEFT_MID, 0, 0)
        itemLabel.textFont(viewUtils.font(26))

        if (item.unit) {
            const unitLabel = dxui.Label.build(item.title + 'UnitLabel', itemBox)
            unitLabel.text(item.unit)
            unitLabel.align(dxui.Utils.ALIGN.RIGHT_MID, 0, 0)
            unitLabel.textFont(viewUtils.font(26))
        }

        switch (item.type) {
            case 'input':
                const input = viewUtils.input(itemBox, item.title + 'input', undefined, undefined, undefined)
                input.align(dxui.Utils.ALIGN.RIGHT_MID, 0, 0)
                if (item.title == "systemSettingView.ntpAddress") {
                    input.setSize(screen.screenSize.width * (300 / 600), screen.screenSize.height * (55 / 1024))
                } else {
                    input.setSize(screen.screenSize.width * (150 / 600), screen.screenSize.height * (55 / 1024))
                }
                item.input = input
                break;
        }
    })

    // const msgLabel = dxui.Label.build('msgLabel', screenMain)
    // msgLabel.align(dxui.Utils.ALIGN.TOP_MID, 0, screen.screenSize.height * (662 / 1024))
    // msgLabel.textFont(viewUtils.font(22))
    // msgLabel.text('2024/02/12 19:07')
    // msgLabel.textColor(0x888888)

    // const msgLabel2 = dxui.Label.build('msgLabel2', screenMain)
    // msgLabel2.align(dxui.Utils.ALIGN.TOP_MID, 0, screen.screenSize.height * (690 / 1024))
    // msgLabel2.textFont(viewUtils.font(22))
    // msgLabel2.textColor(0x888888)
    // msgLabel2.dataI18n = 'systemSettingView.timeSyncSuccess'


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
                // 成功返回上一层界面
                dxui.loadMain(systemSettingView.screenMain)
            }, 500)
        } else {
            timeSettingView.statusPanel.fail()
        }
    })
    saveBtn.align(dxui.Utils.ALIGN.BOTTOM_MID, 0, -screen.screenSize.height * (40 / 1024))
    timeSettingView.statusPanel = viewUtils.statusPanel(screenMain, 'systemSettingView.success', 'systemSettingView.fail')
}

export default timeSettingView
