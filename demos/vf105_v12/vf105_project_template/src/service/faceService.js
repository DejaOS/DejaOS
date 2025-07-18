import logger from "../../dxmodules/dxLogger.js"
import bus from "../../dxmodules/dxEventBus.js"
const faceService = {}


faceService.face = function (data) {
    logger.info("face : " + JSON.stringify(data))
    bus.fire('face', data)
}

export default faceService
