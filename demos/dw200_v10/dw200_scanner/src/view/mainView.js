import dxui from '../../dxmodules/dxUi.js'
import std from '../../dxmodules/dxStd.js'
import screen from '../screen.js'
import utils from '../common/utils/utils.js'
import passwordView from './passwordView.js'
import popWin from './popWin.js'
import driver from '../driver.js'
const mainView = {}
mainView.init = function () {
    /**************************************************创建屏幕*****************************************************/
    let screen_main = dxui.View.build('screen_main', dxui.Utils.LAYER.MAIN)
    mainView.screen_main = screen_main
    screen_main.scroll(false)
    screen_main.on(dxui.Utils.ENUM.LV_EVENT_SCREEN_LOADED, () => {
        screen.screenNow = screen_main
        let uiConfig = screen.getUIConfig()
        bottom_sn.text("SN:" + uiConfig.sn)
        if (uiConfig.rotation == 0 || uiConfig.rotation == 2) {
            // 竖屏
            screen_img.source(uiConfig["rotation" + uiConfig.rotation + "BgImage"])
            top_cont.setSize(320, 28)
            bottom_cont.setSize(320, 28)
            bottom_sn.setSize(160 - 5, 28);
            bottom_ip.setSize(160 - 5, 28);
            date_box.align(dxui.Utils.ALIGN.TOP_MID, 0, 100)
        } else {
            // 横屏
            screen_img.source(uiConfig["rotation" + uiConfig.rotation + "BgImage"])
            top_cont.setSize(480, 28)
            bottom_cont.setSize(480, 28)
            bottom_sn.setSize(240 - 5, 28);
            bottom_ip.setSize(240 - 5, 28);
            date_box.align(dxui.Utils.ALIGN.TOP_RIGHT, 0, 30)
        }
        // 更新时间
        mainView.timer = std.setInterval(() => {
            let formatDate = utils.getDateTime()
            if (mainView.lastMinutes != formatDate.minutes) {
                screen_label_time.text(formatDate.hours + ":" + formatDate.minutes)
                mainView.lastMinutes = formatDate.minutes
            }
            if (mainView.lastDay != formatDate.day) {
                screen_label_data.text(`${formatDate.dayTextEn} ${formatDate.month}-${formatDate.day}`)
                mainView.lastDay = formatDate.day
            }
            // 十分钟设置一次
            if (!mainView.lastSec || (new Date().getTime() - mainView.lastSec > 600000)) {
                screen_label_company.longMode(dxui.Utils.LABEL_LONG_MODE.SCROLL_CIRCULAR)
                bottom_sn.longMode(dxui.Utils.LABEL_LONG_MODE.SCROLL_CIRCULAR)
                bottom_ip.longMode(dxui.Utils.LABEL_LONG_MODE.SCROLL_CIRCULAR)
                mainView.lastSec = new Date().getTime()
            }
        }, 1000)
        // 公司名称更新
        screen_label_company.text(uiConfig.devname)
        popWin.sysInfo.hide()
        mainView.date_box.show()
        // sn/ip显示/隐藏
        if (uiConfig.sn_show) {
            bottom_sn.show()
        } else {
            bottom_sn.text(" ")
        }
        if (uiConfig.ip_show) {
            bottom_ip.show()
            if (driver.net.getStatus()) {
                bottom_ip.text("IP:" + uiConfig.ip)
            }

        } else {
            bottom_ip.text(" ")
        }
        // 按钮文字设置
        if (uiConfig.buttonText) {
            screen_btn_unlocking_label.text(uiConfig.buttonText)
            screen_btn_unlocking.width(uiConfig.buttonText.length * 30 + 50)
        }
        // 密码按钮显示/隐藏
        if (uiConfig.show_unlocking) {
            screen_btn_unlocking.show()
        } else {
            screen_btn_unlocking.hide()
        }
        // 中英文切换，0中文1英文
        switch (uiConfig.language) {
            case 0:
                screen_btn_unlocking_label.text(uiConfig.buttonText)
                break;
            case 1:
                screen_btn_unlocking_label.text("OPEN")
                break;
            default:
                break;
        }
        // 隐藏版本号
        if (uiConfig.version_show) {
            version.text(uiConfig.version)
            version.show()
        } else {
            version.hide()
        }
        if (uiConfig.show_date) {
            screen_label_time.show()
            screen_label_data.show()
        } else {
            screen_label_time.hide()
            screen_label_data.hide()
        }
        if (uiConfig.show_devname) {
            screen_label_company.show()
        } else {
            screen_label_company.hide()
        }
    })
    screen_main.on(dxui.Utils.ENUM.LV_EVENT_SCREEN_UNLOADED, () => {
        std.clearInterval(mainView.timer)
    })
    /**************************************************创建背景图片*****************************************************/
    let screen_img = dxui.Image.build('screen_img', screen_main)
    mainView.screen_img = screen_img
    screen_img.source("/app/code/resource/image/background_90.png")
    /**************************************************创建版本号*****************************************************/
    let version = buildLabel('version', screen_main, 12, "dw200_access_v1.0.0")
    mainView.version = version
    version.hide()
    /**************************************************创建时间盒子*****************************************************/
    let date_box = dxui.View.build('date_box', screen_main)
    mainView.date_box = date_box
    clearStyle(date_box)
    date_box.bgOpa(0)
    date_box.setSize(220, 200)
    date_box.align(dxui.Utils.ALIGN.TOP_RIGHT, 0, 30)
    date_box.flexFlow(dxui.Utils.FLEX_FLOW.COLUMN)
    date_box.flexAlign(dxui.Utils.FLEX_ALIGN.START, dxui.Utils.FLEX_ALIGN.CENTER, dxui.Utils.FLEX_ALIGN.CENTER)
    date_box.obj.lvObjSetStylePadGap(-5, dxui.Utils.ENUM._LV_STYLE_STATE_CMP_SAME)
    /**************************************************创建时间Label*****************************************************/
    let screen_label_time = buildLabel('screen_label_time', date_box, 60, "00:00")
    /**************************************************创建DateLabel*****************************************************/
    let screen_label_data = buildLabel('screen_label_data', date_box, 30, "Sun 00-00")
    /**************************************************创建公司名称Label*****************************************************/
    let screen_label_company = buildLabel('screen_label_company', date_box, 27, "欢迎使用")
    mainView.screen_label_company = screen_label_company
    screen_label_company.width(220);
    screen_label_company.longMode(dxui.Utils.LABEL_LONG_MODE.SCROLL_CIRCULAR)
    /**************************************************创建密码按钮*****************************************************/
    let screen_btn_unlocking = dxui.Button.build('screen_btn_unlocking', screen_main)
    mainView.screen_btn_unlocking = screen_btn_unlocking
    screen_btn_unlocking.setSize(120, 50)
    screen_btn_unlocking.bgColor(0x000000)
    screen_btn_unlocking.bgOpa(30)
    screen_btn_unlocking.align(dxui.Utils.ALIGN.BOTTOM_MID, 0, -64);
    screen_btn_unlocking.on(dxui.Utils.EVENT.CLICK, () => {
        screen.press()
        dxui.loadMain(passwordView.screen_password)
    })
    /**************************************************创建密码Label*****************************************************/
    let screen_btn_unlocking_label = buildLabel('screen_btn_unlocking_label', screen_btn_unlocking, 30, "")
    mainView.screen_btn_unlocking_label = screen_btn_unlocking_label
    screen_btn_unlocking_label.align(dxui.Utils.ALIGN.CENTER, 0, 0)
    /**************************************************创建上方容器*****************************************************/
    let top_cont = dxui.View.build('top_cont', screen_main)
    clearStyle(top_cont)
    top_cont.setSize(480, 28)
    top_cont.bgOpa(30)
    top_cont.bgColor(0x000000)
    top_cont.flexFlow(dxui.Utils.FLEX_FLOW.ROW)
    top_cont.flexAlign(dxui.Utils.FLEX_ALIGN.END, dxui.Utils.FLEX_ALIGN.CENTER, dxui.Utils.FLEX_ALIGN.CENTER)
    /**************************************************创建网络状态常显示图片*****************************************************/
    let top_net_disable = dxui.Image.build('top_net_disable', top_cont)
    mainView.top_net_disable = top_net_disable
    top_net_disable.source('/app/code/resource/image/eth_disable.png')
    /**************************************************创建网络状态常显示图片*****************************************************/
    let top_net_enable = dxui.Image.build('top_net_enable', top_cont)
    mainView.top_net_enable = top_net_enable
    top_net_enable.source('/app/code/resource/image/eth_enable.png')
    top_net_enable.hide()
    /**************************************************创建tcp状态常显示图片*****************************************************/
    let top_tcp = dxui.Image.build('top_tcp', top_cont)
    mainView.top_tcp = top_tcp
    top_tcp.source('/app/code/resource/image/tcp_enable.png')
    top_tcp.hide()
    /**************************************************创建下方容器*****************************************************/
    let bottom_cont = dxui.View.build('bottom_cont', screen_main)
    clearStyle(bottom_cont)
    bottom_cont.setSize(480, 28)
    bottom_cont.bgOpa(30)
    bottom_cont.bgColor(0x000000)
    bottom_cont.align(dxui.Utils.ALIGN.BOTTOM_MID, 0, 0)
    bottom_cont.flexFlow(dxui.Utils.FLEX_FLOW.ROW)
    bottom_cont.flexAlign(dxui.Utils.FLEX_ALIGN.SPACE_BETWEEN, dxui.Utils.FLEX_ALIGN.CENTER, dxui.Utils.FLEX_ALIGN.CENTER)
    /**************************************************显示设备SN*****************************************************/
    let bottom_sn = buildLabel('bottom_sn', bottom_cont, 19, " ")
    mainView.bottom_sn = bottom_sn
    bottom_sn.longMode(dxui.Utils.LABEL_LONG_MODE.SCROLL_CIRCULAR)
    bottom_sn.width(240 - 5);
    bottom_sn.textAlign(dxui.Utils.TEXT_ALIGN.LEFT)
    bottom_sn.hide()
    /**************************************************显示设备ip*****************************************************/
    let bottom_ip = buildLabel('bottom_ip', bottom_cont, 19, " ")
    mainView.bottom_ip = bottom_ip
    bottom_ip.longMode(dxui.Utils.LABEL_LONG_MODE.SCROLL_CIRCULAR)
    bottom_ip.width(240 - 5);
    bottom_ip.textAlign(dxui.Utils.TEXT_ALIGN.RIGHT)
}

function buildLabel(id, parent, size, text) {
    let label = dxui.Label.build(id, parent)
    let font60 = dxui.Font.build('/app/code/resource/font/PangMenZhengDaoBiaoTiTi-1.ttf', size, dxui.Utils.FONT_STYLE.NORMAL)
    label.textFont(font60)
    label.textColor(0xFFFFFF)
    label.text(text)
    label.textAlign(dxui.Utils.TEXT_ALIGN.CENTER)
    return label
}

function clearStyle(obj) {
    obj.radius(0)
    obj.padAll(0)
    obj.borderWidth(0)
}
export default mainView
