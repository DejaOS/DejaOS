import config from '../../dxmodules/dxConfig.js'
import std from '../../dxmodules/dxStd.js'

const weComService = {}

/**
 * 判断是否是企微设备
 * @returns {boolean}
 */
weComService.isWeCom = function () {
    let weComDevice = std.loadFile("/etc/.weCom")
    return weComDevice && weComDevice.trim() === "weCom"
}

/**
 * 获取企微绑定状态
 * @returns {number}
 */
weComService.getStatus = function () {
    return config.get("sys.weComStatus")
}

/**
 * 获取企微专用mqtt地址
 * @returns {string}
 */
weComService.getAddr = function () {
    return config.get("sys.weComMqttAddr")
}


export default weComService