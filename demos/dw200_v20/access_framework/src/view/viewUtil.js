//view related utility functions
import dxui from '../../dxmodules/dxUi.js'
import std from '../../dxmodules/dxStd.js'
const viewUtil = {}
viewUtil.fontPath = ''
viewUtil.buildLabel = function (id, parent, size, text) {
    let label = dxui.Label.build(id, parent)
    label.textFont(viewUtil.getFont(size))
    label.textColor(0xFFFFFF)
    label.text(text)
    label.textAlign(dxui.Utils.TEXT_ALIGN.CENTER)
    return label
}

viewUtil.clearStyle = function (obj) {
    obj.radius(0)
    obj.padAll(0)
    obj.borderWidth(0)
}
viewUtil.getFont = function (size, path) {
    let temp = '' + size
    if (!viewUtil.fonts) {
        viewUtil.fonts = {}
    }
    if (!viewUtil.fonts[temp]) {
        viewUtil.fonts[temp] = dxui.Font.build(viewUtil.fontPath, size, dxui.Utils.FONT_STYLE.NORMAL)
    }
    return viewUtil.fonts[temp]
}

viewUtil.isVertical = function (rotation) {
    return rotation == 0 || rotation == 2
}

viewUtil.buildIcon = function (id, parent, imageName) {
    const icon = dxui.Image.build(id, parent)
    icon.source('/app/code/resource/image/' + imageName)
    icon.hide()
    return icon
}

viewUtil.enableLabelScrolling = function (label, width) {
    label.width(width)
    label.longMode(dxui.Utils.LABEL_LONG_MODE.SCROLL_CIRCULAR)
}

viewUtil.getScrollTime = function (text, font, labelWidth) {
    let textWidth = 0
    if (text) {
        for (let i = 0; i < text.length; i++) {
            let dsc = font.obj.lvFontGetGlyphDsc(text.charCodeAt(i), text.charCodeAt(i + 1))
            textWidth += dsc.adv_w
        }
    }
    if (textWidth <= labelWidth) {
        return 2000
    }
    const time = (textWidth - labelWidth) * 30
    return time > 2000 ? time : 2000
}

viewUtil.inactiveTimers = {}
viewUtil.setInactiveTimeout = function (id, callback, timeout) {
    viewUtil.clearInactiveTimeout(id)
    viewUtil.inactiveTimers[id] = std.setInterval(() => {
        const count = dxui.Utils.GG.NativeDisp.lvDispGetInactiveTime()
        if (count > timeout) {
            viewUtil.clearInactiveTimeout(id)
            if (callback) callback()
        }
    }, 1000)
}

viewUtil.clearInactiveTimeout = function (id) {
    if (viewUtil.inactiveTimers[id]) {
        std.clearInterval(viewUtil.inactiveTimers[id])
        viewUtil.inactiveTimers[id] = null
    }
}
export default viewUtil