/**
 * httpWorker.js - HTTP server
 * Implements access_device_http_api_v_1 endpoints
 */

import std from "../../dxmodules/dxStd.js";
import log from "../../dxmodules/dxLogger.js";
import bus from "../../dxmodules/dxEventBus.js";
import server from "../../dxmodules/dxHttpServer.js";
import dxOs from "../../dxmodules/dxOs.js";
import dxCommonUtils from "../../dxmodules/dxCommonUtils.js";
import ntp from "../../dxmodules/dxNtp.js";
import DeviceConfigService, { CONFIG_META } from "../service/DeviceConfigService.js";
import AccessDB from "../service/AccessDB.js";
import { getDeviceInfo, EVENT_DOOR_OPEN_REQUEST, EVENT_UI_TIP, EVENT_OTA_UPGRADE_REQUEST } from "../constants.js";

const HTTP_PORT = 8080;
const JSON_HEADER = { "Content-Type": "application/json; charset=utf-8" };

// ─── Helpers ───────────────────────────────────────────────────────────────────

function ok(data) {
    return JSON.stringify({ code: 0, message: "ok", data: data !== undefined ? data : null });
}

function fail(code, message) {
    return JSON.stringify({ code, message });
}

function send(res, body) {
    res.send(body, JSON_HEADER);
}

function parseBody(req) {
    try {
        return req.body ? JSON.parse(req.body) : {};
    } catch (e) {
        return null;
    }
}

function parseQuery(queryStr) {
    const result = {};
    if (!queryStr) return result;
    queryStr.split("&").forEach((pair) => {
        const idx = pair.indexOf("=");
        if (idx < 0) return;
        const k = decodeURIComponent(pair.slice(0, idx));
        const v = decodeURIComponent(pair.slice(idx + 1));
        result[k] = v;
    });
    return result;
}

/** Validate X-API-Key */
function checkAuth(req) {
    const key = req.headers && (req.headers["X-API-Key"] || req.headers["x-api-key"]);
    const configured = DeviceConfigService.get("apiKey") || "password";
    return key === configured;
}

// ─── Handlers ──────────────────────────────────────────────────────────────────

/** POST /web/login — no X-API-Key */
function handleWebLogin(req, res) {
    const body = parseBody(req);
    if (!body) return send(res, fail(1, "Invalid parameters"));
    const configured = DeviceConfigService.get("apiKey") || "password";
    if (body.password === configured) {
        log.info("[httpWorker] Web login OK");
        send(res, ok(null));
    } else {
        send(res, fail(2, "Invalid password"));
    }
}

/** GET /api/v1/test */
function handleTest(req, res) {
    send(res, ok({
        sn: dxOs.getSn(),
        model: getDeviceInfo().model,
        timestamp: Date.now(),
    }));
}

/** GET /api/v1/device/info */
function handleDeviceInfo(req, res) {
    const netCfgRaw = DeviceConfigService.get("networkConfig") || "{}";
    let netCfg = {};
    try { netCfg = JSON.parse(netCfgRaw); } catch (e) { }
    send(res, ok(getDeviceInfo()));
}

/** GET /api/v1/device/config */
function handleGetConfig(req, res) {
    const all = DeviceConfigService.getAll();
    const result = {};
    Object.keys(all).forEach((k) => {
        const meta = CONFIG_META[k];
        // readwrite=2 write-only, omit from response
        if (meta && meta.readwrite === 2) return;
        result[k] = all[k];
    });
    send(res, ok(result));
}

/** POST /api/v1/device/config */
function handleSetConfig(req, res) {
    const body = parseBody(req);
    if (!body || !body.config) return send(res, fail(1, "Missing config field"));
    const cfg = body.config;
    Object.keys(cfg).forEach((k) => {
        DeviceConfigService.set(k, cfg[k]);
    });
    send(res, ok(null));
}

/** POST /api/v1/device/opendoor */
function handleOpenDoor(req, res) {
    bus.fire(EVENT_DOOR_OPEN_REQUEST, { source: "http" });
    bus.fire(EVENT_UI_TIP, { level: "success", message: "Remote unlock OK" });
    log.info("[httpWorker] Remote unlock");
    AccessDB.appendAccessRecord({
        userId: "",
        name: "Remote",
        type: "remote",
        value: "",
        result: 1,
        time: Date.now(),
    });
    send(res, ok(null));
}

/** POST /api/v1/device/time */
function handleSetTime(req, res) {
    const body = parseBody(req);
    if (!body || !body.time) return send(res, fail(1, "Missing time field"));
    try {
        ntp.setTime(body.time, true);
        log.info("[httpWorker] System time set:", body.time);
        send(res, ok(null));
    } catch (e) {
        log.error("[httpWorker] Set time failed:", e);
        send(res, fail(2, "Failed to set time: " + (e.message || String(e))));
    }
}

/** POST /api/v1/device/background */
function handleSetBackground(req, res) {
    const body = parseBody(req);
    if (!body || !body.image) return send(res, fail(1, "Missing image field"));

    let b64 = body.image;
    const comma = b64.indexOf(",");
    if (comma >= 0) b64 = b64.slice(comma + 1);

    const TMP = "/app/data/tmp/background.png";
    const DEST = "/app/code/resource/image/background.png";
    try {
        dxOs.systemBrief("mkdir -p /app/data/tmp");
        const saved = dxCommonUtils.fs.base64ToFile(TMP, b64);
        if (!saved) return send(res, fail(2, "File write failed"));
        dxOs.systemBrief(`mv ${TMP} ${DEST}`);
        log.info("[httpWorker] Background updated, reboot in 3s");
        send(res, ok(null));
        DeviceConfigService.reboot(3);
    } catch (e) {
        log.error("[httpWorker] Background update failed:", e);
        send(res, fail(3, "Update failed: " + (e.message || String(e))));
    }
}

/** POST /api/v1/device/reboot */
function handleReboot(req, res) {
    send(res, ok(null));
    log.info("[httpWorker] Device reboot");
    DeviceConfigService.reboot(2);
}

/** POST /api/v1/device/cleardata */
function handleClearData(req, res) {
    send(res, ok(null));
    log.info("[httpWorker] Clear data and reboot");
    DeviceConfigService.clearAllData();
}

/** POST /api/v1/device/upgrade */
function handleUpgrade(req, res) {
    const body = parseBody(req);
    if (!body || typeof body.url !== "string" || typeof body.md5 !== "string") {
        return send(res, fail(1, "url and md5 are required"));
    }
    const url = body.url.trim();
    const md5 = body.md5.trim().toLowerCase();
    if (!url) return send(res, fail(1, "url cannot be empty"));
    if (!/^[a-f0-9]{32}$/.test(md5)) {
        return send(res, fail(1, "Invalid md5 format"));
    }

    bus.fire(EVENT_OTA_UPGRADE_REQUEST, { url, md5 });
    log.info("[httpWorker] OTA upgrade queued", url);
    send(res, ok(null));
}

/** POST /api/v1/users/add */
function handleUsersAdd(req, res) {
    const body = parseBody(req);
    if (!body || !Array.isArray(body.users) || body.users.length === 0) {
        return send(res, fail(1, "Missing users array"));
    }
    if (body.users.length > 100) return send(res, fail(1, "At most 100 users per request"));
    AccessDB.upsertUsers(body.users);
    send(res, ok(null));
}

/** POST /api/v1/users/delete */
function handleUsersDelete(req, res) {
    const body = parseBody(req);
    if (!body) return send(res, fail(1, "Invalid parameters"));

    if (Array.isArray(body.ids) && body.ids.length > 0) {
        // Delete by credential row id
        AccessDB.deleteUserByIds(body.ids);
    } else if (Array.isArray(body.userIds) && body.userIds.length > 0) {
        // Delete all credentials for these user IDs
        body.userIds
            .map((x) => (typeof x === "string" ? x.trim() : ""))
            .filter((x) => x)
            .forEach((uid) => AccessDB.deleteUser(uid));
    } else if (body.userId) {
        // Legacy: delete all credentials for one userId
        AccessDB.deleteUser(body.userId);
    } else {
        return send(res, fail(1, "Provide userIds or ids"));
    }
    send(res, ok(null));
}

/** GET /api/v1/users/list */
function handleUsersList(req, res) {
    const q = parseQuery(req.query);
    const page = parseInt(q.page, 10) || 1;
    const size = parseInt(q.size, 10) || 50;
    const filters = {
        userId: q.userId || "",
        name:   q.name   || "",
        type:   q.type   || "",
        value:  q.value  || "",
    };
    const result = AccessDB.listUsers(page, size, filters);
    send(res, ok(result));
}

/** POST /api/v1/users/clear */
function handleUsersClear(req, res) {
    AccessDB.clearUsers();
    send(res, ok(null));
}

/** GET /api/v1/access */
function handleAccessList(req, res) {
    const q = parseQuery(req.query);
    const page = parseInt(q.page, 10) || 1;
    const size = parseInt(q.size, 10) || 100;
    const filters = {
        userId: q.userId || "",
        name:   q.name   || "",
        type:   q.type   || "",
        value:  q.value  || "",
        result: q.result !== undefined ? q.result : "",
    };
    const result = AccessDB.listAccess(page, size, filters);
    send(res, ok(result));
}

/** POST /api/v1/access/delete */
function handleAccessDelete(req, res) {
    const body = parseBody(req);
    if (!body || !Array.isArray(body.ids) || body.ids.length === 0) {
        return send(res, fail(1, "Missing ids array"));
    }
    AccessDB.deleteAccessByIds(body.ids);
    send(res, ok(null));
}

/** POST /api/v1/access/clear */
function handleAccessClear(req, res) {
    AccessDB.clearAccess();
    send(res, ok(null));
}

/** GET /api/v1/events */
function handleEventsList(req, res) {
    const q = parseQuery(req.query);
    const page = parseInt(q.page, 10) || 1;
    const size = parseInt(q.size, 10) || 100;
    const filters = {
        type:    q.type    || "",
        message: q.message || "",
    };
    const result = AccessDB.listEvents(page, size, filters);
    send(res, ok(result));
}

/** POST /api/v1/events/delete */
function handleEventsDelete(req, res) {
    const body = parseBody(req);
    if (!body || !Array.isArray(body.ids) || body.ids.length === 0) {
        return send(res, fail(1, "Missing ids array"));
    }
    AccessDB.deleteEventsByIds(body.ids);
    send(res, ok(null));
}

/** POST /api/v1/events/clear */
function handleEventsClear(req, res) {
    AccessDB.clearEvents();
    send(res, ok(null));
}

// ─── Router ────────────────────────────────────────────────────────────────────

function initHttpServer() {
    try {
        server.serveStatic("/", "/app/code/src/web/");

        // Web login (no API key)
        server.route("/web/login", (req, res) => {
            if (req.method !== "POST") return send(res, fail(1, "Method Not Allowed"));
            handleWebLogin(req, res);
        });

        // /api/v1/test (no API key)
        server.route("/api/v1/test", (req, res) => {
            handleTest(req, res);
        });

        server.route("/api/v1/*", (req, res) => {
            if (!checkAuth(req)) {
                return send(res, fail(2, "Unauthorized"));
            }

            const url = req.url.split("?")[0];
            const method = req.method;

            if (url === "/api/v1/device/info" && method === "GET") return handleDeviceInfo(req, res);
            if (url === "/api/v1/device/config" && method === "GET") return handleGetConfig(req, res);
            if (url === "/api/v1/device/config" && method === "POST") return handleSetConfig(req, res);
            if (url === "/api/v1/device/opendoor" && method === "POST") return handleOpenDoor(req, res);
            if (url === "/api/v1/device/time" && method === "POST") return handleSetTime(req, res);
            if (url === "/api/v1/device/background" && method === "POST") return handleSetBackground(req, res);
            if (url === "/api/v1/device/reboot" && method === "POST") return handleReboot(req, res);
            if (url === "/api/v1/device/cleardata" && method === "POST") return handleClearData(req, res);
            if (url === "/api/v1/device/upgrade" && method === "POST") return handleUpgrade(req, res);
            if (url === "/api/v1/users/add" && method === "POST") return handleUsersAdd(req, res);
            if (url === "/api/v1/users/delete" && method === "POST") return handleUsersDelete(req, res);
            if (url === "/api/v1/users/list" && method === "GET") return handleUsersList(req, res);
            if (url === "/api/v1/users/clear" && method === "POST") return handleUsersClear(req, res);
            if (url === "/api/v1/access" && method === "GET") return handleAccessList(req, res);
            if (url === "/api/v1/access/delete" && method === "POST") return handleAccessDelete(req, res);
            if (url === "/api/v1/access/clear" && method === "POST") return handleAccessClear(req, res);
            if (url === "/api/v1/events" && method === "GET") return handleEventsList(req, res);
            if (url === "/api/v1/events/delete" && method === "POST") return handleEventsDelete(req, res);
            if (url === "/api/v1/events/clear" && method === "POST") return handleEventsClear(req, res);

            send(res, fail(1, "Not found"));
        });

        server.listen(HTTP_PORT);
        log.info(`[httpWorker] HTTP listening on ${HTTP_PORT}`);
    } catch (e) {
        log.error("[httpWorker] Init failed:", e);
    }
}

// ─── Boot ──────────────────────────────────────────────────────────────────────

initHttpServer();

std.setInterval(() => {
    server.loop();
}, 50);
