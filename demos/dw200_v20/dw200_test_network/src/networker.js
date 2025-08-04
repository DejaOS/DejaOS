import std from "../dxmodules/dxStd.js";
import net from '../dxmodules/dxNetwork.js'
import bus from '../dxmodules/dxEventBus.js'
import logger from '../dxmodules/dxLogger.js'
import common from '../dxmodules/dxCommon.js'

net.init()
net.setCallbacks({
    /**
     * Network status change callback
     * @param {number} net_type - Network type (1: Ethernet, 2: WiFi)
     * @param {number} net_status - Network status code
     */
    onStatusChange: (net_type, net_status) => {
        logger.info(`Network status changed: type=${net_type}, status=${net_status}`);
        bus.fire('network_status_change', { net_type, net_status })
    }
});
bus.on('network_scan_wifi', (data) => {
    try {
        let wifiList = net.scanWifi(10000, 500);
        bus.fire('network_scan_wifi_result', wifiList)
    } catch (e) {
        bus.fire('network_scan_wifi_result', e.message)
    }
})
bus.on('ping_test', (data) => {
    try {
        const host = 'www.baidu.com'
        // Use ping command to check network connectivity, timeout 3 seconds, send 1 packet
        let cmd = `ping -c 1 -W 3 ${host} > /dev/null 2>&1 && echo 'Y' || echo 'N'`
        let res = common.systemWithRes(cmd, 5000).split(/\s/)[0]
        logger.info("Ping baidu.com check result:", res)
        bus.fire('ping_test_result', `${res === "Y"}`)
    } catch (error) {
        logger.error('Ping baidu.com check failed:', error)
        bus.fire('ping_test_result', `${error.message}`)
    }
})
std.setInterval(() => {
    try {
        net.loop()
    } catch (e) {
        logger.error(`Network loop error: ${e}`)
    }
}, 100)