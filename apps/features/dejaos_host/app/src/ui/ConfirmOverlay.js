import dxui from '../../dxmodules/dxUi.js'
import UI from './UI.js'

let overlay = null
let titleLabel = null
let messageLabel = null
let confirmCallback = null

function hide() {
    if (overlay) overlay.hide()
    confirmCallback = null
}

function init() {
    if (overlay) return
    overlay = UI.view('host_confirm_overlay', dxui.Utils.LAYER.TOP, 0, 0, 480, 854, 0x132a29, 0)
    overlay.bgOpa(58)
    overlay.clickable(true)
    const modal = UI.card('host_confirm_modal', overlay, 45, 302, 390, 224, 24)
    titleLabel = UI.label('host_confirm_title', modal, 'Confirm Action', 24, 22, 342, 30, 19, UI.Theme.INK, true)
    messageLabel = UI.label('host_confirm_message', modal, '', 24, 65, 342, 62, 12, UI.Theme.MUTED, false)
    messageLabel.longMode(dxui.Utils.LABEL_LONG_MODE.WRAP)

    function handleCancel() {
        hide()
    }
    function handleConfirm() {
        const callback = confirmCallback
        hide()
        if (callback) callback()
    }

    UI.button('host_confirm_cancel', modal, 'Cancel', 166, 158, 88, 42, 0xedf2f1, UI.Theme.BRAND_DEEP, handleCancel, 12, 12)
    UI.button('host_confirm_ok', modal, 'Confirm', 270, 158, 96, 42, 0xce4c4c, UI.Theme.WHITE, handleConfirm, 12, 12)
    overlay.hide()
}

function show(title, message, onConfirm) {
    if (!overlay) init()
    titleLabel.text(title)
    messageLabel.text(message)
    confirmCallback = onConfirm
    overlay.show()
    overlay.moveForeground()
}

export default { init, show, hide }
