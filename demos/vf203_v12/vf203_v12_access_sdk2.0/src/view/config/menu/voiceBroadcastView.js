import dxui from '../../../../dxmodules/dxUi.js'
import std from '../../../../dxmodules/dxStd.js'
import viewUtils from "../../viewUtils.js"
import topView from "../../topView.js"
import configView from '../configView.js'
import i18n from "../../i18n.js"
import screen from '../../../screen.js'
const voiceBroadcastView = {}

voiceBroadcastView.init = function () {
    /**************************************************创建屏幕*****************************************************/
    const screenMain = dxui.View.build('voiceBroadcastView', dxui.Utils.LAYER.MAIN)
    voiceBroadcastView.screenMain = screenMain
    screenMain.scroll(false)
    screenMain.bgColor(0xffffff)
    screenMain.on(dxui.Utils.ENUM.LV_EVENT_SCREEN_LOADED, () => {
        topView.changeTheme(true)

        refreshLanguage()

        const configAll = screen.getConfig()
        voiceBroadcastView.strangerVoiceDropdown.setSelected(configAll['face.stranger'])
        voiceBroadcastView.voiceModeDropdown.setSelected(configAll['face.voiceMode'])
        greetingInput.text(configAll['face.voiceModeDate'])
        volumeSlider.value(configAll['base.volume'])
        volumeSlider.send(dxui.Utils.EVENT.VALUE_CHANGED)
        if (configAll['face.voiceMode'] == 2) {
            greetingBox.show()
            volumeBox.align(dxui.Utils.ALIGN.TOP_MID, 0, screen.screenSize.height * (380 / 1024))
        } else {
            greetingBox.hide()
            volumeBox.align(dxui.Utils.ALIGN.TOP_MID, 0, screen.screenSize.height * (300 / 1024))
        }
    })

    const titleBox = viewUtils.title(screenMain, configView.screenMain, 'voiceBroadcastViewTitle', 'voiceBroadcastView.title')
    titleBox.align(dxui.Utils.ALIGN.TOP_MID, 0, screen.screenSize.height * (70 / 1024))

    const strangerVoiceBox = dxui.View.build('strangerVoiceBox', screenMain)
    viewUtils._clearStyle(strangerVoiceBox)
    strangerVoiceBox.bgOpa(0)
    strangerVoiceBox.setSize(screen.screenSize.width * ((600 - 28 * 2) / 600), screen.screenSize.height * (80 / 1024))
    strangerVoiceBox.align(dxui.Utils.ALIGN.TOP_MID, 0, screen.screenSize.height * (140 / 1024))
    strangerVoiceBox.borderWidth(1)
    strangerVoiceBox.setBorderColor(0xDEDEDE)
    strangerVoiceBox.obj.setStyleBorderSide(dxui.Utils.ENUM.LV_BORDER_SIDE_BOTTOM, 0)

    const strangerVoiceLbl = dxui.Label.build('strangerVoiceLbl', strangerVoiceBox)
    strangerVoiceLbl.textFont(viewUtils.font(26))
    strangerVoiceLbl.dataI18n = 'voiceBroadcastView.strangerVoice'
    strangerVoiceLbl.align(dxui.Utils.ALIGN.LEFT_MID, 0, 0)

    const strangerVoiceDropdown = dxui.Dropdown.build('strangerVoiceDropdown', strangerVoiceBox)
    voiceBroadcastView.strangerVoiceDropdown = strangerVoiceDropdown
    strangerVoiceDropdown.textFont(viewUtils.font(22))
    strangerVoiceDropdown.getList().textFont(viewUtils.font(22))
    strangerVoiceDropdown.align(dxui.Utils.ALIGN.RIGHT_MID, 0, 0)
    strangerVoiceDropdown.setSymbol(screen.dropdownSymbol)
    strangerVoiceDropdown.width(screen.screenSize.width * (300 / 600))

    const voiceModeBox = dxui.View.build('voiceModeBox', screenMain)
    viewUtils._clearStyle(voiceModeBox)
    voiceModeBox.bgOpa(0)
    voiceModeBox.setSize(screen.screenSize.width * ((600 - 28 * 2) / 600), screen.screenSize.height * (80 / 1024))
    voiceModeBox.align(dxui.Utils.ALIGN.TOP_MID, 0, screen.screenSize.height * (220 / 1024))
    voiceModeBox.borderWidth(1)
    voiceModeBox.setBorderColor(0xDEDEDE)
    voiceModeBox.obj.setStyleBorderSide(dxui.Utils.ENUM.LV_BORDER_SIDE_BOTTOM, 0)

    const voiceModeLbl = dxui.Label.build('voiceModeLbl', voiceModeBox)
    voiceModeLbl.textFont(viewUtils.font(26))
    voiceModeLbl.dataI18n = 'voiceBroadcastView.voiceMode'
    voiceModeLbl.align(dxui.Utils.ALIGN.LEFT_MID, 0, 0)

    const voiceModeDropdown = dxui.Dropdown.build('voiceModeDropdown', voiceModeBox)
    voiceBroadcastView.voiceModeDropdown = voiceModeDropdown
    voiceModeDropdown.textFont(viewUtils.font(22))
    voiceModeDropdown.getList().textFont(viewUtils.font(22))
    voiceModeDropdown.align(dxui.Utils.ALIGN.RIGHT_MID, 0, 0)
    voiceModeDropdown.setSymbol(screen.dropdownSymbol)
    voiceModeDropdown.width(screen.screenSize.width * (300 / 600))
    voiceModeDropdown.on(dxui.Utils.EVENT.VALUE_CHANGED, () => {
        if (voiceBroadcastView.voiceModeDropdown.getSelected() == 2) {
            greetingBox.show()
            volumeBox.align(dxui.Utils.ALIGN.TOP_MID, 0, screen.screenSize.height * (380 / 1024))
        } else {
            greetingBox.hide()
            volumeBox.align(dxui.Utils.ALIGN.TOP_MID, 0, screen.screenSize.height * (300 / 1024))
        }
    })

    const greetingBox = dxui.View.build('greetingBox', screenMain)
    greetingBox.hide()
    viewUtils._clearStyle(greetingBox)
    greetingBox.bgOpa(0)
    greetingBox.setSize(screen.screenSize.width * ((600 - 28 * 2) / 600), screen.screenSize.height * (80 / 1024))
    greetingBox.align(dxui.Utils.ALIGN.TOP_MID, 0, screen.screenSize.height * (300 / 1024))
    greetingBox.borderWidth(1)
    greetingBox.setBorderColor(0xDEDEDE)
    greetingBox.obj.setStyleBorderSide(dxui.Utils.ENUM.LV_BORDER_SIDE_BOTTOM, 0)

    const greetingBoxLbl = dxui.Label.build('greetingBoxLbl', greetingBox)
    greetingBoxLbl.textFont(viewUtils.font(26))
    greetingBoxLbl.dataI18n = 'voiceBroadcastView.greeting'
    greetingBoxLbl.align(dxui.Utils.ALIGN.LEFT_MID, 0, 0)

    const greetingInput = viewUtils.input(greetingBox, 'greetingInput', undefined, undefined, "localUserAddView.input")
    greetingInput.textFont(viewUtils.font(26))
    greetingInput.align(dxui.Utils.ALIGN.RIGHT_MID, 0, 0)
    greetingInput.setSize(screen.screenSize.width * (300 / 600), screen.screenSize.height * (50 / 1024))
    greetingInput.padLeft(5)
    greetingInput.radius(5)
    greetingInput.setOneLine(true)
    greetingInput.borderWidth(1)
    greetingInput.setBorderColor(0xDEDEDE)

    const volumeBox = dxui.View.build('volumeBox', screenMain)
    viewUtils._clearStyle(volumeBox)
    volumeBox.bgOpa(0)
    volumeBox.setSize(screen.screenSize.width * ((600 - 28 * 2) / 600), screen.screenSize.height * (80 / 1024))
    volumeBox.align(dxui.Utils.ALIGN.TOP_MID, 0, screen.screenSize.height * (380 / 1024))
    volumeBox.borderWidth(1)
    volumeBox.setBorderColor(0xDEDEDE)
    volumeBox.obj.setStyleBorderSide(dxui.Utils.ENUM.LV_BORDER_SIDE_BOTTOM, 0)

    const volumeLbl = dxui.Label.build('volumeLbl', volumeBox)
    volumeLbl.textFont(viewUtils.font(26))
    volumeLbl.dataI18n = 'voiceBroadcastView.volume'
    volumeLbl.align(dxui.Utils.ALIGN.LEFT_MID, 0, 0)

    const volumeValueLbl = dxui.Label.build('volumeValueLbl', volumeBox)
    volumeValueLbl.textFont(viewUtils.font(26))
    volumeValueLbl.align(dxui.Utils.ALIGN.RIGHT_MID, 0, 0)
    volumeValueLbl.width(screen.screenSize.width * (50 / 600))
    volumeValueLbl.text('0')
    volumeValueLbl.textAlign(dxui.Utils.TEXT_ALIGN.RIGHT)

    const volumeSlider = dxui.Slider.build('volumeSlider', volumeBox)
    volumeSlider.width(screen.screenSize.width * (200 / 600))
    volumeSlider.height(screen.screenSize.height * (15 / 1024))
    volumeSlider.range(0, 10)
    volumeSlider.on(dxui.Utils.EVENT.VALUE_CHANGED, () => {
        volumeValueLbl.text(volumeSlider.value() + '')
    })
    volumeSlider.alignTo(volumeValueLbl, dxui.Utils.ALIGN.OUT_LEFT_MID, -screen.screenSize.width * (10 / 600), 0)
    volumeSlider.bgColor(0x000000, NativeObject.APP.NativeComponents.NativeEnum.LV_PART_KNOB)
    volumeSlider.bgColor(0x000000, NativeObject.APP.NativeComponents.NativeEnum.LV_PART_INDICATOR)

    const saveBtn = viewUtils.bottomBtn(screenMain, screenMain.id + 'saveBtn', 'voiceBroadcastView.save', () => {
        const saveConfigData = {
            face: {
                stranger: voiceBroadcastView.strangerVoiceDropdown.getSelected(),
                voiceMode: voiceBroadcastView.voiceModeDropdown.getSelected(),
                voiceModeDate: greetingInput.text()
            },
            base: {
                volume: Math.floor(volumeSlider.value()),
            }
        }

        const res = screen.saveConfig(saveConfigData)
        if (res === true) {
            voiceBroadcastView.statusPanel.success()
            std.setTimeout(() => {
                // 成功返回上一层界面
                dxui.loadMain(configView.screenMain)
            }, 500)
        } else {
            voiceBroadcastView.statusPanel.fail()
        }
    })
    saveBtn.align(dxui.Utils.ALIGN.BOTTOM_MID, 0, -screen.screenSize.height * (40 / 1024))
    voiceBroadcastView.statusPanel = viewUtils.statusPanel(screenMain, 'voiceBroadcastView.success', 'voiceBroadcastView.fail')

    // 初次渲染时应用语言对应的下拉文案，避免出现默认 option1
    refreshLanguage()
}

function refreshLanguage() {
    // 控件尚未创建时直接返回，避免调用 undefined
    if (!voiceBroadcastView.strangerVoiceDropdown || !voiceBroadcastView.voiceModeDropdown) {
        return
    }

    // 读取当前语言的选项文案
    const strangerData = i18n.t('voiceBroadcastView.strangerData') || ["No voice", "Play first register", "Play stranger hello"]
    const voiceModeData = i18n.t('voiceBroadcastView.voiceModeData') || ["No voice", "Play name", "Play greeting"]

    // 安全设置选项
    const setOptionsSafe = (dropdown, options) => {
        if (!dropdown) return
        if (typeof dropdown.setOptions === 'function') {
            dropdown.setOptions(options)
        } else if (typeof dropdown.setOption === 'function') {
            dropdown.setOption(options)
        }
    }

    setOptionsSafe(voiceBroadcastView.strangerVoiceDropdown, strangerData)
    setOptionsSafe(voiceBroadcastView.voiceModeDropdown, voiceModeData)
}

export default voiceBroadcastView
