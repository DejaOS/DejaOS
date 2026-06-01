import dxui from '../../../../dxmodules/dxUi.js'
import viewUtils from "../../viewUtils.js"
import std from '../../../../dxmodules/dxStd.js'
import topView from "../../topView.js"
import configView from '../configView.js'
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
        fireSettingSwitch.select(configAll['access.fire'] == 1)
        mqttSettingInput.text(configAll['mqtt.addr'])
        mqttUserSettingInput.text(configAll['mqtt.username'])
        mqttPwdSettingInput.text(configAll['mqtt.password'])
        onlineCheckingSettingSwitch.select(configAll['mqtt.onlinecheck'] == 1)
        onlineCheckingTimeoutSettingInput.text(configAll['mqtt.timeout'] + '')
        if (screen.driver.device.model === 'vf105') {
            contentBox.setSize(screen.screenSize.width * (550 / 600), screen.screenSize.height * (624 / 1024))
            alarmSettingBox.hide()
        } else {
            contentBox.setSize(screen.screenSize.width * (550 / 600), screen.screenSize.height * (700 / 1024))
            alarmSettingBox.show()
            alarmSettingSwitch.select(configAll['access.tamper'] == 1)
        }
    })

    const titleBox = viewUtils.title(screenMain, configView.screenMain, 'doorControlViewTitle', 'doorControlView.title')
    titleBox.align(dxui.Utils.ALIGN.TOP_MID, 0, screen.screenSize.height * (70 / 1024))

    const contentBox = dxui.View.build('contentBox' + screenMain.id, screenMain)
    viewUtils._clearStyle(contentBox)
    contentBox.align(dxui.Utils.ALIGN.TOP_MID, 0, screen.screenSize.height * (140 / 1024))
    contentBox.setSize(screen.screenSize.width * (550 / 600), screen.screenSize.height * (624 / 1024))
    contentBox.flexFlow(dxui.Utils.FLEX_FLOW.COLUMN)
    contentBox.flexAlign(dxui.Utils.FLEX_ALIGN.SPACE_BETWEEN, dxui.Utils.FLEX_ALIGN.CENTER, dxui.Utils.FLEX_ALIGN.START)

    const delaySettingBox = dxui.View.build('delaySettingB ox', contentBox)
    viewUtils._clearStyle(delaySettingBox)
    // delaySettingBox.align(dxui.Utils.ALIGN.TOP_MID, 0, screen.screenSize.height * (140 / 1024))
    delaySettingBox.setSize(screen.screenSize.width * (550 / 600), screen.screenSize.height * (76 / 1024))
    delaySettingBox.borderWidth(1)
    delaySettingBox.setBorderColor(0xDEDEDE)
    delaySettingBox.obj.setStyleBorderSide(dxui.Utils.ENUM.LV_BORDER_SIDE_BOTTOM, 0)

    const delaySettingLbl = dxui.Label.build('delaySettingLbl', delaySettingBox)
    delaySettingLbl.dataI18n = 'doorControlView.openDoorRelayDelay'
    delaySettingLbl.align(dxui.Utils.ALIGN.LEFT_MID, 0, 0)
    delaySettingLbl.textFont(viewUtils.font(26))

    const delaySettingUnitLbl = dxui.Label.build('delaySettingUnitLbl', delaySettingBox)
    delaySettingUnitLbl.dataI18n = "doorControlView.s"
    delaySettingUnitLbl.align(dxui.Utils.ALIGN.RIGHT_MID, 0, 0)
    delaySettingUnitLbl.textFont(viewUtils.font(26))

    const delaySettingInput = viewUtils.input(delaySettingBox, 'delaySettingInput', 2, undefined, 'doorControlView.input')
    delaySettingInput.align(dxui.Utils.ALIGN.RIGHT_MID, -screen.screenSize.width * (60 / 600), 0)
    delaySettingInput.setSize(screen.screenSize.width * (150 / 600), screen.screenSize.height * (60 / 1024))

    const alarmSettingBox = dxui.View.build('alarmSettingBox', contentBox)
    viewUtils._clearStyle(alarmSettingBox)
    // alarmSettingBox.align(dxui.Utils.ALIGN.TOP_MID, 0, screen.screenSize.height * (216 / 1024))
    alarmSettingBox.setSize(screen.screenSize.width * (550 / 600), screen.screenSize.height * (76 / 1024))
    alarmSettingBox.borderWidth(1)
    alarmSettingBox.setBorderColor(0xDEDEDE)
    alarmSettingBox.obj.setStyleBorderSide(dxui.Utils.ENUM.LV_BORDER_SIDE_BOTTOM, 0)

    const alarmSettingLbl = dxui.Label.build('alarmSettingLbl', alarmSettingBox)
    alarmSettingLbl.dataI18n = 'doorControlView.antiTamperAlarm'
    alarmSettingLbl.align(dxui.Utils.ALIGN.LEFT_MID, 0, 0)
    alarmSettingLbl.textFont(viewUtils.font(26))

    const alarmSettingSwitch = dxui.Switch.build('alarmSettingSwitch', alarmSettingBox)
    alarmSettingSwitch.align(dxui.Utils.ALIGN.RIGHT_MID, 0, 0)
    alarmSettingSwitch.setSize(screen.screenSize.width * (70 / 600), screen.screenSize.height * (35 / 1024))
    alarmSettingSwitch.bgColor(0x000000, NativeObject.APP.NativeComponents.NativeEnum.LV_PART_INDICATOR | NativeObject.APP.NativeComponents.NativeEnum.LV_STATE_CHECKED)

    const fireSettingBox = dxui.View.build('fireSettingBox', contentBox)
    viewUtils._clearStyle(fireSettingBox)
    // fireSettingBox.align(dxui.Utils.ALIGN.TOP_MID, 0, screen.screenSize.height * (292 / 1024))
    fireSettingBox.setSize(screen.screenSize.width * (550 / 600), screen.screenSize.height * (76 / 1024))
    fireSettingBox.borderWidth(1)
    fireSettingBox.setBorderColor(0xDEDEDE)
    fireSettingBox.obj.setStyleBorderSide(dxui.Utils.ENUM.LV_BORDER_SIDE_BOTTOM, 0)

    const fireSettingLbl = dxui.Label.build('fireSettingLbl', fireSettingBox)
    fireSettingLbl.dataI18n = 'doorControlView.fireAlarm'
    fireSettingLbl.align(dxui.Utils.ALIGN.LEFT_MID, 0, 0)
    fireSettingLbl.textFont(viewUtils.font(26))

    const fireSettingSwitch = dxui.Switch.build('fireSettingSwitch', fireSettingBox)
    fireSettingSwitch.align(dxui.Utils.ALIGN.RIGHT_MID, 0, 0)
    fireSettingSwitch.setSize(screen.screenSize.width * (70 / 600), screen.screenSize.height * (35 / 1024))
    fireSettingSwitch.bgColor(0x000000, NativeObject.APP.NativeComponents.NativeEnum.LV_PART_INDICATOR | NativeObject.APP.NativeComponents.NativeEnum.LV_STATE_CHECKED)

    const mqttSettingBox = dxui.View.build('mqttSettingBox', contentBox)
    viewUtils._clearStyle(mqttSettingBox)
    // mqttSettingBox.align(dxui.Utils.ALIGN.TOP_MID, 0, screen.screenSize.height * (368 / 1024))
    mqttSettingBox.setSize(screen.screenSize.width * (550 / 600), screen.screenSize.height * (76 / 1024))
    mqttSettingBox.borderWidth(1)
    mqttSettingBox.setBorderColor(0xDEDEDE)
    mqttSettingBox.obj.setStyleBorderSide(dxui.Utils.ENUM.LV_BORDER_SIDE_BOTTOM, 0)

    const mqttSettingLbl = dxui.Label.build('mqttSettingLbl', mqttSettingBox)
    mqttSettingLbl.dataI18n = 'doorControlView.mqttAddr'
    mqttSettingLbl.align(dxui.Utils.ALIGN.LEFT_MID, 0, 0)
    mqttSettingLbl.textFont(viewUtils.font(26))

    const mqttSettingInput = viewUtils.input(mqttSettingBox, 'mqttSettingInput', undefined, undefined, 'doorControlView.input')
    mqttSettingInput.align(dxui.Utils.ALIGN.RIGHT_MID, 0, 0)
    mqttSettingInput.setSize(screen.screenSize.width * (250 / 600), screen.screenSize.height * (60 / 1024))

    const mqttUserSettingBox = dxui.View.build('mqttUserSettingBox', contentBox)
    viewUtils._clearStyle(mqttUserSettingBox)
    // mqttUserSettingBox.align(dxui.Utils.ALIGN.TOP_MID, 0, screen.screenSize.height * (444 / 1024))
    mqttUserSettingBox.setSize(screen.screenSize.width * (550 / 600), screen.screenSize.height * (76 / 1024))
    mqttUserSettingBox.borderWidth(1)
    mqttUserSettingBox.setBorderColor(0xDEDEDE)
    mqttUserSettingBox.obj.setStyleBorderSide(dxui.Utils.ENUM.LV_BORDER_SIDE_BOTTOM, 0)

    const mqttUserSettingLbl = dxui.Label.build('mqttUserSettingLbl', mqttUserSettingBox)
    mqttUserSettingLbl.dataI18n = 'doorControlView.mqttUser'
    mqttUserSettingLbl.align(dxui.Utils.ALIGN.LEFT_MID, 0, 0)
    mqttUserSettingLbl.textFont(viewUtils.font(26))

    const mqttUserSettingInput = viewUtils.input(mqttUserSettingBox, 'mqttUserSettingInput', undefined, undefined, 'doorControlView.input')
    mqttUserSettingInput.align(dxui.Utils.ALIGN.RIGHT_MID, 0, 0)
    mqttUserSettingInput.setSize(screen.screenSize.width * (250 / 600), screen.screenSize.height * (60 / 1024))

    const mqttPwdSettingBox = dxui.View.build('mqttPwdSettingBox', contentBox)
    viewUtils._clearStyle(mqttPwdSettingBox)
    // mqttPwdSettingBox.align(dxui.Utils.ALIGN.TOP_MID, 0, screen.screenSize.height * (540 / 1024))
    mqttPwdSettingBox.setSize(screen.screenSize.width * (550 / 600), screen.screenSize.height * (76 / 1024))
    mqttPwdSettingBox.borderWidth(1)
    mqttPwdSettingBox.setBorderColor(0xDEDEDE)
    mqttPwdSettingBox.obj.setStyleBorderSide(dxui.Utils.ENUM.LV_BORDER_SIDE_BOTTOM, 0)

    const mqttPwdSettingLbl = dxui.Label.build('mqttPwdSettingLbl', mqttPwdSettingBox)
    mqttPwdSettingLbl.dataI18n = 'doorControlView.mqttPwd'
    mqttPwdSettingLbl.align(dxui.Utils.ALIGN.LEFT_MID, 0, 0)
    mqttPwdSettingLbl.textFont(viewUtils.font(26))

    const mqttPwdSettingInput = viewUtils.input(mqttPwdSettingBox, 'mqttPwdSettingInput', undefined, undefined, 'doorControlView.input')
    mqttPwdSettingInput.align(dxui.Utils.ALIGN.RIGHT_MID, 0, 0)
    mqttPwdSettingInput.setSize(screen.screenSize.width * (250 / 600), screen.screenSize.height * (60 / 1024))

    const onlineCheckingSettingBox = dxui.View.build('onlineCheckingSettingBox', contentBox)
    viewUtils._clearStyle(onlineCheckingSettingBox)
    // onlineCheckingSettingBox.align(dxui.Utils.ALIGN.TOP_MID, 0, screen.screenSize.height * (616 / 1024))
    onlineCheckingSettingBox.setSize(screen.screenSize.width * (550 / 600), screen.screenSize.height * (76 / 1024))
    onlineCheckingSettingBox.borderWidth(1)
    onlineCheckingSettingBox.setBorderColor(0xDEDEDE)
    onlineCheckingSettingBox.obj.setStyleBorderSide(dxui.Utils.ENUM.LV_BORDER_SIDE_BOTTOM, 0)

    const onlineCheckingSettingLbl = dxui.Label.build('onlineCheckingSettingLbl', onlineCheckingSettingBox)
    onlineCheckingSettingLbl.dataI18n = 'doorControlView.onlineChecking'
    onlineCheckingSettingLbl.align(dxui.Utils.ALIGN.LEFT_MID, 0, 0)
    onlineCheckingSettingLbl.textFont(viewUtils.font(26))

    const onlineCheckingSettingSwitch = dxui.Switch.build('onlineCheckingSettingSwitch', onlineCheckingSettingBox)
    onlineCheckingSettingSwitch.align(dxui.Utils.ALIGN.RIGHT_MID, 0, 0)
    onlineCheckingSettingSwitch.setSize(screen.screenSize.width * (70 / 600), screen.screenSize.height * (35 / 1024))
    onlineCheckingSettingSwitch.bgColor(0x000000, NativeObject.APP.NativeComponents.NativeEnum.LV_PART_INDICATOR | NativeObject.APP.NativeComponents.NativeEnum.LV_STATE_CHECKED)

    const onlineCheckingTimeoutSettingBox = dxui.View.build('onlineCheckingTimeoutSettingBox', contentBox)
    viewUtils._clearStyle(onlineCheckingTimeoutSettingBox)
    onlineCheckingTimeoutSettingBox.align(dxui.Utils.ALIGN.TOP_MID, 0, screen.screenSize.height * (692 / 1024))
    onlineCheckingTimeoutSettingBox.setSize(screen.screenSize.width * (550 / 600), screen.screenSize.height * (76 / 1024))
    onlineCheckingTimeoutSettingBox.borderWidth(1)
    onlineCheckingTimeoutSettingBox.setBorderColor(0xDEDEDE)
    onlineCheckingTimeoutSettingBox.obj.setStyleBorderSide(dxui.Utils.ENUM.LV_BORDER_SIDE_BOTTOM, 0)

    const onlineCheckingTimeoutSettingLbl = dxui.Label.build('onlineCheckingTimeoutSettingLbl', onlineCheckingTimeoutSettingBox)
    onlineCheckingTimeoutSettingLbl.dataI18n = 'doorControlView.onlineCheckingTimeout'
    onlineCheckingTimeoutSettingLbl.align(dxui.Utils.ALIGN.LEFT_MID, 0, 0)
    onlineCheckingTimeoutSettingLbl.textFont(viewUtils.font(26))

    const onlineCheckingTimeoutSettingUnitLbl = dxui.Label.build('onlineCheckingTimeoutSettingUnitLbl', onlineCheckingTimeoutSettingBox)
    onlineCheckingTimeoutSettingUnitLbl.dataI18n = "doorControlView.s"
    onlineCheckingTimeoutSettingUnitLbl.align(dxui.Utils.ALIGN.RIGHT_MID, 0, 0)
    onlineCheckingTimeoutSettingUnitLbl.textFont(viewUtils.font(26))

    const onlineCheckingTimeoutSettingInput = viewUtils.input(onlineCheckingTimeoutSettingBox, 'onlineCheckingTimeoutSettingInput', 2, undefined, 'doorControlView.input')
    onlineCheckingTimeoutSettingInput.align(dxui.Utils.ALIGN.RIGHT_MID, -screen.screenSize.width * (60 / 600), 0)
    onlineCheckingTimeoutSettingInput.setSize(screen.screenSize.width * (150 / 600), screen.screenSize.height * (60 / 1024))

    const saveBtn = viewUtils.bottomBtn(screenMain, screenMain.id + 'saveBtn', 'doorControlView.save', () => {
        let saveConfigData = {
            access: {
                relayTime: parseInt(delaySettingInput.text()),
                fire: fireSettingSwitch.isSelect() ? 1 : 0
            },
            mqtt: {
                addr: mqttSettingInput.text(),
                username: mqttUserSettingInput.text(),
                password: mqttPwdSettingInput.text(),
                onlinecheck: onlineCheckingSettingSwitch.isSelect() ? 1 : 0,
                timeout: parseInt(onlineCheckingTimeoutSettingInput.text())
            }

        }

        if (screen.driver.device.model != 'vf105') {
            saveConfigData.access.tamper = alarmSettingSwitch.isSelect() ? 1 : 0
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
    saveBtn.align(dxui.Utils.ALIGN.BOTTOM_MID, 0, -screen.screenSize.height * (40 / 1024))

    doorControlView.statusPanel = viewUtils.statusPanel(screenMain, 'doorControlView.success', 'doorControlView.fail')
}

export default doorControlView
