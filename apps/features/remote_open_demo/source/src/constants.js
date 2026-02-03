// constants.js - Global constants and shared memory
import dxMap from "../dxmodules/dxMap.js";
import dxstd from "../dxmodules/dxStd.js";

const CONFIG_FILE = "/app/data/config.json";

export const COLORS = {
    primary: 0x1E88E5,       // Theme blue
    primaryDark: 0x1565C0,   // Dark blue
    secondary: 0x2D2D2D,     // Secondary background
    dark: 0x1A1A1A,          // Dark background
    light: 0xF5F5F5,         // Light text
    success: 0x4CAF50,       // Success green
    warning: 0xFFC107,       // Warning yellow
    danger: 0xF44336,        // Danger red
    info: 0x2196F3,          // Info blue
    white: 0xFFFFFF,
    gray: 0x888888,
    grayLight: 0xAAAAAA,
};

// Shared memory configuration (using dxMap for cross-worker sharing)
const SHARED_MAP_TOPIC = "__remote_open_shared__";
const sharedMap = dxMap.get(SHARED_MAP_TOPIC);

/**
 * Set network connection status
 * @param {boolean} connected - true if network connected
 */
export function setNetworkConnected(connected) {
    sharedMap.put("__network_connected__", !!connected);
}

/**
 * Get network connection status
 * @returns {boolean}
 */
export function isNetworkConnected() {
    return !!sharedMap.get("__network_connected__");
}

/**
 * Set HTTP server URL for web access
 * @param {string} url - e.g., "http://192.168.1.100:8080"
 */
export function setHttpServerUrl(url) {
    sharedMap.put("__http_server_url__", url || "");
}

/**
 * Get HTTP server URL
 * @returns {string}
 */
export function getHttpServerUrl() {
    return sharedMap.get("__http_server_url__") || "";
}

/**
 * Set network configuration (writes to sharedMap and persists to config.json)
 * @param {Object} config - network config
 */
export function setNetworkConfig(config) {
    const c = config || {};
    sharedMap.put("__network_config__", c);
    try {
        dxstd.saveFile(CONFIG_FILE, JSON.stringify(c));
    } catch (e) {
        // File write failure does not affect in-memory config
    }
}

/**
 * Get network configuration (prefer config.json on startup for persisted config)
 * @returns {Object}
 */
export function getNetworkConfig() {
    try {
        if (dxstd.exist(CONFIG_FILE)) {
            const raw = dxstd.loadFile(CONFIG_FILE);
            const parsed = JSON.parse(raw);
            if (parsed && typeof parsed === "object") {
                sharedMap.put("__network_config__", parsed);
                return parsed;
            }
        }
    } catch (e) {
        // File missing or parse error; fall back to memory
    }
    return sharedMap.get("__network_config__") || {};
}