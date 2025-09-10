// UI Controller: Manages all UI-related logic, including screen display, 
// user interactions, and view updates.
import dxui from '../../dxmodules/dxUi.js'
import config from '../service/config.js'
import std from '../../dxmodules/dxStd.js'
import bus from '../../dxmodules/dxEventBus.js'
import log from '../../dxmodules/dxLogger.js'
import viewUtil from '../view/viewUtil.js'
import pwm from '../../dxmodules/dxPwm.js'

import mainView from '../view/mainView.js'
import passwordView from '../view/passwordView.js'
import popWin from '../view/popWin.js'

const screen = {}

screen.reloadUiConfig = function () {
    screen.uiConfig =
    {
        rotation: config.get("uiInfo.rotation"),
        sn: config.get("sysInfo.sn"),
        ip: config.get('netInfo.ip'),
        devname: config.get("sysInfo.deviceName"),
        background: config.get("uiInfo.background"),
        fontPath: config.get("uiInfo.fontPath"),
        rotation0BgImage: config.get("uiInfo.rotation0BgImage"),
        rotation1BgImage: config.get("uiInfo.rotation1BgImage"),
        rotation2BgImage: config.get("uiInfo.rotation2BgImage"),
        rotation3BgImage: config.get("uiInfo.rotation3BgImage"),
        verBgImage: config.get("uiInfo.verBgImage"),
        horBgImage: config.get("uiInfo.horBgImage"),
        sn_show: config.get("uiInfo.sn_show"),
        ip_show: config.get("uiInfo.ip_show"),
        statusBar: config.get("uiInfo.statusBar"),
        language: config.get("sysInfo.language"),
        show_unlocking: config.get("uiInfo.show_unlocking"),
        buttonText: config.get("uiInfo.buttonText"),
        version: config.get("sysInfo.appVersion"),
        version_show: config.get("sysInfo.version_show"),
        netInfo_type: config.get("netInfo.type"),
        dateFormat: config.get("sysInfo.dateFormat"),
        timeFormat: config.get("sysInfo.timeFormat"),
    }
    viewUtil.fontPath = screen.uiConfig.fontPath
    return screen.uiConfig
}
// key tone
screen.press = function () {
    pwm.pressBeep()
}
screen.success = function () {
    pwm.successBeep()
}
screen.fail = function () {
    pwm.failBeep()
}
screen.warning = function () {
    pwm.warningBeep()
}
screen.openPassword = function () {
    screen.press()
    dxui.loadMain(passwordView.screen_password)
}
screen.backmain = function () {
    dxui.loadMain(mainView.screen_main)
}
// password verification
screen.password = function (password) {
    bus.fire(config.events.access.PASSWORD_PASS, { "type": 400, "code": password })
}

// Reload the current ui, the ui content will be adjusted according to the configuration
screen.reload = function () {
    screen.reloadUiConfig()
    dxui.Utils.GG.NativeDisp.lvDispSetRotation(screen.uiConfig.rotation)
    dxui.loadMain(screen.screenNow)
}

function events() {
    bus.on(config.events.net.CONNECTED_CHANGED, mainView.netStatusChange)
    bus.on(config.events.tcp.CONNECTED_CHANGED, mainView.tcpConnectedChange)
    bus.on(config.events.mqtt.CONNECTED_CHANGED, mainView.mqttConnectedChange)
    bus.on(config.events.ui.DISPLAY_RESULTS, popWin.displayResults)
    bus.on(config.events.ui.RELOAD, screen.reload)
    bus.on(config.events.ui.SHOW_MSG, popWin.showPopMsg)
    bus.on(config.events.ui.SHOW_PIC, popWin.showPopPic)
    bus.on(config.events.ui.WARNING, popWin.warning)
    bus.on(config.events.ui.TIME_FORMAT, mainView.timeFormat)
    bus.on(config.events.ui.CUSTOM_POP_WIN, (data) => {
        let { msg, time } = data
        popWin.customPopWin(msg, time)
    })
}

function run() {
    try {
        screen.reloadUiConfig()
        dxui.init({ orientation: screen.uiConfig.rotation });
        mainView.init(screen)
        passwordView.init(screen)
        popWin.init(screen)
        dxui.loadMain(mainView.screen_main)
        events()
    } catch (e) {
        log.error('uiworker.init', e)
    }
}
run()

std.setInterval(() => {
    try {
        dxui.handler()
    } catch (e) {
        log.error('uiworker.loop', e)
    }
}, 20)