import dxui from '../../../../dxmodules/dxUi.js'
import std from '../../../../dxmodules/dxStd.js'
import viewUtils from "../../viewUtils.js"
import topView from "../../topView.js"
import configView from '../configView.js'
import i18n from "../../i18n.js"
import screen from '../../../screen.js'
const voiceBroadcastView = {}

const strangerData = ["无语音", "请先注册", "陌生人你好"]
const strangerData0 = ["No voice", "Play first register", "Play stranger hello"]
const voiceModeData = ["无语音", "名字", "问候语"]
const voiceModeData0 = ["No voice", "Play name", "Play greeting"]

voiceBroadcastView.init = function () {
    /**************************************************创建屏幕*****************************************************/
    const screenMain = dxui.View.build('voiceBroadcastView', dxui.Utils.LAYER.MAIN)
    voiceBroadcastView.screenMain = screenMain
    screenMain.scroll(false)
    screenMain.bgColor(0xffffff)
    screenMain.on(dxui.Utils.ENUM.LV_EVENT_SCREEN_LOADED, () => {
        topView.changeTheme(true)

        const configAll = screen.getConfig()
        strangerVoiceDropdown.setOptions(configAll['base.language'] == 'CN' ? strangerData : strangerData0)
        voiceModeDropdown.setOptions(configAll['base.language'] == 'CN' ? voiceModeData : voiceModeData0)

        strangerVoiceDropdown.setSelected(configAll['face.stranger'])
        voiceModeDropdown.setSelected(configAll['face.voiceMode'])
        volumeSlider.value(configAll['base.volume'])
        volumeSlider.send(dxui.Utils.EVENT.VALUE_CHANGED)
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
    strangerVoiceDropdown.textFont(viewUtils.font(26))
    strangerVoiceDropdown.getList().textFont(viewUtils.font(26))
    strangerVoiceDropdown.align(dxui.Utils.ALIGN.RIGHT_MID, 0, 0)
    strangerVoiceDropdown.setSymbol(screen.dropdownSymbol)
    strangerVoiceDropdown.width(screen.screenSize.width * (300 / 600))
    strangerVoiceDropdown.setOptions(['请先注册', '请先注册请先注册请先注册', '请先注册'])


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
    voiceModeDropdown.textFont(viewUtils.font(26))
    voiceModeDropdown.getList().textFont(viewUtils.font(26))
    voiceModeDropdown.align(dxui.Utils.ALIGN.RIGHT_MID, 0, 0)
    voiceModeDropdown.setSymbol(screen.dropdownSymbol)
    voiceModeDropdown.width(screen.screenSize.width * (300 / 600))
    voiceModeDropdown.setOptions(['请先注册', '请先注册请先注册请先注册', '请先注册'])


    const volumeBox = dxui.View.build('volumeBox', screenMain)
    viewUtils._clearStyle(volumeBox)
    volumeBox.bgOpa(0)
    volumeBox.setSize(screen.screenSize.width * ((600 - 28 * 2) / 600), screen.screenSize.height * (80 / 1024))
    volumeBox.align(dxui.Utils.ALIGN.TOP_MID, 0, screen.screenSize.height * (300 / 1024))
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
                stranger: strangerVoiceDropdown.getSelected(),
                voiceMode: voiceModeDropdown.getSelected(),
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
}

export default voiceBroadcastView
