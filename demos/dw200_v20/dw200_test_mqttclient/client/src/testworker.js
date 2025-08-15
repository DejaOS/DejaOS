import std from "../dxmodules/dxStd.js";
import net from '../dxmodules/dxNetwork.js'
import bus from '../dxmodules/dxEventBus.js'
import logger from '../dxmodules/dxLogger.js'
import common from '../dxmodules/dxCommon.js'
import mqttclient from '../dxmodules/dxMqttClient.js'

const url = 'tcp://192.168.50.36:1883'
let msg_count = 0
net.init()
mqttclient.init(url, 'my-device-12345');

net.connectWifiWithDHCP("vguangYPT", "vguangypt_o0");
net.setCallbacks({
    onStatusChange: (net_type, net_status) => {
        logger.info(`Network status changed: type=${net_type}, status=${net_status}`);
        bus.fire('network_status_change', { net_type, net_status })
    }
});

mqttclient.setCallbacks({
    onConnectSuccess: () => {
        logger.info("MQTT connected");
        mqttclient.subscribe('testmqttclient/test1', { qos: 1 });
        mqttclient.subscribe('testmqttclient/test2');
        bus.fire('mqtt_msg', "MQTT connected")
    },
    onMessage: (topic, message, qos, retained) => {
        logger.info(`MQTT message received: topic=${topic}, message=${message}`);
        msg_count++
        bus.fire('mqtt_msg', `${msg_count} MQTT message received: topic=${topic}, message=${message}`)
    },
    onDelivery: (messageId) => {
        logger.info(`MQTT message delivered: messageId=${messageId}`);
        bus.fire('mqtt_msg', `MQTT message delivered: messageId=${messageId}`)
    },
    onConnectionLost: (reason) => {
        logger.info(`MQTT connection lost: reason=${reason}`);
        bus.fire('mqtt_msg', `MQTT connection lost: reason=${reason}`)
        autoconnect()
    }
});
function autoconnect() {
    std.setTimeout(() => {
        connectMqtt()
    }, 5000)
}
autoconnect()
function connectMqtt() {
    try {
        bus.fire('mqtt_msg', "MQTT connecting")
        mqttclient.connect()
    } catch (e) {
        logger.error(`MQTT connect error:`, e)
        bus.fire('mqtt_msg', "MQTT connect error, retry in 5 seconds: " + e)
        std.setTimeout(() => {
            connectMqtt()
        }, 5000)
    }
}
bus.on('mqtt_publish', (data) => {
    logger.info(`MQTT publish: topic=${data.topic}, payload=${data.payload}`)
    mqttclient.publish(data.topic, data.payload, { qos: 1 })
})
std.setInterval(() => {
    try {
        net.loop()
        mqttclient.loop()
    } catch (e) {
        logger.error(`loop error: ${e}`)
    }
}, 100)