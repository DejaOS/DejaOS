import net from '../../dxmodules/dxNetwork.js'
import logger from '../../dxmodules/dxLogger.js'
import bus from '../../dxmodules/dxEventBus.js'
import std from '../../dxmodules/dxStd.js'
const netService = {}

netInit();

function netInit() {
    logger.info("[driver.net] netInit")
    net.init()

    let type = 1
    let dhcp = 2
    let ssid = ""
    let psk = ""
    let ip = ""
    let gateway = ""
    let netmask = ""
    let dns = ""

    // Read network configuration from JSON config file
    try {
        if (std.exist('/app/code/src/config.json')) {
            logger.info("[driver.net] Reading network configuration from config file" + std.loadFile('/app/code/src/config.json'))
            const configData = JSON.parse(std.loadFile('/app/code/src/config.json'))
            type = configData.type || 1
            dhcp = configData.dhcp || 2
            ssid = configData.ssid || ""
            psk = configData.psk || ""
            ip = configData.ip || ""
            gateway = configData.gateway || ""
            netmask = configData.netmask || ""
            dns = configData.dns || ""
            logger.info("[driver.net] Network configuration read from config file:", { type, dhcp, ssid, psk })
        }
    } catch (error) {
        logger.error("[driver.net] Failed to read config file:", error)
    }

    logger.info("[driver.net] init with options:", { type, dhcp, ssid, psk, ip, gateway, netmask, dns })
    if (type == 2) {
        net.connectWifiWithDHCP(ssid, psk);
    } else if (type == 1) {
        if (dhcp == 2) {
            // Ethernet DHCP
            net.connectEthWithDHCP()
        } else {
            let netOption = {
                ip: ip,
                gateway: gateway,
                netmask: netmask,
                dns: dns
            }
            // Ethernet static
            net.connectEth(netOption)
        }
    }

}


net.setCallbacks({
    onStatusChange: (net_type, net_status) => {
        logger.info(`Network status changed: type=${net_type}, status=${net_status}`);
        bus.fire('network_status_change', { net_type, net_status })
    }
});


std.setInterval(() => {
    try {
        net.loop()
    } catch (e) {
        logger.error(`net loop error: ${e}`)
    }
}, 100)

export default netService