import ui from "../dxmodules/dxUi.js";
import std from "../dxmodules/dxStd.js";
import testPage from './testPage.js'
import bus from '../dxmodules/dxEventBus.js'
import logger from '../dxmodules/dxLogger.js'

bus.newWorker('testworker', '/app/code/src/testworker.js')
// UI initialization
ui.init({ orientation: 1 }, {});
// Initialize test page
const configs = [
    {
        text: "Test Publish1",
        color: 0x27ae60, // Green color
        action: () => {
            // Execute specific operation
            bus.fire('mqtt_publish', {
                topic: 'testmqttclient/test3',
                payload: 'Hello1, MQTT Server!'
            })
        }
    },
    {
        text: "Test Publish2",
        color: 0xe74c3c, // Red color
        action: () => {
            bus.fire('mqtt_publish', {
                topic: 'testmqttclient/test3',
                payload: 'Hello2, MQTT Server!'
            })
        }
    }
]
testPage.init(configs)

// // Directly show network test page
testPage.show()

bus.on('network_status_change', (data) => {
    testPage.log(`Network status changed: type=${data.net_type}, status=${data.net_status}`)
})
bus.on('mqtt_msg', (data) => {
    testPage.log(`MQTT message: ${data}`)
})
// Refresh UI
let timer = std.setInterval(() => {
    if (ui.handler() < 0) {
        std.clearInterval(timer)
    }
}, 10) 