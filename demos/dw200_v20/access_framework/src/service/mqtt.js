//mqtt related business processing
const mqttservice = {}
mqttservice.alarm = function (type, value) {
    // driver.mqtt.send("access_device/v1/event/alarm", JSON.stringify(mqttService.mqttReply(utils.genRandomStr(10), { type: type, value: value }, mqttService.CODE.S_000)))
}

export default mqttservice;