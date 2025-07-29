/**
 * Network Module based on native network_bridge C library.
 * This module provides a singleton interface to network management.
 *
 * Features:
 * - Initialize/deinitialize network stack
 * - Connect/disconnect to Ethernet/WiFi/4G
 * - Query network status, local IP, RSSI
 * - Scan WiFi hotspots
 * - Register event callbacks (status change, WiFi scan complete)
 *
 * Usage:
 * - Call `init()` once to initialize.
 * - Use connect/disconnect/getStatus/isConnected/getLocalIP/getRSSI/scanWifi as needed.
 * - Use setCallbacks to register event handlers.
 * - Call loop() periodically to process events (e.g. in setInterval).
 *
 * Doc/Demo: https://github.com/DejaOS/DejaOS
 */
import { netClass } from './libvbar-m-dxnetwork.so'

/**
 * @typedef {object} NetOption
 * @property {string} ip - Static IP address.
 * @property {string} gateway - Static gateway address.
 * @property {string} netmask - Static netmask.
 * @property {string} [dns] - Static DNS server address.
 */


let net = null;
const dxnetwork = {};

function checkNetInitialized() {
    if (!net) {
        throw new Error('Network client is not initialized. Call init() first.');
    }
}

/**
 * Initializes the network client. Must be called before any other operation.
 * @example
 * dxnetwork.init();
 */
dxnetwork.init = function () {
    if (!net) {
        net = new netClass();
    }
}

/**
 * Initializes the network stack (native layer).
 * @returns {void}
 */
dxnetwork.netInit = function () {
    dxnetwork.init();
    net.init();
}

/**
 * Deinitializes the network stack and releases resources.
 * @returns {void}
 */
dxnetwork.deinit = function () {
    if (net) {
        net.deinit();
        net = null;
    }
}

/**
 * Connects to a network (Ethernet/WiFi/4G).
 * @param {object} options - Connection options.
 * @param {number} options.netType - Network type:
 *   1 = Ethernet,
 *   2 = WiFi,
 *   3 = 4G Modem.
 * @param {number} [options.ipMode] - IP mode: 0 = DHCP, 1 = Static.
 * @param {string} [options.ssid] - WiFi SSID (for WiFi only).
 * @param {string} [options.psk] - WiFi password (for WiFi only).
 * @param {string} [options.apn] - APN for 4G connection.
 * @param {string} [options.user] - Username for 4G APN.
 * @param {string} [options.password] - Password for 4G APN.
 * @param {string} [options.ip] - Static IP address (for static mode).
 * @param {string} [options.gateway] - Static gateway (for static mode).
 * @param {string} [options.netmask] - Static netmask (for static mode).
 * @param {string} [options.dns] - Static DNS (for static mode).
 * @returns {void}
 * @example
 * dxnetwork.connect({ netType: 2, ssid: 'MyWiFi', psk: 'password' });
 */
dxnetwork.connect = function (options) {
    dxnetwork.init();
    net.connect(options);
}

/**
 * Connects to Ethernet with DHCP.
 * @returns {void}
 * @example
 * dxnetwork.connectEthWithDHCP();
 */
dxnetwork.connectEthWithDHCP = function () {
    dxnetwork.init();
    const options = {
        netType: 1, // Ethernet
        ipMode: 0   // DHCP
    };
    net.connect(options);
};

/**
 * Connects to Ethernet with a static IP configuration.
 * @param {NetOption} netOption - The static IP configuration.
 * @returns {void}
 * @example
 * dxnetwork.connectEth({
 *   ip: '192.168.1.100',
 *   gateway: '192.168.1.1',
 *   netmask: '255.255.255.0',
 *   dns: '8.8.8.8'
 * });
 */
dxnetwork.connectEth = function (netOption) {
    dxnetwork.init();
    if (!netOption || !netOption.ip || !netOption.gateway || !netOption.netmask) {
        throw new Error('Static IP configuration (ip, gateway, netmask) is required for connectEth.');
    }
    const options = {
        netType: 1, // Ethernet
        ipMode: 1,  // Static
        ip: netOption.ip,
        gateway: netOption.gateway,
        netmask: netOption.netmask,
        dns: netOption.dns
    };
    net.connect(options);
};

/**
 * Connects to a WiFi network with DHCP.
 * @param {string} ssid - The SSID of the WiFi network.
 * @param {string} psk - The password (Pre-Shared Key) of the WiFi network.
 * @returns {void}
 * @example
 * dxnetwork.connectWifiWithDHCP('MyWiFi', 'MyPassword');
 */
dxnetwork.connectWifiWithDHCP = function (ssid, psk) {
    dxnetwork.init();
    if (!ssid || !psk) {
        throw new Error('SSID and PSK are required for connectWifiWithDHCP.');
    }
    const options = {
        netType: 2, // WiFi
        ipMode: 0,  // DHCP
        ssid: ssid,
        psk: psk
    };
    net.connect(options);
};

/**
 * Connects to a WiFi network with a static IP configuration.
 * @param {string} ssid - The SSID of the WiFi network.
 * @param {string} psk - The password (Pre-Shared Key) of the WiFi network.
 * @param {NetOption} netOption - The static IP configuration.
 * @returns {void}
 * @example
 * dxnetwork.connectWifi('MyWiFi', 'MyPassword', {
 *   ip: '192.168.1.101',
 *   gateway: '192.168.1.1',
 *   netmask: '255.255.255.0'
 * });
 */
dxnetwork.connectWifi = function (ssid, psk, netOption) {
    dxnetwork.init();
    if (!ssid || !psk) {
        throw new Error('SSID and PSK are required for connectWifi.');
    }
    if (!netOption || !netOption.ip || !netOption.gateway || !netOption.netmask) {
        throw new Error('Static IP configuration (ip, gateway, netmask) is required for connectWifi with static IP.');
    }
    const options = {
        netType: 2, // WiFi
        ipMode: 1,  // Static
        ssid: ssid,
        psk: psk,
        ip: netOption.ip,
        gateway: netOption.gateway,
        netmask: netOption.netmask,
        dns: netOption.dns
    };
    net.connect(options);
};

/**
 * Connects to a 4G mobile network with default settings.
 * @returns {void}
 * @example
 * dxnetwork.connect4G();
 */
dxnetwork.connect4G = function () {
    dxnetwork.init();
    const options = {
        netType: 3, // 4G Modem
    };
    net.connect(options);
};

/**
 * Disconnects from the current network.
 * @returns {void}
 */
dxnetwork.disconnect = function () {
    dxnetwork.init();
    net.disconnect();
}

/**
 * Gets the current network status.
 * @returns {number} Network status code.
 */
dxnetwork.getStatus = function () {
    dxnetwork.init();
    return net.getStatus();
}

/**
 * Checks if the network is currently connected.
 * @returns {boolean} True if connected, false otherwise.
 */
dxnetwork.isConnected = function () {
    dxnetwork.init();
    return net.isConnected();
}

/**
 * Gets the local IP address.
 * @returns {string} ip address.
 * @returns {string} gateway address.
 * @returns {string} netmask address.
 * @returns {string} dns address.
 */
dxnetwork.getNetParam = function () {
    dxnetwork.init();
    return net.getNetParam();
}

/**
 * Gets the current signal strength (RSSI).
 * @returns {number} RSSI value.
 */
dxnetwork.getRSSI = function () {
    dxnetwork.init();
    return net.getRSSI();
}

/**
 * Scans for available WiFi hotspots.
 * @param {number} [timeout=10000] - Timeout in milliseconds.
 * @param {number} [interval=1000] - Scan interval in milliseconds.
 * @returns {Array} List of WiFi hotspots.
 */
dxnetwork.scanWifi = function (timeout, interval) {
    dxnetwork.init();
    return net.scanWifi(timeout, interval);
};

/**
 * Sets callback handlers for network events.
 * @param {object} callbacks - Callback functions.
 * @param {function(netType:number, status:number)} [callbacks.onStatusChange] - Called when network status changes.
 * @param {function()} [callbacks.onWifiScanComplete] - Called when WiFi scan completes.
 * @returns {void}
 */
dxnetwork.setCallbacks = function (callbacks) {
    dxnetwork.init();
    net.setCallbacks(callbacks);
}

/**
 * Processes events from the network event queue. Should be called periodically (e.g. in setInterval).
 * Handles status change and WiFi scan complete events.
 * @example
 * setInterval(() => {
 *   dxnetwork.loop();
 * }, 10); // Process events every 10ms
 */
dxnetwork.loop = function () {
    try {
        dxnetwork.init();
        net.loop();
    } catch (e) {
        // Optionally log error
        // console.error('Error in network loop:', e);
    }
}

/**
 * Gets the native network client object.
 * @returns {Object|null} The native client object, or null if not initialized.
 */
dxnetwork.getNative = function () {
    return net;
}

export default dxnetwork;
