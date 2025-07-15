import logger from "../../dxmodules/dxLogger.js"
import bus from "../../dxmodules/dxEventBus.js"
import dxCommon from "../../dxmodules/dxCommon.js"
const codeService = {}

/**
 * Handle scanning action
 * @param {object} data Scan text
 */
codeService.code = function (data) {
    logger.info("Code : ", data)
    let dataHex = Array.from(new Uint8Array(data.data))
    
    let qrCode = dxCommon.utf8HexToStr(dxCommon.arrToHex(dataHex))
    logger.info("Code : " + JSON.stringify(qrCode))
    bus.fire('code', qrCode)
}

export default codeService
