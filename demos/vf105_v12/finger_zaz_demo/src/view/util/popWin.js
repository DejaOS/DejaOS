import dxui from '../../../dxmodules/dxUi.js'
import screen from '../../screen.js'
import std from '../../../dxmodules/dxStd.js'

const popWin = {}
popWin.init = function () {
    let center_background = dxui.View.build('center_background', dxui.Utils.LAYER.TOP)
    popWin.center_background = center_background
    center_background.scroll(false)
    clearStyle(center_background)
    center_background.setSize(800, 1280)
    center_background.bgColor(0x000000)
    center_background.bgOpa(50)
    center_background.hide()
    
    let center_cont = dxui.View.build('center_cont', center_background)
    popWin.center_cont = center_cont
    clearStyle(center_cont)
    center_cont.setSize(480, 320);
    center_cont.radius(25)
    center_cont.align(dxui.Utils.ALIGN.CENTER, 0, 0)
    center_cont.bgColor(0x989898)

    let center_label = buildLabel('center_label', center_cont, 30, "")
    popWin.center_label = center_label
    center_cont.update()
    center_label.width(center_cont.width() - 20)
    center_label.longMode(dxui.Utils.LABEL_LONG_MODE.SCROLL_CIRCULAR)
    center_label.align(dxui.Utils.ALIGN.CENTER, 0, 0);
    center_label.textColor(0xFFFFFF)

}

function clearStyle(obj) {
    obj.radius(0)
    obj.padAll(0)
    obj.borderWidth(0)
}

function buildLabel(id, parent, size, text) {
    let label = dxui.Label.build(id, parent)
    let font60 = dxui.Font.build(screen.fontPath, size, dxui.Utils.FONT_STYLE.NORMAL)
    label.textFont(font60)
    label.textColor(0x000000)
    label.text(text)
    label.textAlign(dxui.Utils.TEXT_ALIGN.CENTER)
    return label
}

let popTimer

popWin.show = function(text){
    if (popTimer) {
        std.clearTimeout(popTimer)
        popTimer = undefined
    }

    popWin.center_label.text(text)
    popWin.center_background.show()

    popTimer = std.setTimeout(() => {
        popWin.center_background.hide()
    }, 2000)
}



export default popWin