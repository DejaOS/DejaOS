// Device Controller: Manages various hardware and network events,
//  such as network connectivity, NFC card reading, barcode scanning, and GPIO key inputs etc.
// It consolidates multiple business listeners into a single worker to save threads.
import net from '../../dxmodules/dxNetwork.js'
import std from '../../dxmodules/dxStd.js'
import bus from '../../dxmodules/dxEventBus.js'
import logger from '../../dxmodules/dxLogger.js'
import ntp from '../../dxmodules/dxNtp.js'
import dxNfc from '../../dxmodules/dxNfc.js'
import dxGpioKey from '../../dxmodules/dxGpioKey.js'
import dxMap from '../../dxmodules/dxMap.js'
import barcode from '../../dxmodules/dxBarcode.js'
import commonutil from '../../dxmodules/dxCommonUtils.js'
import config from '../service/config.js'
import utils from '../utils/utils.js'
import mqttservice from '../service/mqtt.js'

const netservice = {
    lastConnected: false,
    getConfig: function () {
        return {
            dhcp: config.get("netInfo.dhcp") == 1,
            type: config.get("netInfo.type"),
            ip: config.get("netInfo.ip"),
            gateway: config.get("netInfo.gateway"),
            netmask: config.get("netInfo.subnetMask"),
            dns: config.get("netInfo.dns"),
            ssid: config.get("netInfo.ssid"),
            psk: config.get("netInfo.psk")
        }
    },
    setConfig: function (net_param) {
        if (!net_param) {
            return
        }
        if (net_param.ip) {
            config.set("netInfo.ip", net_param.ip)
        }
        if (net_param.gateway) {
            config.set("netInfo.gateway", net_param.gateway)
        }
        if (net_param.subnetMask) {
            config.set("netInfo.subnetMask", net_param.netmask)
        }
        if (net_param.dns) {
            config.set("netInfo.dns", net_param.dns)
        }
    },
    connect: function () {
        try {
            let res = 0;
            // Get network configuration
            let { dhcp, type, ip, gateway, netmask, dns, ssid, psk } = netservice.getConfig()
            logger.info("NET connect", dhcp, type, ip, gateway, netmask, dns, ssid, psk);
            // If the network type is not configured, use the default Ethernet
            if (!type) {
                logger.info("Network type not configured, using default");
                type = 1; // Use Ethernet by default
            }

            switch (type) {
                case 1:
                    // Ethernet connection
                    if (dhcp) {
                        // Use DHCP to obtain IP automatically
                        res = net.connectEthWithDHCP()
                    } else {
                        // Use static IP configuration
                        logger.info(ip, gateway, netmask, dns);

                        // Verify the integrity of the static IP configuration
                        if (!ip || !gateway || !netmask || !dns) {
                            logger.error("Ethernet static IP configuration incomplete");
                            return;
                        }
                        // Establish an Ethernet connection
                        res = net.connectEth({ ip, gateway, netmask, dns })
                    }
                    break;

                case 2:
                    // WiFi connection
                    if (!ssid) {
                        logger.error("WiFi SSID not configured");
                        return;
                    }
                    logger.info(ssid, psk);

                    if (dhcp) {
                        // Use DHCP to obtain IP automatically
                        res = net.connectWifiWithDHCP(ssid, psk)
                    } else {
                        // Verify the integrity of the static IP configuration
                        if (!ip || !gateway || !netmask) {
                            logger.error("WiFi static IP configuration incomplete");
                            return;
                        }
                        // Establish a WiFi connection
                        res = net.connectWifi(ssid, psk, { ip, gateway, netmask })
                    }
                    break;
                default:
                    logger.warn(`Unknown network type: ${type}`);
                    break;
            }
            logger.info("NET connect res:", res);
            if (res < 0) {
                //Less than 0 does not mean that the network connection fails, but a special error, you can try again
                std.setTimeout(() => {
                    netservice.connect()
                }, 3000)
            }
            return res;
        } catch (error) {
            logger.error("Error in connect function:", error);
        }
    },
    reconnect: function () {
        logger.info("NET reconnect");
        // Release network resources
        netservice.connect()
    },
    events: function () {
        // Listen for reconnection events
        bus.on(config.events.net.RECONNECT, netservice.reconnect)
    },
    run: function () {
        // Initialize the network module
        net.init();

        // Set network status change callback
        net.setCallbacks({
            onStatusChange: (net_type, net_status) => {
                logger.info(`Network status changed: type=${net_type}, status=${net_status}`);
                if (net.isConnected()) {
                    if (!netservice.lastConnected) {
                        netservice.setConfig(net.getNetParam())
                        bus.fire(config.events.net.CONNECTED_CHANGED, "connected")
                        netservice.lastConnected = true
                    }
                } else {
                    if (netservice.lastConnected) {
                        bus.fire(config.events.net.CONNECTED_CHANGED, "disconnected")
                        netservice.lastConnected = false
                    }
                }
            }
        });

        // Establish a network connection
        netservice.connect()
    },
    init: function () {
        netservice.events()
        netservice.run()
    }
}
const ntpserivice = {
    getConfig: function () {
        return {
            isNtp: config.get("netInfo.ntp") ? true : false,
            ntpAddr: config.get("netInfo.ntpAddr"),
            ntpHour: config.get("netInfo.ntpHour"),
            ntpLocaltime: config.get("netInfo.ntpLocaltime")
        }
    },
    init: function () {
        let { isNtp, ntpAddr, ntpHour, ntpLocaltime } = ntpserivice.getConfig()
        if (isNtp) {
            ntp.startSync(ntpAddr, ntpHour * 60, 2)
        }
    }
}
const barcodeservice = {
    getConfig: function () {
        return {
            mode: config.get("scanInfo.sMode"),
            interval: config.get("scanInfo.interval")
        }
    },
    detected: function (data) {
        let str = commonutil.codec.utf8HexToStr(commonutil.codec.arrayBufferToHex(data));
        const now = new Date().getTime()
        if (barcodeservice.mode == 1) {//single mode
            if (str != barcodeservice.singleOldContent) {
                bus.fire(config.events.barcode.BARCODE_DETECTED, str);
                barcodeservice.lastTimestamp = now
                barcodeservice.singleOldContent = str
            }
        } else {//interval mode 
            let _interval = Math.max(500, barcodeservice.interval)//at least 500 milliseconds
            if ((now - barcodeservice.lastTimestamp) > _interval || str != barcodeservice.intervalOldContent) {//do not send duplicate data within 1 second
                bus.fire(config.events.barcode.BARCODE_DETECTED, str);
                barcodeservice.lastTimestamp = now
                barcodeservice.intervalOldContent = str
            }
        }
    },
    init: function () {
        barcode.init()
        let opts = barcodeservice.getConfig()
        barcodeservice.mode = opts.mode
        barcodeservice.interval = opts.interval
        barcode.setCallbacks({
            onBarcodeDetected: function (data, type, quality, timestamp) {
                try {
                    barcodeservice.detected(data)
                } catch (error) {
                    logger.error('barcodeservice detected error', error);
                }
            },
        })
    }
}
const nfcservice = {
    options: { id: 'nfc1', m1: true, psam: false },
    isNfc: function () {
        return config.get('sysInfo.nfc')
    },
    init: function () {
        if (!nfcservice.isNfc()) {
            logger.debug("Card swiping is disabled")
            return
        }
        this.options.useEid = config.get("sysInfo.nfc_identity_card_enable") == 3 ? 1 : 0
        dxNfc.worker.beforeLoop(nfcservice.options)
    },
    eidInit: function () {
        if (!nfcservice.isNfc()) {
            logger.debug("Card swiping is disabled")
            return
        }
        if (config.get("sysInfo.nfc_identity_card_enable") == 3) {
            dxNfc.eidUpdateConfig({ appid: "1621503", sn: config.get("sysInfo.sn"), device_model: config.get("sysInfo.appVersion") })
        }
    },
    loop: function () {
        dxNfc.worker.loop(nfcservice.options)
    },
    //Read M1 card multi-block data
    m1cardReadSector: function (taskFlg, secNum, logicBlkNum, blkNums, key, keyType) {
        return dxNfc.m1cardReadSector(taskFlg, secNum, logicBlkNum, blkNums, key, keyType, nfcservice.options.id)
    }
}
const gpiokeyservice = {
    init: function () {
        dxGpioKey.worker.beforeLoop()
        gpiokeyservice.gpiokeyMap = dxMap.get("GPIOKEY")
    },
    loop: function () {
        dxGpioKey.worker.loop()
        if (utils.isEmpty(gpiokeyservice.checkTime) || new Date().getTime() - gpiokeyservice.checkTime > 200) {
            // Reduce the check frequency, check every 200 milliseconds
            gpiokeyservice.checkTime = new Date().getTime()
            let map = gpiokeyservice.gpiokeyMap
            let alarmOpenTimeoutTime = map.get("alarmOpenTimeoutTime")
            if (typeof alarmOpenTimeoutTime == 'number' && new Date().getTime() >= alarmOpenTimeoutTime) {
                mqttservice.alarm(3, 0)
                map.del("alarmOpenTimeoutTime")
            }
        }
    },
}
// Module initialization
try {
    netservice.init()
    ntpserivice.init()
    barcodeservice.init()
    nfcservice.init()
    nfcservice.eidInit()
    gpiokeyservice.init()
} catch (error) {
    logger.error('eventWorker init error', error);
}
std.setInterval(() => {
    try {
        if (net.getNative()) {
            net.loop(); // Execute network loop processing
        }
        barcode.loop()
        if (nfcservice.isNfc()) {
            nfcservice.loop()
        }
        gpiokeyservice.loop()
    } catch (error) {
        logger.error('eventWorker loop error', error);
    }
}, 10)