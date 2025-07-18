import dxui from '../../../../../dxmodules/dxUi.js'
import std from '../../../../../dxmodules/dxStd.js'
import viewUtils from "../../../viewUtils.js"
import topView from "../../../topView.js"
import i18n from "../../../i18n.js"
import systemSettingView from '../systemSettingView.js'
import screen from '../../../../screen.js'
const passLogSettingView = {}
passLogSettingView.init = function () {
    /**************************************************创建屏幕*****************************************************/
    const screenMain = dxui.View.build('passLogSettingView', dxui.Utils.LAYER.MAIN)
    passLogSettingView.screenMain = screenMain
    screenMain.scroll(false)
    screenMain.bgColor(0xffffff)
    screenMain.on(dxui.Utils.ENUM.LV_EVENT_SCREEN_LOADED, () => {
        topView.changeTheme(true)

        // passLogSettingView.info[0].value = [i18n.t('systemSettingView.fullView'), i18n.t('systemSettingView.face')]
        // passLogSettingView.info[0].dropdown.setOptions(passLogSettingView.info[0].value)

        const configAll = screen.getConfig()
        // passLogSettingView.info[0].dropdown.setSelected(configAll['sys.accessImageType'])
        passLogSettingView.info[0].switch.select(configAll['sys.strangerImage'] == 1)
    })

    const titleBox = viewUtils.title(screenMain, systemSettingView.screenMain, 'passLogSettingViewTitle', 'systemSettingView.passLogSetting')
    titleBox.align(dxui.Utils.ALIGN.TOP_MID, 0, 70)

    passLogSettingView.info = [
        // {
        //     title: "systemSettingView.imageSaveType",
        //     type: 'dropdown',
        //     value: [i18n.t('systemSettingView.fullView'), i18n.t('systemSettingView.face')],
        //     dropdown: null
        // },
        {
            title: "systemSettingView.saveStrangerImage",
            type: 'switch',
        },
    ]

    const passSettingBox = dxui.View.build('passSettingBox', screenMain)
    viewUtils._clearStyle(passSettingBox)
    passSettingBox.align(dxui.Utils.ALIGN.TOP_MID, 0, 140)
    passSettingBox.setSize(600, 600)
    passSettingBox.bgOpa(0)
    passSettingBox.flexFlow(dxui.Utils.FLEX_FLOW.ROW_WRAP)
    passSettingBox.flexAlign(dxui.Utils.FLEX_ALIGN.CENTER, dxui.Utils.FLEX_ALIGN.START, dxui.Utils.FLEX_ALIGN.START)
    passSettingBox.obj.lvObjSetStylePadGap(0, dxui.Utils.ENUM._LV_STYLE_STATE_CMP_SAME)
    passSettingBox.borderWidth(1)
    passSettingBox.setBorderColor(0xDEDEDE)
    passSettingBox.obj.setStyleBorderSide(dxui.Utils.ENUM.LV_BORDER_SIDE_TOP, 0)

    passLogSettingView.info.forEach(item => {
        const itemBox = dxui.View.build(item.title, passSettingBox)
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
            case 'dropdown':
                const dropdown = dxui.Dropdown.build(item.title + 'dropdown', itemBox)
                dropdown.align(dxui.Utils.ALIGN.RIGHT_MID, 0, 0)
                dropdown.setSize(200, 60)
                dropdown.textFont(viewUtils.font(26))
                dropdown.getList().textFont(viewUtils.font(26))
                dropdown.setSymbol('/app/code/resource/image/down.png')
                dropdown.setOptions(item.value)
                item.dropdown = dropdown
                break;
        }
    })

    const saveBtn = viewUtils.bottomBtn(screenMain, screenMain.id + 'saveBtn', 'systemSettingView.save', () => {
        const saveConfigData = {
            sys: {
                // accessImageType: passLogSettingView.info[0].dropdown.getSelected(),
                strangerImage: passLogSettingView.info[0].switch.isSelect() ? 1 : 0
            }
        }

        const res = screen.saveConfig(saveConfigData)
        if (res === true) {
            passLogSettingView.statusPanel.success()
            std.setTimeout(() => {
                // 成功返回上一层界面
                dxui.loadMain(systemSettingView.screenMain)
            }, 500)
        } else {
            passLogSettingView.statusPanel.fail()
        }
    })
    saveBtn.align(dxui.Utils.ALIGN.BOTTOM_MID, 0, -83)

    passLogSettingView.statusPanel = viewUtils.statusPanel(screenMain, 'systemSettingView.success', 'systemSettingView.fail')
}

export default passLogSettingView
