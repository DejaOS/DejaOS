import dxUi from '../../../../../dxmodules/dxUi.js'
import std from '../../../../../dxmodules/dxStd.js'
import viewUtils from "../../../viewUtils.js"
import topView from "../../../topView.js"
import systemSettingView from '../systemSettingView.js'
import i18n from "../../../i18n.js"
import screen from '../../../../screen.js'
import logger from '../../../../../dxmodules/dxLogger.js'
const displaySettingView = {}
const languageDataEn = ['中文', 'EN', 'RU']
const languageDataCn = ['中文', 'EN', 'RU']
const languageDataRu = ['中文', 'EN', 'RU']
const themeModeDataCn = ['标准模式', '简洁模式']
const themeModeDataEn = ['StandardMode', 'SimpleMode']
const themeModeDataRu = ['Стандарт', 'Простой']

displaySettingView.init = function () {
    /************************************************** Create Screen *****************************************************/
    const screenMain = dxUi.View.build('displaySettingView', dxUi.Utils.LAYER.MAIN)
    displaySettingView.screenMain = screenMain
    screenMain.scroll(false)
    screenMain.bgColor(0xffffff)
    screenMain.on(dxUi.Utils.ENUM.LV_EVENT_SCREEN_LOADED, () => {
        topView.changeTheme(true)

        refreshLanguage()

        const configAll = screen.getConfig()
        // Auto adjust screen brightness
        displaySettingView.info[0].switch.select(configAll['base.brightnessAuto'] == 1)
        if (configAll['base.brightnessAuto'] == 1) {
            displaySettingView.info[1].slider.disable(true)
        } else {
            displaySettingView.info[1].slider.disable(false)
        }
        // Screen brightness
        displaySettingView.info[1].slider.value(configAll['base.brightness'])
        displaySettingView.info[1].slider.send(dxUi.Utils.EVENT.VALUE_CHANGED)
        // Auto screen off
        displaySettingView.info[2].switch.select(configAll['base.screenOff'] != 0)
        // Screen off time
        displaySettingView.info[3].input.text(configAll['base.screenOff'] + '')
        // Auto screensaver
        displaySettingView.info[4].switch.select(configAll['base.screensaver'] != 0)
        // Screensaver time
        displaySettingView.info[5].input.text(configAll['base.screensaver'] + '')
        // Display IP
        displaySettingView.info[6].switch.select(configAll['base.showIp'] == 1)
        // Display SN
        displaySettingView.info[7].switch.select(configAll['base.showSn'] == 1)
        // Display mini program code
        displaySettingView.info[9].switch.select(configAll['base.showProgramCode'] == 1)
        // App mode
        displaySettingView.info[10].dropdown.setSelected(configAll['base.appMode'])
    })

    const titleBox = viewUtils.title(screenMain, systemSettingView.screenMain, 'displaySettingViewTitle', 'systemSettingView.displaySetting')
    titleBox.align(dxUi.Utils.ALIGN.TOP_MID, 0, 70)

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

    const displaySettingBox = dxUi.View.build('displaySettingBox', screenMain)
    viewUtils._clearStyle(displaySettingBox)
    displaySettingBox.align(dxUi.Utils.ALIGN.TOP_MID, 0, 140)
    displaySettingBox.setSize(screen.screenSize.width, 850)
    displaySettingBox.bgOpa(0)
    displaySettingBox.flexFlow(dxUi.Utils.FLEX_FLOW.ROW_WRAP)
    displaySettingBox.flexAlign(dxUi.Utils.FLEX_ALIGN.CENTER, dxUi.Utils.FLEX_ALIGN.START, dxUi.Utils.FLEX_ALIGN.START)
    displaySettingBox.obj.lvObjSetStylePadGap(0, dxUi.Utils.ENUM._LV_STYLE_STATE_CMP_SAME)
    displaySettingBox.borderWidth(1)
    displaySettingBox.setBorderColor(0xDEDEDE)
    displaySettingBox.obj.setStyleBorderSide(dxUi.Utils.ENUM.LV_BORDER_SIDE_TOP, 0)

    displaySettingView.info.forEach(item => {
        const itemBox = dxUi.View.build(item.title, displaySettingBox)
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

        if (item.i18nUnit) {
            const unitLabel = dxUi.Label.build(item.title + 'UnitLabel', itemBox)
            unitLabel.dataI18n = item.i18nUnit
            unitLabel.align(dxUi.Utils.ALIGN.RIGHT_MID, 0, 0)
            unitLabel.textFont(viewUtils.font(26))
        }

        switch (item.type) {
            case 'switch':
                const __switch = dxUi.Switch.build(item.title + 'switch', itemBox)
                __switch.align(dxUi.Utils.ALIGN.RIGHT_MID, 0, 0)
                __switch.setSize(70, 35)
                item.switch = __switch

                if (item.title == 'systemSettingView.autoAdjustScreenBrightness') {
                    __switch.on(dxUi.Utils.EVENT.VALUE_CHANGED, () => {
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
                    __switch.on(dxUi.Utils.EVENT.VALUE_CHANGED, () => {
                        if (!__switch.isSelect()) {
                            displaySettingView.info[3].input.text("0")
                        }
                    })
                }

                if (item.title == 'systemSettingView.autoScreenSaver') {
                    __switch.on(dxUi.Utils.EVENT.VALUE_CHANGED, () => {
                        if (!__switch.isSelect()) {
                            displaySettingView.info[5].input.text("0")
                        }
                    })
                }

                break;
            case 'input':
                const input = viewUtils.input(itemBox, item.title + 'input', undefined, undefined, undefined)
                input.align(dxUi.Utils.ALIGN.RIGHT_MID, -60, 0)
                input.setSize(100, 55)
                item.input = input
                break;
            case 'dropdown':
                const dropdown = dxUi.Dropdown.build(item.title + 'dropdown', itemBox)
                dropdown.align(dxUi.Utils.ALIGN.RIGHT_MID, 0, 0)
                dropdown.textFont(viewUtils.font(26))
                dropdown.getList().textFont(viewUtils.font(26))
                dropdown.setSize(230,55)
                dropdown.setSymbol('/app/code/resource/image/down.png')
                item.dropdown = dropdown
                break;
            case 'slider':
                const sliderLabel = dxUi.Label.build(item.title + 'sliderLabel', itemBox)
                sliderLabel.align(dxUi.Utils.ALIGN.RIGHT_MID, -30, 0)
                sliderLabel.width(50)
                sliderLabel.text('0')
                sliderLabel.textFont(viewUtils.font(26))
                sliderLabel.textAlign(dxUi.Utils.TEXT_ALIGN.RIGHT)

                const slider = dxUi.Slider.build(item.title + 'slider', itemBox)
                slider.align(dxUi.Utils.ALIGN.RIGHT_MID, -90, 0)
                slider.width(150)
                slider.range(0, 100)

                slider.on(dxUi.Utils.EVENT.VALUE_CHANGED, () => {
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
                language: languageDataEn[displaySettingView.info[8].dropdown.getSelected()],
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
        logger.info(`saved language: ${saveConfigData.base.language}`)
        const res = screen.saveConfig(saveConfigData)
        if (res === true) {
            displaySettingView.statusPanel.success()
            i18n.setLanguage(screen.getConfig()['base.language'])
            refreshLanguage()
            std.setTimeout(() => {
                // Success, return to previous screen
                dxUi.loadMain(systemSettingView.screenMain)
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
    saveBtn.align(dxUi.Utils.ALIGN.BOTTOM_MID, 0, -83)

    displaySettingView.statusPanel = viewUtils.statusPanel(screenMain, 'systemSettingView.success', 'systemSettingView.fail')
}

function refreshLanguage() {
    switch (screen.getConfig()['base.language']) {
        case 'CN':
            displaySettingView.info[8].dropdown.setOptions(languageDataCn)
            displaySettingView.info[8].dropdown.setSelected(0)
            displaySettingView.info[10].dropdown.setOptions(themeModeDataCn)
            // displaySettingView.info[10].dropdown.setSelected(0)
            break;
        case 'EN':
            displaySettingView.info[8].dropdown.setOptions(languageDataEn)
            displaySettingView.info[8].dropdown.setSelected(1)
            displaySettingView.info[10].dropdown.setOptions(themeModeDataEn)
            // displaySettingView.info[10].dropdown.setSelected(1)
            break;
        case 'RU':
            displaySettingView.info[8].dropdown.setOptions(languageDataRu)
            displaySettingView.info[8].dropdown.setSelected(2)
            displaySettingView.info[10].dropdown.setOptions(themeModeDataRu)
            // displaySettingView.info[10].dropdown.setSelected(1)
            break;
        default:
            displaySettingView.info[8].dropdown.setOptions(languageDataEn)
            displaySettingView.info[8].dropdown.setSelected(1)
            displaySettingView.info[10].dropdown.setOptions(themeModeDataEn)
            // displaySettingView.info[10].dropdown.setSelected(1)
            break;
    }
}

export default displaySettingView
