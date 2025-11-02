import dxUi from '../../../../dxmodules/dxUi.js'
import std from '../../../../dxmodules/dxStd.js'
import viewUtils from "../../viewUtils.js"
import topView from "../../topView.js"
import configView from '../configView.js'
import i18n from "../../i18n.js"
import screen from '../../../screen.js'
const voiceBroadcastView = {}

const strangerData = {
    CN: ["无语音", "请先注册", "陌生人你好"],
    EN: ["No voice", "Play first register", "Play stranger hello"],
    RU: ["Без звука", "Сначала зарегистрируйтесь", "Здравствуйте, незнакомец"],
}

const voiceModeData = {
    CN: ["无语音", "名字", "问候语"],
    EN: ["No voice", "Play name", "Play greeting"],
    RU: ["Без звука", "Играть имя", "Играть приветствие"],
}
voiceBroadcastView.init = function () {
    /************************************************** Create Screen *****************************************************/
    const screenMain = dxUi.View.build('voiceBroadcastView', dxUi.Utils.LAYER.MAIN)
    voiceBroadcastView.screenMain = screenMain
    screenMain.scroll(false)
    screenMain.bgColor(0xffffff)
    screenMain.on(dxUi.Utils.ENUM.LV_EVENT_SCREEN_LOADED, () => {
        topView.changeTheme(true)

        const configAll = screen.getConfig()
        strangerVoiceDropdown.setOptions(strangerData[configAll['base.language'] || 'CN'])
        voiceModeDropdown.setOptions(voiceModeData[configAll['base.language'] || 'CN'])

        strangerVoiceDropdown.setSelected(configAll['face.stranger'])
        voiceModeDropdown.setSelected(configAll['face.voiceMode'])
        volumeSlider.value(configAll['base.volume'])
        volumeSlider.send(dxUi.Utils.EVENT.VALUE_CHANGED)
    })

    const titleBox = viewUtils.title(screenMain, configView.screenMain, 'voiceBroadcastViewTitle', 'voiceBroadcastView.title')
    titleBox.align(dxUi.Utils.ALIGN.TOP_MID, 0, 70)

    const strangerVoiceBox = dxUi.View.build('strangerVoiceBox', screenMain)
    viewUtils._clearStyle(strangerVoiceBox)
    strangerVoiceBox.bgOpa(0)
    strangerVoiceBox.setSize(screen.screenSize.width - 28 * 2, 80)
    strangerVoiceBox.align(dxUi.Utils.ALIGN.TOP_MID, 0, 140)
    strangerVoiceBox.borderWidth(1)
    strangerVoiceBox.setBorderColor(0xDEDEDE)
    strangerVoiceBox.obj.setStyleBorderSide(dxUi.Utils.ENUM.LV_BORDER_SIDE_BOTTOM, 0)

    const strangerVoiceLbl = dxUi.Label.build('strangerVoiceLbl', strangerVoiceBox)
    strangerVoiceLbl.textFont(viewUtils.font(26))
    strangerVoiceLbl.dataI18n = 'voiceBroadcastView.strangerVoice'
    strangerVoiceLbl.align(dxUi.Utils.ALIGN.LEFT_MID, 0, 0)

    const strangerVoiceDropdown = dxUi.Dropdown.build('strangerVoiceDropdown', strangerVoiceBox)
    strangerVoiceDropdown.textFont(viewUtils.font(26))
    strangerVoiceDropdown.getList().textFont(viewUtils.font(26))
    strangerVoiceDropdown.align(dxUi.Utils.ALIGN.RIGHT_MID, 0, 0)
    strangerVoiceDropdown.setSymbol('/app/code/resource/image/down.png')
    strangerVoiceDropdown.width(300)
    strangerVoiceDropdown.setOptions(['Register first', 'Register first Register first Register first', 'Register first'])


    const voiceModeBox = dxUi.View.build('voiceModeBox', screenMain)
    viewUtils._clearStyle(voiceModeBox)
    voiceModeBox.bgOpa(0)
    voiceModeBox.setSize(screen.screenSize.width - 28 * 2, 80)
    voiceModeBox.align(dxUi.Utils.ALIGN.TOP_MID, 0, 220)
    voiceModeBox.borderWidth(1)
    voiceModeBox.setBorderColor(0xDEDEDE)
    voiceModeBox.obj.setStyleBorderSide(dxUi.Utils.ENUM.LV_BORDER_SIDE_BOTTOM, 0)

    const voiceModeLbl = dxUi.Label.build('voiceModeLbl', voiceModeBox)
    voiceModeLbl.textFont(viewUtils.font(26))
    voiceModeLbl.dataI18n = 'voiceBroadcastView.voiceMode'
    voiceModeLbl.align(dxUi.Utils.ALIGN.LEFT_MID, 0, 0)

    const voiceModeDropdown = dxUi.Dropdown.build('voiceModeDropdown', voiceModeBox)
    voiceModeDropdown.textFont(viewUtils.font(26))
    voiceModeDropdown.getList().textFont(viewUtils.font(26))
    voiceModeDropdown.align(dxUi.Utils.ALIGN.RIGHT_MID, 0, 0)
    voiceModeDropdown.setSymbol('/app/code/resource/image/down.png')
    voiceModeDropdown.width(300)
    voiceModeDropdown.setOptions(['Register first', 'Register first Register first Register first', 'Register first'])


    const volumeBox = dxUi.View.build('volumeBox', screenMain)
    viewUtils._clearStyle(volumeBox)
    volumeBox.bgOpa(0)
    volumeBox.setSize(screen.screenSize.width - 28 * 2, 80)
    volumeBox.align(dxUi.Utils.ALIGN.TOP_MID, 0, 300)
    volumeBox.borderWidth(1)
    volumeBox.setBorderColor(0xDEDEDE)
    volumeBox.obj.setStyleBorderSide(dxUi.Utils.ENUM.LV_BORDER_SIDE_BOTTOM, 0)

    const volumeLbl = dxUi.Label.build('volumeLbl', volumeBox)
    volumeLbl.textFont(viewUtils.font(26))
    volumeLbl.dataI18n = 'voiceBroadcastView.volume'
    volumeLbl.align(dxUi.Utils.ALIGN.LEFT_MID, 0, 0)

    const volumeValueLbl = dxUi.Label.build('volumeValueLbl', volumeBox)
    volumeValueLbl.textFont(viewUtils.font(26))
    volumeValueLbl.align(dxUi.Utils.ALIGN.RIGHT_MID, 0, 0)
    volumeValueLbl.width(50)
    volumeValueLbl.text('0')
    volumeValueLbl.textAlign(dxUi.Utils.TEXT_ALIGN.RIGHT)

    const volumeSlider = dxUi.Slider.build('volumeSlider', volumeBox)
    volumeSlider.width(300)
    volumeSlider.range(0, 100)
    volumeSlider.on(dxUi.Utils.EVENT.VALUE_CHANGED, () => {
        volumeValueLbl.text(volumeSlider.value() + '')
    })
    volumeSlider.alignTo(volumeValueLbl, dxUi.Utils.ALIGN.OUT_LEFT_MID, -10, 0)

    const saveBtn = viewUtils.bottomBtn(screenMain, screenMain.id + 'saveBtn', 'voiceBroadcastView.save', () => {
        const saveConfigData = {
            face: {
                stranger: strangerVoiceDropdown.getSelected(),
                voiceMode: voiceModeDropdown.getSelected(),
            },
            base: {
                volume: volumeSlider.value(),
            }
        }
        const res = screen.saveConfig(saveConfigData)
        if (res === true) {
            voiceBroadcastView.statusPanel.success()
            std.setTimeout(() => {
                // Success, return to previous screen
                dxUi.loadMain(configView.screenMain)
            }, 500)
        } else {
            voiceBroadcastView.statusPanel.fail()
        }
    })
    saveBtn.align(dxUi.Utils.ALIGN.BOTTOM_MID, 0, -83)
    voiceBroadcastView.statusPanel = viewUtils.statusPanel(screenMain, 'voiceBroadcastView.success', 'voiceBroadcastView.fail')
}


export default voiceBroadcastView
