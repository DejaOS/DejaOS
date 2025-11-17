/**
 * MQTT工作模块 (mqttWorker.js)
 * 
 * 功能说明：
 * - 管理MQTT客户端连接
 * - 自动重连机制
 * - 心跳保活
 * - 消息订阅和发布
 * - 事件通知
 */

import std from '../../dxmodules/dxStd.js'
import bus from '../../dxmodules/dxEventBus.js'
import config from '../../dxmodules/dxConfig.js'
import mqtt from '../../dxmodules/dxMqttClient.js'
import logger from '../../dxmodules/dxLogger.js'
import map from '../../dxmodules/dxMap.js'
import weComService from '../service/weComService.js'
import driver from '../driver.js'

// 网络状态跟踪变量
let shouldBeReinit = false  // 是否需要重新初始化
const mqtt_map = map.get("MQTT")
const net_map = map.get("NET")
const client_map = map.get("CLIENT")
/**
 * 获取所有需要订阅的MQTT主题
 * 
 * @returns {Array} 订阅主题列表
 */
function getTopics() {
    // 获取所有订阅的topic
    let sn = config.get("sys.sn")
    const topics = [
        "control", "getConfig", "setConfig", "upgradeFirmware", "test",
        "getPermission", "insertPermission", "delPermission", "clearPermission", "modifyPermission",
        "getKey", "insertKey", "delKey", "clearKey", "modifyKey",
        "getUser", "insertUser", "delUser", "clearUser", "modifyUser",
        "getSecurity", "insertSecurity", "delSecurity", "clearSecurity", "getRecords", "delRecords"
    ]
    const eventReplies = ["connect_reply", "alarm_reply", "access_reply", "access_online_reply", "wecom_reply"]

    let prefix = config.get("mqttInfo.prefix") || ''
    let flag = prefix + 'access_device/v2/cmd/' + sn + "/"
    let eventFlag = prefix + 'access_device/v2/event/' + sn + "/"
    return topics.map(item => flag + item).concat(eventReplies.map(item => eventFlag + item));
}

/**
 * 建立MQTT连接
 * 
 * 使用阻塞式连接，直到连接成功为止
 */
function connect() {
    try {
        if (net_map.get("NET_STATUS") != "connected") {
            return
        }
        // 获取连接配置
        const username = config.get("mqtt.username")
        const password = config.get("mqtt.password")
        const willTopic = config.get("mqtt.willTopic")
        const qos = config.get("mqtt.qos")

        mqtt.connect({
            username: username,
            password: password,
            will: {
                topic: willTopic,
                payload: JSON.stringify({
                    serialNo: std.genRandomStr(10),
                    uuid: config.get("sys.uuid"),
                    sign: "",
                    code: "000000",
                    time: Math.floor(new Date().getTime() / 1000)
                }),
                qos,
                retained: true,
            },
            cleanSession: config.get("mqtt.cleanSession") ? true : false
        });
        // 每次重新连接成功后需要重新订阅
        getTopics().forEach(v => {
            mqtt.subscribe(v, { qos });
        })
    } catch (error) {
        logger.error("MQTT connection error，retry in 5s:");
    }
}

let heartTimer = null
/**
 * 启动心跳定时器
 */
function restartHeartTimer() {
    if (heartTimer) {
        std.clearInterval(heartTimer)
        heartTimer = null
    }
    if (config.get("sys.heart_en")) {
        heartTimer = std.setInterval(() => {
            mqtt.publish("access_device/v2/event/heartbeat", JSON.stringify({
                serialNo: std.genRandomStr(10),
                uuid: config.get("sys.uuid"),
                sign: '',
                code: "000000",
                time: Math.floor(new Date().getTime() / 1000)
            }))
        }, config.get("sys.heart_time") * 1000)
    }
}

/**
 * MQTT初始化主函数
 */
function run() {
    let clientId = config.get('mqtt.clientId') + (config.get("mqtt.clientIdSuffix") == 1 ? std.genRandomStr(3) : "")
    let addr = weComService.isWeCom() ? weComService.getAddr() : config.get("mqtt.addr")
    logger.info("MQTT CONNECTION INFO\naddr:", addr + "\nclientId:" + clientId);
    // 初始化MQTT客户端
    mqtt.init(addr, clientId);

    // 设置MQTT回调函数
    mqtt.setCallbacks({
        onMessage: (topic, payload, qos, retained) => {
            //logger.info(`Message received: topic=${topic}, payload=${payload}, qos=${qos}, retained=${retained}`);
            bus.fire(driver.mqtt.RECEIVE_MSG, { topic, payload })
        },
        onDelivery: (token) => {
            logger.info(`Message delivery confirmed, token: ${token}`);
        },
        onConnectionLost: (cause) => {//disconnect不会触发onConnectionLost事件
            logger.error(`Connection lost: ${cause}`);
            bus.fire(driver.mqtt.CONNECTED_CHANGED, "disconnected")
            mqtt_map.put("MQTT_STATUS", "disconnected")
        },
        onConnectSuccess: () => {
            logger.info("Connected to broker");
            bus.fire(driver.mqtt.CONNECTED_CHANGED, "connected")
            mqtt_map.put("MQTT_STATUS", "connected")
            client_map.put("CLIENT_ID", clientId)
        }
    });

    // 建立连接
    connect()
}

/**
 * MQTT重连函数
 */
function reconnect() {
    logger.info("MQTT reconnect");
    mqtt.disconnect()
    bus.fire(driver.mqtt.CONNECTED_CHANGED, "disconnected")
    mqtt_map.put("MQTT_STATUS", "disconnected")
    mqtt.deinit()
    // 重新初始化MQTT
    run()
}

/**
 * 注册事件监听器
 */
function events() {
    // 监听重连事件
    bus.on(driver.mqtt.REINIT, () => {
        shouldBeReinit = true
    })

    // 监听发送消息事件
    bus.on(driver.mqtt.SEND_MSG, (data) => {
        const { topic, payload } = data
        if (mqtt.getNative() && mqtt.isConnected()) {
            console.log('---topic---',topic);
            console.log('---payload---',payload);
            mqtt.publish(topic, payload)
        }
    })

    // 监听重启心跳事件
    bus.on(driver.mqtt.RESTART_HEARTBEAT, restartHeartTimer)
    bus.on(driver.net.CONNECTED_CHANGED, (status) => {
        if (status == "disconnected") {
            bus.fire(driver.mqtt.CONNECTED_CHANGED, "disconnected")
            mqtt_map.put("MQTT_STATUS", "disconnected")
            mqtt.disconnect()
        }
    })
}
// mqtt状态监听器
function listener() {
    // 创建MQTT循环定时器
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

// 模块初始化
try {
    events()  // 注册事件监听器
    run()     // 初始化MQTT
    listener()
} catch (error) {
    logger.error("MQTT worker initialization error:", error);
}