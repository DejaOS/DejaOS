import AccessDB from "./AccessDB.js";
import dxOs from "../../dxmodules/dxOs.js";
import log from "../../dxmodules/dxLogger.js";
import bus from "../../dxmodules/dxEventBus.js";
import { sharedMap, EVENT_HOMEPAGE_UI, EVENT_NETWORK_CONFIG_UPDATE } from "../constants.js";

// Config meta: in-memory allconfigs and DB values are strings; parse numbers/JSON in app code
// readwrite: 0 read/write, 1 read-only, 2 write-only
// verify(v): null = OK, string = error message
export const CONFIG_META = {
    apiKey: {
        key: "apiKey", desc: "API key", defaultValue: "password", readwrite: 2,
        verify: (v) => (v && v.length >= 4) ? null : "API key must be at least 4 characters",
    },
    adminPassword: {
        key: "adminPassword", desc: "Admin password", defaultValue: "000000", readwrite: 0,
        verify: (v) => /^\d{6}$/.test(v) ? null : "Admin password must be 6 digits",
    },
    webhookUrl: {
        key: "webhookUrl", desc: "Webhook URL", defaultValue: "", readwrite: 0,
        verify: (v) => (!v || /^https?:\/\/.+/.test(v)) ? null : "Webhook must start with http:// or https://",
    },
    screenTitle: {
        key: "screenTitle", desc: "Screen title", defaultValue: "Access app", readwrite: 0,
        verify: (v) => (v && v.length > 0) ? null : "Screen title is required",
    },
    networkConfig: {
        key: "networkConfig", desc: "Network config", defaultValue: "", readwrite: 0,
        verify: (v) => {
            if (!v) return null;
            try { JSON.parse(v); return null; } catch (e) { return "Invalid network config JSON"; }
        },
    },
    barcodeConfig: {
        key: "barcodeConfig", desc: "QR/barcode config",
        defaultValue: JSON.stringify({ key: "", timeout: 10 }), readwrite: 0,
        verify: (v) => {
            if (!v) return null;
            try { JSON.parse(v); return null; } catch (e) { return "Invalid barcode config JSON"; }
        },
    },
};

function isPlainObject(v) {
    return v && typeof v === "object" && !Array.isArray(v);
}

/** Coerce to string; empty uses CONFIG_META default */
function toConfigString(key, raw) {
    const meta = CONFIG_META[key];
    if (!meta) {
        return raw == null || raw === undefined ? "" : String(raw);
    }
    if (raw === null || raw === undefined || raw === "") {
        return String(meta.defaultValue ?? "");
    }
    return String(raw);
}

function buildDefaultConfigs() {
    const out = {};
    const ids = Object.keys(CONFIG_META);
    for (let i = 0; i < ids.length; i++) {
        const meta = CONFIG_META[ids[i]];
        out[meta.key] = toConfigString(meta.key, meta.defaultValue);
    }
    return out;
}

function ensureAllConfigsLoaded() {
    const current = sharedMap.get("allconfigs");
    if (isPlainObject(current) && Object.keys(current).length > 0) {
        return current;
    }

    const merged = buildDefaultConfigs();

    const knownKeys = new Set(
        Object.keys(CONFIG_META).map((id) => CONFIG_META[id].key)
    );
    const dbAll = AccessDB.getAllConfig();
    const dbKeys = dbAll ? Object.keys(dbAll) : [];
    for (let i = 0; i < dbKeys.length; i++) {
        const k = dbKeys[i];
        if (!knownKeys.has(k)) continue;
        merged[k] = toConfigString(k, dbAll[k]);
    }

    sharedMap.put("allconfigs", merged);
    return merged;
}

/** Side effects after a key changes */
function _onConfigChanged(key, value) {
    if (key === "screenTitle") {
        bus.fire(EVENT_HOMEPAGE_UI, { type: "title", value });
    } else if (key === "networkConfig") {
        // Already persisted in set(); null tells networkWorker to reconnect only
        bus.fire(EVENT_NETWORK_CONFIG_UPDATE, null);
    }
}

const DeviceConfigService = {
    set(key, value) {
        if (!key || !CONFIG_META[key]) return false;
        const meta = CONFIG_META[key];
        if (meta.readwrite === 1) return false;

        const v = toConfigString(key, value);

        if (meta.verify) {
            const err = meta.verify(v);
            if (err) {
                log.info(`[DeviceConfigService] validation failed ${key}: ${err}`);
                return false;
            }
        }

        const all = ensureAllConfigsLoaded();
        all[key] = v;
        sharedMap.put("allconfigs", all);
        AccessDB.setConfig(key, v);

        _onConfigChanged(key, v);
        return true;
    },

    get(key) {
        if (!key) return null;
        const all = ensureAllConfigsLoaded();
        return all.hasOwnProperty(key) ? all[key] : null;
    },

    getAll() {
        return ensureAllConfigsLoaded();
    },

    remove(key) {
        if (!key) return false;
        const all = ensureAllConfigsLoaded();
        if (all.hasOwnProperty(key)) {
            delete all[key];
            sharedMap.put("allconfigs", all);
        }
        AccessDB.deleteConfig(key);
        return true;
    },

    /** Erase /app/data then reboot in 2s */
    clearAllData() {
        log.info("[DeviceConfigService] erasing data...");
        try {
            dxOs.systemBlocked("rm -rf /app/data/*");
            log.info("[DeviceConfigService] data directory cleared");
        } catch (e) {
            log.error("[DeviceConfigService] clear data failed:", e);
        }
        try { dxOs.asyncReboot(2); } catch (e) { log.error("[DeviceConfigService] reboot failed:", e); }
    },

    /** Reboot after delay */
    reboot(delaySec = 2) {
        try { dxOs.asyncReboot(delaySec); } catch (e) { log.error("[DeviceConfigService] reboot failed:", e); }
    },
};

export default DeviceConfigService;
