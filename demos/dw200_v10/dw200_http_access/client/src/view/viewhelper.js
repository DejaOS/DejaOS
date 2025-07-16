
import dxui from '../../dxmodules/dxUi.js'
let helper = {}
helper.ROOT = '/app/code/resource/'
helper.buildLabel = function (id, parent, x, y, w, h, text) {
    let l = dxui.Label.build(id, parent)
    l.setPos(x, y)
    l.setSize(w, h)
    l.text(text)
    return l
}
helper.buildView = function (id, parent, x, y, w, h) {
    let b = dxui.View.build(id, parent)
    b.setPos(x, y)
    b.setSize(w, h)
    b.borderWidth(0)
    b.padAll(0)
    b.radius(0)
    b.scroll(false)
    b.scrollbarMode(false)
    return b
}
helper.buildFontLabel = function (id, parent, x, y, w, h, text, size, color, isCenter) {
    let l = this.buildLabel(id, parent, x, y, w, h, text)
    l.textFont(dxui.Font.build(helper.ROOT + 'font.ttf', size, dxui.Utils.FONT_STYLE.BOLD))
    l.textColor(color ? color : 0xFFFFF0)
    if (isCenter) {
        l.textAlign(dxui.Utils.TEXT_ALIGN.CENTER)
    }
    return l
}   

helper.buildImage = function (id, parent, x, y, w, h, png) {
    let i = dxui.Image.build(id, parent)
    i.setPos(x, y)
    i.setSize(w, h)
    if (png) {
        i.source(helper.ROOT + png)
    }  
    return i
}
helper.buildButton = function (id, parent, x, y, w, h, isTran) {
    let b = dxui.Button.build(id, parent)
    b.setPos(x, y)
    b.setSize(w, h)
    b.borderWidth(0)
    b.padAll(0)
    if (isTran) {//To set a transparent button larger than the image to ensure a larger clickable area
        b.bgOpa(0)
        b.shadow(0, 0, 0, 0, 0xfffff, 0)
    }
    return b
}
export default helper