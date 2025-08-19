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

    // 从JSON配置文件读取网络配置
    try {
        if (std.exist('/app/code/src/config.json')) {
            logger.info("[driver.net] 从配置文件读取网络配置" + std.loadFile('/app/code/src/config.json'))
            const configData = JSON.parse(std.loadFile('/app/code/src/config.json'))
            type = configData.type || 1
            dhcp = configData.dhcp || 2
            ssid = configData.ssid || ""
            psk = configData.psk || ""
            ip = configData.ip || ""
            gateway = configData.gateway || ""
            netmask = configData.netmask || ""
            dns = configData.dns || ""
            logger.info("[driver.net] 从配置文件读取网络配置:", { type, dhcp, ssid, psk })
        }
    } catch (error) {
        logger.error("[driver.net] 读取配置文件失败:", error)
    }

    logger.info("[driver.net] init with options:", { type, dhcp, ssid, psk, ip, gateway, netmask, dns })
    if (type == 2) {
        net.connectWifiWithDHCP(ssid, psk);
    } else if (type == 1) {
        if (dhcp == 2) {
            //以太网动态
            net.connectEthWithDHCP()
        } else {
            let netOption = {
                ip: ip,
                gateway: gateway,
                netmask: netmask,
                dns: dns
            }
            //以太网静态
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