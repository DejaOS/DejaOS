// MQTT Controller: Handles all MQTT communication, 
// including connecting to the broker, subscribing to topics, 
// publishing messages, and managing the connection lifecycle.

import std from '../../dxmodules/dxStd.js'
import bus from '../../dxmodules/dxEventBus.js'
import mqtt from '../../dxmodules/dxMqttClient.js'
import logger from '../../dxmodules/dxLogger.js'
import utils from '../utils/utils.js'
import config from '../service/config.js'
import dxOs from '../../dxmodules/dxOs.js'

let shouldBeReinit = false  // whether it needs to be reinitialized
let heartTimer = null  // heartbeat timer
/**
 * get all mqtt topics that need to be subscribed to
 * @returns {Array} list of subscribed topics
 */
function getTopics() {
    let sn = config.get("sysInfo.sn")
    const topics = [
        "control", "getConfig", "setConfig", "upgradeFirmware", "test",
        "getPermission", "insertPermission", "delPermission", "clearPermission",
        "getUser", "insertUser", "delUser", "clearUser",
        "getKey", "insertKey", "delKey", "clearKey",
        "getSecurity", "insertSecurity", "delSecurity", "clearSecurity"
    ]
    const eventReplies = ["connect_reply", "alarm_reply", "access_reply", "access_online_reply"]

    let prefix = config.get("mqttInfo.prefix") || ''
    let flag = prefix + 'access_device/v1/cmd/' + sn + "/"
    let eventFlag = prefix + 'access_device/v1/event/' + sn + "/"
    return topics.map(item => flag + item).concat(eventReplies.map(item => eventFlag + item));
}
function getConfig() {
    return {
        initOptions: {
            clientId: utils.isEmpty(config.get('mqttInfo.clientId')) ? dxOs.getSn() : config.get('mqttInfo.clientId'),
            mqttAddr: config.get("mqttInfo.mqttAddr")
        },
        connectOptions: {
            username: config.get("mqttInfo.mqttName"),
            password: config.get("mqttInfo.password"),
            will: {
                topic: 'access_device/v1/event/offline',
                payload: JSON.stringify({
                    serialNo: std.genRandomStr(10),
                    uuid: config.get("sysInfo.sn"),
                    sign: "",
                    code: "000000",
                    time: Math.floor(new Date().getTime() / 1000)
                }),
                qos: config.get("mqttInfo.qos"),
                retained: true,
            },
            cleanSession: config.get("mqttInfo.cleanSession") ? true : false
        }, heartOptions: {
            topic: "access_device/v1/event/heartbeat",
            uuid: config.get("sysInfo.sn"),
            data: config.get("sysInfo.heart_data"),
            heart_time: config.get("sysInfo.heart_time"),
            heart_en: config.get("sysInfo.heart_en")
        }
    };
}
/**
 * establish an mqtt connection using a blocking connection until the connection is successful
 */
function connect() {
    try {
        // get connection configuration
        let options = getConfig().connectOptions;
        mqtt.connect(options);

        // need to re-subscribe after each successful reconnection
        getTopics().forEach(v => {
            mqtt.subscribe(v, { qos: options.qos });
        })
    } catch (error) {
        logger.error("MQTT connection error,retry after 5 seconds");
    }
}

/**
 * start heartbeat timer
 */
function restartHeartTimer() {
    if (heartTimer) {
        std.clearInterval(heartTimer)
        heartTimer = null
    }
    let heartOptions = getConfig().heartOptions;
    let heart_payload = JSON.stringify({
        serialNo: std.genRandomStr(10),
        uuid: heartOptions.uuid,
        data: heartOptions.data,
        sign: '',
        code: "000000",
        time: Math.floor(Date.parse(new Date()) / 1000)
    })
    let heart_time = heartOptions.heart_time
    let heart_en = heartOptions.heart_en
    if (heart_en && heart_time) {
        heartTimer = std.setInterval(() => {
            mqtt.publish(heartOptions.topic, heart_payload)
        }, heart_time * 1000)
    }
}

/**
 * mqtt initialization main function
 */
function run() {
    let initOptions = getConfig().initOptions;
    logger.info("MQTT CONNECTION INFO\naddr:", initOptions.mqttAddr + "\nclientId:" + initOptions.clientId);
    // initialize mqtt client
    mqtt.init(initOptions.mqttAddr, initOptions.clientId);

    // set mqtt callback function
    mqtt.setCallbacks({
        onMessage: (topic, payload, qos, retained) => {
            logger.info(`Message received: topic=${topic}, payload=${payload}, qos=${qos}, retained=${retained}`);
            bus.fire(config.events.mqtt.RECEIVE_MSG, { topic, payload })
            //TODO send to different workers for processing according to different topics, and the time-consuming permission distribution will be sent to permworker.js for processing
        },
        onDelivery: (token) => {
            logger.info(`Message delivery confirmed, token: ${token}`);
        },
        onConnectionLost: (cause) => {
            logger.error(`Connection lost: ${cause}`);
            bus.fire(config.events.mqtt.CONNECTED_CHANGED, "disconnected")
        },
        onConnectSuccess: () => {
            logger.info("Connected to broker");
            bus.fire(config.events.mqtt.CONNECTED_CHANGED, "connected")
        }
    });
    // establish connection
    connect()
}
function reconnect() {
    logger.info("MQTT reconnect");
    mqtt.disconnect()
    bus.fire(config.events.mqtt.CONNECTED_CHANGED, "disconnected")
    mqtt.deinit()
    // reinitialize mqtt
    run()
}
/**
 * register event listeners
 */
function events() {
    // listen for reconnection events
    bus.on(config.events.mqtt.REINIT, () => {
        shouldBeReinit = true
    })

    // listen for message sending events
    bus.on(config.events.mqtt.SEND_MSG, (data) => {
        const { topic, payload } = data
        if (mqtt.getNative()) {
            mqtt.publish(topic, payload)
        }
    })

    // listen for heartbeat restart events
    bus.on(config.events.mqtt.RESTART_HEARTBEAT, restartHeartTimer)
    bus.on(config.events.net.CONNECTED_CHANGED, (status) => {
        if (status == "disconnected") {
            bus.fire(config.events.mqtt.CONNECTED_CHANGED, "disconnected")
            mqtt.disconnect()
        }
    })
}
// mqtt status listener
function listener() {
    // create mqtt loop timer
    std.setInterval(() => {
        try {
            if (mqtt.getNative()) {
                mqtt.loop();
            }
        } catch (error) {
            logger.error("MQTT loop error:", error)
        }
    }, 50)
    std.setInterval(() => {
        try {
            if (shouldBeReinit) {
                shouldBeReinit = false
                reconnect()
            } else if (mqtt.getNative() && !mqtt.isConnected()) {
                connect()
            }
        } catch (error) {
            logger.error("MQTT connect loop error:", error)
        }
    }, 5000)
}
// module initialization
try {
    events()  // register event listener
    run()     // initialize mqtt
    listener()
} catch (error) {
    logger.error("MQTT worker initialization error:", error);
}