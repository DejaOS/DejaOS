// networkWorker.js - Network worker, independent of UI
import std from "../../dxmodules/dxStd.js";
import log from "../../dxmodules/dxLogger.js";
import bus from "../../dxmodules/dxEventBus.js";
import dxNetwork from "../../dxmodules/dxNetwork.js";
import { setNetworkConnected, setHttpServerUrl, setNetworkConfig, getNetworkConfig } from "../constants.js";

let networkConnected = false;
let currentIp = "";
let networkConfig = {
    netType: "ETH",
    ssid: "",
    password: "",
    dhcp: true
};

function loadNetworkConfig() {
    const savedConfig = getNetworkConfig();
    if (savedConfig && Object.keys(savedConfig).length > 0) {
        networkConfig = {
            netType: savedConfig.netType || "ETH",
            ssid: savedConfig.ssid || "",
            password: savedConfig.password || "",
            dhcp: savedConfig.dhcp !== undefined ? savedConfig.dhcp : true
        };
        log.info("[networkWorker] Loaded saved config:", networkConfig);
    } else {
        networkConfig = { netType: "ETH", ssid: "", password: "", dhcp: true };
        log.info("[networkWorker] Using default config");
    }
    setNetworkConfig(networkConfig);
}

function saveNetworkConfig(config) {
    networkConfig = { ...networkConfig, ...config };
    setNetworkConfig(networkConfig);
    log.info("[networkWorker] Config saved:", config);
}

function connectNetwork() {
    try {
        if (networkConfig.netType === "WIFI" && networkConfig.ssid) {
            log.info(`[networkWorker] Connecting WiFi: ${networkConfig.ssid}`);
            dxNetwork.connectWifiWithDHCP(networkConfig.ssid, networkConfig.password || "");
        } else {
            log.info("[networkWorker] Connecting Ethernet");
            dxNetwork.connectEthWithDHCP();
        }
    } catch (e) {
        log.error("[networkWorker] Connect error:", e);
    }
}

function monitorNetwork() {
    try {
        dxNetwork.loop();
        const connected = dxNetwork.isConnected();

        if (connected !== networkConnected) {
            networkConnected = connected;
            setNetworkConnected(connected);

            if (connected) {
                log.info("[networkWorker] Connected");
                try {
                    const param = dxNetwork.getNetParam && dxNetwork.getNetParam();
                    if (param && param.ip) {
                        currentIp = String(param.ip);
                        log.info(`[networkWorker] IP: ${currentIp}`);
                        setHttpServerUrl(`http://${currentIp}:8080`);
                    }
                } catch (e) {
                    log.error("[networkWorker] getNetParam error:", e);
                }
            } else {
                log.info("[networkWorker] Disconnected");
                currentIp = "";
            }
            bus.fire("NETWORK_STATUS_CHANGED", { connected, ip: currentIp });
        }
    } catch (e) {
        log.error("[networkWorker] Monitor error:", e);
    }
}

try {
    log.info("[networkWorker] Starting...");

    dxNetwork.init();
    loadNetworkConfig();
    connectNetwork();

    std.setInterval(() => monitorNetwork(), 1000);

    bus.on("NETWORK_CONFIG_UPDATE", (data) => {
        log.info("[networkWorker] Config update:", data);
        saveNetworkConfig(data);
        std.setTimeout(() => connectNetwork(), 1000);
    });

    log.info("[networkWorker] Initialized");
} catch (e) {
    log.error("[networkWorker] Init failed:", e);
}
