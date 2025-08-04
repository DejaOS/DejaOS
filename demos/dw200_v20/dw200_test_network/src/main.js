import ui from "../dxmodules/dxUi.js";
import std from "../dxmodules/dxStd.js";
import netTestPage from './netTestPage.js'
import bus from '../dxmodules/dxEventBus.js'
import net from '../dxmodules/dxNetwork.js'

bus.newWorker('networker', '/app/code/src/networker.js')//Try cross-thread network processing, not required
// UI initialization
ui.init({ orientation: 1 }, {});
// Initialize network test page
netTestPage.init()

// // Directly show network test page
netTestPage.show()

bus.on('network_status_change', (data) => {
    netTestPage.log(`Network status changed: type=${data.net_type}, status=${data.net_status}`)
})
bus.on('network_scan_wifi_result', (data) => {
    netTestPage.log(`Available WiFi networks: ${JSON.stringify(data)}`)
})
bus.on('ping_test_result', (data) => {
    netTestPage.log(`Ping baidu.com check result: ${data}`)
})

// Refresh UI
let timer = std.setInterval(() => {
    if (ui.handler() < 0) {
        std.clearInterval(timer)
    }
}, 10) 