import logger from "../../dxmodules/dxLogger.js"
const netService = {}

/**
 * Network status change
 * @param {object} data 
 */
netService.netStatusChanged = function (data) {
    logger.info("net : " + JSON.stringify(data))
}

export default netService