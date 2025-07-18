import dxui from '../../../../../dxmodules/dxUi.js'
import std from '../../../../../dxmodules/dxStd.js'
import viewUtils from "../../../viewUtils.js"
import topView from "../../../topView.js"
import systemSettingView from '../systemSettingView.js'
import i18n from "../../../i18n.js"
import screen from '../../../../screen.js'
import logger from '../../../../../dxmodules/dxLogger.js'
const displaySettingView = {}
const languageData = ['CN', 'EN']
const languageData2 = ['中文', '英文']
const themeModeData = ['标准模式', '简洁模式']
const themeModeData2 = ['StandardMode', 'SimpleMode']

displaySettingView.init = function () {
    /**************************************************创建屏幕*****************************************************/
    const screenMain = dxui.View.build('displaySettingView', dxui.Utils.LAYER.MAIN)
    displaySettingView.screenMain = screenMain
    screenMain.scroll(false)
    screenMain.bgColor(0xffffff)
    screenMain.on(dxui.Utils.ENUM.LV_EVENT_SCREEN_LOADED, () => {
        topView.changeTheme(true)

        refreshLanguage()

        const configAll = screen.getConfig()
        // 自动调节屏幕亮度
        displaySettingView.info[0].switch.select(configAll['base.brightnessAuto'] == 1)
        if (configAll['base.brightnessAuto'] == 1) {
            displaySettingView.info[1].slider.disable(true)
        } else {
            displaySettingView.info[1].slider.disable(false)
        }
        // 屏幕亮度
        displaySettingView.info[1].slider.value(configAll['base.brightness'])
        displaySettingView.info[1].slider.send(dxui.Utils.EVENT.VALUE_CHANGED)
        // 自动关屏
        displaySettingView.info[2].switch.select(configAll['base.screenOff'] != 0)
        // 关屏时间
        displaySettingView.info[3].input.text(configAll['base.screenOff'] + '')
        // 自动屏保
        displaySettingView.info[4].switch.select(configAll['base.screensaver'] != 0)
        // 屏保时间
        displaySettingView.info[5].input.text(configAll['base.screensaver'] + '')
        // 显示IP
        displaySettingView.info[6].switch.select(configAll['base.showIp'] == 1)
        // 显示SN
        displaySettingView.info[7].switch.select(configAll['base.showSn'] == 1)
        // 显示小程序码
        displaySettingView.info[9].switch.select(configAll['base.showProgramCode'] == 1)
        // app模式
        displaySettingView.info[10].dropdown.setSelected(configAll['base.appMode'])
    })

    const titleBox = viewUtils.title(screenMain, systemSettingView.screenMain, 'displaySettingViewTitle', 'systemSettingView.displaySetting')
    titleBox.align(dxui.Utils.ALIGN.TOP_MID, 0, 70)

    displaySettingView.info = [
        {
            title: "systemSettingView.autoAdjustScreenBrightness",
            type: 'switch',
        },
        {
            title: "systemSettingView.screenBrightness",
            type: 'slider',
            unit: '%'
        },
        {
            title: "systemSettingView.autoTurnOffScreen",
            type: 'switch',
        },
        {
            title: "systemSettingView.autoTurnOffScreenTime",
            type: 'input',
            i18nUnit: 'systemSettingView.min'
        },
        {
            title: "systemSettingView.autoScreenSaver",
            type: 'switch',
        },
        {
            title: "systemSettingView.autoScreenSaverTime",
            type: 'input',
            i18nUnit: 'systemSettingView.min'
        },
        {
            title: "systemSettingView.displayIp",
            type: 'switch',
        },
        {
            title: "systemSettingView.displayDeviceSn",
            type: 'switch',
        },
        {
            title: "systemSettingView.language",
            type: 'dropdown',
        },
        {
            title: "systemSettingView.displayCode",
            type: 'switch',
        },
        {
            title: "systemSettingView.themeMode",
            type: 'dropdown',
        },
    ]

    const displaySettingBox = dxui.View.build('displaySettingBox', screenMain)
    viewUtils._clearStyle(displaySettingBox)
    displaySettingBox.align(dxui.Utils.ALIGN.TOP_MID, 0, 140)
    displaySettingBox.setSize(screen.screenSize.width, 850)
    displaySettingBox.bgOpa(0)
    displaySettingBox.flexFlow(dxui.Utils.FLEX_FLOW.ROW_WRAP)
    displaySettingBox.flexAlign(dxui.Utils.FLEX_ALIGN.CENTER, dxui.Utils.FLEX_ALIGN.START, dxui.Utils.FLEX_ALIGN.START)
    displaySettingBox.obj.lvObjSetStylePadGap(0, dxui.Utils.ENUM._LV_STYLE_STATE_CMP_SAME)
    displaySettingBox.borderWidth(1)
    displaySettingBox.setBorderColor(0xDEDEDE)
    displaySettingBox.obj.setStyleBorderSide(dxui.Utils.ENUM.LV_BORDER_SIDE_TOP, 0)

    displaySettingView.info.forEach(item => {
        const itemBox = dxui.View.build(item.title, displaySettingBox)
        viewUtils._clearStyle(itemBox)
        itemBox.setSize(760, 76)
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

        if (item.i18nUnit) {
            const unitLabel = dxui.Label.build(item.title + 'UnitLabel', itemBox)
            unitLabel.dataI18n = item.i18nUnit
            unitLabel.align(dxui.Utils.ALIGN.RIGHT_MID, 0, 0)
            unitLabel.textFont(viewUtils.font(26))
        }

        switch (item.type) {
            case 'switch':
                const __switch = dxui.Switch.build(item.title + 'switch', itemBox)
                __switch.align(dxui.Utils.ALIGN.RIGHT_MID, 0, 0)
                __switch.setSize(70, 35)
                item.switch = __switch

                if (item.title == 'systemSettingView.autoAdjustScreenBrightness') {
                    __switch.on(dxui.Utils.EVENT.VALUE_CHANGED, () => {
                        screen.saveConfig({
                            base: {
                                brightnessAuto: __switch.isSelect() ? 1 : 0
                            }
                        })
                        if (__switch.isSelect()) {
                            displaySettingView.info[1].slider.disable(true)
                        } else {
                            displaySettingView.info[1].slider.disable(false)
                        }
                    })
                }

                if (item.title == 'systemSettingView.autoTurnOffScreen') {
                    __switch.on(dxui.Utils.EVENT.VALUE_CHANGED, () => {
                        if (!__switch.isSelect()) {
                            displaySettingView.info[3].input.text("0")
                        }
                    })
                }

                if (item.title == 'systemSettingView.autoScreenSaver') {
                    __switch.on(dxui.Utils.EVENT.VALUE_CHANGED, () => {
                        if (!__switch.isSelect()) {
                            displaySettingView.info[5].input.text("0")
                        }
                    })
                }

                break;
            case 'input':
                const input = viewUtils.input(itemBox, item.title + 'input', undefined, undefined, undefined)
                input.align(dxui.Utils.ALIGN.RIGHT_MID, -60, 0)
                input.setSize(100, 55)
                item.input = input
                break;
            case 'dropdown':
                const dropdown = dxui.Dropdown.build(item.title + 'dropdown', itemBox)
                dropdown.align(dxui.Utils.ALIGN.RIGHT_MID, 0, 0)
                dropdown.textFont(viewUtils.font(26))
                dropdown.getList().textFont(viewUtils.font(26))
                dropdown.setSize(230,55)
                dropdown.setSymbol('/app/code/resource/image/down.png')
                item.dropdown = dropdown
                break;
            case 'slider':
                const sliderLabel = dxui.Label.build(item.title + 'sliderLabel', itemBox)
                sliderLabel.align(dxui.Utils.ALIGN.RIGHT_MID, -30, 0)
                sliderLabel.width(50)
                sliderLabel.text('0')
                sliderLabel.textFont(viewUtils.font(26))
                sliderLabel.textAlign(dxui.Utils.TEXT_ALIGN.RIGHT)

                const slider = dxui.Slider.build(item.title + 'slider', itemBox)
                slider.align(dxui.Utils.ALIGN.RIGHT_MID, -90, 0)
                slider.width(150)
                slider.range(0, 100)

                slider.on(dxui.Utils.EVENT.VALUE_CHANGED, () => {
                    sliderLabel.text(slider.value() + '')
                    if (screen.getConfig()['base.brightness'] == slider.value()) {
                        return
                    }
                    screen.saveConfig({
                        base: {
                            brightness: slider.value()
                        }
                    })
                })
                item.slider = slider
                break;
        }

    })

    const saveBtn = viewUtils.bottomBtn(screenMain, screenMain.id + 'saveBtn', 'systemSettingView.save', () => {
        const saveConfigData = {
            base: {
                language: languageData[displaySettingView.info[8].dropdown.getSelected()],
                brightnessAuto: displaySettingView.info[0].switch.isSelect() ? 1 : 0,
                brightness: displaySettingView.info[1].slider.value(),
                screenOff: parseInt(displaySettingView.info[3].input.text()),
                screensaver: parseInt(displaySettingView.info[5].input.text()),
                showIp: displaySettingView.info[6].switch.isSelect() ? 1 : 0,
                showSn: displaySettingView.info[7].switch.isSelect() ? 1 : 0,
                showProgramCode: displaySettingView.info[9].switch.isSelect() ? 1 : 0,
                appMode: displaySettingView.info[10].dropdown.getSelected(),
            }
        }

        const res = screen.saveConfig(saveConfigData)
        if (res === true) {
            displaySettingView.statusPanel.success()
            i18n.setLanguage(screen.getConfig()['base.language'])
            refreshLanguage()
            std.setTimeout(() => {
                // 成功返回上一层界面
                dxui.loadMain(systemSettingView.screenMain)
            }, 500)
            
            if (displaySettingView.info[0].switch.isSelect()) {
                displaySettingView.info[1].slider.disable(true)
            } else {
                displaySettingView.info[1].slider.disable(false)
            }
        } else {
            displaySettingView.statusPanel.fail()
        }
    })
    saveBtn.align(dxui.Utils.ALIGN.BOTTOM_MID, 0, -83)

    displaySettingView.statusPanel = viewUtils.statusPanel(screenMain, 'systemSettingView.success', 'systemSettingView.fail')
}

function refreshLanguage() {
    switch (screen.getConfig()['base.language']) {
        case 'CN':
            displaySettingView.info[8].dropdown.setOptions(languageData2)
            displaySettingView.info[8].dropdown.setSelected(0)
            displaySettingView.info[10].dropdown.setOptions(themeModeData)
            displaySettingView.info[10].dropdown.setSelected(0)
            break;
        case 'EN':
            displaySettingView.info[8].dropdown.setOptions(languageData)
            displaySettingView.info[8].dropdown.setSelected(1)
            displaySettingView.info[10].dropdown.setOptions(themeModeData2)
            displaySettingView.info[10].dropdown.setSelected(1)
            break;
        default:
            break;
    }
}

export default displaySettingView
