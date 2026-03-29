// networkWorker.js - Network worker thread
import std from "../../dxmodules/dxStd.js";
import log from "../../dxmodules/dxLogger.js";
import bus from "../../dxmodules/dxEventBus.js";
import dxNetwork from "../../dxmodules/dxNetwork.js";
import httpclient from "../../dxmodules/dxHttpClient.js";
import dxOs from "../../dxmodules/dxOs.js";
import ota from "../../dxmodules/dxOta.js";
import {
    EVENT_NETWORK_CONFIG_UPDATE,
    EVENT_NETWORK_STATUS_CHANGED,
    EVENT_OTA_UPGRADE_REQUEST,
    EVENT_UI_TIP,
    setNetworkConnected,
    setNetworkCurrentIp,
} from "../constants.js";
import DeviceConfigService from "../service/DeviceConfigService.js";
import AccessDB from "../service/AccessDB.js";

let networkConnected = false;
let currentIp = "";
let shouldReconnect = false;
const NETWORK_CONFIG_KEY = "networkConfig";

let networkConfig = {
    netType: "ETH",
    ssid: "",
    password: "",
    dhcp: true,
    // Static IP when dhcp=false
    ip: "",
    gateway: "",
    netmask: "",
    dns: "",
};

function loadNetworkConfig() {
    const raw = DeviceConfigService.get(NETWORK_CONFIG_KEY);
    log.info("[networkWorker] loadNetworkConfig: ", raw);
    if (raw != null && raw !== "") {
        try {
            networkConfig = JSON.parse(String(raw));
        } catch (e) {
            // keep defaults
        }
    }
    log.info("[networkWorker] loadNetworkConfig: ", networkConfig);
}

function saveNetworkConfig(config) {
    networkConfig = { ...networkConfig, ...config };
    DeviceConfigService.set(NETWORK_CONFIG_KEY, JSON.stringify(networkConfig));
    log.info("[networkWorker] config saved:", config);
}

function connectNetwork() {
    try {
        const isWifi = networkConfig.netType === "WIFI";
        const useDhcp = !!networkConfig.dhcp;

        if (isWifi) {
            const ssid = networkConfig.ssid || "";
            const psk = networkConfig.password || "";
            if (!ssid) {
                log.error("[networkWorker] WiFi SSID not configured");
                return;
            }

            if (useDhcp) {
                log.info(`[networkWorker] WiFi DHCP: ${ssid}`);
                dxNetwork.connectWifiWithDHCP(ssid, psk);
            } else {
                const ip = networkConfig.ip;
                const gateway = networkConfig.gateway;
                const netmask = networkConfig.netmask;
                const dns = networkConfig.dns;
                if (!ip || !gateway || !netmask) {
                    log.error("[networkWorker] WiFi static IP incomplete", {
                        ip,
                        gateway,
                        netmask,
                        dns,
                    });
                    return;
                }
                log.info(`[networkWorker] WiFi static IP: ${ssid}`, {
                    ip,
                    gateway,
                    netmask,
                    dns,
                });
                dxNetwork.connectWifi(ssid, psk, { ip, gateway, netmask, dns });
            }
        } else {
            if (useDhcp) {
                log.info("[networkWorker] Ethernet DHCP");
                dxNetwork.connectEthWithDHCP();
            } else {
                const ip = networkConfig.ip;
                const gateway = networkConfig.gateway;
                const netmask = networkConfig.netmask;
                const dns = networkConfig.dns;
                if (!ip || !gateway || !netmask) {
                    log.error("[networkWorker] Ethernet static IP incomplete", {
                        ip,
                        gateway,
                        netmask,
                        dns,
                    });
                    return;
                }
                log.info("[networkWorker] Ethernet static IP", {
                    ip,
                    gateway,
                    netmask,
                    dns,
                });
                dxNetwork.connectEth({ ip, gateway, netmask, dns });
            }
        }
    } catch (e) {
        log.error("[networkWorker] connect error:", e);
    }
}

function monitorNetwork() {
    try {
        dxNetwork.loop();

        if (shouldReconnect) {
            log.info("[networkWorker] shouldReconnect -> connectNetwork");
            shouldReconnect = false;
            connectNetwork();
        }

        const connected = dxNetwork.isConnected();
        let newIp = currentIp;

        if (connected) {
            try {
                const param = dxNetwork.getNetParam && dxNetwork.getNetParam();
                newIp = (param && param.ip) ? String(param.ip) : "";
            } catch (e) {
                log.error("[networkWorker] getNetParam error:", e);
            }
        } else {
            newIp = "";
        }

        if (connected !== networkConnected || (connected && newIp !== currentIp)) {
            networkConnected = connected;
            currentIp = newIp;
            setNetworkConnected(connected);
            setNetworkCurrentIp(currentIp);
            log.info(`[networkWorker] status connected=${connected} ip=${currentIp}`);
            bus.fire(EVENT_NETWORK_STATUS_CHANGED, {
                connected,
                ip: currentIp,
                netType: networkConfig.netType || "ETH",
            });
        }
    } catch (e) {
        log.error("[networkWorker] monitor error:", e);
    }
}

// ─── Webhook sync ─────────────────────────────────────────────────────────────

/** Push unsynced access_record and event_log rows to webhook */
function syncWebhook() {
    const webhookUrl = DeviceConfigService.get("webhookUrl") || "";
    if (!webhookUrl) return;
    if (!networkConnected) return;

    const accessRows = AccessDB.getUnsyncedAccess(100);
    const eventRows = AccessDB.getUnsyncedEvents(100);
    if (accessRows.length === 0 && eventRows.length === 0) return;

    log.info(`[networkWorker] webhook push: access=${accessRows.length} events=${eventRows.length}`);
    try {
        const res = httpclient.post(
            webhookUrl,
            { access: accessRows, events: eventRows },
            10000
        );
        const ok = res && res.code === 0 && res.status >= 200 && res.status < 300;
        if (ok) {
            if (accessRows.length > 0) AccessDB.markAccessSynced(accessRows.map(r => r.id));
            if (eventRows.length > 0) AccessDB.markEventsSynced(eventRows.map(r => r.id));
            log.info("[networkWorker] webhook push OK, marked synced");
        } else {
            log.info("[networkWorker] webhook push failed status=" + (res && res.status));
        }
    } catch (e) {
        log.error("[networkWorker] webhook push error:", e);
    }
}

function handleOtaUpgradeRequest(data) {
    if (!data || typeof data.url !== "string" || typeof data.md5 !== "string") {
        log.error("[networkWorker] OTA invalid params:", data);
        return;
    }
    const url = data.url.trim();
    const md5 = data.md5.trim().toLowerCase();
    if (!url || !/^[a-f0-9]{32}$/.test(md5)) {
        log.error("[networkWorker] OTA param validation failed:", data);
        return;
    }

    try {
        // 300s timeout (aligned with MQTT flow)
        ota.updateHttp(url, md5, 300);
        log.info("[networkWorker] firmware verified, reboot in 3s", url);
        bus.fire(EVENT_UI_TIP, { level: "success", message: "Firmware verified; device will reboot and upgrade" });
        dxOs.asyncReboot(3);
    } catch (e) {
        log.error("[networkWorker] OTA failed:", e);
        bus.fire(EVENT_UI_TIP, {
            level: "error",
            message: "Firmware upgrade failed: " + (e && e.message ? e.message : String(e)),
        });
    }
}

function init() {
    log.info("[networkWorker] starting...");

    dxNetwork.init();
    loadNetworkConfig();
    shouldReconnect = true;
    std.setInterval(() => monitorNetwork(), 1000);

    std.setInterval(() => syncWebhook(), 10000);

    bus.on(EVENT_NETWORK_CONFIG_UPDATE, (data) => {
        log.info("[networkWorker] config update:", data);
        if (data != null) {
            saveNetworkConfig(data);
        }
        shouldReconnect = true;
    });

    bus.on(EVENT_OTA_UPGRADE_REQUEST, (data) => {
        log.info("[networkWorker] OTA request received");
        handleOtaUpgradeRequest(data);
    });

    log.info("[networkWorker] ready");
}

try {
    init();
} catch (e) {
    log.error("[networkWorker] init failed:", e);
}
