import dxui from '../../../../dxmodules/dxUi.js'
import viewUtils from "../../viewUtils.js"
import std from '../../../../dxmodules/dxStd.js'
import topView from "../../topView.js"
import configView from '../configView.js'
import i18n from "../../i18n.js"
import screen from '../../../screen.js'
const doorControlView = {}
doorControlView.init = function () {
    /**************************************************创建屏幕*****************************************************/
    const screenMain = dxui.View.build('doorControlView', dxui.Utils.LAYER.MAIN)
    doorControlView.screenMain = screenMain
    screenMain.scroll(false)
    screenMain.bgColor(0xffffff)
    screenMain.on(dxui.Utils.ENUM.LV_EVENT_SCREEN_LOADED, () => {
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
    titleBox.align(dxui.Utils.ALIGN.TOP_MID, 0, 70)

    const delaySettingBox = dxui.View.build('delaySettingB ox', screenMain)
    viewUtils._clearStyle(delaySettingBox)
    delaySettingBox.align(dxui.Utils.ALIGN.TOP_MID, 0, 140)
    delaySettingBox.setSize(550, 76)
    delaySettingBox.borderWidth(1)
    delaySettingBox.setBorderColor(0xDEDEDE)
    delaySettingBox.obj.setStyleBorderSide(dxui.Utils.ENUM.LV_BORDER_SIDE_BOTTOM, 0)

    const delaySettingLbl = dxui.Label.build('delaySettingLbl', delaySettingBox)
    delaySettingLbl.dataI18n = 'doorControlView.openDoorRelayDelay'
    delaySettingLbl.align(dxui.Utils.ALIGN.LEFT_MID, 0, 0)
    delaySettingLbl.textFont(viewUtils.font(26))

    const delaySettingUnitLbl = dxui.Label.build('delaySettingUnitLbl', delaySettingBox)
    // delaySettingUnitLbl.text('ms')
    delaySettingUnitLbl.dataI18n = "doorControlView.ms"
    delaySettingUnitLbl.align(dxui.Utils.ALIGN.RIGHT_MID, 0, 0)
    delaySettingUnitLbl.textFont(viewUtils.font(26))

    const delaySettingInput = viewUtils.input(delaySettingBox, 'delaySettingInput', 2, undefined, 'doorControlView.input')
    delaySettingInput.align(dxui.Utils.ALIGN.RIGHT_MID, -60, 0)
    delaySettingInput.setSize(150, 60)

    const alarmSettingBox = dxui.View.build('alarmSettingBox', screenMain)
    viewUtils._clearStyle(alarmSettingBox)
    alarmSettingBox.align(dxui.Utils.ALIGN.TOP_MID, 0, 216)
    alarmSettingBox.setSize(550, 76)
    alarmSettingBox.borderWidth(1)
    alarmSettingBox.setBorderColor(0xDEDEDE)
    alarmSettingBox.obj.setStyleBorderSide(dxui.Utils.ENUM.LV_BORDER_SIDE_BOTTOM, 0)

    const alarmSettingLbl = dxui.Label.build('alarmSettingLbl', alarmSettingBox)
    alarmSettingLbl.dataI18n = 'doorControlView.antiTamperAlarm'
    alarmSettingLbl.align(dxui.Utils.ALIGN.LEFT_MID, 0, 0)
    alarmSettingLbl.textFont(viewUtils.font(26))

    const alarmSettingSwitch = dxui.Switch.build('alarmSettingSwitch', alarmSettingBox)
    alarmSettingSwitch.align(dxui.Utils.ALIGN.RIGHT_MID, 0, 0)
    alarmSettingSwitch.setSize(70, 35)


    const mqttSettingBox = dxui.View.build('mqttSettingBox', screenMain)
    viewUtils._clearStyle(mqttSettingBox)
    mqttSettingBox.align(dxui.Utils.ALIGN.TOP_MID, 0, 292)
    mqttSettingBox.setSize(550, 76)
    mqttSettingBox.borderWidth(1)
    mqttSettingBox.setBorderColor(0xDEDEDE)
    mqttSettingBox.obj.setStyleBorderSide(dxui.Utils.ENUM.LV_BORDER_SIDE_BOTTOM, 0)
    // mqttSettingBox.hide()

    const mqttSettingLbl = dxui.Label.build('mqttSettingLbl', mqttSettingBox)
    mqttSettingLbl.dataI18n = 'doorControlView.mqttAddr'
    mqttSettingLbl.align(dxui.Utils.ALIGN.LEFT_MID, 0, 0)
    mqttSettingLbl.textFont(viewUtils.font(26))

    const mqttSettingInput = viewUtils.input(mqttSettingBox, 'mqttSettingInput', undefined, undefined, 'doorControlView.input')
    mqttSettingInput.align(dxui.Utils.ALIGN.RIGHT_MID, 0, 0)
    mqttSettingInput.setSize(250, 60)

    const mqttUserSettingBox = dxui.View.build('mqttUserSettingBox', screenMain)
    viewUtils._clearStyle(mqttUserSettingBox)
    mqttUserSettingBox.align(dxui.Utils.ALIGN.TOP_MID, 0, 368)
    mqttUserSettingBox.setSize(550, 76)
    mqttUserSettingBox.borderWidth(1)
    mqttUserSettingBox.setBorderColor(0xDEDEDE)
    mqttUserSettingBox.obj.setStyleBorderSide(dxui.Utils.ENUM.LV_BORDER_SIDE_BOTTOM, 0)
    // mqttUserSettingBox.hide()

    const mqttUserSettingLbl = dxui.Label.build('mqttUserSettingLbl', mqttUserSettingBox)
    mqttUserSettingLbl.dataI18n = 'doorControlView.mqttUser'
    mqttUserSettingLbl.align(dxui.Utils.ALIGN.LEFT_MID, 0, 0)
    mqttUserSettingLbl.textFont(viewUtils.font(26))

    const mqttUserSettingInput = viewUtils.input(mqttUserSettingBox, 'mqttUserSettingInput', undefined, undefined, 'doorControlView.input')
    mqttUserSettingInput.align(dxui.Utils.ALIGN.RIGHT_MID, 0, 0)
    mqttUserSettingInput.setSize(250, 60)

    const mqttPwdSettingBox = dxui.View.build('mqttPwdSettingBox', screenMain)
    viewUtils._clearStyle(mqttPwdSettingBox)
    mqttPwdSettingBox.align(dxui.Utils.ALIGN.TOP_MID, 0, 444)
    mqttPwdSettingBox.setSize(550, 76)
    mqttPwdSettingBox.borderWidth(1)
    mqttPwdSettingBox.setBorderColor(0xDEDEDE)
    mqttPwdSettingBox.obj.setStyleBorderSide(dxui.Utils.ENUM.LV_BORDER_SIDE_BOTTOM, 0)
    // mqttPwdSettingBox.hide()

    const mqttPwdSettingLbl = dxui.Label.build('mqttPwdSettingLbl', mqttPwdSettingBox)
    mqttPwdSettingLbl.dataI18n = 'doorControlView.mqttPwd'
    mqttPwdSettingLbl.align(dxui.Utils.ALIGN.LEFT_MID, 0, 0)
    mqttPwdSettingLbl.textFont(viewUtils.font(26))

    const mqttPwdSettingInput = viewUtils.input(mqttPwdSettingBox, 'mqttPwdSettingInput', undefined, undefined, 'doorControlView.input')
    mqttPwdSettingInput.align(dxui.Utils.ALIGN.RIGHT_MID, 0, 0)
    mqttPwdSettingInput.setSize(250, 60)


    const onlineCheckingSettingBox = dxui.View.build('onlineCheckingSettingBox', screenMain)
    viewUtils._clearStyle(onlineCheckingSettingBox)
    onlineCheckingSettingBox.align(dxui.Utils.ALIGN.TOP_MID, 0, 540)
    onlineCheckingSettingBox.setSize(550, 76)
    onlineCheckingSettingBox.borderWidth(1)
    onlineCheckingSettingBox.setBorderColor(0xDEDEDE)
    onlineCheckingSettingBox.obj.setStyleBorderSide(dxui.Utils.ENUM.LV_BORDER_SIDE_BOTTOM, 0)
    // onlineCheckingSettingBox.hide()

    const onlineCheckingSettingLbl = dxui.Label.build('onlineCheckingSettingLbl', onlineCheckingSettingBox)
    onlineCheckingSettingLbl.dataI18n = 'doorControlView.onlineChecking'
    onlineCheckingSettingLbl.align(dxui.Utils.ALIGN.LEFT_MID, 0, 0)
    onlineCheckingSettingLbl.textFont(viewUtils.font(26))

    const onlineCheckingSettingSwitch = dxui.Switch.build('onlineCheckingSettingSwitch', onlineCheckingSettingBox)
    onlineCheckingSettingSwitch.align(dxui.Utils.ALIGN.RIGHT_MID, 0, 0)
    onlineCheckingSettingSwitch.setSize(70, 35)

    const onlineCheckingTimeoutSettingBox = dxui.View.build('onlineCheckingTimeoutSettingBox', screenMain)
    viewUtils._clearStyle(onlineCheckingTimeoutSettingBox)
    onlineCheckingTimeoutSettingBox.align(dxui.Utils.ALIGN.TOP_MID, 0, 616)
    onlineCheckingTimeoutSettingBox.setSize(550, 76)
    onlineCheckingTimeoutSettingBox.borderWidth(1)
    onlineCheckingTimeoutSettingBox.setBorderColor(0xDEDEDE)
    onlineCheckingTimeoutSettingBox.obj.setStyleBorderSide(dxui.Utils.ENUM.LV_BORDER_SIDE_BOTTOM, 0)
    // onlineCheckingTimeoutSettingBox.hide()

    const onlineCheckingTimeoutSettingLbl = dxui.Label.build('onlineCheckingTimeoutSettingLbl', onlineCheckingTimeoutSettingBox)
    onlineCheckingTimeoutSettingLbl.dataI18n = 'doorControlView.onlineCheckingTimeout'
    onlineCheckingTimeoutSettingLbl.align(dxui.Utils.ALIGN.LEFT_MID, 0, 0)
    onlineCheckingTimeoutSettingLbl.textFont(viewUtils.font(26))

    const onlineCheckingTimeoutSettingUnitLbl = dxui.Label.build('onlineCheckingTimeoutSettingUnitLbl', onlineCheckingTimeoutSettingBox)
    onlineCheckingTimeoutSettingUnitLbl.dataI18n = "doorControlView.ms"
    onlineCheckingTimeoutSettingUnitLbl.align(dxui.Utils.ALIGN.RIGHT_MID, 0, 0)
    onlineCheckingTimeoutSettingUnitLbl.textFont(viewUtils.font(26))

    const onlineCheckingTimeoutSettingInput = viewUtils.input(onlineCheckingTimeoutSettingBox, 'onlineCheckingTimeoutSettingInput', 2, undefined, 'doorControlView.input')
    onlineCheckingTimeoutSettingInput.align(dxui.Utils.ALIGN.RIGHT_MID, -45, 0)
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
                // 成功返回上一层界面
                dxui.loadMain(configView.screenMain)
            }, 500)
        } else {
            doorControlView.statusPanel.fail()
        }
    })
    saveBtn.align(dxui.Utils.ALIGN.BOTTOM_MID, 0, -83)

    doorControlView.statusPanel = viewUtils.statusPanel(screenMain, 'doorControlView.success', 'doorControlView.fail')
}

export default doorControlView
