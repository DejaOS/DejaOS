import dxui from '../../dxmodules/dxUi.js'
import std from '../../dxmodules/dxStd.js'
import UI from './UI.js'

let root = null
let messageLabel = null
let timer = null

function init() {
    if (root) return
    const toastHeight = 48
    const labelHeight = 20
    const labelY = Math.floor((toastHeight - labelHeight) / 2)
    root = UI.view('host_toast', dxui.Utils.LAYER.TOP, 70, 786, 340, toastHeight, 0x173a37, 24)
    root.bgOpa(96)
    messageLabel = UI.label('host_toast_label', root, '', 10, labelY, 320, labelHeight, 11, UI.Theme.WHITE, true, dxui.Utils.TEXT_ALIGN.CENTER)
    root.hide()
}

function hide() {
    if (root) root.hide()
}

function show(message) {
    if (!root) init()
    if (timer) std.clearTimeout(timer)
    messageLabel.text(message)
    root.show()
    root.moveForeground()
    timer = std.setTimeout(function hideToast() {
        hide()
        timer = null
    }, 1800)
}

export default { init, show, hide }
