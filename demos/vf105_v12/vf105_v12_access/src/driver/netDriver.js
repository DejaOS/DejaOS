import net from '../../dxmodules/dxNet.js'
import common from '../../dxmodules/dxCommon.js'
import config from '../../dxmodules/dxConfig.js'
import logger from '../../dxmodules/dxLogger.js'
import std from '../../dxmodules/dxStd.js'
import map from '../../dxmodules/dxMap.js'
import bus from '../../dxmodules/dxEventBus.js'
import utils from '../common/utils/utils.js'

const netDriver = {
    init: function () {
        let dns = config.get("net.dns").split(",")
        let option = {
            type: config.get("net.type"),
            dhcp: config.get("net.dhcp"),
            ip: config.get("net.ip"),
            gateway: config.get("net.gateway"),
            netmask: config.get("net.mask"),
            dns0: dns[0],
            dns1: dns[1],
            macAddr: common.getUuid2mac()
        }
        logger.info("Update network configuration:", JSON.stringify(option));
        net.worker.beforeLoop(option)
        config.set("net.mac", common.getUuid2mac())
        if (config.get("net.type") == 2) {
            // Connect Wi-Fi using configuration file
            let ssid = utils.isEmpty(config.get('net.ssid')) ? "ssid" : config.get('net.ssid')
            let psk = utils.isEmpty(config.get('net.psk')) ? "psk" : config.get('net.psk')
            this.netConnectWifiSsid(ssid, psk)
        }
        // Fix incorrect network status after switching
        std.setInterval(() => {
            let status = net.getStatus()
            if (status.status != map.get("NET").get("status")) {
                status.type = config.get("net.type")
                bus.fire(net.STATUS_CHANGE, status)
            }
        }, 1000)
    },
    changeNetType: function () {
        // Mutex lock
        if (map.get("NET").get("changeType") == "Y") {
            return
        }
        map.get("NET").put("changeType", "Y")
        let type = config.get("net.type")
        logger.info("Switch network", type);
        [1, 2, 4].filter(v => v != type).forEach(v => {
            logger.info("Disable network card", v, net.cardEnable(v, false));
        })
        logger.info("Set master network card", type, net.setMasterCard(type));
        logger.info("Enable network card", type, net.cardEnable(type, true));
        if (type == 2) {
            // For Wi‑Fi, connect using values from config
            let ssid = utils.isEmpty(config.get('net.ssid')) ? "ssid" : config.get('net.ssid')
            let psk = utils.isEmpty(config.get('net.psk')) ? "psk" : config.get('net.psk')
            logger.info("Connect Wi‑Fi", ssid, psk);
            net.netConnectWifiSsid(ssid, psk)
        }
        if (type == 1 || type == 2) {
            let dns = config.get("net.dns").split(",")
            net.setModeByCard(type, config.get("net.dhcp"), config.get("net.dhcp") == 1 ? {
                ip: config.get("net.ip"),
                gateway: config.get("net.gateway"),
                netmask: config.get("net.mask"),
                dns0: dns[0],
                dns1: dns[1],
            } : undefined)
        }
        map.get("NET").del("changeType")
    },
    eidInit: function () {
        net.exit();
        common.systemWithRes(`pkill -9 -f 'wpa_supplicant|udhcpc'`, 5)
    },
    getStatus: function () {
        let status = net.getStatus()
        if (status.connected == true && status.status == 4) {
            return true
        } else {
            return false
        }

    },
    // Connect Wi‑Fi
    netConnectWifiSsid: function (ssid, psk) {
        net.netConnectWifiSsid(ssid, psk, "")
    },
    // Get Wi‑Fi list
    netGetWifiSsidList: function () {
        if (!this.getStatus()) {
            // If Wi‑Fi connection previously failed, destroy first before scanning
            net.netDisconnetWifi()
        }
        let result = net.netGetWifiSsidList(1000, 5)
        if (!result || !result.results || result.results.length === 0) {
            return [];
        }
        let wifiList = []; // Initialize wifiList as array
        result.results.forEach(element => wifiList.push(element.ssid)); // Push SSIDs into array
        return wifiList;
    },
    cardReset: function () {
        // net.netCardReset(2,1)
    },
    loop: function () {
        net.worker.loop()
    }
}

export default netDriver

