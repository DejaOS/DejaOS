import logger from '../../dxmodules/dxLogger.js'
import dxui from '../../dxmodules/dxUi.js'
import common from '../../dxmodules/dxCommon.js'
import dxNet from '../../dxmodules/dxNet.js'
import helper from './viewhelper.js'
import entryview from './entryview.js'
import driver from '../driver.js'
import bus from '../../dxmodules/dxEventBus.js'
const VERSION = '1.1.0'
const ui = {}
ui.popTime = 0

ui.init = function () {
    dxui.init({ orientation: 1 }, {});
    initMain()
    initOn()
    initSnIp()
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
    ui.netImage = helper.buildImage('image/eth', main, 445, 0, 24, 24, 'image/eth' + (dxNet.getStatus().connected ? 'on' : 'off') + '.png')
    let timeLabel = buildTipLabel('time', main, 260, 30, 240, 68, '00:00', 60)
    ui.timeLabel = timeLabel

    let dateLabel = buildTipLabel('date', main, 0, 0, 240, 40, '00-00', 30)
    dateLabel.alignTo(timeLabel, dxui.Utils.ALIGN.OUT_BOTTOM_MID, 0, 0)
    ui.dateLabel = dateLabel

    let menui = helper.buildImage('menu', main, 175, 145, 128, 128, 'image/menu.png')
    menui.clickable(true)
    menui.on(dxui.Utils.EVENT.CLICK, function () {
        dxui.loadMain(ui.idview)
        driver.pwm.press()
    })

    ui.main = main
    dxui.loadMain(main)
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
function refershDateTime() {
    let currentDate = new Date();
    let month = (currentDate.getMonth() + 1).toString(10).padStart(2, '0') // Month starts from 0, so add 1
    let day = currentDate.getDate().toString(10).padStart(2, '0') // Get date
    let hours = currentDate.getHours().toString(10).padStart(2, '0') // Get hours
    let minutes = currentDate.getMinutes().toString(10).padStart(2, '0') // Get minutes
    let dayOfWeek = currentDate.getDay()

    // Map weekday numbers to text
    let daysOfWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
    let dayText = daysOfWeek[dayOfWeek]

    ui.timeLabel.text(`${hours}:${minutes}`)
    ui.dateLabel.text(`${dayText} ${month}-${day}`)
}
function initOn() {
    bus.on(dxNet.STATUS_CHANGE, function (data) {
        logger.info('..........................', data.connected)
        ui.netImage.source(helper.ROOT + 'image/eth' + (data.connected ? 'on' : 'off') + '.png')
        if (data.connected) {
            let param = dxNet.getModeByCard(data.type).param
            if (ui.showSnIp) { ui.ipLabel.text('IP: ' + param.ip) }
        } else {
            if (ui.showSnIp) { ui.ipLabel.text('  ') }
        }
    })
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