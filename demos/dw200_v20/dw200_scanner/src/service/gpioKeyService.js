import log from '../../dxmodules/dxLogger.js'
import dxMap from '../../dxmodules/dxMap.js'
const gpioKeyService = {}

gpioKeyService.receiveMsg = function (data) {
    log.info('[gpioKeyService] receiveMsg :' + JSON.stringify(data))
    if (data.code == 48) {
        let map = dxMap.get("SENSOR")
        map.put("data", data)
    }

}

export default gpioKeyService
