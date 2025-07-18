import dxui from '../../../../../dxmodules/dxUi.js'
import std from '../../../../../dxmodules/dxStd.js'
import viewUtils from "../../../viewUtils.js"
import topView from "../../../topView.js"
import i18n from "../../../i18n.js"
import systemSettingView from '../systemSettingView.js'
import screen from '../../../../screen.js'
const passwordOpenDoorSettingView = {}
passwordOpenDoorSettingView.init = function () {
    /**************************************************创建屏幕*****************************************************/
    const screenMain = dxui.View.build('passwordOpenDoorSettingView', dxui.Utils.LAYER.MAIN)
    passwordOpenDoorSettingView.screenMain = screenMain
    screenMain.scroll(false)
    screenMain.bgColor(0xffffff)
    screenMain.on(dxui.Utils.ENUM.LV_EVENT_SCREEN_LOADED, () => {
        topView.changeTheme(true)

        const configAll = screen.getConfig()
        passwordOpenDoorSettingView.info[0].switch.select(configAll['sys.pwd'] == 1)
    })

    const titleBox = viewUtils.title(screenMain, systemSettingView.screenMain, 'passwordOpenDoorSettingViewTitle', 'systemSettingView.passwordOpenDoorSetting')
    titleBox.align(dxui.Utils.ALIGN.TOP_MID, 0, 70)

    passwordOpenDoorSettingView.info = [
        {
            title: "systemSettingView.passwordOpenDoor",
            type: 'switch',
        }
    ]

    const passwordOpenDoorSettingBox = dxui.View.build('passwordOpenDoorSettingBox', screenMain)
    viewUtils._clearStyle(passwordOpenDoorSettingBox)
    passwordOpenDoorSettingBox.align(dxui.Utils.ALIGN.TOP_MID, 0, 140)
    passwordOpenDoorSettingBox.setSize(600, 600)
    passwordOpenDoorSettingBox.bgOpa(0)
    passwordOpenDoorSettingBox.flexFlow(dxui.Utils.FLEX_FLOW.ROW_WRAP)
    passwordOpenDoorSettingBox.flexAlign(dxui.Utils.FLEX_ALIGN.CENTER, dxui.Utils.FLEX_ALIGN.START, dxui.Utils.FLEX_ALIGN.START)
    passwordOpenDoorSettingBox.obj.lvObjSetStylePadGap(0, dxui.Utils.ENUM._LV_STYLE_STATE_CMP_SAME)
    passwordOpenDoorSettingBox.borderWidth(1)
    passwordOpenDoorSettingBox.setBorderColor(0xDEDEDE)
    passwordOpenDoorSettingBox.obj.setStyleBorderSide(dxui.Utils.ENUM.LV_BORDER_SIDE_TOP, 0)

    passwordOpenDoorSettingView.info.forEach(item => {
        const itemBox = dxui.View.build(item.title, passwordOpenDoorSettingBox)
        viewUtils._clearStyle(itemBox)
        itemBox.setSize(560, 76)
        itemBox.borderWidth(1)
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
            case 'switch':
                const __switch = dxui.Switch.build(item.title + 'switch', itemBox)
                __switch.align(dxui.Utils.ALIGN.RIGHT_MID, 0, 0)
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
                // 成功返回上一层界面
                dxui.loadMain(systemSettingView.screenMain)
            }, 500)
        } else {
            passwordOpenDoorSettingView.statusPanel.fail()
        }
    })
    saveBtn.align(dxui.Utils.ALIGN.BOTTOM_MID, 0, -83)

    passwordOpenDoorSettingView.statusPanel = viewUtils.statusPanel(screenMain, 'systemSettingView.success', 'systemSettingView.fail')
}

export default passwordOpenDoorSettingView
