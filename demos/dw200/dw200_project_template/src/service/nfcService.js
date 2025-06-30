import logger from "../../dxmodules/dxLogger.js"
import bus from "../../dxmodules/dxEventBus.js"
const cardService = {}

/**
 * Handle card swipe action
 * @param {object} data Card information
 */
cardService.nfc = function (data) {
    logger.info("Card : " + JSON.stringify(data))
    bus.fire('nfc', data)
}

export default cardService
