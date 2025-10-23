import dxUi from '../../../../dxmodules/dxUi.js'
import std from '../../../../dxmodules/dxStd.js'
import viewUtils from "../../viewUtils.js"
import topView from "../../topView.js"
import configView from '../configView.js'
import i18n from "../../i18n.js"
import screen from '../../../screen.js'
const doorControlView = {}
doorControlView.init = function () {
    /************************************************** Create Screen *****************************************************/
    const screenMain = dxUi.View.build('doorControlView', dxUi.Utils.LAYER.MAIN)
    doorControlView.screenMain = screenMain
    screenMain.scroll(false)
    screenMain.bgColor(0xffffff)
    screenMain.on(dxUi.Utils.ENUM.LV_EVENT_SCREEN_LOADED, () => {
        topView.changeTheme(true)

        const configAll = screen.getConfig()
        delaySettingInput.text(configAll['access.relayTime'] + '')
        alarmSettingSwitch.select(configAll['access.tamperAlarm'] == 1)
        mqttSettingInput.text(configAll['mqtt.addr'])
        mqttUserSettingInput.text(configAll['mqtt.username'])
        mqttPwdSettingInput.text(configAll['mqtt.password'])
        onlineCheckingSettingSwitch.select(configAll['mqtt.onlinecheck'] == 1)
        onlineCheckingTimeoutSettingInput.text(configAll['mqtt.timeout'] + '')
    })

    const titleBox = viewUtils.title(screenMain, configView.screenMain, 'doorControlViewTitle', 'doorControlView.title')
    titleBox.align(dxUi.Utils.ALIGN.TOP_MID, 0, 70)

    const delaySettingBox = dxUi.View.build('delaySettingBox', screenMain)
    viewUtils._clearStyle(delaySettingBox)
    delaySettingBox.align(dxUi.Utils.ALIGN.TOP_MID, 0, 140)
    delaySettingBox.setSize(750, 76)
    delaySettingBox.borderWidth(1)
    delaySettingBox.setBorderColor(0xDEDEDE)
    delaySettingBox.obj.setStyleBorderSide(dxUi.Utils.ENUM.LV_BORDER_SIDE_BOTTOM, 0)

    const delaySettingLbl = dxUi.Label.build('delaySettingLbl', delaySettingBox)
    delaySettingLbl.dataI18n = 'doorControlView.openDoorRelayDelay'
    delaySettingLbl.align(dxUi.Utils.ALIGN.LEFT_MID, 0, 0)
    delaySettingLbl.textFont(viewUtils.font(26))

    const delaySettingUnitLbl = dxUi.Label.build('delaySettingUnitLbl', delaySettingBox)
    delaySettingUnitLbl.dataI18n = "doorControlView.ms"
    delaySettingUnitLbl.align(dxUi.Utils.ALIGN.RIGHT_MID, 0, 0)
    delaySettingUnitLbl.textFont(viewUtils.font(26))

    const delaySettingInput = viewUtils.input(delaySettingBox, 'delaySettingInput', 2, undefined, 'doorControlView.input')
    delaySettingInput.align(dxUi.Utils.ALIGN.RIGHT_MID, -60, 0)
    delaySettingInput.setSize(150, 60)

    const alarmSettingBox = dxUi.View.build('alarmSettingBox', screenMain)
    viewUtils._clearStyle(alarmSettingBox)
    alarmSettingBox.align(dxUi.Utils.ALIGN.TOP_MID, 0, 216)
    alarmSettingBox.setSize(750, 76)
    alarmSettingBox.borderWidth(1)
    alarmSettingBox.setBorderColor(0xDEDEDE)
    alarmSettingBox.obj.setStyleBorderSide(dxUi.Utils.ENUM.LV_BORDER_SIDE_BOTTOM, 0)

    const alarmSettingLbl = dxUi.Label.build('alarmSettingLbl', alarmSettingBox)
    alarmSettingLbl.dataI18n = 'doorControlView.antiTamperAlarm'
    alarmSettingLbl.align(dxUi.Utils.ALIGN.LEFT_MID, 0, 0)
    alarmSettingLbl.textFont(viewUtils.font(26))

    const alarmSettingSwitch = dxUi.Switch.build('alarmSettingSwitch', alarmSettingBox)
    alarmSettingSwitch.align(dxUi.Utils.ALIGN.RIGHT_MID, 0, 0)
    alarmSettingSwitch.setSize(70, 35)


    const mqttSettingBox = dxUi.View.build('mqttSettingBox', screenMain)
    viewUtils._clearStyle(mqttSettingBox)
    mqttSettingBox.align(dxUi.Utils.ALIGN.TOP_MID, 0, 292)
    mqttSettingBox.setSize(750, 76)
    mqttSettingBox.borderWidth(1)
    mqttSettingBox.setBorderColor(0xDEDEDE)
    mqttSettingBox.obj.setStyleBorderSide(dxUi.Utils.ENUM.LV_BORDER_SIDE_BOTTOM, 0)

    const mqttSettingLbl = dxUi.Label.build('mqttSettingLbl', mqttSettingBox)
    mqttSettingLbl.dataI18n = 'doorControlView.mqttAddr'
    mqttSettingLbl.align(dxUi.Utils.ALIGN.LEFT_MID, 0, 0)
    mqttSettingLbl.textFont(viewUtils.font(26))

    const mqttSettingInput = viewUtils.input(mqttSettingBox, 'mqttSettingInput', undefined, undefined, 'doorControlView.input')
    mqttSettingInput.align(dxUi.Utils.ALIGN.RIGHT_MID, 0, 0)
    mqttSettingInput.setSize(320, 60)

    const mqttUserSettingBox = dxUi.View.build('mqttUserSettingBox', screenMain)
    viewUtils._clearStyle(mqttUserSettingBox)
    mqttUserSettingBox.align(dxUi.Utils.ALIGN.TOP_MID, 0, 368)
    mqttUserSettingBox.setSize(750, 76)
    mqttUserSettingBox.borderWidth(1)
    mqttUserSettingBox.setBorderColor(0xDEDEDE)
    mqttUserSettingBox.obj.setStyleBorderSide(dxUi.Utils.ENUM.LV_BORDER_SIDE_BOTTOM, 0)

    const mqttUserSettingLbl = dxUi.Label.build('mqttUserSettingLbl', mqttUserSettingBox)
    mqttUserSettingLbl.dataI18n = 'doorControlView.mqttUser'
    mqttUserSettingLbl.align(dxUi.Utils.ALIGN.LEFT_MID, 0, 0)
    mqttUserSettingLbl.textFont(viewUtils.font(26))

    const mqttUserSettingInput = viewUtils.input(mqttUserSettingBox, 'mqttUserSettingInput', undefined, undefined, 'doorControlView.input')
    mqttUserSettingInput.align(dxUi.Utils.ALIGN.RIGHT_MID, 0, 0)
    mqttUserSettingInput.setSize(320, 60)

    const mqttPwdSettingBox = dxUi.View.build('mqttPwdSettingBox', screenMain)
    viewUtils._clearStyle(mqttPwdSettingBox)
    mqttPwdSettingBox.align(dxUi.Utils.ALIGN.TOP_MID, 0, 444)
    mqttPwdSettingBox.setSize(750, 76)
    mqttPwdSettingBox.borderWidth(1)
    mqttPwdSettingBox.setBorderColor(0xDEDEDE)
    mqttPwdSettingBox.obj.setStyleBorderSide(dxUi.Utils.ENUM.LV_BORDER_SIDE_BOTTOM, 0)

    const mqttPwdSettingLbl = dxUi.Label.build('mqttPwdSettingLbl', mqttPwdSettingBox)
    mqttPwdSettingLbl.dataI18n = 'doorControlView.mqttPwd'
    mqttPwdSettingLbl.align(dxUi.Utils.ALIGN.LEFT_MID, 0, 0)
    mqttPwdSettingLbl.textFont(viewUtils.font(26))

    const mqttPwdSettingInput = viewUtils.input(mqttPwdSettingBox, 'mqttPwdSettingInput', undefined, undefined, 'doorControlView.input')
    mqttPwdSettingInput.align(dxUi.Utils.ALIGN.RIGHT_MID, 0, 0)
    mqttPwdSettingInput.setSize(320, 60)


    const onlineCheckingSettingBox = dxUi.View.build('onlineCheckingSettingBox', screenMain)
    viewUtils._clearStyle(onlineCheckingSettingBox)
    onlineCheckingSettingBox.align(dxUi.Utils.ALIGN.TOP_MID, 0, 540)
    onlineCheckingSettingBox.setSize(750, 76)
    onlineCheckingSettingBox.borderWidth(1)
    onlineCheckingSettingBox.setBorderColor(0xDEDEDE)
    onlineCheckingSettingBox.obj.setStyleBorderSide(dxUi.Utils.ENUM.LV_BORDER_SIDE_BOTTOM, 0)

    const onlineCheckingSettingLbl = dxUi.Label.build('onlineCheckingSettingLbl', onlineCheckingSettingBox)
    onlineCheckingSettingLbl.dataI18n = 'doorControlView.onlineChecking'
    onlineCheckingSettingLbl.align(dxUi.Utils.ALIGN.LEFT_MID, 0, 0)
    onlineCheckingSettingLbl.textFont(viewUtils.font(26))

    const onlineCheckingSettingSwitch = dxUi.Switch.build('onlineCheckingSettingSwitch', onlineCheckingSettingBox)
    onlineCheckingSettingSwitch.align(dxUi.Utils.ALIGN.RIGHT_MID, 0, 0)
    onlineCheckingSettingSwitch.setSize(70, 35)

    const onlineCheckingTimeoutSettingBox = dxUi.View.build('onlineCheckingTimeoutSettingBox', screenMain)
    viewUtils._clearStyle(onlineCheckingTimeoutSettingBox)
    onlineCheckingTimeoutSettingBox.align(dxUi.Utils.ALIGN.TOP_MID, 0, 616)
    onlineCheckingTimeoutSettingBox.setSize(750, 76)
    onlineCheckingTimeoutSettingBox.borderWidth(1)
    onlineCheckingTimeoutSettingBox.setBorderColor(0xDEDEDE)
    onlineCheckingTimeoutSettingBox.obj.setStyleBorderSide(dxUi.Utils.ENUM.LV_BORDER_SIDE_BOTTOM, 0)

    const onlineCheckingTimeoutSettingLbl = dxUi.Label.build('onlineCheckingTimeoutSettingLbl', onlineCheckingTimeoutSettingBox)
    onlineCheckingTimeoutSettingLbl.dataI18n = 'doorControlView.onlineCheckingTimeout'
    onlineCheckingTimeoutSettingLbl.align(dxUi.Utils.ALIGN.LEFT_MID, 0, 0)
    onlineCheckingTimeoutSettingLbl.textFont(viewUtils.font(26))

    const onlineCheckingTimeoutSettingUnitLbl = dxUi.Label.build('onlineCheckingTimeoutSettingUnitLbl', onlineCheckingTimeoutSettingBox)
    onlineCheckingTimeoutSettingUnitLbl.text('ms')
    onlineCheckingTimeoutSettingUnitLbl.align(dxUi.Utils.ALIGN.RIGHT_MID, 0, 0)
    onlineCheckingTimeoutSettingUnitLbl.textFont(viewUtils.font(26))

    const onlineCheckingTimeoutSettingInput = viewUtils.input(onlineCheckingTimeoutSettingBox, 'onlineCheckingTimeoutSettingInput', 2, undefined, 'doorControlView.input')
    onlineCheckingTimeoutSettingInput.align(dxUi.Utils.ALIGN.RIGHT_MID, -45, 0)
    onlineCheckingTimeoutSettingInput.setSize(150, 60)

    const saveBtn = viewUtils.bottomBtn(screenMain, screenMain.id + 'saveBtn', 'doorControlView.save', () => {
        const saveConfigData = {
            access: {
                relayTime: parseInt(delaySettingInput.text()),
                tamperAlarm: alarmSettingSwitch.isSelect() ? 1 : 0
            },
            mqtt: {
                addr: mqttSettingInput.text(),
                username: mqttUserSettingInput.text(),
                password: mqttPwdSettingInput.text(),
                onlinecheck: onlineCheckingSettingSwitch.isSelect() ? 1 : 0,
                timeout: parseInt(onlineCheckingTimeoutSettingInput.text())
            }
        }
        const res = screen.saveConfig(saveConfigData)
        if (res === true) {
            doorControlView.statusPanel.success()
            std.setTimeout(() => {
                // Success, return to previous screen
                dxUi.loadMain(configView.screenMain)
            }, 500)
        } else {
            doorControlView.statusPanel.fail()
        }
    })
    saveBtn.align(dxUi.Utils.ALIGN.BOTTOM_MID, 0, -83)

    doorControlView.statusPanel = viewUtils.statusPanel(screenMain, 'doorControlView.success', 'doorControlView.fail')
}

export default doorControlView
