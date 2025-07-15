// mqtt worker，connect mqttbroker and receive mqtt commands and send mqtt commands
import common from '../dxmodules/dxCommon.js'
import mqtt from '../dxmodules/dxMqtt.js'
import log from '../dxmodules/dxLogger.js'
import net from '../dxmodules/dxNet.js'
import std from '../dxmodules/dxStd.js'
import ota from '../dxmodules/dxOta.js'
import * as os from 'os'

// Get device serial number for identification
const sn = common.getSn()

// MQTT topic subscriptions - listening for upgrade commands
const topics = [`upgrade_demo/v1/cmd/${sn}/#`]

// MQTT connection configuration
const options = {
    mqttAddr: "tcp://101.200.139.97:51883", // MQTT broker address,this is a test mqtt broker which can be used for testing in internet
    clientId: sn, // Use serial number as client ID
    username: "upgrade_demo", // MQTT username
    password: "upgrade_demo_pwd", // MQTT password
    prefix: "", // Topic prefix (empty)
    qos: 1, // Quality of Service level
    subs: topics, // Topics to subscribe to
    willTopic: "upgrade_demo/v1/event/offline", // Last will topic
    willMessage: JSON.stringify({ uuid: sn, timestamp: timestamp() }), // Last will message
    id: "mymqttid" // MQTT instance ID
}

// Connection status tracking
let connected = false

/**
 * Main function to initialize and run MQTT client
 */
function run() {
    // Initialize MQTT connection with configuration parameters
    mqtt.init(options.mqttAddr, options.clientId, options.username, options.password, options.prefix, options.qos, options.willTopic, options.willMessage, options.id)
    log.info('mqtt start......,id =', options.id)

    // Wait for 2 seconds before starting monitoring
    os.sleep(2000)

    // Main monitoring loop - checks MQTT and network status every 50ms
    std.setInterval(() => {
        // Check if both MQTT and network are connected
        if (mqtt.isConnected(options.id) && net.getStatus().connected) {
            // If just connected, perform initial setup
            if (!connected) {
                _fireChange(true)
                // Subscribe to configured topics
                mqtt.subscribes(options.subs, options.qos, options.id)
                log.info('mqtt connected')
                // Send initial heartbeat
                heartBeat()
            }
            // Process incoming messages if any
            if (!mqtt.msgIsEmpty(options.id)) {
                let msg = mqtt.receive(options.id)
                handleReceive(msg)
            }
        } else {
            // Handle disconnection
            if (connected) {
                _fireChange(false)
            }
        }
    }, 50);

    // Heartbeat timer - sends heartbeat every 5 minutes (300000ms)
    std.setInterval(() => {
        heartBeat()
    }, 300000);
}

// Start the MQTT worker with error handling
try {
    run()
} catch (error) {
    log.error(error)
}

/**
 * Update connection status
 * @param {boolean} status - Connection status
 */
function _fireChange(status) {
    connected = status
}

/**
 * Get current timestamp in seconds
 * @returns {number} Current timestamp
 */
function timestamp() {
    return Math.floor(new Date().getTime() / 1000)
}

/**
 * Handle incoming MQTT messages
 * @param {Object} msg - Received message object
 */
function handleReceive(msg) {
    log.info('receive msg:', msg)

    // Check if message is an upgrade command
    if (msg.topic == 'upgrade_demo/v1/cmd/' + sn + '/upgrade') {
        log.info('upgrade cmd received')
        let payload = JSON.parse(msg.payload)
        log.info('upgrade url:', payload.url)
        log.info('upgrade md5:', payload.md5)

        // Perform OTA update with provided URL and MD5 hash
        ota.updateHttp(payload.url, payload.md5)
        mqtt.send('upgrade_demo/v1/cmd/upgrade_reply', JSON.stringify({ uuid: sn, timestamp: timestamp() }), options.id)
        ota.reboot()
    }
}

/**
 * Send heartbeat message to indicate device is alive
 */
function heartBeat() {
    let msg = { uuid: sn, timestamp: timestamp() }
    log.info('send heart beat:', msg)
    // Publish heartbeat to the event topic
    mqtt.send('upgrade_demo/v1/event/heart', JSON.stringify(msg), options.id)
}