import logger from '../../dxmodules/dxLogger.js'
import httphandler from '../httphandler.js'
import helper from './viewhelper.js'
import driver from '../driver.js'
const entry = {}
entry.initView = function (dxui, ui, id, color, input) {
    let all = {}
    all.id = id
    let view = helper.buildView(id + 'view', dxui.Utils.LAYER.MAIN, 0, 0, 480, 320)
    all.view = view
    view.bgColor(0x14192f)
    const cancelbutton = helper.buildButton(id + "cancel", view, 12, 12, 104, 140)
    cancelbutton.bgColor(0x525252)
    helper.buildImage(id + 'cimage', cancelbutton, 40, 40, 24, 24, 'image/cancel.png')
    helper.buildFontLabel(id + 'clabel', cancelbutton, 8, 76, 88, 27, 'Close', 20, 0xFFFFFF, true)
    cancelbutton.on(dxui.Utils.EVENT.CLICK, function () {
        close(dxui, ui, all)
    })
    helper.buildFontLabel(id + 'plabel', view, 128, 34, 25, 19, 'PIN', 14, 0xFFFFFF)
    all.ptext = buildTextfield(all, dxui, id + 'ptext', view, 128, 54, 224, 48, true)
    const okbutton = helper.buildButton(id + "ok", view, 364, 12, 104, 140)
    okbutton.bgColor(color)
    helper.buildImage(id + 'oimage', okbutton, 40, 40, 24, 17, 'image/ok.png')
    helper.buildFontLabel(id + 'olabel', okbutton, 8, 76, 88, 27, 'OK', 20, 0xFFFFFF, true)
    okbutton.on(dxui.Utils.EVENT.CLICK, function () {
        httphandler.send('pin', all.ptext.text())
        close(dxui, ui, all)
    })
    let matrix = dxui.Buttons.build(id + 'buttons', view)
    let style = dxui.Style.build()
    style.padAll(0)
    style.borderWidth(0)
    style.padColumn(7)
    style.padRow(7)
    style.bgColor(0x14192f)
    matrix.setPos(13, 161)
    matrix.setSize(301, 147)
    matrix.addStyle(style)
    matrix.textColor(0xFFFFFF, dxui.Utils.STYLE_PART.ITEMS)
    matrix.bgColor(0x777777, dxui.Utils.STYLE_PART.ITEMS)
    matrix.textFont(dxui.Font.build(helper.ROOT + 'font.ttf', 30, dxui.Utils.FONT_STYLE.BOLD), dxui.Utils.STYLE_PART.ITEMS)
    matrix.data(["1", "2", "3", "4", "\n", "7", "8", "9", "0", ""])
    matrix.on(dxui.Utils.EVENT.CLICK, function () {
        press(all, dxui, matrix.clickedButton().text)
    })

    buildNumberButton(all, dxui, id + 'b5', view, 321, 161, 70, 70, '5')
    buildNumberButton(all, dxui, id + 'b6', view, 398, 161, 70, 70, '6')
    const del = buildNumberButton(all, dxui, id + 'del', view, 321, 238, 147, 70, 'del')
    del.on(dxui.Utils.EVENT.LONG_PRESSED, function () {
        press(all, dxui, '', true)
    })
    helper.buildImage(id + 'delimage', del, 62, 23, 30, 24, 'image/del.png')
    return view
}
function close(dxui, ui, all) {
    all.ptext.text('')
    dxui.loadMain(ui.main)
    driver.pwm.press()
}
function press(all, dxui, ns, isclear) {
    let textfield = all.ptext
    if (textfield) {
        if (isclear) {
            textfield.text('')
        } else {
            if (ns === 'del') {
                textfield.obj.lvTextareaDelChar()
            } else {
                textfield.obj.lvTextareaAddText(ns)
            }
        }
        textfield.send(dxui.Utils.EVENT.FOCUSED)
        driver.pwm.press()
    }
}
function buildNumberButton(all, dxui, id, parent, x, y, w, h, text) {
    const b = helper.buildButton(id, parent, x, y, w, h)
    b.bgColor(0x777777)
    if (text != 'del') {
        helper.buildFontLabel(id + 'label', b, 26, 15, 18, 41, text, 30, 0xFFFFFF)
    }
    b.on(dxui.Utils.EVENT.CLICK, function (data) { press(all, dxui, data.ud) }, text)
    return b
}
function buildTextfield(all, dxui, id, parent, x, y, w, h, ispwd) {
    let t = dxui.Textarea.build(id, parent)
    t.setPos(x, y)
    t.setSize(w, h)
    t.setOneLine(true)
    t.setMaxLength(20)
    if (ispwd) {
        t.setPasswordMode(true)
    }
    t.textFont(dxui.Font.build(helper.ROOT + 'font.ttf', 22, dxui.Utils.FONT_STYLE.BOLD))
    t.textColor(0x000000)
    return t
}
export default entry