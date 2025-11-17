/**
 * 网络工作模块 (netWorker.js)
 * 
 * 功能说明：
 * - 管理网络连接（以太网、WiFi、4G）
 * - 支持DHCP和静态IP配置
 * - 自动重连机制
 * - 网络状态监控和事件通知
 * - WiFi扫描功能
 * 
 * 网络类型：
 * - type=1: 以太网
 * - type=2: WiFi
 * - type=4: 4G
 * 
 * 网络状态：
 * - status=4: 已连接
 * - 其他状态: 未连接或连接中
 */

import net from '../../dxmodules/dxNetwork.js'
import std from '../../dxmodules/dxStd.js'
import bus from '../../dxmodules/dxEventBus.js'
import config from '../../dxmodules/dxConfig.js'
import logger from '../../dxmodules/dxLogger.js'
import map from '../../dxmodules/dxMap.js'
import driver from '../driver.js'
import netUtils from '../common/utils/netUtils.js'
import * as os from "os"

// 网络状态跟踪变量
let lastConnected = false  // 上次连接状态
let shouldReconnect = false
const net_map = map.get("NET")
/**
 * 根据配置建立网络连接
 * 
 * 支持的连接方式：
 * 1. 以太网 - DHCP或静态IP
 * 2. WiFi - DHCP或静态IP
 * 3. 4G - 自动连接
 */
function connect() {
    try {
        let res = 0;
        // 获取网络配置
        let dhcp = config.get("net.dhcp") == 2  // DHCP启用标志
        let type = config.get("net.type")       // 网络类型

        // 如果未配置网络类型，使用默认的以太网
        if (!type) {
            logger.warn("Network type not configured, using default");
            type = 1; // 默认使用以太网
        }

        switch (type) {
            case 1:
                // 以太网连接
                if (dhcp) {
                    // 使用DHCP自动获取IP
                    res = net.connectEthWithDHCP()
                } else {
                    // 使用静态IP配置
                    const ip = config.get("net.ip")
                    const gateway = config.get("net.gateway")
                    const netmask = config.get("net.mask")
                    const dns = config.get("net.dns")
                    logger.info(ip, gateway, netmask, dns);

                    // 验证静态IP配置的完整性
                    if (!ip || !gateway || !netmask || !dns) {
                        logger.error("Ethernet static IP configuration incomplete");
                        return;
                    }

                    // 建立以太网连接
                    res = net.connectEth({ ip, gateway, netmask, dns })
                }
                break;

            case 2:
                // WiFi连接
                let ssid = config.get("net.ssid")
                let psk = config.get("net.psk")
                if (!ssid) {
                    psk = ""
                }
                logger.info(ssid, psk);

                if (dhcp) {
                    // 使用DHCP自动获取IP
                    res = net.connectWifiWithDHCP(ssid, psk)
                } else {
                    // 使用静态IP配置
                    const ip = config.get("net.ip")
                    const gateway = config.get("net.gateway")
                    const netmask = config.get("net.mask")

                    // 验证静态IP配置的完整性
                    if (!ip || !gateway || !netmask) {
                        logger.error("WiFi static IP configuration incomplete");
                        return;
                    }

                    // 建立WiFi连接
                    res = net.connectWifi(ssid, psk, { ip, gateway, netmask })
                }
                break;

            case 4:
                // 4G连接 - 自动配置
                res = net.connect4G()
                break;

            default:
                logger.warn(`Unknown network type: ${type}`);
                break;
        }
        logger.info("NET connect res:", res);
        if (res < 0) {
            //小于0并不是表示网络连接失败，而是一个特殊的错误，可以重试一次就可以
            shouldReconnect = true
        }
        return res;
    } catch (error) {
        logger.error("Error in connect function:", error);
    }
}

/**
 * 网络重连函数
 */
function reconnect() {
    logger.info("NET reconnect");
    shouldReconnect = true
}

/**
 * 注册事件监听器
 * 
 * 监听的事件：
 * - RECONNECT: 手动触发重连
 * - SCAN_WIFI: 扫描WiFi网络
 */
function events() {
    // 监听重连事件
    bus.on(driver.net.RECONNECT, reconnect)

    // 监听WiFi扫描事件
    bus.on(driver.net.SCAN_WIFI, () => {
        // 扫描WiFi网络并返回结果
        // 参数：超时时间2500ms，扫描间隔200ms
        let wifiList = net.scanWifi(2500, 200)
        if (wifiList) {
            let ssidList = wifiList.map(v => v.ssid)
            let cleaned = netUtils.filterWifiList(ssidList, { maxLen: 64 });
            bus.fire(driver.net.WIFI_LIST, cleaned)
        }
    })
}



/**
 * 网络初始化主函数
 * 
 * 执行步骤：
 * 1. 初始化网络模块
 * 2. 设置网络状态回调
 * 3. 建立网络连接
 * 4. 创建必要的定时器
 */
function run() {
    // 初始化网络模块
    net.init();
    shouldReconnect = true
}

// 网络状态监听器
function listener() {
    std.setInterval(() => {
        try {
            if (net.getNative()) {
                net.loop(); // 执行网络循环处理
            }
            if (shouldReconnect) {
                logger.info("NET shouldReconnect");
                shouldReconnect = false
                connect()
            }
        } catch (error) {
            logger.error(error)
        }
        if (net.isConnected()) {
            if (!lastConnected) {
                bus.fire(driver.net.CONNECTED_CHANGED, "connected")
                lastConnected = true
                net_map.put("NET_STATUS", "connected")
            }
        } else {
            if (lastConnected) {
                bus.fire(driver.net.CONNECTED_CHANGED, "disconnected")
                lastConnected = false
                net_map.put("NET_STATUS", "disconnected")
            }
        }
    }, 5000)
}

// 模块初始化
try {
    events()  // 注册事件监听器
    run()     // 初始化网络
    listener()
} catch (error) {
    logger.error(error);
}