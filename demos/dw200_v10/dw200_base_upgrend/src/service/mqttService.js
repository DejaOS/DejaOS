import logger from '../../dxmodules/dxLogger.js'
import ota from '../../dxmodules/dxOta.js'
import common from '../../dxmodules/dxCommon.js'
import driver from '../../src/driver.js'

const mqttService = {}

mqttService.receiveMsg = function (data) {
    logger.info('[mqttService] receiveMsg :' + JSON.stringify(data.topic))
    if (typeof mqttService[data.topic.match(/[^/]+$/)[0]] == 'function') {
        mqttService[data.topic.match(/[^/]+$/)[0]](data)
    } else {
        logger.error("No such topic", data.topic)
    }

    
}

mqttService.upgrade = function(param){
    logger.info("upgrade:" + JSON.stringify(param))
    let data = JSON.parse(param.payload)
    if(data.url && data.md5){
        let httpOpts = {verifyPeer: 0, verifyHost : 0}
        ota.updateHttp(data.url, data.md5, 60, null, httpOpts)
        driver.mqtt.send("base_upgrade/v1/cmd/upgrade_reply", JSON.stringify({ uuid: common.getSn(), timestamp: Math.floor(new Date().getTime() / 1000)}))
        common.asyncReboot(2)
    }
}

export default mqttService