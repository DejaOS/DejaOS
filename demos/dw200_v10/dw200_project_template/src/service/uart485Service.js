import logger from '../../dxmodules/dxLogger.js'
const uart485Service = {}


uart485Service.receive = function (data) {
    logger.info("uart485 : " + JSON.stringify(data))
}

export default uart485Service
