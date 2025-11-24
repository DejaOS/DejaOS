/**
 * MQTT Worker Module (mqttWorker.js)
 * 
 * Features:
 * - Manage MQTT client connections
 * - Automatic reconnection mechanism
 * - Heartbeat keep-alive
 * - Message subscription and publishing
 * - Event notifications
 */

import std from '../../dxmodules/dxStd.js'
import bus from '../../dxmodules/dxEventBus.js'
import config from '../../dxmodules/dxConfig.js'
import mqtt from '../../dxmodules/dxMqttClient.js'
import logger from '../../dxmodules/dxLogger.js'
import driver from '../driver.js'
import map from '../../dxmodules/dxMap.js'
import dxNet from '../../dxmodules/dxNet.js'

const mqtt_map = map.get("MQTT")
const net_map = map.get("NET")
const client_map = map.get("CLIENT")
/**
 * Get all MQTT topics that need to be subscribed
 * 
 * @returns {Array} List of subscription topics
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

/**
 * Establish MQTT connection
 * 
 * Uses blocking connection until connection succeeds
 */


function connect() {
  try {
    // Prevent duplicate connections
    if (driver.mqtt.isConnected()) {
      logger.info("MQTT already connected, skip connection")
      return
    }
    if (net_map.get("NET_STATUS") != "connected") {
      return
    }
    // Get connection configuration
    const username = config.get("mqttInfo.mqttName") || 'admin'
    const password = config.get("mqttInfo.password") || 'password'
    const qos = config.get("mqttInfo.qos")
    const prefix = config.get("mqttInfo.prefix") || ''
    mqtt.connect({
      username,
      password,
      will: {
        topic: prefix + 'access_device/v1/event/offline',
        payload: JSON.stringify({
          serialNo: std.genRandomStr(10),
          uuid: config.get("sysInfo.sn"),
          sign: "",
          code: "000000",
          time: Math.floor(new Date().getTime() / 1000)
        }),
        qos,
        retained: true,
      },
      cleanSession: config.get("mqttInfo.cleanSession") ? true : false
    });
    // Need to resubscribe after each successful reconnection
    getTopics().forEach(v => {
      mqtt.subscribe(v, { qos });
    })
  } catch (error) {
    logger.error("MQTT connection error,reconnect in 5s...");
  }
}

let heartTimer = null
/**
 * Start heartbeat timer
 */
function restartHeartTimer() {
  if (heartTimer) {
    std.clearInterval(heartTimer)
    heartTimer = null
  }
  if (config.get("sysInfo.heart_en")) {
    let prefix = config.get("mqttInfo.prefix") || ''
    heartTimer = std.setInterval(() => {
      mqtt.publish(prefix + "access_device/v1/event/heartbeat", JSON.stringify({
        serialNo: std.genRandomStr(10),
        uuid: config.get("sysInfo.uuid"),
        data: config.get("sysInfo.heart_data"),
        sign: '',
        code: "000000",
        time: Math.floor(new Date().getTime() / 1000)
      }))
    }, config.get("sysInfo.heart_time") * 1000)
  }
}

/**
 * MQTT initialization main function
 */
function run() {
  let clientId = config.get('mqttInfo.clientId') + (config.get("mqttInfo.clientIdSuffix") == 1 ? std.genRandomStr(3) : "")
  logger.info("MQTT CONNECTION INFO\naddr:", config.get("mqttInfo.mqttAddr") + "\nclientId:" + clientId);

  // Initialize MQTT client
  let mqttAddr = config.get("mqttInfo.mqttAddr")
  let hasProtocol = /^mqtt:\/\//i.test(mqttAddr);
  mqtt.init(hasProtocol ? mqttAddr : `mqtt://${mqttAddr}`, clientId);

  // Set MQTT callback functions
  mqtt.setCallbacks({
    onMessage: (topic, payload, qos, retained) => {
      logger.info(`Message received: topic=${topic}, payload=${payload}, qos=${qos}, retained=${retained}`);
      bus.fire(driver.mqtt.RECEIVE_MSG, { topic, payload })
    },
    onDelivery: (token) => {
      //logger.info(`Message delivery confirmed, token: ${token}`);
    },
    onConnectionLost: (cause) => {// disconnect does not trigger onConnectionLost event
      logger.error(`Connection lost: ${cause}`);
      bus.fire(driver.mqtt.CONNECTED_CHANGED, "disconnected")
      mqtt_map.put("MQTT_STATUS", "disconnected")
    },
    onConnectSuccess: () => {
      logger.info("Connected to broker");
      bus.fire(driver.mqtt.CONNECTED_CHANGED, "connected")
      mqtt_map.put("MQTT_STATUS", "connected")
      client_map.put("CLIENT_ID", clientId)
      restartHeartTimer()
    }
  });

  // Establish connection
  connect()
}

/**
 * Register event listeners
 */
function events() {
  // Listen for send message event
  bus.on(driver.mqtt.SEND_MSG, (data) => {
    const { topic, payload } = data
    if (mqtt.getNative() && mqtt.isConnected()) {
      mqtt.publish(topic, payload)
    }
  })

  // Listen for restart heartbeat event
  bus.on(driver.mqtt.RESTART_HEARTBEAT, restartHeartTimer)
  // Remove direct listening to dxNet.STATUS_CHANGE, change to listen for network status changes processed by netService
  bus.on(dxNet.STATUS_CHANGE, (status) => {
    if (!status.connected) {
      mqtt.disconnect()// Does not trigger onConnectionLost event
      bus.fire(driver.mqtt.CONNECTED_CHANGED, "disconnected")
      mqtt_map.put("MQTT_STATUS", "disconnected")
    }
  })

  bus.on(driver.mqtt.UNSUBSCRIBE, () => {
    getTopics().forEach(v => {
      mqtt.unsubscribe(v)
    })
  })
}

// MQTT status listener
function listener() {
  // Create MQTT loop timer
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
      if (mqtt.getNative() && !mqtt.isConnected()) {
        connect()
      }
    } catch (error) {
      logger.error("MQTT connect loop error:", error)
    }
  }, 5000)
}


// Module initialization
try {
  events()  // Register event listeners
  run()     // Initialize MQTT
  listener()
} catch (error) {
  logger.error("MQTT worker initialization error:", error);
}