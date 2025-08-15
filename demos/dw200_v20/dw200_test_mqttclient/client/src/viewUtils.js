import dxui from '../dxmodules/dxUi.js'

const viewUtils = {}
const fontPath = '/app/code/resource/font/font.ttf'

// Font definitions
viewUtils.font12 = dxui.Font.build(fontPath, 12, dxui.Utils.FONT_STYLE.NORMAL)
viewUtils.font14 = dxui.Font.build(fontPath, 14, dxui.Utils.FONT_STYLE.NORMAL)
viewUtils.font16 = dxui.Font.build(fontPath, 16, dxui.Utils.FONT_STYLE.NORMAL)
viewUtils.font20 = dxui.Font.build(fontPath, 20, dxui.Utils.FONT_STYLE.NORMAL)
viewUtils.font24 = dxui.Font.build(fontPath, 24, dxui.Utils.FONT_STYLE.NORMAL)

// Create label
viewUtils.createLabel = function (id, parent, text, fontSize = 16) {
    let label = dxui.Label.build(id, parent)
    label.text(text)
    label.textFont(fontSize === 20 ? viewUtils.font20 :
        fontSize === 24 ? viewUtils.font24 : viewUtils.font16)
    return label
}

// Create button
viewUtils.createButton = function (id, parent, text, fontSize = 16) {
    let btn = dxui.Button.build(id, parent)
    let label = dxui.Label.build(btn.id + 'label', btn)
    label.text(text)
    label.textFont(fontSize === 20 ? viewUtils.font20 :
        fontSize === 24 ? viewUtils.font24 : viewUtils.font16)
    label.textColor(0xFFFFFF)
    label.align(dxui.Utils.ALIGN.CENTER, 0, 0)
    return btn
}

// Create clickable label (button with transparent background)
viewUtils.createClickableLabel = function (id, parent, text, fontSize = 16) {
    let btn = dxui.Button.build(id, parent)
    btn.bgOpa(0) // Set button background transparent
    btn.borderWidth(1)
    btn.setBorderColor(0xbdc3c7)
    btn.radius(4)

    let label = dxui.Label.build(btn.id + 'label', btn)
    label.text(text)
    label.textFont(fontSize === 20 ? viewUtils.font20 :
        fontSize === 24 ? viewUtils.font24 :
            fontSize === 14 ? viewUtils.font14 :
                fontSize === 12 ? viewUtils.font12 : viewUtils.font16)
    label.textColor(0x2c3e50)
    label.setPos(-10, -5) // Left align, left margin 5 pixels

    return btn
}



export default viewUtils 