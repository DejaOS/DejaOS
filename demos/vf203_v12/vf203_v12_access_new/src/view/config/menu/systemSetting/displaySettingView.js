import dxui from '../../../../../dxmodules/dxUi.js'
import std from '../../../../../dxmodules/dxStd.js'
import viewUtils from "../../../viewUtils.js"
import topView from "../../../topView.js"
import systemSettingView from '../systemSettingView.js'
import i18n from "../../../i18n.js"
import screen from '../../../../screen.js'
const displaySettingView = {}
const languageData = ['CN', 'EN']
const languageData2 = ['中文', '英文']
const themeModeData = ['标准模式', '简洁模式']
const themeModeData2 = ['StandardMode', 'SimpleMode']
const idleData = ['永不', '1分钟', '2分钟', '3分钟', '4分钟', '5分钟']
const idleData2 = ['Never', '1 Min', '2 Min', '3 Min', '4 Min', '5 Min']

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

        // 屏幕亮度
        displaySettingView.info[0].slider.value(configAll['base.backlight'])
        displaySettingView.info[0].slider.send(dxui.Utils.EVENT.VALUE_CHANGED)
        // 熄屏时间
        displaySettingView.info[1].dropdown.setSelected(configAll['base.screenOff'])
        // 屏保时间
        displaySettingView.info[2].dropdown.setSelected(configAll['base.screensaver'])
        // 显示IP
        displaySettingView.info[3].switch.select(configAll['base.showIp'] == 1)
        // 显示SN
        displaySettingView.info[4].switch.select(configAll['base.showSn'] == 1)
        // 显示小程序码
        //displaySettingView.info[9].switch.select(configAll['base.showProgramCode'] == 1)暂时隐藏小程序二维码

        displaySettingView.info[8].slider.value(configAll['base.brightness'])
        displaySettingView.info[8].slider.send(dxui.Utils.EVENT.VALUE_CHANGED)
        displaySettingView.info[9].slider.value(configAll['base.nirBrightness'])
        displaySettingView.info[9].slider.send(dxui.Utils.EVENT.VALUE_CHANGED)
    })

    const titleBox = viewUtils.title(screenMain, systemSettingView.screenMain, 'displaySettingViewTitle', 'systemSettingView.displaySetting')
    titleBox.align(dxui.Utils.ALIGN.TOP_MID, 0, screen.screenSize.height * (70 / 1024))

    displaySettingView.info = [
        {
            title: "systemSettingView.screenBacklight",
            type: 'slider',
            unit: '%'
        },
        {
            title: "systemSettingView.autoTurnOffScreenTime",
            type: 'dropdown',
        },
        {
            title: "systemSettingView.autoScreenSaverTime",
            type: 'dropdown',
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
        {
            title: "systemSettingView.brightness",
            type: 'slider',
            unit: '%'
        },
        {
            title: "systemSettingView.nirBrightness",
            type: 'slider',
            unit: '%'
        },
    ]

    const displaySettingBox = dxui.View.build('displaySettingBox', screenMain)
    viewUtils._clearStyle(displaySettingBox)
    displaySettingBox.align(dxui.Utils.ALIGN.TOP_MID, 0, screen.screenSize.height * (140 / 1024))
    displaySettingBox.setSize(screen.screenSize.width * (600 / 600), screen.screenSize.height * (700 / 1024))
    displaySettingBox.bgOpa(0)
    displaySettingBox.flexFlow(dxui.Utils.FLEX_FLOW.ROW_WRAP)
    displaySettingBox.flexAlign(dxui.Utils.FLEX_ALIGN.CENTER, dxui.Utils.FLEX_ALIGN.START, dxui.Utils.FLEX_ALIGN.START)
    displaySettingBox.obj.lvObjSetStylePadGap(screen.screenSize.width * (0 / 600), dxui.Utils.ENUM._LV_STYLE_STATE_CMP_SAME)
    displaySettingBox.borderWidth(screen.screenSize.width * (1 / 600))
    displaySettingBox.setBorderColor(0xDEDEDE)
    displaySettingBox.obj.setStyleBorderSide(dxui.Utils.ENUM.LV_BORDER_SIDE_TOP, 0)

    displaySettingView.info.forEach(item => {
        if (item.title == 'systemSettingView.displayCode') {
            return/* 暂时隐藏小程序二维码 */
        }
        const itemBox = dxui.View.build(item.title, displaySettingBox)
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
                __switch.setSize(screen.screenSize.width * (70 / 600), screen.screenSize.height * (35 / 1024))
                __switch.bgColor(0x000000, NativeObject.APP.NativeComponents.NativeEnum.LV_PART_INDICATOR | NativeObject.APP.NativeComponents.NativeEnum.LV_STATE_CHECKED)

                item.switch = __switch
                break;
            case 'input':
                const input = viewUtils.input(itemBox, item.title + 'input', 2, undefined, undefined)
                input.align(dxui.Utils.ALIGN.RIGHT_MID, -screen.screenSize.width * (60 / 600), 0)
                input.setSize(screen.screenSize.width * (100 / 600), screen.screenSize.height * (45 / 1024))
                item.input = input
                break;
            case 'dropdown':
                const dropdown = dxui.Dropdown.build(item.title + 'dropdown', itemBox)
                dropdown.align(dxui.Utils.ALIGN.RIGHT_MID, 0, 0)
                dropdown.textFont(viewUtils.font(26))
                dropdown.getList().textFont(viewUtils.font(26))
                dropdown.setSize(screen.screenSize.width * (220 / 600), screen.screenSize.height * (45 / 1024))
                dropdown.padTop((screen.screenSize.height * (45 / 1024) - viewUtils.font(26).obj.lvFontGetLineHeight()) / 2)
                dropdown.padBottom(0)
                dropdown.setSymbol(screen.dropdownSymbol)
                item.dropdown = dropdown
                if (item.title == 'systemSettingView.autoTurnOffScreenTime' || item.title == 'systemSettingView.autoScreenSaverTime') {
                    dropdown.setOptions(idleData)
                }
                break;
            case 'slider':
                const sliderLabel = dxui.Label.build(item.title + 'sliderLabel', itemBox)
                sliderLabel.align(dxui.Utils.ALIGN.RIGHT_MID, -screen.screenSize.width * (30 / 600), 0)
                sliderLabel.width(screen.screenSize.width * (50 / 600))
                sliderLabel.text('0')
                sliderLabel.textFont(viewUtils.font(26))
                sliderLabel.textAlign(dxui.Utils.TEXT_ALIGN.RIGHT)

                const slider = dxui.Slider.build(item.title + 'slider', itemBox)
                slider.align(dxui.Utils.ALIGN.RIGHT_MID, -screen.screenSize.width * (90 / 600), 0)
                slider.width(screen.screenSize.width * (150 / 600))
                slider.range(0, 100)
                slider.bgColor(0x000000, NativeObject.APP.NativeComponents.NativeEnum.LV_PART_KNOB)
                slider.bgColor(0x000000, NativeObject.APP.NativeComponents.NativeEnum.LV_PART_INDICATOR)

                if (item.title == 'systemSettingView.screenBacklight') {
                    slider.on(dxui.Utils.EVENT.VALUE_CHANGED, () => {
                        sliderLabel.text(slider.value() + '')
                        if (screen.getConfig()['base.backlight'] == slider.value()) {
                            return
                        }
                        screen.saveConfig({
                            base: {
                                backlight: slider.value() > 0 ? slider.value() : 1
                            }
                        })
                    })
                } else if (item.title == 'systemSettingView.brightness') {
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
                } else if (item.title == 'systemSettingView.nirBrightness') {
                    slider.on(dxui.Utils.EVENT.VALUE_CHANGED, () => {
                        sliderLabel.text(slider.value() + '')
                        if (screen.getConfig()['base.nirBrightness'] == slider.value()) {
                            return
                        }
                        screen.saveConfig({
                            base: {
                                nirBrightness: slider.value()
                            }
                        })
                    })
                }
                item.slider = slider
                break;
        }

    })

    const saveBtn = viewUtils.bottomBtn(screenMain, screenMain.id + 'saveBtn', 'systemSettingView.save', () => {
        const saveConfigData = {
            base: {
                language: languageData[displaySettingView.info[5].dropdown.getSelected()],
                backlight: displaySettingView.info[0].slider.value(),
                brightness: displaySettingView.info[8].slider.value(),
                nirBrightness: displaySettingView.info[9].slider.value(),
                screenOff: displaySettingView.info[1].dropdown.getSelected(),
                screensaver: displaySettingView.info[2].dropdown.getSelected(),
                showIp: displaySettingView.info[3].switch.isSelect() ? 1 : 0,
                showSn: displaySettingView.info[4].switch.isSelect() ? 1 : 0,
                //showProgramCode: displaySettingView.info[9].switch.isSelect() ? 1 : 0,暂时隐藏小程序按钮
                appMode: displaySettingView.info[7].dropdown.getSelected(),
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
        } else {
            displaySettingView.statusPanel.fail()
        }
    })
    saveBtn.align(dxui.Utils.ALIGN.BOTTOM_MID, 0, -screen.screenSize.height * (40 / 1024))

    displaySettingView.statusPanel = viewUtils.statusPanel(screenMain, 'systemSettingView.success', 'systemSettingView.fail')
}

function refreshLanguage() {
    switch (screen.getConfig()['base.language']) {
        case 'CN':
            displaySettingView.info[1].dropdown.setOptions(idleData)
            displaySettingView.info[2].dropdown.setOptions(idleData)

            displaySettingView.info[5].dropdown.setOptions(languageData2)
            displaySettingView.info[5].dropdown.setSelected(0)

            displaySettingView.info[7].dropdown.setOptions(themeModeData)
            displaySettingView.info[7].dropdown.setSelected(0)
            break;
        case 'EN':
            displaySettingView.info[1].dropdown.setOptions(idleData2)
            displaySettingView.info[2].dropdown.setOptions(idleData2)

            displaySettingView.info[5].dropdown.setOptions(languageData)
            displaySettingView.info[5].dropdown.setSelected(1)

            displaySettingView.info[7].dropdown.setOptions(themeModeData2)
            displaySettingView.info[7].dropdown.setSelected(1)
            break;
        default:
            break;
    }
    if (screen.getConfig()["base.appMode"] == 0) {
        displaySettingView.info[7].dropdown.setSelected(0)
    } else {
        displaySettingView.info[7].dropdown.setSelected(1)
    }
}

export default displaySettingView
