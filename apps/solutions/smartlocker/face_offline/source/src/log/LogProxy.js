import log from "../../dxmodules/dxLogger.js";

/**
 * LogProxy
 *
 * - Expose stable log API: LogProxy.xxx(...)
 * - Current: forward to dxLogger; can add DB / MQTT etc. here
 * - Avoid business code depending on concrete backend
 */

const LEVEL = {
    DEBUG: "debug",
    INFO: "info",
    WARN: "warn",
    ERROR: "error",
};

function _normalizeLevel(level) {
    const l = (level || "").toString().toLowerCase();
    if (l === "debug" || l === "info" || l === "warn" || l === "error") {
        return l;
    }
    return "info";
}

/**
 * Build unified text format "[tag] message {json}" for file/DB/MQTT
 */
function _buildMessage(tag, message, extra) {
    const msg = message == null ? "" : String(message);
    const prefix = tag ? `[${tag}] ` : "";
    let ext = "";
    if (extra !== undefined && extra !== null) {
        try {
            ext = " " + JSON.stringify(extra);
        } catch (e) {
            // Ignore extra on JSON error
        }
    }
    return prefix + msg + ext;
}

const LogProxy = {
    LEVEL,

    /**
     * Low-level entry
     * @param {"debug"|"info"|"warn"|"error"} level
     * @param {string} tag e.g. "lockWorker" / "UI" / "DB"
     * @param {string} message Short description
     * @param {object} [extra] Optional structured data
     */
    log(level, tag, message, extra) {
        const l = _normalizeLevel(level);
        const text = _buildMessage(tag, message, extra);

        // Current: forward to dxLogger; add SQLite/MQTT here if needed
        switch (l) {
            case "debug":
                if (typeof log.debug === "function") {
                    log.debug(text);
                } else {
                    log.info(text);
                }
                break;
            case "info":
                log.info(text);
                break;
            case "warn":
                log.warn ? log.warn(text) : log.info(text);
                break;
            case "error":
                log.error ? log.error(text) : log.info(text);
                break;
            default:
                log.info(text);
                break;
        }
    },

    debug(tag, message, extra) {
        this.log(LEVEL.DEBUG, tag, message, extra);
    },

    info(tag, message, extra) {
        this.log(LEVEL.INFO, tag, message, extra);
    },

    warn(tag, message, extra) {
        this.log(LEVEL.WARN, tag, message, extra);
    },

    error(tag, message, extra) {
        this.log(LEVEL.ERROR, tag, message, extra);
    },

    /**
     * Semantic event API, e.g. LogProxy.event("locker.store.success", { cabinetNo, time })
     * Can send to backend or dedicated table later
     */
    event(eventName, payload) {
        const msg = `event: ${eventName}`;
        this.info("event", msg, payload);
    },
};

export default LogProxy;


