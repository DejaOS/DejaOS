import logger from '../../dxmodules/dxLogger.js'
import dxui from '../../dxmodules/dxUi.js'
import common from '../../dxmodules/dxCommon.js'
import dxNet from '../../dxmodules/dxNet.js'
import dxMqtt from '../../dxmodules/dxMqtt.js'
import config from '../../dxmodules/dxConfig.js'
import helper from './viewhelper.js'
import entryview from './entryview.js'
import driver from '../driver.js'
import bus from '../../dxmodules/dxEventBus.js'
const VERSION = '1.1.0'
const ui = {}
ui.popTime = 0

ui.init = function () {
    initConfig()
    dxui.init({ orientation: 1 }, {});
    initMain()
    initOn()
    initSnIp()
    initMenuView()
    ui.phoneview = entryview.initView(dxui, ui, 'phone', 0xEF7622, 'Phone Number')
    ui.idview = entryview.initView(dxui, ui, 'id', 0x4871F7, 'ID Number')
    dxui.setInterval('refershDateTime', refershDateTime, 10000)
}
ui.loop = function () {
    dxui.handler()
    showPopImage()
}
function initMain() {
    let main = helper.buildView('helper.ROOT', dxui.Utils.LAYER.MAIN, 0, 0, 480, 320)
    helper.buildImage('bg', main, 0, 0, 480, 320, 'image/bg.png')
    if (ui.showVer) {
        helper.buildLabel('version', main, 0, 0, 100, 10, 'v' + VERSION)
    }
    if (ui.showNetMqtt) {
        ui.netImage = helper.buildImage('image/eth', main, 425, 0, 24, 24, 'image/eth' + (dxNet.getStatus().connected ? 'on' : 'off') + '.png')
        ui.mqttImage = helper.buildImage('image/mqtt', main, 452, 1, 24, 24, 'image/mqttoff.png')
    }
    let timeLabel = buildTipLabel('time', main, 260, 30, 240, 68, '00:00', 60)
    ui.timeLabel = timeLabel

    let dateLabel = buildTipLabel('date', main, 0, 0, 240, 40, '00-00', 30)
    dateLabel.alignTo(timeLabel, dxui.Utils.ALIGN.OUT_BOTTOM_MID, 0, 0)
    ui.dateLabel = dateLabel

    let menui = helper.buildImage('menu', main, 175, 145, 128, 128, 'image/menu.png')
    menui.clickable(true)
    menui.on(dxui.Utils.EVENT.CLICK, function () {
        dxui.loadMain(ui.menuview)
        driver.pwm.press()
    })

    ui.main = main
    dxui.loadMain(main)
}
function initMenuView() {
    let view = helper.buildView('menuview', dxui.Utils.LAYER.MAIN, 0, 0, 480, 320)
    view.bgColor(0x14192f)
    const cancelbutton = helper.buildButton("menucancel", view, 12, 261, 456, 47)
    cancelbutton.bgColor(0x525252)
    helper.buildImage('menucanceli', cancelbutton, 169, 14, 18, 18, 'image/scancel.png')
    helper.buildFontLabel('menucancell', cancelbutton, 199, 10, 88, 27, 'Close', 20, 0xFFFFFF, true)
    cancelbutton.on(dxui.Utils.EVENT.CLICK, function () {
        dxui.loadMain(ui.main)
        driver.pwm.press()
    })
    const phonebutton = helper.buildButton("menuphone", view, 34, 23, 200, 214)
    phonebutton.bgColor(0xEF7622)
    helper.buildImage('menuphonei', phonebutton, 89, 47, 22, 32, 'image/phone.png')
    helper.buildFontLabel('menuphonel', phonebutton, 6, 103, 187, 81, 'Phone', 22, 0xFFFFFF, true)
    phonebutton.on(dxui.Utils.EVENT.CLICK, function () {
        dxui.loadMain(ui.phoneview)
        driver.pwm.press()
    })
    const idbutton = helper.buildButton("menuid", view, 246, 23, 200, 214)
    idbutton.bgColor(0x4871F7)
    helper.buildImage('menuidi', idbutton, 85, 52, 32, 23, 'image/scan.png')
    helper.buildFontLabel('menuidl', idbutton, 7, 103, 187, 81, 'ID', 22, 0xFFFFFF, true)
    idbutton.on(dxui.Utils.EVENT.CLICK, function () {
        dxui.loadMain(ui.idview)
        driver.pwm.press()
    })
    ui.menuview = view
}

function initSnIp() {
    if (ui.showSnIp) {
        let bottom = helper.buildView('bottom', dxui.Utils.LAYER.TOP, 0, 292, 480, 28)
        bottom.bgColor(0x001133)
        bottom.bgOpa(30)
        ui.ipLabel = helper.buildFontLabel('ip', bottom, 280, 1, 200, 20, ' ', 20, 0xffffff)
        ui.snLabel = helper.buildFontLabel('sn', bottom, 5, 1, 260, 20, 'SN: ' + common.getSn(), 20, 0xffffff)
    }
}
function initConfig() {
    config.set('sys.appVersion', 'dw200_michael_' + VERSION)
    ui.showSnIp = (config.get('sys.sn_show') === 1)
    ui.showVer = !(config.get('sys.ver_show') === 0)
    ui.showNetMqtt = !(config.get('sys.net_show') === 0)
}
function refershDateTime() {
    let currentDate = new Date();
    let month = (currentDate.getMonth() + 1).toString(10).padStart(2, '0') // 月份从0开始，所以要加1
    let day = currentDate.getDate().toString(10).padStart(2, '0') // 获取日期
    let hours = currentDate.getHours().toString(10).padStart(2, '0') // 获取小时
    let minutes = currentDate.getMinutes().toString(10).padStart(2, '0') // 获取分钟
    let dayOfWeek = currentDate.getDay()

    // 映射星期数字到文本
    let daysOfWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
    let dayText = daysOfWeek[dayOfWeek]

    ui.timeLabel.text(`${hours}:${minutes}`)
    ui.dateLabel.text(`${dayText} ${month}-${day}`)
}
function setConfig(param) {
    config.setAndSave('net.ip', param.ip)
    config.setAndSave('net.gateway', param.gateway)
    config.setAndSave('net.mask', param.netmask)
}
function initOn() {
    bus.on(dxNet.STATUS_CHANGE, function (data) {
        logger.info('..........................',data.connected)
        if (ui.showNetMqtt) { ui.netImage.source(helper.ROOT + 'image/eth' + (data.connected ? 'on' : 'off') + '.png') }
        if (data.connected) {
            let param = dxNet.getModeByCard(data.type).param
            setConfig(param)
            if (ui.showSnIp) { ui.ipLabel.text('IP: ' + param.ip) }
        } else {
            if (ui.showSnIp) { ui.ipLabel.text('  ') }
        }
    })
    if (ui.showNetMqtt) {
        bus.on(dxMqtt.CONNECTED_CHANGED, function (data) {
            ui.mqttImage.source(helper.ROOT + 'image/mqtt' + ((data === 'connected') ? 'on' : 'off') + '.png')
        })
    }
    ui.popImageview = helper.buildView('popImageview', dxui.Utils.LAYER.TOP, 0, 0, 480, 320)
    const popImage = helper.buildImage("popimage", ui.popImageview, 0, 0, 480, 320)
    ui.popImageview.hide()
    bus.on('ui', function (data) {
        // logger.info(data)
        ui.popTime = Date.now() + (data.extra.timeout || 2000)
        popImage.source(helper.ROOT + 'image/' + data.extra.image)
    })
}
function showPopImage() {
    if (!ui.popImageview) {
        return
    }
    let now = Date.now()
    const shouldShow = (now < ui.popTime);
    if (shouldShow && ui.popImageview.isHide()) {
        ui.popImageview.show();
    } else if (!shouldShow && !ui.popImageview.isHide()) {
        ui.popImageview.hide();
    }
}

function buildTipLabel(id, parent, x, y, w, h, text, size, color) {
    let l = buildlabel(id, parent, x, y, w, h, text)
    l.textFont(dxui.Font.build('/app/code/resource/font.ttf', size, dxui.Utils.FONT_STYLE.NORMAL))
    l.textColor(color ? color : 0xFFFFF0)
    l.textAlign(dxui.Utils.TEXT_ALIGN.CENTER)
    return l
}

function buildlabel(id, parent, x, y, w, h, text) {
    let l = dxui.Label.build(id, parent)
    l.setPos(x, y)
    l.setSize(w, h)
    l.text(text)
    return l
}
export default ui