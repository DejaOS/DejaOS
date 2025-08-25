import common from '../../dxmodules/dxCommon.js'
import logger from '../../dxmodules/dxLogger.js'
import std from '../../dxmodules/dxStd.js'
import mqttclient from '../../dxmodules/dxMqttClient.js'
import bus from '../../dxmodules/dxEventBus.js'
import ota from '../../dxmodules/dxOta.js'

const mqttService = {}

initMqtt();

function initMqtt() {
    let mqttAddr = ""
    // Read MQTT configuration from JSON config file
    try {
        if (std.exist('/app/code/src/config.json')) {
            const configData = JSON.parse(std.loadFile('/app/code/src/config.json'))
            mqttAddr = configData.mqttAddr || ""
            logger.info("[driver.mqtt] MQTT configuration read from config file:", { mqttAddr })
        }
    } catch (error) {
        logger.error("[driver.mqtt] Failed to read config file:", error)
    }

    // If mqttAddr is empty, use default address
    if (!mqttAddr || mqttAddr.trim() === "") {
        mqttAddr = "mqtt://123.57.175.193:61613"
        logger.info("[driver.mqtt] Using default MQTT address:", mqttAddr)
    }

    logger.info("[driver.mqtt] Initializing MQTT client:", 'tcp://' + mqttAddr, common.getSn())
    mqttclient.init('tcp://' + mqttAddr, common.getSn())

}

// Subscribe to base_upgrade/v1/cmd/${common.getSn()}/#
mqttclient.setCallbacks({
    onConnectSuccess: () => {
        logger.info("MQTT connected");
        mqttclient.subscribe(`base_upgrade/v1/cmd/${common.getSn()}/upgrade`);
        // After connection success, send connection success event, UI shows icon
        logger.info("[driver.mqtt] Sending connection success event, UI shows icon")
        bus.fire('mqtt_connected', 0)
    },
    onMessage: (topic, message, qos, retained) => {
        logger.info(`MQTT message received: topic=${topic}, message=${message}`);
        // Handle message
        handleMsg(topic, message)
    },
    onDelivery: (messageId) => {
        logger.info(`MQTT message delivered: messageId=${messageId}`);
        // bus.fire('mqtt_msg', `MQTT message delivered: messageId=${messageId}`)
    },
    onConnectionLost: (reason) => {
        logger.info(`MQTT connection lost: reason=${reason}`);
        // After connection failure, send connection failure event, UI hides icon
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
            logger.info("[driver.mqtt] MQTT configuration read from config file:", { username, password })
        }
    } catch (error) {
        logger.error("[driver.mqtt] Failed to read config file:", error)
    }

    // Set connection parameters
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
    // Check if topic contains upgrade
    if(topic.includes("upgrade")){
        logger.info('Upgrade message:' + JSON.stringify(message))
        let data = JSON.parse(message)
        if(data.url && data.md5){
            // UI shows upgrading
            bus.fire('show_upgrade_dialog', { url: data.url, md5: data.md5 })
            
            let httpOpts = {verifyPeer: 0, verifyHost : 0}
            ota.updateHttp(data.url, data.md5, 60, null, httpOpts)
            // Hide upgrade dialog
            bus.fire('hide_upgrade_dialog')
            // Send upgrade success message
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