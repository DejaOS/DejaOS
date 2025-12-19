import log from "../../dxmodules/dxLogger.js";

/**
 * Log proxy (LogProxy)
 *
 * Goals:
 * - Expose a stable logging API for business code: LogProxy.xxx(...)
 * - Currently always forwards to dxLogger; later we can centralize "write DB / send MQTT" here.
 * - Avoid spreading concrete logging backends all over business code.
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
 * Build unified text format so it can be reused for file / DB / MQTT, etc.
 * Current format: "[tag] message {json}".
 */
function _buildMessage(tag, message, extra) {
    const msg = message == null ? "" : String(message);
    const prefix = tag ? `[${tag}] ` : "";
    let ext = "";
    if (extra !== undefined && extra !== null) {
        try {
            ext = " " + JSON.stringify(extra);
        } catch (e) {
            // Ignore extra if JSON serialization fails
        }
    }
    return prefix + msg + ext;
}

const LogProxy = {
    LEVEL,

    /**
     * Unified low-level entry.
     * @param {"debug"|"info"|"warn"|"error"} level
     * @param {string} tag Module / feature tag, e.g. "lockWorker" / "UI" / "DB"
     * @param {string} message Short description
     * @param {object} [extra] Optional structured extra data
     */
    log(level, tag, message, extra) {
        const l = _normalizeLevel(level);
        const text = _buildMessage(tag, message, extra);

        // Current implementation: just forward to dxLogger.
        // To log into SQLite / MQTT, add logic here later.
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
     * Semantic event interface, suitable for business events.
     * Example: LogProxy.event("locker.store.success", { cabinetNo, time }).
     * In future these events can be sent to backend or a dedicated table.
     */
    event(eventName, payload) {
        const msg = `event: ${eventName}`;
        this.info("event", msg, payload);
    },
};

export default LogProxy;


