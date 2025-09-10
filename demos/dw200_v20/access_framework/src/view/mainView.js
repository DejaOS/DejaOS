import dxui from '../../dxmodules/dxUi.js'
import std from '../../dxmodules/dxStd.js'
import logger from '../../dxmodules/dxLogger.js'
import utils from '../utils/utils.js'
import viewUtil from './viewUtil.js'

const mainView = {}
let screen = null
mainView.init = function (screenRef) {
    screen = screenRef
    /**************************************************create screen*****************************************************/
    let screen_main = dxui.View.build('screen_main', dxui.Utils.LAYER.MAIN)
    mainView.screen_main = screen_main
    screen_main.scroll(false)
    screen_main.on(dxui.Utils.ENUM.LV_EVENT_SCREEN_LOADED, () => {
        screen.screenNow = screen_main
        let uiConfig = screen.uiConfig
        bottom_sn.text("SN:" + uiConfig.sn)
        if (viewUtil.isVertical(uiConfig.rotation)) {
            // vertical screen
            screen_img.source(uiConfig["rotation" + uiConfig.rotation + "BgImage"])
            top_cont.setSize(320, 28)
            bottom_cont.setSize(320, 28)
            bottom_sn.setSize(160 - 5, 28);
            bottom_ip.setSize(160 - 5, 28);
            date_box.align(dxui.Utils.ALIGN.TOP_MID, 0, 100)
        } else {
            // horizontal screen
            screen_img.source(uiConfig["rotation" + uiConfig.rotation + "BgImage"])
            top_cont.setSize(480, 28)
            bottom_cont.setSize(480, 28)
            bottom_sn.setSize(240 - 5, 28);
            bottom_ip.setSize(240 - 5, 28);
            date_box.align(dxui.Utils.ALIGN.TOP_RIGHT, 0, 30)
        }
        // update time
        mainView.timer = std.setInterval(() => {
            let formatDate = utils.getDateTime()
            if (mainView.lastMinutes != formatDate.minutes) {
                let time = screen.uiConfig.timeFormat == 1 ? `${formatDate.hours}:${formatDate.minutes}` : utils.convertTo12HourFormat(formatDate.hours, formatDate.minutes)
                screen_label_time.text(time)
                mainView.lastMinutes = formatDate.minutes
            }
            let date = screen.uiConfig.dateFormat == 1 ? `${formatDate.year}/${formatDate.month}/${formatDate.day}` : `${formatDate.day}/${formatDate.month}/${formatDate.year}`
            screen_label_data.text(date)
        }, 10000)
        // a network connection icon is not displayed by default
        if (uiConfig.netInfo_type == 2) {
            mainView.top_wifi_disable.show()
        } else if (uiConfig.netInfo_type == 1) {
            mainView.top_net_disable.show()
        }
        // company name update
        if (uiConfig.devname) {
            screen_label_company.text(uiConfig.devname)
        } else {
            screen_label_company.text(" ")
        }
        // sn/ip show/hide
        if (uiConfig.sn_show) {
            bottom_sn.show()
        } else {
            bottom_sn.text(" ")
        }
        if (uiConfig.ip_show) {
            bottom_ip.show()
        } else {
            bottom_ip.text(" ")
        }
        // bottom bar show/hide
        if (uiConfig.statusBar) {
            bottom_cont.show()
        } else {
            bottom_cont.hide()
        }
        // button text settings
        if (uiConfig.buttonText) {
            screen_btn_unlocking_label.text(uiConfig.buttonText)
            screen_btn_unlocking.width(uiConfig.buttonText.length * 30 + 50)
        }
        // password button show/hide
        if (uiConfig.show_unlocking) {
            screen_btn_unlocking.show()
        } else {
            screen_btn_unlocking.hide()
        }
        // switch between chinese and english, cn chinese en english
        switch (uiConfig.language) {
            case 0:
                screen_btn_unlocking_label.text(uiConfig.buttonText)
                access_icon.source('/app/code/resource/image/access_icon.png')
                access_icon.update()
                imageBox.setSize(access_icon.width() + 5, access_icon.height() + 5)
                break;
            case 1:
                screen_btn_unlocking_label.text("OPEN")
                access_icon.source('/app/code/resource/image/access_icon_en.png')
                access_icon.update()
                imageBox.setSize(access_icon.width() + 5, access_icon.height() + 5)
                break;
            default:
                break;
        }
    })
    screen_main.on(dxui.Utils.ENUM.LV_EVENT_SCREEN_UNLOADED, () => {
        std.clearInterval(mainView.timer)
    })
    /**************************************************create background image*****************************************************/
    let screen_img = dxui.Image.build('screen_img', screen_main)
    mainView.screen_img = screen_img
    screen_img.source("/app/code/resource/image/background_90.jpg")
    /**************************************************create version number*****************************************************/
    let version = viewUtil.buildLabel('version', screen_main, 12, "dw200_v20_access_2.0.0")
    mainView.version = version
    version.align(dxui.Utils.ALIGN.TOP_LEFT, 0, 30)
    version.hide()
    /**************************************************create time box*****************************************************/
    let date_box = dxui.View.build('date_box', screen_main)
    mainView.date_box = date_box
    viewUtil.clearStyle(date_box)
    date_box.bgOpa(0)
    date_box.setSize(220, 200)
    date_box.align(dxui.Utils.ALIGN.TOP_RIGHT, 0, 30)
    date_box.flexFlow(dxui.Utils.FLEX_FLOW.COLUMN)
    date_box.flexAlign(dxui.Utils.FLEX_ALIGN.START, dxui.Utils.FLEX_ALIGN.CENTER, dxui.Utils.FLEX_ALIGN.CENTER)
    date_box.obj.lvObjSetStylePadGap(-5, dxui.Utils.ENUM._LV_STYLE_STATE_CMP_SAME)
    /**************************************************create time label*****************************************************/
    let screen_label_time = viewUtil.buildLabel('screen_label_time', date_box, 45, "00:00")
    mainView.screen_label_time = screen_label_time
    /**************************************************create date label*****************************************************/
    let screen_label_data = viewUtil.buildLabel('screen_label_data', date_box, 30, "Sun 00-00")
    mainView.screen_label_data = screen_label_data
    /**************************************************create company name label*****************************************************/
    let screen_label_company = viewUtil.buildLabel('screen_label_company', date_box, 27, "欢迎使用")
    mainView.screen_label_company = screen_label_company
    viewUtil.enableLabelScrolling(screen_label_company, 220)
    /**************************************************create password button*****************************************************/
    let screen_btn_unlocking = dxui.Button.build('screen_btn_unlocking', screen_main)
    mainView.screen_btn_unlocking = screen_btn_unlocking
    screen_btn_unlocking.setSize(120, 50)
    screen_btn_unlocking.bgColor(0x000000)
    screen_btn_unlocking.bgOpa(30)
    screen_btn_unlocking.align(dxui.Utils.ALIGN.BOTTOM_MID, 0, -64);
    screen_btn_unlocking.on(dxui.Utils.EVENT.CLICK, () => {
        screen.openPassword()
    })
    /**************************************************create password label*****************************************************/
    let screen_btn_unlocking_label = viewUtil.buildLabel('screen_btn_unlocking_label', screen_btn_unlocking, 30, "密码")
    mainView.screen_btn_unlocking_label = screen_btn_unlocking_label
    screen_btn_unlocking_label.align(dxui.Utils.ALIGN.CENTER, 0, 0)
    /**************************************************create top container*****************************************************/
    let top_cont = dxui.View.build('top_cont', screen_main)
    viewUtil.clearStyle(top_cont)
    top_cont.setSize(480, 28)
    top_cont.bgOpa(30)
    top_cont.bgColor(0x000000)
    top_cont.flexFlow(dxui.Utils.FLEX_FLOW.ROW)
    top_cont.flexAlign(dxui.Utils.FLEX_ALIGN.SPACE_BETWEEN, dxui.Utils.FLEX_ALIGN.CENTER, dxui.Utils.FLEX_ALIGN.CENTER)
    let imageBox = dxui.View.build('imageBox', top_cont)
    let access_icon = dxui.Image.build('access_icon', imageBox)
    imageBox.borderWidth(0)
    imageBox.bgOpa(0)
    imageBox.scroll(false)
    access_icon.source('/app/code/resource/image/access_icon.png')
    access_icon.align(dxui.Utils.ALIGN.CENTER, 0, 0)
    imageBox.on(dxui.Utils.EVENT.CLICK, () => {
        mainView.version.show()
        mainView.version.text(screen.uiConfig.version)
        std.setTimeout(() => {
            mainView.version.hide()
        }, 10000)
    })
    /**************************************************create the container on the top right*****************************************************/
    let top_right = dxui.View.build('top_right', top_cont)
    viewUtil.clearStyle(top_right)
    top_right.setSize(180, 28)
    top_right.bgOpa(0)
    top_right.bgColor(0x000000)
    top_right.flexFlow(dxui.Utils.FLEX_FLOW.ROW)
    top_right.flexAlign(dxui.Utils.FLEX_ALIGN.END, dxui.Utils.FLEX_ALIGN.CENTER, dxui.Utils.FLEX_ALIGN.CENTER)
    /**************************************************create a wifi network status display image*****************************************************/
    let top_wifi_enable = viewUtil.buildIcon('top_wifi_enable', top_right, 'wifi_enable.png')
    mainView.top_wifi_enable = top_wifi_enable
    /**************************************************create a picture of the wifi network status that is always displayed*****************************************************/
    let top_wifi_disable = viewUtil.buildIcon('top_wifi_disable', top_right, 'wifi_disable.png')
    mainView.top_wifi_disable = top_wifi_disable
    /**************************************************create a picture of the network status that is always displayed*****************************************************/
    let top_net_disable = viewUtil.buildIcon('top_net_disable', top_right, 'eth_disable.png')
    mainView.top_net_disable = top_net_disable
    /**************************************************create a picture of the network status that is always displayed*****************************************************/
    let top_net_enable = viewUtil.buildIcon('top_net_enable', top_right, 'eth_enable.png')
    mainView.top_net_enable = top_net_enable
    /**************************************************create an image that is always displayed for the mqtt status*****************************************************/
    let top_mqtt = viewUtil.buildIcon('top_mqtt', top_right, 'mqtt_enable.png')
    mainView.top_mqtt = top_mqtt
    /**************************************************create bottom container*****************************************************/
    let bottom_cont = dxui.View.build('bottom_cont', screen_main)
    viewUtil.clearStyle(bottom_cont)
    bottom_cont.setSize(480, 28)
    bottom_cont.bgOpa(30)
    bottom_cont.bgColor(0x000000)
    bottom_cont.align(dxui.Utils.ALIGN.BOTTOM_MID, 0, 0)
    bottom_cont.flexFlow(dxui.Utils.FLEX_FLOW.ROW)
    bottom_cont.flexAlign(dxui.Utils.FLEX_ALIGN.SPACE_BETWEEN, dxui.Utils.FLEX_ALIGN.CENTER, dxui.Utils.FLEX_ALIGN.CENTER)
    /**************************************************display device sn*****************************************************/
    let bottom_sn = viewUtil.buildLabel('bottom_sn', bottom_cont, 19, " ")
    mainView.bottom_sn = bottom_sn
    viewUtil.enableLabelScrolling(bottom_sn, 240 - 5)
    bottom_sn.textAlign(dxui.Utils.TEXT_ALIGN.LEFT)
    /**************************************************display device ip*****************************************************/
    let bottom_ip = viewUtil.buildLabel('bottom_ip', bottom_cont, 19, " ")
    mainView.bottom_ip = bottom_ip
    viewUtil.enableLabelScrolling(bottom_ip, 240 - 5)
    bottom_ip.textAlign(dxui.Utils.TEXT_ALIGN.RIGHT)

}
// network connection status monitoring
mainView.netStatusChange = function (data) {
    if (data == "connected") {
        screen.reloadUiConfig()
        let ip = screen.uiConfig.ip
        mainView.bottom_ip.text("IP:" + ip)
        if (screen.uiConfig.ip_show) {
            mainView.bottom_ip.show()
        } else {
            mainView.bottom_ip.text(" ")
        }
        mainView.top_wifi_disable.hide()
        mainView.top_net_disable.hide()
        if (screen.uiConfig.netInfo_type == 2) {
            mainView.top_wifi_enable.show()
        } else {
            mainView.top_net_enable.show()
        }
    } else {
        mainView.bottom_ip.text(" ")
        if (screen.uiConfig.netInfo_type == 2) {
            mainView.top_wifi_enable.hide()
            mainView.top_wifi_disable.show()
        } else {
            mainView.top_net_enable.hide()
            mainView.top_net_disable.show()
        }
    }
}

// tcp connection status monitoring
mainView.tcpConnectedChange = function (data) {
    if (data == "connected") {
        mainView.top_tcp.show()
    } else {
        mainView.top_tcp.hide()
    }
}
// mqtt connection status
mainView.mqttConnectedChange = function (data) {
    if (data == "connected") {
        mainView.top_mqtt.show()
    } else if (data == "disconnected") {
        mainView.top_mqtt.hide()
    }
}

mainView.timeFormat = function () {
    let formatDate = utils.getDateTime()
    let time = screen.uiConfig.timeFormat == 1 ? `${formatDate.hours}:${formatDate.minutes}` : utils.convertTo12HourFormat(formatDate.hours, formatDate.minutes)
    let date = screen.uiConfig.dateFormat == 1 ? `${formatDate.year}/${formatDate.month}/${formatDate.day}` : `${formatDate.day}/${formatDate.month}/${formatDate.year}`
    mainView.screen_label_time.text(time)
    mainView.screen_label_data.text(date)
}
export default mainView