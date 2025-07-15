import * as os from "os"
import dxui from '../dxmodules/dxUi.js'

const viewUtils = {}
const fontPath = '/app/code/resource/font/PangMenZhengDaoBiaoTiTi-1.ttf'
viewUtils.font16 = dxui.Font.build(fontPath, 16, dxui.Utils.FONT_STYLE.NORMAL)
viewUtils.font20 = dxui.Font.build(fontPath, 20, dxui.Utils.FONT_STYLE.NORMAL)
viewUtils.font24 = dxui.Font.build(fontPath, 24, dxui.Utils.FONT_STYLE.NORMAL)
viewUtils.font28 = dxui.Font.build(fontPath, 28, dxui.Utils.FONT_STYLE.NORMAL)
viewUtils.font28Bold = dxui.Font.build(fontPath, 28, dxui.Utils.FONT_STYLE.BOLD)
viewUtils.font32 = dxui.Font.build(fontPath, 32, dxui.Utils.FONT_STYLE.NORMAL)
viewUtils.font36 = dxui.Font.build(fontPath, 36, dxui.Utils.FONT_STYLE.NORMAL)
viewUtils.font40 = dxui.Font.build(fontPath, 40, dxui.Utils.FONT_STYLE.NORMAL)
viewUtils.font52 = dxui.Font.build(fontPath, 52, dxui.Utils.FONT_STYLE.NORMAL)
viewUtils.font58 = dxui.Font.build(fontPath, 58, dxui.Utils.FONT_STYLE.NORMAL)
viewUtils.font88 = dxui.Font.build(fontPath, 88, dxui.Utils.FONT_STYLE.NORMAL)
// Clear styles
viewUtils._clearStyle = function (obj) {
    obj.radius(0)
    obj.borderWidth(0)
    obj.padAll(0)
}
// Common top bar
viewUtils.top = function (parent) {
    parent.update()
    let top = dxui.View.build(parent.id + 'top', parent)
    top.setSize(parent.width(), parent.height() / 3)
    this._clearStyle(top)
    top.bgColor(0x2F3243)
    top.update()
    return top
}
// Common menu
viewUtils.menu = function (parent) {
    let menu = this.panel(parent)
    // Flex layout, evenly distribute vertical axis, center display
    menu.flexFlow(dxui.Utils.FLEX_FLOW.COLUMN)
    menu.flexAlign(dxui.Utils.FLEX_ALIGN.SPACE_EVENLY, dxui.Utils.FLEX_ALIGN.CENTER, dxui.Utils.FLEX_ALIGN.CENTER)
    menu.update()
    return menu
}
// Breadcrumb go back to previous level
viewUtils.crumbsOut = function (ui) {
    if (!ui.crumbs) {
        return
    }
    let obj = ui.crumbs.pop()
    obj.panel.hide()
    if (ui.crumbs.length > 0) {
        let last = ui.crumbs[ui.crumbs.length - 1]
        last.panel.show()
        return last.title
    }
}
// Breadcrumb enter next level
viewUtils.crumbsEnter = function (ui, title, panel) {
    if (!ui.crumbs) {
        ui.crumbs = []
    }
    if (ui.crumbs.length > 0) {
        ui.crumbs[ui.crumbs.length - 1].panel.hide()
    }
    panel.show()
    ui.crumbs.push({ title: title, panel: panel })
}
// Common panel
viewUtils.panel = function (parent, id) {
    parent.update()
    let panel = dxui.View.build(parent.id + 'panel' + (id ? id : ''), parent)
    this._clearStyle(panel)
    panel.setSize(parent.width() - 100, parent.height() / 4 * 3)
    panel.radius(20)
    panel.align(dxui.Utils.ALIGN.CENTER, 0, 0)
    viewUtils.shadowStyle(panel)
    panel.update()
    return panel
}
// Pop-up notification
viewUtils.popNote = function (msg, bgColor, textColor) {
    let clearAnime = () => {
        if (viewUtils.popTimer) {
            os.clearTimeout(viewUtils.popTimer)
            viewUtils.popTimer = null
        }
        if (viewUtils.popAnime) {
            viewUtils.popAnime.lvAnimDel()
            viewUtils.popAnime = null
        }
    }
    let clearPop = () => {
        if (viewUtils.pop) {
            dxui.del(viewUtils.popMsg)
            dxui.del(viewUtils.pop)
            viewUtils.pop = null
        }
    }
    clearPop()
    clearAnime()
    if (!msg) {
        return
    }
    let pop = dxui.View.build('popNote', dxui.Utils.LAYER.TOP)
    viewUtils.pop = pop
    this._clearStyle(pop)
    pop.setSize(400, 60)
    pop.radius(25)
    pop.borderWidth(0)
    pop.align(dxui.Utils.ALIGN.TOP_MID, 0, 0)
    pop.moveForeground()
    pop.bgColor(utils.isEmpty(bgColor) ? 0x23AAF2 : bgColor)
    pop.bgOpa(0)
    let popMsg = dxui.Label.build('popMsg', pop)
    viewUtils.popMsg = popMsg
    popMsg.textFont(viewUtils.font24)
    popMsg.textColor(utils.isEmpty(textColor) ? 0xffffff : textColor)
    popMsg.text(msg)
    popMsg.align(dxui.Utils.ALIGN.CENTER, 0, 0)
    viewUtils.popAnime = dxui.Utils.anime(pop, 0, 100, (obj, v) => {
        obj.bgOpa(v)
        obj.align(dxui.Utils.ALIGN.TOP_MID, 0, v)
    }, 300, null, null, "bounce")
    viewUtils.popTimer = os.setTimeout(() => {
        clearAnime()
        viewUtils.popTimer = os.setTimeout(() => {
            viewUtils.popAnime = dxui.Utils.anime(pop, 100, 200, (obj, v) => {
                obj.bgOpa(200 - v)
                obj.align(dxui.Utils.ALIGN.TOP_MID, 0, v)
                if (v == 200) {
                    clearPop()
                    viewUtils.popTimer = os.setTimeout(() => {
                        clearAnime()
                    }, 1)
                }
            }, 300, null, null, "ease_in_out")
        }, 2000)
    }, 300)
}
// Clear pop-up notification
viewUtils.clearPopNote = function () {
    viewUtils.popNote()
}
// Add button
viewUtils.addButton = function (parent, text, bgColor, textColor) {
    parent.update()
    let box = dxui.View.build(parent.id + 'box' + text, parent)
    this._clearStyle(box)
    box.width(parent.contentWidth())
    box.height(70)
    box.padRight(25)
    box.padLeft(25)
    box.update()
    let btn = dxui.Button.build(box.id + 'btn', box)
    btn.setSize(box.contentWidth(), box.contentHeight() - 10)
    btn.bgColor(utils.isEmpty(bgColor) ? 0x23AAF2 : bgColor)
    btn.align(dxui.Utils.ALIGN.CENTER, 0, 0)
    btn.radius(25)
    let label = dxui.Label.build(btn.id + 'label', btn)
    label.textFont(viewUtils.font24)
    label.text(text)
    label.textColor(utils.isEmpty(textColor) ? 0xffffff : textColor)
    label.align(dxui.Utils.ALIGN.CENTER, 0, 0)
    return btn
}
// Add switch
viewUtils.addSwitch = function (parent, key, value) {
    parent.update()
    let box = dxui.View.build(parent.id + 'box' + key, parent)
    this._clearStyle(box)
    box.width(parent.contentWidth())
    box.height(70)
    box.padRight(50)
    box.padLeft(50)
    let keyLabel = dxui.Label.build(box.id + 'keyLabel', box)
    keyLabel.text(key)
    keyLabel.textFont(viewUtils.font24)
    keyLabel.align(dxui.Utils.ALIGN.LEFT_MID, 0, 0)
    let _switch = dxui.Switch.build(box.id + 'switch', box)
    _switch.setSize(60, 30)
    _switch.select(value)
    _switch.align(dxui.Utils.ALIGN.RIGHT_MID, 0, 0)
    return _switch
}
// Add input box
viewUtils.addInput = function (root, parent, key, value, isPlaceholder, isHide) {
    parent.update()
    let box = dxui.View.build(parent.id + 'box' + key, parent)
    this._clearStyle(box)
    box.width(parent.contentWidth())
    box.height(70)
    box.padRight(25)
    box.padLeft(25)
    box.textFont(viewUtils.font24)
    box.update()
    let box1 = dxui.View.build(box.id + 'box1', box)
    this._clearStyle(box1)
    box1.width(box.contentWidth())
    box1.height(box.contentHeight() - 10)
    box1.align(dxui.Utils.ALIGN.CENTER, 0, 0)
    box1.borderWidth(3)
    box1.setBorderColor(0xe6e6e6)
    box1.radius(25)
    box1.bgColor(0xe6e6e6)
    box1.on(dxui.Utils.EVENT.FOCUSED, () => {
        input.send(dxui.Utils.EVENT.FOCUSED)
    })
    box1.on(dxui.Utils.EVENT.DEFOCUSED, () => {
        input.send(dxui.Utils.EVENT.DEFOCUSED)
    })
    let keyLabel = dxui.Label.build(box1.id + 'keyLabel', box1)
    keyLabel.text(key)
    keyLabel.align(dxui.Utils.ALIGN.LEFT_MID, 25, 0)
    keyLabel.update()
    let input = dxui.Textarea.build(box.id + 'input', box)
    this._clearStyle(input)
    input.padAll(1)
    input.bgOpa(0)
    input.width(box1.contentWidth() - keyLabel.width() - 65)
    input.setAlign(dxui.Utils.TEXT_ALIGN.RIGHT)
    input.setOneLine(true)
    input.setMaxLength(32)
    input.align(dxui.Utils.ALIGN.RIGHT_MID, -25, 0)
    input.on(dxui.Utils.EVENT.FOCUSED, () => {
        box1.setBorderColor(0x23AAF2)
        // Right-aligned text cannot scroll, so align left when editing
        input.setAlign(dxui.Utils.TEXT_ALIGN.LEFT)
    })
    input.on(dxui.Utils.EVENT.DEFOCUSED, () => {
        box1.setBorderColor(0xe6e6e6)
        input.scrollToX(-1000)
        input.setAlign(dxui.Utils.TEXT_ALIGN.RIGHT)
    })
    if (isPlaceholder) {
        input.obj.lvTextareaSetPlaceholderText(value)
    } else {
        input.text(value)
    }
    let keyboard = dxui.Keyboard.build(root.id + 'keyboard' + key, root)
    keyboard.textFont(dxui.Font.build(null, 24, null))
    keyboard.chFont(viewUtils.font24)
    keyboard.setTextarea(input)
    keyboard.moveForeground()
    keyboard.setPopovers(true)
    keyboard.height(400)
    keyboard.hide()
    input.on(dxui.Utils.EVENT.CLICK, () => {
        keyboard.show()
    })
    input.on(dxui.Utils.EVENT.FOCUSED, () => {
        keyboard.show()
    })
    input.on(dxui.Utils.EVENT.DEFOCUSED, () => {
        keyboard.hide()
    })
    input.on(dxui.Utils.EVENT.READY, () => {
        keyboard.hide()
        input.send(dxui.Utils.EVENT.DEFOCUSED)
    })
    if (isHide) {
        input.obj.lvTextareaSetPasswordShowTime(0)
        input.setPasswordMode(true)
        input.obj.lvTextareaSetPasswordShowTime(1500)
        let iconBox = dxui.View.build(box1.id + 'iconBox' + key, box1)
        this._clearStyle(iconBox)
        iconBox.setSize(32, 32)
        iconBox.bgOpa(0)
        let icon = dxui.Image.build(iconBox.id + 'icon', iconBox)
        icon.source('/app/code/resource/image/eye_fill.png')
        iconBox.align(dxui.Utils.ALIGN.RIGHT_MID, -15, 0)
        input.align(dxui.Utils.ALIGN.RIGHT_MID, -60, 0)
        input.update()
        input.width(input.width() - 25)
        iconBox.obj.lvObjAddFlag(dxui.Utils.GG.NativeEnum.LV_OBJ_FLAG_CHECKABLE);
        iconBox.on(dxui.Utils.EVENT.CLICK, () => {
            if (iconBox.obj.hasState(dxui.Utils.STATE.CHECKED)) {
                icon.source('/app/code/resource/image/eye_fill_show.png')
                input.setPasswordMode(false)
            } else {
                icon.source('/app/code/resource/image/eye_fill.png')
                input.setPasswordMode(true)
            }
        })
    }
    return { input: input, box1: box1 }
}
// Add configuration item
viewUtils.addConfig = function (parent, key, value, isSelect) {
    parent.update()
    let box = dxui.View.build(parent.id + 'box' + key, parent)
    this._clearStyle(box)
    box.width(parent.contentWidth())
    box.height(70)
    box.padRight(50)
    box.padLeft(50)
    let keyLabel = dxui.Label.build(box.id + 'keyLabel', box)
    keyLabel.text(key)
    keyLabel.textFont(viewUtils.font24)
    keyLabel.align(dxui.Utils.ALIGN.LEFT_MID, 0, 0)
    let icon = dxui.Image.build(box.id + 'icon', box)
    if (isSelect) {
        icon.source('/app/code/resource/image/select_arrow.png')
    } else {
        icon.source('/app/code/resource/image/arrow_right.png')
    }
    icon.align(dxui.Utils.ALIGN.RIGHT_MID, 0, 0)
    if (value) {
        let valueLabel = dxui.Label.build(box.id + 'valueLabel', box)
        valueLabel.textFont(viewUtils.font20)
        valueLabel.textColor(0x8a8a8a)
        valueLabel.text(value)
        valueLabel.alignTo(icon, dxui.Utils.ALIGN.OUT_LEFT_MID, 0, 0)
    }
    let st1 = dxui.Style.build()
    st1.bgColor(0xe6e6e6)
    st1.obj.lvStyleSetTransition(dxui.Utils.ENUM.LV_STYLE_BG_COLOR, "step", 0, 0)
    box.addStyle(st1, dxui.Utils.ENUM.LV_STATE_PRESSED)
    return box
}
// Default shadow
viewUtils.shadowStyle = function (obj) {
    obj.shadow(15, 3, 5, 2, 0x000000, 50)
}
viewUtils.clearShadowStyle = function (obj) {
    obj.shadow(0, 0, 0, 0, 0x000000, 0)
}
// Common menu item style
viewUtils.menuItemBtnStyle = function (obj, icon, text, font, color1, color2, w, h, gradW, offsetText) {
    obj.padAll(0)
    obj.bgColor(color1)
    obj.radius(20)
    obj.setSize(w, h)

    let st1 = dxui.Style.build()
    st1.bgGradColor(color2)
    st1.bgGradDir(dxui.Utils.GRAD.HOR)
    st1.bgMainStop(gradW)
    st1.bgGradStop(0)
    obj.addStyle(st1)

    let leftIcon = dxui.View.build(obj.id + 'leftIcon', obj)
    leftIcon.align(dxui.Utils.ALIGN.LEFT_MID, 30, 0)
    leftIcon.hide()

    let img = dxui.Image.build(obj.id + "img", obj)
    img.source(icon)
    img.alignTo(leftIcon, dxui.Utils.ALIGN.CENTER, 0, 0)

    let label = dxui.Label.build(obj.id + 'label', obj)
    label.textFont(font)
    label.text(text)
    label.align(dxui.Utils.ALIGN.CENTER, offsetText, 0)
}

export default viewUtils