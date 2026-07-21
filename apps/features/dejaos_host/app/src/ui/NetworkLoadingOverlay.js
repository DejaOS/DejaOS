import dxui from '../../dxmodules/dxUi.js'
import std from '../../dxmodules/dxStd.js'
import log from '../../dxmodules/dxLogger.js'
import UI from './UI.js'

let root = null
let messageLabel = null
let dots = []
let animationTimer = null
let timeoutTimer = null
let step = 0
let timeoutCallback = null

function clearTimers() {
    try {
        if (animationTimer) std.clearInterval(animationTimer)
        if (timeoutTimer) std.clearTimeout(timeoutTimer)
    } catch (e) {
        log.error('clear network loading timers failed', e)
    }
    animationTimer = null
    timeoutTimer = null
}

function hide() {
    clearTimers()
    timeoutCallback = null
    if (root) root.hide()
}

function animate() {
    dots.forEach(function updateDot(dot, index) {
        dot.bgColor(index === step ? UI.Theme.BRAND : 0xcfdad8)
    })
    step = (step + 1) % dots.length
}

function init() {
    if (root) return
    root = UI.view('network_loading_overlay', dxui.Utils.LAYER.TOP, 0, 0, 480, 854, 0x102a28, 0)
    root.bgOpa(58)
    root.clickable(true)
    const modal = UI.card('network_loading_modal', root, 70, 300, 340, 214, 24)
    UI.label('network_loading_title', modal, 'Connecting', 20, 26, 300, 34, 22, UI.Theme.INK, true, dxui.Utils.TEXT_ALIGN.CENTER)
    messageLabel = UI.label('network_loading_message', modal, '', 20, 70, 300, 28, 13, UI.Theme.MUTED, false, dxui.Utils.TEXT_ALIGN.CENTER)
    for (let i = 0; i < 8; i += 1) {
        const dot = UI.view('network_loading_dot_' + i, modal, 76 + i * 25, 118, 12, 12, 0xcfdad8, 6)
        dots.push(dot)
    }
    UI.label('network_loading_hint', modal, 'Wait up to 60 seconds. Keep power connected.', 20, 154, 300, 30, 11, UI.Theme.MUTED, false, dxui.Utils.TEXT_ALIGN.CENTER)
    root.hide()
}

function show(message, onTimeout) {
    if (!root) init()
    clearTimers()
    timeoutCallback = onTimeout
    messageLabel.text(message || 'Applying network settings')
    step = 0
    animate()
    root.show()
    root.moveForeground()
    try {
        animationTimer = std.setInterval(animate, 140)
        timeoutTimer = std.setTimeout(function handleTimeout() {
            const callback = timeoutCallback
            hide()
            if (callback) callback()
        }, 60000)
    } catch (e) {
        log.error('start network loading timers failed', e)
        hide()
        if (onTimeout) onTimeout()
    }
}

function isVisible() {
    return !!root && !root.isHide()
}

export default { show, hide, isVisible }
