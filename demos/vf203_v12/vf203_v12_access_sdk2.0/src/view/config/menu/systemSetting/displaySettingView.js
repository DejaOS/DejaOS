import dxui from '../../../../../dxmodules/dxUi.js'
import std from '../../../../../dxmodules/dxStd.js'
import viewUtils from "../../../viewUtils.js"
import topView from "../../../topView.js"
import systemSettingView from '../systemSettingView.js'
import i18n from "../../../i18n.js"
import screen from '../../../../screen.js'
import dxDriver from '../../../../../dxmodules/dxDriver.js'
const displaySettingView = {}
// 支持的语言列表，与 langPack 中新增的语言保持一致
const languages = ['CN', 'EN', 'ES', 'FR', 'DE', 'RU', 'AR', 'PT', 'KO', 'JP']

/**
 * 判断是否是国际版本
 * @returns {boolean} true表示国际版本，false表示国内版本
 */
function isInternationalVersion() {
    try {
        let savedVersion = std.loadFile('/etc/app/region.conf') || std.loadFile('/etc/app/.region')
        if (savedVersion) {
            savedVersion = savedVersion.trim()
        }
        // 文件有内容代表国际版本，无内容代表国内版本
         return savedVersion && savedVersion=="INTL" 
    } catch (e) {
        // 如果文件不存在或读取失败，默认返回false（国内版本）
        return false
    }
}

/**
 * 根据版本获取可用的语言列表
 * @returns {Array<string>} 可用的语言代码列表
 */
function getAvailableLanguages() {
    const isInternational = isInternationalVersion()
    if (isInternational) {
        // 国际版本：排除 CN
        return languages.filter(lang => lang !== 'CN')
    } else {
        // 国内版本：只保留 CN
        return ['CN']
    }
}

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
        displaySettingView.info.screenBacklight.slider.value(configAll['base.backlight'])
        displaySettingView.info.screenBacklight.slider.send(dxui.Utils.EVENT.VALUE_CHANGED)
        // 熄屏时间
        displaySettingView.info.autoTurnOffScreenTime.dropdown.setSelected(configAll['base.screenOff'])
        // 屏保时间
        displaySettingView.info.autoScreenSaverTime.dropdown.setSelected(configAll['base.screensaver'])
        // 显示IP
        displaySettingView.info.displayIp.switch.select(configAll['base.showIp'] == 1)
        // 显示SN
        displaySettingView.info.displayDeviceSn.switch.select(configAll['base.showSn'] == 1)
        // 显示小程序码
        //displaySettingView.info.displayCode.switch.select(configAll['base.showProgramCode'] == 1)暂时隐藏小程序二维码

        displaySettingView.info.brightness.slider.value(configAll['base.brightness'])
        displaySettingView.info.brightness.slider.send(dxui.Utils.EVENT.VALUE_CHANGED)
        // displaySettingView.info.nirBrightness.slider.value(configAll['base.nirBrightness'])
        // displaySettingView.info.nirBrightness.slider.send(dxui.Utils.EVENT.VALUE_CHANGED)
    })

    const titleBox = viewUtils.title(screenMain, systemSettingView.screenMain, 'displaySettingViewTitle', 'systemSettingView.displaySetting')
    titleBox.align(dxui.Utils.ALIGN.TOP_MID, 0, screen.screenSize.height * (70 / 1024))

    // 使用对象而不是数组，通过 key 访问，避免下标依赖
    displaySettingView.info = {
        screenBacklight: {
            key: 'screenBacklight',
            title: "systemSettingView.screenBacklight",
            type: 'slider',
            unit: '%'
        },
        autoTurnOffScreenTime: {
            key: 'autoTurnOffScreenTime',
            title: "systemSettingView.autoTurnOffScreenTime",
            type: 'dropdown',
        },
        autoScreenSaverTime: {
            key: 'autoScreenSaverTime',
            title: "systemSettingView.autoScreenSaverTime",
            type: 'dropdown',
        },
        displayIp: {
            key: 'displayIp',
            title: "systemSettingView.displayIp",
            type: 'switch',
        },
        displayDeviceSn: {
            key: 'displayDeviceSn',
            title: "systemSettingView.displayDeviceSn",
            type: 'switch',
        },
        language: {
            key: 'language',
            title: "systemSettingView.language",
            type: 'dropdown',
        },
        displayCode: {
            key: 'displayCode',
            title: "systemSettingView.displayCode",
            type: 'switch',
        },
        themeMode: {
            key: 'themeMode',
            title: "systemSettingView.themeMode",
            type: 'dropdown',
        },
        brightness: {
            key: 'brightness',
            title: "systemSettingView.brightness",
            type: 'slider',
            unit: '%'
        },
        // nirBrightness: {
        //     key: 'nirBrightness',
        //     title: "systemSettingView.nirBrightness",
        //     type: 'slider',
        //     unit: '%'
        // },
    }

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

    // 遍历所有配置项，使用 Object.entries 确保通过 key 正确赋值
    Object.entries(displaySettingView.info).forEach(([key, item]) => {
        if (key === 'displayCode') {
            return/* 暂时隐藏小程序二维码 */
        }
        if (key === 'language' && !isInternationalVersion()) {
            return
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

                displaySettingView.info[key].switch = __switch
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
                slider.width(screen.screenSize.width * (200 / 600))
                slider.height(screen.screenSize.height * (15 / 1024))
                slider.range(0, 100)
                slider.bgColor(0x000000, NativeObject.APP.NativeComponents.NativeEnum.LV_PART_KNOB)
                slider.bgColor(0x000000, NativeObject.APP.NativeComponents.NativeEnum.LV_PART_INDICATOR)

                if (item.key === 'screenBacklight') {
                    slider.on(dxui.Utils.EVENT.VALUE_CHANGED, () => {
                        sliderLabel.text(slider.value() + '')
                        // if (screen.getConfig()['base.backlight'] == slider.value()) {
                        //     return
                        // }
                        // screen.saveConfig({
                        //     base: {
                        //         backlight: slider.value() > 0 ? slider.value() : 1
                        //     }
                        // })
                    })
                } else if (item.key === 'brightness') {
                    if (dxDriver.DRIVER.MODEL == "vf202" || dxDriver.DRIVER.MODEL == "vf114" || dxDriver.DRIVER.MODEL == "vf105") {
                        itemBox.show()
                        slider.on(dxui.Utils.EVENT.VALUE_CHANGED, () => {
                            sliderLabel.text(slider.value() + '')
                            // if (screen.getConfig()['base.brightness'] == slider.value()) {
                            //     return
                            // }
                            // screen.saveConfig({
                            //     base: {
                            //         brightness: slider.value()
                            //     }
                            // })
                        })
                    } else {
                        itemBox.hide()
                    }
                }
                //  else if (item.key === 'nirBrightness') {
                //     slider.on(dxui.Utils.EVENT.VALUE_CHANGED, () => {
                //         sliderLabel.text(slider.value() + '')
                //         // if (screen.getConfig()['base.nirBrightness'] == slider.value()) {
                //         //     return
                //         // }
                //         // screen.saveConfig({
                //         //     base: {
                //         //         nirBrightness: slider.value()
                //         //     }
                //         // })
                //     })
                // }
                item.slider = slider
                break;
        }

    })

    // 初次渲染时应用语言对应的下拉文案，避免出现默认 option1
    refreshLanguage()

    const saveBtn = viewUtils.bottomBtn(screenMain, screenMain.id + 'saveBtn', 'systemSettingView.save', () => {
     
        
        const saveConfigData = {
            base: {
                backlight: displaySettingView.info.screenBacklight.slider.value() > 0 ? displaySettingView.info.screenBacklight.slider.value() : 1,
                brightness: displaySettingView.info.brightness.slider.value(),
                // nirBrightness: displaySettingView.info.nirBrightness.slider.value(),
                screenOff: displaySettingView.info.autoTurnOffScreenTime.dropdown.getSelected(),
                screensaver: displaySettingView.info.autoScreenSaverTime.dropdown.getSelected(),
                showIp: displaySettingView.info.displayIp.switch.isSelect() ? 1 : 0,
                showSn: displaySettingView.info.displayDeviceSn.switch.isSelect() ? 1 : 0,
                //showProgramCode: displaySettingView.info.displayCode.switch.isSelect() ? 1 : 0,暂时隐藏小程序按钮
                appMode: displaySettingView.info.themeMode.dropdown.getSelected(),
            }
        }
        if(isInternationalVersion()) {
            // 根据版本获取可用语言列表，确保保存的语言代码正确
            const availableLanguages = getAvailableLanguages()
            const selectedLangIndex = displaySettingView.info.language.dropdown.getSelected()
            const selectedLanguage = availableLanguages[selectedLangIndex] || availableLanguages[0]
            const currentLang = screen.getConfig()['base.language']
            if (currentLang != selectedLanguage) {
                saveConfigData.base["language"] = selectedLanguage
            }
        }
        const res = screen.saveConfig(saveConfigData)
        if (res === true) {
            displaySettingView.statusPanel.success()
            i18n.setLanguage(screen.getConfig()['base.language'])
            std.setTimeout(() => {
                // 成功返回上一层界面
                refreshLanguage()
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
    // 控件尚未创建时直接返回，避免调用 undefined
    if (!displaySettingView.info
        || !displaySettingView.info.autoTurnOffScreenTime?.dropdown
        || !displaySettingView.info.autoScreenSaverTime?.dropdown
        || (isInternationalVersion() && !displaySettingView.info.language?.dropdown)
        || !displaySettingView.info.themeMode?.dropdown) {
        return
    }

    // 读取当前语言的选项文案
    const idleOptions = i18n.t('displaySettingView.idleOptions') || ['Never', '1 min', '2 min', '3 min', '4 min', '5 min']
    const themeOptions = i18n.t('displaySettingView.themeOptions') || { standard: 'Standard', simple: 'Simple' }
    const languageOptions = i18n.t('displaySettingView.languageOptions') || {}

    // 熄屏/屏保下拉
    const setOptionsSafe = (dropdown, options) => {
        if (!dropdown) return
        if (typeof dropdown.setOptions === 'function') {
            dropdown.setOptions(options)
        } else if (typeof dropdown.setOption === 'function') {
            // 兼容可能的单个/数组 API
            dropdown.setOption(options)
        }
    }
    setOptionsSafe(displaySettingView.info.autoTurnOffScreenTime.dropdown, idleOptions)
    setOptionsSafe(displaySettingView.info.autoScreenSaverTime.dropdown, idleOptions)
    if(isInternationalVersion()) {
        // 语言下拉（根据版本过滤可用语言）
        const availableLanguages = getAvailableLanguages()
        const languageLabels = availableLanguages.map(code => languageOptions[code] || code)
        setOptionsSafe(displaySettingView.info["language"].dropdown, languageLabels)

        // 设置当前选中的语言
        const currentLang = screen.getConfig()['base.language']
        const langIndex = availableLanguages.indexOf(currentLang)
        // 如果当前语言不在可用列表中，自动修正为可用列表的第一个并保存
        if (langIndex < 0) {
            // 如果当前语言不可用（例如：国内版本配置了英文），自动修正为可用列表的第一个
            const defaultLang = availableLanguages[0]
            // 自动修正配置，确保系统语言始终可用
            screen.saveConfig({
                base: {
                    language: defaultLang
                }
            })
            // 更新 i18n 的语言设置
            i18n.setLanguage(defaultLang)
            displaySettingView.info.language.dropdown.setSelected(0)
        } else {
            displaySettingView.info.language.dropdown.setSelected(langIndex)
        }
    }
    // 主题下拉
    setOptionsSafe(displaySettingView.info.themeMode.dropdown, [themeOptions.standard, themeOptions.simple])
    displaySettingView.info.themeMode.dropdown.setSelected(screen.getConfig()["base.appMode"] == 0 ? 0 : 1)
}

export default displaySettingView
