import common from '../../dxmodules/dxCommon.js'
import logger from '../../dxmodules/dxLogger.js'
import std from '../../dxmodules/dxStd.js'
import mqttclient from '../../dxmodules/dxMqttClient.js'
import bus from '../../dxmodules/dxEventBus.js'
import ota from '../../dxmodules/dxOta.js'

const mqttService = {}

initMqtt();

function initMqtt() {
    //判断是否配置了mqtt地址
    let mqttAddr = ""
    // 从JSON配置文件读取MQTT配置
    try {
        if (std.exist('/app/code/src/config.json')) {
            const configData = JSON.parse(std.loadFile('/app/code/src/config.json'))
            mqttAddr = configData.mqttAddr || ""
            logger.info("[driver.mqtt] 从配置文件读取MQTT配置:", { mqttAddr })
        }
    } catch (error) {
        logger.error("[driver.mqtt] 读取配置文件失败:", error)
    }

    // 如果mqttAddr为空，使用默认地址
    if (!mqttAddr || mqttAddr.trim() === "") {
        mqttAddr = "mqtt://123.57.175.193:61613"
        logger.info("[driver.mqtt] 使用默认MQTT地址:", mqttAddr)
    }

    logger.info("[driver.mqtt] 初始化MQTT客户端:", 'tcp://' + mqttAddr, common.getSn())
    mqttclient.init('tcp://' + mqttAddr, common.getSn())

}

//订阅base_upgrade/v1/cmd/${common.getSn()}/#
mqttclient.setCallbacks({
    onConnectSuccess: () => {
        logger.info("MQTT connected");
        mqttclient.subscribe(`base_upgrade/v1/cmd/${common.getSn()}/upgrade`);
        //连接成功后，发送连接成功事件,界面显示图标
        logger.info("[driver.mqtt] 发送连接成功事件,界面显示图标")
        bus.fire('mqtt_connected', 0)
    },
    onMessage: (topic, message, qos, retained) => {
        logger.info(`MQTT message received: topic=${topic}, message=${message}`);
        //处理消息
        handleMsg(topic, message)
    },
    onDelivery: (messageId) => {
        logger.info(`MQTT message delivered: messageId=${messageId}`);
        // bus.fire('mqtt_msg', `MQTT message delivered: messageId=${messageId}`)
    },
    onConnectionLost: (reason) => {
        logger.info(`MQTT connection lost: reason=${reason}`);
        //连接失败后，发送连接失败事件,界面隐藏图标
        bus.fire('mqtt_connected', 1)
        autoconnect()
    }
});

bus.on('mqtt_publish', (data) => {
    logger.info(`MQTT publish: topic=${data.topic}, payload=${data.payload}`)
    mqttclient.publish(data.topic, data.payload, { qos: 1 })
})


bus.on('mqtt_to_connect', (data) => {
    logger.info(`MQTT to connect: ${data}`)
    if(data == 0){
        connectMqtt()
    }
})

function connectMqtt() {
    let username = ""
    let password = ""
    try {
        if (std.exist('/app/code/src/config.json')) {
            const configData = JSON.parse(std.loadFile('/app/code/src/config.json'))
            username = configData.username || ""
            password = configData.password || ""
            logger.info("[driver.mqtt] 从配置文件读取MQTT配置:", { username, password })
        }
    } catch (error) {
        logger.error("[driver.mqtt] 读取配置文件失败:", error)
    }

    //设置连接参数
    let options = {
        username: username,
        password: password,
        will: {
            topic: "base_upgrade/v1/event/offline",
            payload: JSON.stringify({ uuid: common.getSn(), timestamp: Math.floor(new Date().getTime() / 1000) }),
            qos: 1,
            retained: true
        }
    }
    logger.info("[driver.mqtt] connect :", options)
    mqttclient.connect(options)
}

function autoconnect() {
    std.setTimeout(() => {
        connectMqtt()
    }, 5000)
}


function handleMsg(topic, message) {
    logger.info(`MQTT handleMsg: topic=${topic}, message=${message}`)
    //判断topic是否包含upgrade
    if(topic.includes("upgrade")){
        logger.info('升级消息:' + JSON.stringify(message))
        let data = JSON.parse(message)
        if(data.url && data.md5){
            let httpOpts = {verifyPeer: 0, verifyHost : 0}
            ota.updateHttp(data.url, data.md5, 60, null, httpOpts)
            //发送升级成功消息
            bus.fire("mqtt_publish", { topic: "base_upgrade/v1/cmd/upgrade_reply", payload: JSON.stringify({ uuid: common.getSn(), timestamp: Math.floor(new Date().getTime() / 1000)})})
            common.asyncReboot(2)
        }
    }
}


std.setInterval(() => {
    try {
        mqttclient.loop()
    } catch (e) {
        logger.error(`loop error: ${e}`)
    }
}, 100)








export default mqttService