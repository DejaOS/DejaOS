// constants.js - Shared constants and memory
import dxMap from "../dxmodules/dxMap.js";
import dxOs from "../dxmodules/dxOs.js";

export const COLORS = {
    primary: 0x1E88E5,       // Theme blue
    primaryDark: 0x1565C0,   // Dark blue
    secondary: 0x2D2D2D,     // Secondary background
    dark: 0x1A1A1A,          // Dark background
    light: 0xF5F5F5,         // Light text
    success: 0x4CAF50,       // Success green
    warning: 0xFFC107,       // Warning amber
    danger: 0xF44336,        // Danger red
    info: 0x2196F3,          // Info blue
    white: 0xFFFFFF,
    gray: 0x888888,
    grayLight: 0xAAAAAA,
};

export const EVENT_DOOR_OPEN_REQUEST = "DOOR_OPEN_REQUEST";
// payload: { type: "background" | "title", value?: string }
export const EVENT_HOMEPAGE_UI = "HOMEPAGE_UI";
export const EVENT_NETWORK_STATUS_CHANGED = "NETWORK_STATUS_CHANGED";
export const EVENT_NETWORK_CONFIG_UPDATE = "NETWORK_CONFIG_UPDATE";
export const EVENT_WIFI_SHARE_SCANNED = "WIFI_SHARE_SCANNED";
// payload: { url: string, md5: string }
export const EVENT_OTA_UPGRADE_REQUEST = "OTA_UPGRADE_REQUEST";

// UI tip event (hardwareWorker → uiWorker)
// payload: { level: "success"|"error"|"warning"|"info", message: string }
export const EVENT_UI_TIP = "UI_TIP";

// Shared map (dxMap across workers)
export const SHARED_MAP_TOPIC = "__access_control_shared__";
export const sharedMap = dxMap.get(SHARED_MAP_TOPIC);

/** Network connected flag (in-memory) */
export function setNetworkConnected(connected) {
    sharedMap.put("__network_connected__", !!connected);
}

export function isNetworkConnected() {
    return !!sharedMap.get("__network_connected__");
}

/** Current IP (in-memory, updated by networkWorker) */
export function setNetworkCurrentIp(ip) {
    sharedMap.put("__network_current_ip__", ip ? String(ip) : "");
}

export function getNetworkCurrentIp() {
    return sharedMap.get("__network_current_ip__") || "";
}

/** Basic device info snapshot */
export function getDeviceInfo() {
    let freeMem = 0;
    let freeStorage = 0;
    try { freeMem     = Math.floor((dxOs.getFreemem()  || 0) / 1024); }       catch (e) {}
    try { freeStorage = Math.floor((dxOs.getFreedisk() || 0) / 1024 / 1024); } catch (e) {}
    return {
        sn:          dxOs.getSn(),
        model:       "DW200",
        firmware:    "http_access_1.0.0",
        ip:          getNetworkCurrentIp() || "",
        mac:         dxOs.getUuid2mac() || "",
        uptime:      dxOs.getUptime() || 0,
        freeMem,       // KB
        freeStorage,   // MB
    };
}

/** WiFi share QR scan in progress (in-memory, default false) */
export function setScanWifiShare(val) {
    sharedMap.put("__scan_wifi_share__", !!val);
}

export function getScanWifiShare() {
    return !!sharedMap.get("__scan_wifi_share__");
}
