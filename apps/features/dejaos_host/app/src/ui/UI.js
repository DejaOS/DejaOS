import dxui from '../../dxmodules/dxUi.js'
import driver from '../../dxmodules/dxDriver.js'
import UIManager from '../UIManager.js'

const Theme = {
    PAGE: 0xf4f7f7,
    WHITE: 0xffffff,
    INK: 0x17232e,
    MUTED: 0x72808e,
    LINE: 0xe2e8e7,
    BRAND: 0x126d63,
    BRAND_DEEP: 0x0b514c,
    MINT: 0xdff4ed,
    ORANGE: 0xed7c38,
    RED: 0xce4c4c,
    PURPLE: 0x8359b5
}

const FONT_SCALE = 2
const timeLabels = []
let currentTime = '--:--'

function scaledFontSize(size) {
    return Math.max(10, (size || 14) + FONT_SCALE)
}

function view(id, parent, x, y, width, height, color, radius) {
    const item = dxui.View.build(id, parent)
    item.setSize(width, height)
    item.setPos(x, y)
    item.padAll(0)
    item.scroll(false)
    item.borderWidth(0)
    item.radius(radius || 0)
    item.bgColor(color === undefined ? Theme.WHITE : color)
    return item
}

function label(id, parent, text, x, y, width, height, size, color, bold, align) {
    const item = dxui.Label.build(id, parent)
    item.setSize(width, height)
    item.setPos(x, y)
    item.text(text || '')
    item.textFont(UIManager.font(scaledFontSize(size), bold ? dxui.Utils.FONT_STYLE.BOLD : dxui.Utils.FONT_STYLE.NORMAL))
    item.textColor(color === undefined ? Theme.INK : color)
    item.textAlign(align === undefined ? dxui.Utils.TEXT_ALIGN.LEFT : align)
    item.longMode(dxui.Utils.LABEL_LONG_MODE.CLIP)
    return item
}

function image(id, parent, path, x, y, width, height) {
    const item = dxui.Image.build(id, parent)
    item.setSize(width, height)
    item.setPos(x, y)
    item.source(path)
    return item
}

function hitArea(id, parent, x, y, width, height, onClick, radius) {
    const item = view(id, parent, x, y, width, height, Theme.WHITE, radius || 0)
    item.bgOpa(0)
    item.clickable(true)
    if (onClick) item.on(dxui.Utils.EVENT.CLICK, onClick)
    return item
}

function button(id, parent, text, x, y, width, height, color, textColor, onClick, radius, fontSize) {
    const item = dxui.Button.build(id, parent)
    item.setSize(width, height)
    item.setPos(x, y)
    item.padAll(0)
    item.borderWidth(0)
    item.radius(radius === undefined ? 11 : radius)
    item.bgColor(color === undefined ? Theme.BRAND : color)
    const actualFontSize = scaledFontSize(fontSize || 12)
    const labelHeight = actualFontSize + 6
    const labelY = Math.max(0, Math.floor((height - labelHeight) / 2))
    const itemLabel = label(id + '_label', item, text, 0, labelY, width, labelHeight, fontSize || 12, textColor === undefined ? Theme.WHITE : textColor, true, dxui.Utils.TEXT_ALIGN.CENTER)
    itemLabel.clickable(false)
    item._label = itemLabel
    item._hit = hitArea(id + '_hit', item, 0, 0, width, height, onClick, radius === undefined ? 11 : radius)
    return item
}

function card(id, parent, x, y, width, height, radius) {
    const item = view(id, parent, x, y, width, height, Theme.WHITE, radius === undefined ? 18 : radius)
    item.borderWidth(1)
    item.borderColor(Theme.LINE)
    item.shadow(14, 0, 4, 0, 0x243b39, 8)
    return item
}

function shell(page, id, title, subtitle, showBack) {
    const root = view(id + '_root', UIManager.getRoot(), 0, 0, driver.DISPLAY.WIDTH, driver.DISPLAY.HEIGHT, Theme.PAGE, 0)
    const status = view(id + '_status', root, 0, 0, 480, 34, Theme.BRAND_DEEP, 0)
    const timeLabel = label(id + '_time', status, currentTime, 18, 7, 80, 20, 12, Theme.WHITE, true)
    timeLabels.push(timeLabel)
    label(id + '_status_right', status, 'ETH', 344, 7, 118, 20, 11, Theme.WHITE, true, dxui.Utils.TEXT_ALIGN.RIGHT)

    const header = view(id + '_header', root, 0, 34, 480, 56, Theme.BRAND, 0)
    let titleX = 18
    if (showBack) {
        function handleBack() {
            page.close()
        }
        button(id + '_back', header, '<', 12, 11, 34, 34, 0x2b7b73, Theme.WHITE, handleBack, 11, 20)
        titleX = 58
    } else {
        image(id + '_mark', header, '/app/code/resource/icon/host.png', 14, 8, 40, 40)
        titleX = 64
    }
    const hasSubtitle = !!subtitle
    const titleLabel = label(id + '_title', header, title, titleX, hasSubtitle ? 4 : 11, 330, hasSubtitle ? 25 : 34, hasSubtitle ? 18 : 22, Theme.WHITE, true)
    const subtitleLabel = label(id + '_subtitle', header, subtitle || '', titleX, 31, 350, 19, 10, 0xb8d7d2, false)
    if (!hasSubtitle) subtitleLabel.hide()
    const headerRightLabel = label(id + '_header_right', header, '', 340, 11, 120, 34, 14, Theme.WHITE, true, dxui.Utils.TEXT_ALIGN.RIGHT)
    headerRightLabel.hide()
    const content = view(id + '_content', root, 0, 90, 480, 764, Theme.PAGE, 0)
    return { root, content, titleLabel, subtitleLabel, headerRightLabel }
}

function setTitle(shellObj, title, subtitle) {
    shellObj.titleLabel.text(title)
    shellObj.subtitleLabel.text(subtitle || '')
    if (subtitle) shellObj.subtitleLabel.show()
    else shellObj.subtitleLabel.hide()
}

function setHeaderRight(shellObj, text) {
    if (!shellObj || !shellObj.headerRightLabel) return
    shellObj.headerRightLabel.text(text || '')
    if (text) {
        shellObj.titleLabel.setSize(270, 34)
        shellObj.headerRightLabel.show()
    } else {
        shellObj.titleLabel.setSize(330, 34)
        shellObj.headerRightLabel.hide()
    }
}

function setClock(value) {
    if (typeof value !== 'string' || !/^\d{2}:\d{2}$/.test(value)) return
    currentTime = value
    timeLabels.forEach(function updateTime(item) {
        item.text(currentTime)
    })
}

export default {
    Theme,
    view,
    label,
    image,
    hitArea,
    button,
    card,
    shell,
    setTitle,
    setHeaderRight,
    setClock
}
