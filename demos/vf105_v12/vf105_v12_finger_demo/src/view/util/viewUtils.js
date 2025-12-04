import dxui from '../../../dxmodules/dxUi.js'

const viewUtils = {}

viewUtils.font = function (size, style) {
    return dxui.Font.build('/app/code/resource/font/AlibabaPuHuiTi-2-65-Medium.ttf', size || 14, style || dxui.Utils.FONT_STYLE.NORMAL)
}

// Semantic colors
viewUtils.color = {
    // Success, green
    success: 0x00BF8A,
    // Failure, red
    fail: 0xFF0000,
    // Warning, yellow
    warning: 0xFFA800,
    // Default, blue
    default: 0x00a8ff
}

// Clear style
viewUtils._clearStyle = function (obj) {
    obj.radius(0)
    obj.borderWidth(0)
    obj.padAll(0)
}



export default viewUtils