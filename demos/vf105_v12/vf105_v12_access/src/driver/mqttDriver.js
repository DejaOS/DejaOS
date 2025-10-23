import mqtt from '../../dxmodules/dxMqtt.js'
import config from '../../dxmodules/dxConfig.js'
import std from '../../dxmodules/dxStd.js'
import logger from '../../dxmodules/dxLogger.js'
import mqttService from '../service/mqttService.js'
import utils from '../common/utils/utils.js'
import syncDriver from './syncDriver.js'

const mqttDriver = {
    init: function () {
        mqtt.run({ mqttAddr: config.get("mqtt.addr"), clientId: config.get('mqtt.clientId') + std.genRandomStr(3), subs: mqttService.getTopics(), username: config.get("mqtt.username"), password: config.get("mqtt.password"), qos: config.get("mqtt.qos"), willTopic: config.get("mqtt.willTopic"), willMessage: JSON.stringify({ "uuid": config.get("sys.uuid") }) })
    },
    eidInit: function () {
        mqtt.destroy()
    },
    send: function (topic, payload,) {
        logger.info("[driver.mqtt] send :", topic)
        mqtt.send(topic, payload)
    },
    getOnlinecheck: function () {
        let timeout = config.get("mqtt.timeout")
        timeout = utils.isEmpty(timeout) ? 2000 : timeout
        return syncDriver.request("mqtt.getOnlinecheck", timeout)
    },
    getOnlinecheckReply: function (data) {
        syncDriver.response("mqtt.getOnlinecheck", data)
    },
    getStatus: function () {
        return mqtt.isConnected()
    },
    heartbeat: function () {
        if (utils.isEmpty(this.heart_en)) {
            let heart_en = config.get('sys.heart_en')
            this.heart_en = utils.isEmpty(heart_en) ? 0 : heart_en
            let heart_time = config.get('sys.heart_time')
            this.heart_time = utils.isEmpty(heart_time) ? 30 : heart_time < 30 ? 30 : heart_time
        }
        if (utils.isEmpty(this.lastHeartbeat)) {
            this.lastHeartbeat = 0
        }
        if (this.heart_en === 1 && (new Date().getTime() - this.lastHeartbeat >= (this.heart_time * 1000))) {
            this.lastHeartbeat = new Date().getTime()
            mqttDriver.send("access_device/v2/event/heartbeat", JSON.stringify(mqttService.mqttReply(std.genRandomStr(10), undefined, mqttService.CODE.S_000)))
        }
    }
}

export default mqttDriver

