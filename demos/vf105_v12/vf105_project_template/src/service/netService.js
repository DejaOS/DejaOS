import logger from "../../dxmodules/dxLogger.js"
import driver from "../driver.js"
const netService = {}

/**
 * 网络状态变化
 * @param {object} data 
 */
netService.netStatusChanged = function (data) {
    logger.info("net : " + JSON.stringify(data))
    if(data.status==4){
        driver.alsa.ttsPlay("联网成功")
    }
}

export default netService