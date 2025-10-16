import dxUi from '../../../../../dxmodules/dxUi.js'
import std from '../../../../../dxmodules/dxStd.js'
import viewUtils from "../../../viewUtils.js"
import topView from "../../../topView.js"
import i18n from "../../../i18n.js"
import systemSettingView from '../systemSettingView.js'
import screen from '../../../../screen.js'
const passwordOpenDoorSettingView = {}
passwordOpenDoorSettingView.init = function () {
    /************************************************** Create Screen *****************************************************/
    const screenMain = dxUi.View.build('passwordOpenDoorSettingView', dxUi.Utils.LAYER.MAIN)
    passwordOpenDoorSettingView.screenMain = screenMain
    screenMain.scroll(false)
    screenMain.bgColor(0xffffff)
    screenMain.on(dxUi.Utils.ENUM.LV_EVENT_SCREEN_LOADED, () => {
        topView.changeTheme(true)

        const configAll = screen.getConfig()
        passwordOpenDoorSettingView.info[0].switch.select(configAll['sys.pwd'] == 1)
    })

    const titleBox = viewUtils.title(screenMain, systemSettingView.screenMain, 'passwordOpenDoorSettingViewTitle', 'systemSettingView.passwordOpenDoorSetting')
    titleBox.align(dxUi.Utils.ALIGN.TOP_MID, 0, 70)

    passwordOpenDoorSettingView.info = [
        {
            title: "systemSettingView.passwordOpenDoor",
            type: 'switch',
        }
    ]

    const passwordOpenDoorSettingBox = dxUi.View.build('passwordOpenDoorSettingBox', screenMain)
    viewUtils._clearStyle(passwordOpenDoorSettingBox)
    passwordOpenDoorSettingBox.align(dxUi.Utils.ALIGN.TOP_MID, 0, 140)
    passwordOpenDoorSettingBox.setSize(screen.screenSize.width, 600)
    passwordOpenDoorSettingBox.bgOpa(0)
    passwordOpenDoorSettingBox.flexFlow(dxUi.Utils.FLEX_FLOW.ROW_WRAP)
    passwordOpenDoorSettingBox.flexAlign(dxUi.Utils.FLEX_ALIGN.CENTER, dxUi.Utils.FLEX_ALIGN.START, dxUi.Utils.FLEX_ALIGN.START)
    passwordOpenDoorSettingBox.obj.lvObjSetStylePadGap(0, dxUi.Utils.ENUM._LV_STYLE_STATE_CMP_SAME)
    passwordOpenDoorSettingBox.borderWidth(1)
    passwordOpenDoorSettingBox.setBorderColor(0xDEDEDE)
    passwordOpenDoorSettingBox.obj.setStyleBorderSide(dxUi.Utils.ENUM.LV_BORDER_SIDE_TOP, 0)

    passwordOpenDoorSettingView.info.forEach(item => {
        const itemBox = dxUi.View.build(item.title, passwordOpenDoorSettingBox)
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
            case 'switch':
                const __switch = dxUi.Switch.build(item.title + 'switch', itemBox)
                __switch.align(dxUi.Utils.ALIGN.RIGHT_MID, 0, 0)
                __switch.setSize(70, 35)
                item.switch = __switch
                break;
        }
    })

    const saveBtn = viewUtils.bottomBtn(screenMain, screenMain.id + 'saveBtn', 'systemSettingView.save', () => {
        const saveConfigData = {
            sys: {
                pwd: passwordOpenDoorSettingView.info[0].switch.isSelect() ? 1 : 0,
            }
        }
        const res = screen.saveConfig(saveConfigData)
        if (res === true) {
            passwordOpenDoorSettingView.statusPanel.success()
            std.setTimeout(() => {
                // Success, return to previous screen
                dxUi.loadMain(systemSettingView.screenMain)
            }, 500)
        } else {
            passwordOpenDoorSettingView.statusPanel.fail()
        }
    })
    saveBtn.align(dxUi.Utils.ALIGN.BOTTOM_MID, 0, -83)

    passwordOpenDoorSettingView.statusPanel = viewUtils.statusPanel(screenMain, 'systemSettingView.success', 'systemSettingView.fail')
}

export default passwordOpenDoorSettingView
