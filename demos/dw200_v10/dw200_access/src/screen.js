import dxui from '../dxmodules/dxUi.js'
import mainView from './view/mainView.js'
import passwordView from './view/passwordView.js'
import popWin from './view/popWin.js'
import config from '../dxmodules/dxConfig.js'
import std from '../dxmodules/dxStd.js'
import dxNet from '../dxmodules/dxNet.js'
import driver from './driver.js'
import bus from '../dxmodules/dxEventBus.js'
import utils from './common/utils/utils.js'
import codeService from './service/codeService.js'
const screen = {}

screen.init = function () {
    let dir = config.get('uiInfo.rotation')
    if (![0, 1, 2, 3].includes(dir)) {
        dir = 1
    }
    screen.fontPath = (utils.isEmpty(config.get("uiInfo.fontPath")) || !std.exist(config.get("uiInfo.fontPath"))) ? '/app/code/resource/font/PangMenZhengDaoBiaoTiTi-1.ttf' : config.get("uiInfo.fontPath")

    dxui.init({ orientation: dir });
    mainView.init()
    passwordView.init()
    popWin.init()
    dxui.loadMain(mainView.screen_main)

    subscribe()
}

function subscribe() {
    bus.on('netStatusChange', screen.netStatusChange)
    bus.on('mqttConnectedChange', screen.mqttConnectedChange)
    bus.on('displayResults', screen.displayResults)
    bus.on('reload', screen.reload)
    bus.on('showMsg', screen.showMsg)
    bus.on('showPic', screen.showPic)
    bus.on('warning', screen.warning)
    bus.on('fail', screen.fail)
    bus.on('success', screen.success)
}

// 网络连接状态监听
screen.netStatusChange = function (data) {
    if (data.connected) {
        let ip = dxNet.getModeByCard(dxNet.TYPE.ETHERNET).param.ip
        mainView.bottom_ip.text("IP:" + ip)
        if (config.get("uiInfo.ip_show")) {
            mainView.bottom_ip.show()
        }
        mainView.top_net_disable.hide()
        mainView.top_net_enable.show()
    } else {
        mainView.bottom_ip.text(" ")
        mainView.top_net_disable.show()
        mainView.top_net_enable.hide()
    }
    mainView.bottom_ip.longMode(dxui.Utils.LABEL_LONG_MODE.SCROLL_CIRCULAR)
}

// tcp连接状态监听
screen.tcpConnectedChange = function (data) {
    if (data == "connected") {
        mainView.top_tcp.show()
    } else {
        mainView.top_tcp.hide()
    }
}

// 获取ui相关配置
screen.getUIConfig = function () {
    let configAll = config.getAll()
    return {
        rotation: configAll["uiInfo.rotation"],
        sn: configAll["sysInfo.sn"],
        ip: configAll['netInfo.ip'],
        devname: configAll["sysInfo.deviceName"],
        background: configAll["uiInfo.background"],
        rotation0BgImage: configAll["uiInfo.rotation0BgImage"],
        rotation1BgImage: configAll["uiInfo.rotation1BgImage"],
        rotation2BgImage: configAll["uiInfo.rotation2BgImage"],
        rotation3BgImage: configAll["uiInfo.rotation3BgImage"],
        verBgImage: configAll["uiInfo.verBgImage"],
        horBgImage: configAll["uiInfo.horBgImage"],
        sn_show: configAll["uiInfo.sn_show"],
        ip_show: configAll["uiInfo.ip_show"],
        statusBar: configAll["uiInfo.statusBar"],
        language: configAll["sysInfo.language"],
        show_unlocking: configAll["uiInfo.show_unlocking"],
        // buttonText: configAll["uiInfo.buttonText"],
        version: configAll["sysInfo.appVersion"],
        version_show: configAll["sysInfo.version_show"],
        show_date: configAll['uiInfo.show_date'],
        show_devname: configAll['uiInfo.show_devname'],
    }
}

// 按键音
screen.press = function () {
    driver.pwm.press()
}

// 密码校验
screen.password = function (password) {
    bus.fire('password', { "type": 400, "code": password })
}

let popTimer
// 成功
screen.success = function (msg, beep) {
    if (popTimer) {
        std.clearTimeout(popTimer)
        popTimer = undefined
    }
    popWin.center_background.show()
    popWin.center_img.source('/app/code/resource/image/hint_true.png')
    popWin.center_label.text(msg)
    popWin.center_label.longMode(dxui.Utils.LABEL_LONG_MODE.SCROLL_CIRCULAR)
    popWin.center_label.textColor(0x46DE8D)
    popWin.center_bottom_view.bgColor(0x46DE8D)

    let label_width = 0
    for (let i = 0; i < msg.length; i++) {
        let dsc = popWin.font32.obj.lvFontGetGlyphDsc(msg.charCodeAt(i), msg.charCodeAt(i + 1))
        label_width += dsc.adv_w
    }
    let time = (label_width - popWin.center_label.width()) * 30

    popTimer = std.setTimeout(() => {
        popWin.center_background.hide()
    }, time > 2000 ? time : 2000)

    if (beep !== false) {
        std.setTimeout(() => {
            driver.pwm.success()
        }, 100)
    }
}

// 失败
screen.fail = function (msg, beep) {
    if (popTimer) {
        std.clearTimeout(popTimer)
        popTimer = undefined
    }
    popWin.center_background.show()
    popWin.center_img.source('/app/code/resource/image/hint_false.png')
    popWin.center_label.text(msg)
    popWin.center_label.longMode(dxui.Utils.LABEL_LONG_MODE.SCROLL_CIRCULAR)
    popWin.center_label.textColor(0xF35F5F)
    popWin.center_bottom_view.bgColor(0xF35F5F)

    let label_width = 0
    for (let i = 0; i < msg.length; i++) {
        let dsc = popWin.font32.obj.lvFontGetGlyphDsc(msg.charCodeAt(i), msg.charCodeAt(i + 1))
        label_width += dsc.adv_w
    }
    let time = (label_width - popWin.center_label.width()) * 30

    popTimer = std.setTimeout(() => {
        popWin.center_background.hide()
    }, time > 2000 ? time : 2000)
    if (beep !== false) {
        std.setTimeout(() => {
            driver.pwm.fail()
        }, 100)
    }
}
// 警告
screen.warning = function (data) {
    if (popTimer) {
        std.clearTimeout(popTimer)
        popTimer = undefined
    }
    popWin.center_background.show()
    popWin.center_img.source('/app/code/resource/image/bell.png')
    popWin.center_label.text(data.msg)
    popWin.center_label.longMode(dxui.Utils.LABEL_LONG_MODE.SCROLL_CIRCULAR)
    popWin.center_label.textColor(0xfbbc1a)
    popWin.center_bottom_view.bgColor(0xfbbc1a)

    let label_width = 0
    for (let i = 0; i < data.msg.length; i++) {
        let dsc = popWin.font32.obj.lvFontGetGlyphDsc(data.msg.charCodeAt(i), data.msg.charCodeAt(i + 1))
        label_width += dsc.adv_w
    }
    let time = (label_width - popWin.center_label.width()) * 30

    popTimer = std.setTimeout(() => {
        popWin.center_background.hide()
    }, data.timeout ? data.timeout : (time > 2000 ? time : 2000))
    if (data.beep !== false) {
        std.setTimeout(() => {
            driver.pwm.warning()
        }, 100)
    }
}

// 自定义弹窗内容
screen.customPopWin = function (msg, time) {
    if (popTimer) {
        std.clearTimeout(popTimer)
        popTimer = undefined
    }
    popWin.center_background.show()
    popWin.center_img.hide()
    popWin.center_label.text(msg)
    popWin.center_label.longMode(dxui.Utils.LABEL_LONG_MODE.SCROLL_CIRCULAR)
    popWin.center_label.textColor(0)
    popWin.center_bottom_view.bgColor(0)

    let label_width = 0
    for (let i = 0; i < msg.length; i++) {
        let dsc = popWin.font32.obj.lvFontGetGlyphDsc(msg.charCodeAt(i), msg.charCodeAt(i + 1))
        label_width += dsc.adv_w
    }
    let time1 = (label_width - popWin.center_label.width()) * 30

    popTimer = std.setTimeout(() => {
        popWin.center_background.hide()
        popWin.center_img.show()
    }, time ? time : (time1 > 2000 ? time1 : 2000))
}

// 直接展示文字和图片
screen.customShowMsgAndImg = function (msg, msgTimeout, img, imgTimeout) {
    if (msg || img) {
        popWin.center_background.show()
        popWin.center_cont.hide()
        popWin.center_img.hide()
        mainView.date_box.hide()
        mainView.screen_btn_unlocking.hide()
        popWin.center_background.bgOpa(0)
        msgTimeout = msgTimeout ? msgTimeout : 0
        imgTimeout = imgTimeout ? imgTimeout : 0
        std.setTimeout(() => {
            popWin.center_background.hide()
            popWin.center_cont.show()
            popWin.center_img.show()
            mainView.date_box.show()
            mainView.screen_btn_unlocking.show()
            popWin.center_background.bgOpa(50)
        }, msgTimeout > imgTimeout ? msgTimeout : imgTimeout)
    }

    if (msg) {
        popWin.showMsg.text(msg)
        popWin.showMsg.show()
        std.setTimeout(() => {
            popWin.showMsg.hide()
        }, msgTimeout ? msgTimeout : 0)
    }

    if (img) {
        popWin.showPic.source('/app/code/resource/image/' + img + '.png')
        popWin.showPic.show()
        std.setTimeout(() => {
            popWin.showPic.hide()
        }, imgTimeout ? imgTimeout : 0)
    }
}

// mqtt连接状态
screen.mqttConnectedChange = function (data) {
    if (data == "connected") {
        mainView.top_mqtt.show()
    } else if (data == "disconnected") {
        mainView.top_mqtt.hide()
    }
}

/**
 * 显示弹窗
 * @param {*} param param.flag:true|false成功|失败；param.type:类型
 * @returns 
 */
screen.displayResults = function (param) {

    if (!param) {
        return
    }
    let res = "失败"
    // 除非language为EN,否则默认中文
    let isEn = config.get("sysInfo.language") == "EN"
    if (isEn) {
        res = param.flag ? "success!" : "fail!"
        if (param.msg && param.flag == false) {
            res = res + "原因为：" + param.msg
        }
    } else {
        res = (param.flag ? "成功！" : "失败！")
        if (param.msg && param.flag == false) {
            res = res + "原因为：" + param.msg
        }
    }
    let msg = ""
    switch (parseInt(param.type)) {
        case 100:
        case 101:
        case 103:
            msg = (isEn ? "qr code verify " : "扫码验证")
            break;
        case 200:
        case 203:
            msg = (isEn ? "card verify " : "刷卡验证")
            break;
        case 400:
            msg = (isEn ? "password verify " : "密码验证")
            break;
        case 500:
            msg = (isEn ? "online verify" : "在线验证")
            break;
        case 600:
            msg = (isEn ? "bluetooth verify " : "蓝牙验证")
            break;
        case 800:
            msg = (isEn ? "open by press button " : "按键开门")
            break;
        case 900:
            msg = (isEn ? "remote open " : "远程开门")
            break;
        default:
            break;
    }
    if (msg === "" && param.type == "disable") {
        msg = isEn ? "Device disabled" : "设备已禁用"
    } else {
        msg += res
    }
    if (param.flag) {
        screen.success(msg)
    } else {
        screen.fail(msg)
    }
}

// 展示文字
// eg:{msg:'',time:1000}
screen.showMsg = function (param) {
    screen.customPopWin(param.msg, param.time)
}

// 展示图片
// eg:{time:1000,img:'a'}
screen.showPic = function (param) {
    this.customShowMsgAndImg(null, null, param.img, param.time)
}

// 重新加载当前ui，会根据配置调整ui内容显示
screen.reload = function () {
    let dir = config.get('uiInfo.rotation')
    if (![0, 1, 2, 3].includes(dir)) {
        dir = 1
    }
    dxui.Utils.GG.NativeDisp.lvDispSetRotation(dir)
    dxui.loadMain(screen.screenNow)
}

screen.loop = function () {
    dxui.handler()
}

export default screen
