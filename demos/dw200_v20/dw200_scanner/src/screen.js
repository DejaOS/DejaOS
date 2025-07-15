import dxui from '../dxmodules/dxUi.js'
import mainView from './view/mainView.js'
import passwordView from './view/passwordView.js'
import popWin from './view/popWin.js'
import config from '../dxmodules/dxConfig.js'
import std from '../dxmodules/dxStd.js'
import dxNet from '../dxmodules/dxNet.js'
import driver from './driver.js'
import bus from '../dxmodules/dxEventBus.js'
import codeService from './service/codeService.js'
import dxCommon from '../dxmodules/dxCommon.js'
import utils from './common/utils/utils.js'
const screen = {}

screen.init = function () {
    let dir = config.get('sysInfo.rotation')
    if (![0, 1, 2, 3].includes(dir)) {
        dir = 1
    }
    dxui.init({ orientation: dir });
    mainView.init()
    passwordView.init()
    popWin.init()
    dxui.loadMain(mainView.screen_main)

    subscribe()
}

function subscribe () {
    bus.on('netStatusChange', screen.netStatusChange)
    bus.on('tcpConnectedChange', screen.tcpConnectedChange)
    bus.on('reload', screen.reload)
    bus.on('showSystemInfo', screen.showSystemInfo)
    bus.on('customShowMsgAndImg', (data) => {
        let { msg, msgTimeout, img, imgTimeout } = data
        screen.customShowMsgAndImg(msg, msgTimeout, img, imgTimeout)
    })
    bus.on('customPopWin', (data) => {
        let { msg, time, hasBtn, res, hasTitle } = data
        screen.customPopWin(msg, time, hasBtn, res, hasTitle)
    })
    bus.on('success', (data) => {
        let { msg, beep } = data
        screen.success(msg, beep)
    })
    bus.on('fail', (data) => {
        let { msg, beep } = data
        screen.fail(msg, beep)
    })
    bus.on('timeFormat', screen.timeFormat)
}

// 网络连接状态监听
screen.netStatusChange = function (data) {
    let uiConfig = screen.getUIConfig()
    if (data.connected) {
        let ip = dxNet.getModeByCard(config.get("sysInfo.net_type")).param.ip
        mainView.bottom_ip.text("IP:" + ip)
        if (uiConfig.ip_show) {
            mainView.bottom_ip.show()
        } else {
            mainView.bottom_ip.text(" ")
        }
        mainView.top_wifi_disable.hide()
        mainView.top_net_disable.hide()
        if (config.get("sysInfo.net_type") == 2) {
            mainView.top_wifi_enable.show()
        } else {
            mainView.top_net_enable.show()
        }
    } else {
        mainView.bottom_ip.text(" ")
        if (config.get("sysInfo.net_type") == 2) {
            mainView.top_wifi_enable.hide()
            mainView.top_wifi_disable.show()
        } else {
            mainView.top_net_enable.hide()
            mainView.top_net_disable.show()

        }
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
        rotation: configAll['sysInfo.rotation'],
        sn: configAll['sysInfo.sn'],
        ip: configAll['sysInfo.ip'],
        devname: configAll['sysInfo.devname'],
        rotation0BgImage: configAll['sysInfo.rotation0BgImage'],
        rotation1BgImage: configAll['sysInfo.rotation1BgImage'],
        rotation2BgImage: configAll['sysInfo.rotation2BgImage'],
        rotation3BgImage: configAll['sysInfo.rotation3BgImage'],
        sn_show: configAll['sysInfo.sn_show'],
        ip_show: configAll['sysInfo.ip_show'],
        language: configAll['sysInfo.language'],
        show_unlocking: configAll['sysInfo.show_unlocking'],
        buttonText: configAll['sysInfo.buttonText'],
        version: configAll['sysInfo.version'],
        version_show: configAll['sysInfo.version_show'],
        show_date: configAll['sysInfo.show_date'],
        show_devname: configAll['sysInfo.show_devname'],
        netInfo_type: configAll["sysInfo.net_type"],
        dateFormat: configAll["sysInfo.dateFormat"],
        timeFormat: configAll["sysInfo.timeFormat"],
    }
}

// 按键音
screen.press = function () {
    driver.pwm.press()
}

// 密码校验
screen.password = function (password) {
    bus.fire('code', { code: password, source: 'password' })
}

// 成功
screen.success = function (msg, beep) {
    popWin.center_background.show()
    popWin.center_img.source.show()
    popWin.center_img.source('/app/code/resource/image/hint_true.png')
    popWin.center_label.text(msg)
    popWin.center_label.textColor(0x46DE8D)
    popWin.center_bottom_view.bgColor(0x46DE8D)
    std.setTimeout(() => popWin.center_background.hide(), 1500)
    if (beep !== false) {
        std.setTimeout(() => {
            driver.pwm.success()
        }, 100)
    }
}

// 失败
screen.fail = function (msg, beep) {
    popWin.center_background.show()
    popWin.center_img.source('/app/code/resource/image/hint_false.png')
    popWin.center_label.text(msg)
    popWin.center_label.textColor(0xF35F5F)
    popWin.center_bottom_view.bgColor(0xF35F5F)
    std.setTimeout(() => popWin.center_background.hide(), 1500)
    if (beep !== false) {
        std.setTimeout(() => {
            driver.pwm.fail()
        }, 100)
    }
}

// 自定义弹窗内容
screen.customPopWin = function (msg, time, hasBtn, res, hasTitle) {
    if (screen.customPopWinTimer) {
        std.clearTimeout(screen.customPopWinTimer)
    }
    popWin.center_background.show()
    popWin.center_bottom_view.show()
    popWin.center_label.text(msg)
    popWin.center_img.show()
    popWin.center_cont.show()
    if (res === true) {
        popWin.center_label.textColor(0x00BF8A)
        popWin.center_bottom_view.bgColor(0x00BF8A)
        popWin.center_img.source('/app/code/resource/image/hint_true.png')
    } else if (res === false) {
        popWin.center_label.textColor(0xFF0000)
        popWin.center_bottom_view.bgColor(0xFF0000)
        popWin.center_img.source('/app/code/resource/image/hint_false.png')
    } else {
        popWin.center_img.source('/app/code/resource/image/bell.png')
        popWin.center_label.textColor(0xFFA800)
        popWin.center_bottom_view.bgColor(0xFFA800)

    }
    if (hasBtn) {
        popWin.center_close_btn.show()
        popWin.center_bottom_view.hide()
    } else {
        popWin.center_close_btn.hide()
        popWin.center_bottom_view.show()
    }

    if (hasTitle) {
        popWin.center_bottom_view.hide()
        popWin.center_title.show()
        if (config.get("sysInfo.language") == 1) {
            popWin.center_title.text("—— Tips ——")
        } else {
            popWin.center_title.text("—— 温馨提示 ——")
        }
    } else {
        popWin.center_title.hide()
    }

    if (config.get("sysInfo.language") == 1) {
        popWin.center_close_label.text("OK")
    } else {
        popWin.center_close_label.text("好的")
    }

    screen.customPopWinTimer = std.setTimeout(() => {
        popWin.center_background.hide()
        popWin.center_img.hide()
        popWin.center_close_btn.hide()
        // popWin.center_cont.hide()
    }, time ? time : 1500)
}
let homeTimeoutData
let msgTimeoutData
let imgTimeoutData
// 直接展示文字和图片 code=0000&&desc=json&&{"resultCode":"0000","wavFileName":"s","msg":"card\n78945612","img":"1","msgTimeout":2000}
screen.customShowMsgAndImg = function (msg, msgTimeout, img, imgTimeout) {
    if (msg || img) {
        popWin.center_background.show()
        popWin.qrcode.hide()
        popWin.showMsg.hide()
        popWin.showMsgBL.hide()
        popWin.showMsgBM.hide()
        popWin.showMsgBU.hide()
        popWin.showMsgBR.hide()
        popWin.showPic.hide()
        popWin.center_cont.hide()
        popWin.center_img.hide()
        mainView.date_box.hide()
        mainView.screen_btn_unlocking.hide()
        popWin.center_background.bgOpa(0)
        msgTimeout = msgTimeout ? msgTimeout : 2000
        imgTimeout = imgTimeout ? imgTimeout : 2000
        let timeout = msgTimeout > imgTimeout ? msgTimeout : imgTimeout
        if (homeTimeoutData) {
            std.clearTimeout(homeTimeoutData)
        }
        homeTimeoutData = std.setTimeout(() => {
            popWin.center_background.hide()
            popWin.center_cont.show()
            popWin.center_img.show()
            mainView.date_box.show()
            if (config.get("sysInfo.show_unlocking")) {
                mainView.screen_btn_unlocking.show()
            }
            popWin.center_background.bgOpa(50)
        }, timeout)
    }

    if (msg) {
        if (typeof msg == 'object' && msg.dynamic_qr_str) {
            popWin.qrcode.show()
            popWin.qrcode.update(msg.dynamic_qr_str)
        } else if (typeof msg == 'object') {
            let { center, bottom_left, bottom_mid, bottom_right } = msg
            popWin.showMsgBU.text(center)
            popWin.showMsgBL.text(bottom_left)
            popWin.showMsgBM.text(bottom_mid)
            popWin.showMsgBR.text(bottom_right)
            popWin.showMsgBL.show()
            popWin.showMsgBM.show()
            popWin.showMsgBR.show()
            popWin.showMsgBU.show()
        } else {
            popWin.showMsg.text(msg)
            popWin.showMsg.show()
        }
        if (msgTimeoutData) {
            std.clearTimeout(msgTimeoutData)
        }

        msgTimeoutData = std.setTimeout(() => {
            popWin.qrcode.hide()
            popWin.showMsg.hide()
            popWin.showMsgBL.hide()
            popWin.showMsgBM.hide()
            popWin.showMsgBU.hide()
            popWin.showMsgBR.hide()
        }, msgTimeout)
    }
    if (img) {
        popWin.showPic.source('/app/code/resource/image/' + img + '.png')
        popWin.showPic.show()
        if (imgTimeoutData) {
            std.clearTimeout(imgTimeoutData)
        }
        imgTimeoutData = std.setTimeout(() => {
            popWin.showPic.hide()
        }, imgTimeout)
    }

}

//设备信息页面
screen.showSysInfo = function () {
    mainView.date_box.hide()
    popWin.showMsg.text('123456')
    popWin.showMsg.show()
}
// 设备信息展示
screen.showSystemInfo = function (data) {
    let uiConfig = screen.getUIConfig()
    if (data) {
        //开始更新文字
        //隐藏   时间  开锁按钮
        mainView.date_box.hide()
        mainView.screen_btn_unlocking.hide()
        //修改文字
        popWin.sysInfo.show()

        popWin.info.text(uiConfig.language == 1 ? "DEV INFO" : "设备信息")
        popWin.versionInfo.text((uiConfig.language == 1 ? "APP VERSION：" : "应用版本号：") + uiConfig.version)
        popWin.disk.text((uiConfig.language == 1 ? "VERSION：" : " 剩余存储：") + parseInt(dxCommon.getFreedisk() / 1024 / 1024) + "MB")
        popWin.memory.text((uiConfig.language == 1 ? "MEMORY：" : " 剩余内存：") + parseInt(dxCommon.getFreemem() / 1024 / 1024) + "MB")
        popWin.cpu.text((uiConfig.language == 1 ? "CPUUTILIZATION：" : "CPU占用率：") + dxCommon.getFreecpu() + "%")

    } else {
        popWin.sysInfo.hide()
        mainView.date_box.show()
        if (config.get("sysInfo.show_unlocking")) {
            mainView.screen_btn_unlocking.show()
        }
    }
}

// 重新加载当前ui，会根据配置调整ui内容显示
screen.reload = function () {
    dxui.Utils.GG.NativeDisp.lvDispSetRotation(config.get("sysInfo.rotation"))
    dxui.loadMain(screen.screenNow)
}

screen.loop = function () {
    dxui.handler()
}


screen.timeFormat = function () {
    let formatDate = utils.getDateTime()
    let time = screen.getUIConfig().timeFormat == 1 ? `${formatDate.hours}:${formatDate.minutes}` : utils.convertTo12HourFormat(formatDate.hours, formatDate.minutes)
    let date = screen.getUIConfig().dateFormat == 1 ? `${formatDate.year}/${formatDate.month}/${formatDate.day}` : `${formatDate.day}/${formatDate.month}/${formatDate.year}`
    mainView.screen_label_time.text(time)
    mainView.screen_label_data.text(date)
}

let screenTimer = null
screen.showVersion = function () {
    if(screenTimer) {
        return
    }
    let uiConfig = screen.getUIConfig()
    screenTimer = std.setInterval(() => {
        let count = dxui.Utils.GG.NativeDisp.lvDispGetInactiveTime()
        if (count > 15 * 1000) {
            mainView.version.hide()
            std.clearInterval(screenTimer)
            screenTimer = null
        } else {
            mainView.version.show()
            mainView.version.text(uiConfig.version)
        }
    }, 1000)
}

export default screen
