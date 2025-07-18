
import dxui from '../../../../../dxmodules/dxUi.js'
import std from '../../../../../dxmodules/dxStd.js'
import viewUtils from "../../../viewUtils.js"
import topView from "../../../topView.js"
import systemSettingView from '../systemSettingView.js'
import i18n from "../../../i18n.js"
import screen from '../../../../screen.js'
const passwordManagementView = {}
passwordManagementView.init = function () {
    /**************************************************创建屏幕*****************************************************/
    const screenMain = dxui.View.build('passwordManagementView', dxui.Utils.LAYER.MAIN)
    passwordManagementView.screenMain = screenMain
    screenMain.scroll(false)
    screenMain.bgColor(0xffffff)
    screenMain.on(dxui.Utils.ENUM.LV_EVENT_SCREEN_LOADED, () => {
        topView.changeTheme(true)
    })

    const titleBox = viewUtils.title(screenMain, systemSettingView.screenMain, 'passwordManagementViewTitle', 'systemSettingView.passwordManagement')
    titleBox.align(dxui.Utils.ALIGN.TOP_MID, 0, 70)

    passwordManagementView.info = [
        {
            title: "systemSettingView.inputOriginalPassword",
            type: 'input',
        },
        {
            title: "systemSettingView.inputNewPassword",
            type: 'input',
        },
        {
            title: "systemSettingView.inputRepeatNewPassword",
            type: 'input',
        }
    ]

    const passwordManagementBox = dxui.View.build('passwordManagementBox', screenMain)
    viewUtils._clearStyle(passwordManagementBox)
    passwordManagementBox.align(dxui.Utils.ALIGN.TOP_MID, 0, 140)
    passwordManagementBox.setSize(600, 300)
    passwordManagementBox.bgOpa(0)
    passwordManagementBox.flexFlow(dxui.Utils.FLEX_FLOW.ROW_WRAP)
    passwordManagementBox.flexAlign(dxui.Utils.FLEX_ALIGN.CENTER, dxui.Utils.FLEX_ALIGN.START, dxui.Utils.FLEX_ALIGN.START)
    passwordManagementBox.obj.lvObjSetStylePadGap(0, dxui.Utils.ENUM._LV_STYLE_STATE_CMP_SAME)
    passwordManagementBox.borderWidth(1)
    passwordManagementBox.setBorderColor(0xDEDEDE)
    passwordManagementBox.obj.setStyleBorderSide(dxui.Utils.ENUM.LV_BORDER_SIDE_TOP, 0)

    passwordManagementView.info.forEach(item => {
        const itemBox = dxui.View.build(item.title, passwordManagementBox)
        viewUtils._clearStyle(itemBox)
        itemBox.setSize(560, 76)
        itemBox.borderWidth(1)
        itemBox.setBorderColor(0xDEDEDE)
        itemBox.obj.setStyleBorderSide(dxui.Utils.ENUM.LV_BORDER_SIDE_BOTTOM, 0)

        const itemLabel = dxui.Label.build(item.title + 'Label', itemBox)
        itemLabel.dataI18n = item.title
        itemLabel.align(dxui.Utils.ALIGN.LEFT_MID, 0, 0)
        itemLabel.textFont(viewUtils.font(26))
        itemLabel.width(260)
        itemLabel.longMode(dxui.Utils.LABEL_LONG_MODE.SCROLL_CIRCULAR)

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
                input.setSize(280, 55)
                item.input = input
                break;
        }
    })


    const saveBtn = viewUtils.bottomBtn(screenMain, screenMain.id + 'saveBtn', 'systemSettingView.save', () => {
        const configAll = screen.getConfig()
        if (configAll['base.password'] != passwordManagementView.info[0].input.text()) {
            passwordManagementView.statusPanel.fail()
            return
        }

        if (passwordManagementView.info[1].input.text() != passwordManagementView.info[2].input.text()) {
            passwordManagementView.statusPanel.fail()
            return
        }

        const saveConfigData = {
            base: {
                password: passwordManagementView.info[2].input.text(),
            }
        }

        const res = screen.saveConfig(saveConfigData)
        if (res === true) {
            passwordManagementView.statusPanel.success()
            std.setTimeout(() => {
                // 成功返回上一层界面
                dxui.loadMain(systemSettingView.screenMain)
            }, 500)
        } else {
            passwordManagementView.statusPanel.fail()
        }
    })
    saveBtn.align(dxui.Utils.ALIGN.BOTTOM_MID, 0, -83)
    passwordManagementView.statusPanel = viewUtils.statusPanel(screenMain, 'systemSettingView.success', 'systemSettingView.fail')
}

export default passwordManagementView
