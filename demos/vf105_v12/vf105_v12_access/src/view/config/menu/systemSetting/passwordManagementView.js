
import dxUi from '../../../../../dxmodules/dxUi.js'
import std from '../../../../../dxmodules/dxStd.js'
import viewUtils from "../../../viewUtils.js"
import topView from "../../../topView.js"
import systemSettingView from '../systemSettingView.js'
import i18n from "../../../i18n.js"
import screen from '../../../../screen.js'
const passwordManagementView = {}
passwordManagementView.init = function () {
    /************************************************** Create Screen *****************************************************/
    const screenMain = dxUi.View.build('passwordManagementView', dxUi.Utils.LAYER.MAIN)
    passwordManagementView.screenMain = screenMain
    screenMain.scroll(false)
    screenMain.bgColor(0xffffff)
    screenMain.on(dxUi.Utils.ENUM.LV_EVENT_SCREEN_LOADED, () => {
        topView.changeTheme(true)
    })

    const titleBox = viewUtils.title(screenMain, systemSettingView.screenMain, 'passwordManagementViewTitle', 'systemSettingView.passwordManagement')
    titleBox.align(dxUi.Utils.ALIGN.TOP_MID, 0, 70)

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

    const passwordManagementBox = dxUi.View.build('passwordManagementBox', screenMain)
    viewUtils._clearStyle(passwordManagementBox)
    passwordManagementBox.align(dxUi.Utils.ALIGN.TOP_MID, 0, 140)
    passwordManagementBox.setSize(screen.screenSize.width, 300)
    passwordManagementBox.bgOpa(0)
    passwordManagementBox.flexFlow(dxUi.Utils.FLEX_FLOW.ROW_WRAP)
    passwordManagementBox.flexAlign(dxUi.Utils.FLEX_ALIGN.CENTER, dxUi.Utils.FLEX_ALIGN.START, dxUi.Utils.FLEX_ALIGN.START)
    passwordManagementBox.obj.lvObjSetStylePadGap(0, dxUi.Utils.ENUM._LV_STYLE_STATE_CMP_SAME)
    passwordManagementBox.borderWidth(1)
    passwordManagementBox.setBorderColor(0xDEDEDE)
    passwordManagementBox.obj.setStyleBorderSide(dxUi.Utils.ENUM.LV_BORDER_SIDE_TOP, 0)

    passwordManagementView.info.forEach(item => {
        const itemBox = dxUi.View.build(item.title, passwordManagementBox)
        viewUtils._clearStyle(itemBox)
        itemBox.setSize(760, 76)
        itemBox.borderWidth(1)
        itemBox.setBorderColor(0xDEDEDE)
        itemBox.obj.setStyleBorderSide(dxUi.Utils.ENUM.LV_BORDER_SIDE_BOTTOM, 0)

        const itemLabel = dxUi.Label.build(item.title + 'Label', itemBox)
        itemLabel.dataI18n = item.title
        itemLabel.align(dxUi.Utils.ALIGN.LEFT_MID, 0, 0)
        itemLabel.textFont(viewUtils.font(26))
        itemLabel.width(300)
        itemLabel.longMode(dxUi.Utils.LABEL_LONG_MODE.SCROLL_CIRCULAR)

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
                // Success, return to previous screen
                dxUi.loadMain(systemSettingView.screenMain)
            }, 500)
        } else {
            passwordManagementView.statusPanel.fail()
        }
    })
    saveBtn.align(dxUi.Utils.ALIGN.BOTTOM_MID, 0, -83)
    passwordManagementView.statusPanel = viewUtils.statusPanel(screenMain, 'systemSettingView.success', 'systemSettingView.fail')
}

export default passwordManagementView
