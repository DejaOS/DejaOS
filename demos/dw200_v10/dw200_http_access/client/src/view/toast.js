import dxui from '../../dxmodules/dxUi.js'
import std from '../../dxmodules/dxStd.js'

// Toast module
const toast = {}

// Global variables
let toastTimer
let toastBackground
let toastContainer
let toastIcon
let toastLabel
let toastFont

/**
 * Initialize toast module
 * Create UI components for toast display
 */
toast.init = function () {
    // Create toast background layer
    toastBackground = dxui.View.build('toast_background', dxui.Utils.LAYER.TOP)
    toastBackground.scroll(false)
    clearStyle(toastBackground)
    toastBackground.setSize(480, 320)
    toastBackground.bgColor(0x000000)
    toastBackground.bgOpa(50)
    toastBackground.hide()

    // Override show method to handle rotation
    let overwrite = toastBackground.show
    toastBackground.show = () => {
        // Default to landscape mode, adjust if needed
        toastBackground.setSize(480, 320)
        toastContainer.setSize(360, 80)
        toastContainer.update()
        toastLabel.width(toastContainer.width() - 60) // Leave space for icon
        overwrite.call(toastBackground)
        toastBackground.update()
    }

    // Create toast container
    toastContainer = dxui.View.build('toast_container', toastBackground)
    clearStyle(toastContainer)
    toastContainer.setSize(360, 80)
    toastContainer.radius(15)
    toastContainer.align(dxui.Utils.ALIGN.CENTER, 0, 0)
    toastContainer.bgColor(0xFFFFFF)

    // Create toast icon
    toastIcon = dxui.Image.build('toast_icon', toastContainer)
    toastIcon.setSize(32, 32)
    toastIcon.align(dxui.Utils.ALIGN.LEFT_MID, 15, 0)

    // Create toast label
    toastLabel = dxui.Label.build('toast_label', toastContainer)
    toastFont = dxui.Font.build('/app/code/resource/font.ttf', 24, dxui.Utils.FONT_STYLE.NORMAL)
    toastLabel.textFont(toastFont)
    toastLabel.textColor(0x333333)
    toastLabel.textAlign(dxui.Utils.TEXT_ALIGN.LEFT)
    toastLabel.align(dxui.Utils.ALIGN.LEFT_MID, 60, 0) // Position after icon
    toastLabel.longMode(dxui.Utils.LABEL_LONG_MODE.SCROLL_CIRCULAR)
}



/**
 * Clear style properties for UI components
 * @param {Object} obj - UI component object
 */
function clearStyle(obj) {
    obj.radius(0)
    obj.padAll(0)
    obj.borderWidth(0)
}



/**
 * Hide toast message
 */
toast.hide = function () {
    if (toastTimer) {
        std.clearTimeout(toastTimer)
        toastTimer = undefined
    }
    toastBackground.hide()
}

/**
 * Show warning toast
 * @param {string} message - Warning message
 * @param {number} timeout - Display timeout in milliseconds (default: 3000)
 */
toast.warning = function (message, timeout = 3000) {
    // Clear existing timer
    if (toastTimer) {
        std.clearTimeout(toastTimer)
        toastTimer = undefined
    }

    // Update UI for warning
    toastIcon.source('/app/code/resource/image/warning.png')
    toastContainer.bgColor(0xFFF3CD)
    toastLabel.text(message)

    // Show toast
    toastBackground.show()

    // Set auto-hide timer
    toastTimer = std.setTimeout(() => {
        toast.hide()
    }, timeout)
}

/**
 * Show error toast
 * @param {string} message - Error message
 * @param {number} timeout - Display timeout in milliseconds (default: 3000)
 */
toast.error = function (message, timeout = 3000) {
    // Clear existing timer
    if (toastTimer) {
        std.clearTimeout(toastTimer)
        toastTimer = undefined
    }

    // Update UI for error
    toastIcon.source('/app/code/resource/image/error.png')
    toastContainer.bgColor(0xF8D7DA)
    toastLabel.text(message)

    // Show toast
    toastBackground.show()

    // Set auto-hide timer
    toastTimer = std.setTimeout(() => {
        toast.hide()
    }, timeout)
}

/**
 * Show info toast
 * @param {string} message - Info message
 * @param {number} timeout - Display timeout in milliseconds (default: 3000)
 */
toast.info = function (message, timeout = 3000) {
    // Clear existing timer
    if (toastTimer) {
        std.clearTimeout(toastTimer)
        toastTimer = undefined
    }

    // Update UI for info
    toastIcon.source('/app/code/resource/image/info.png')
    toastContainer.bgColor(0xD1ECF1)
    toastLabel.text(message)

    // Show toast
    toastBackground.show()

    // Set auto-hide timer
    toastTimer = std.setTimeout(() => {
        toast.hide()
    }, timeout)
}

// Export toast module
export default toast 