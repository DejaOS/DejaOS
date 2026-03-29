import dxSqliteDB from "../../dxmodules/dxSqliteDB.js";
import log from "../../dxmodules/dxLogger.js";

// App DB path (matches /app/data convention in constants)
const DB_PATH = "/app/data/access.db";

// dxSqliteDB shares the path across threads via dxMap; _db is this thread's handle
let _db = null;

function getDB() {
    if (!_db) {
        _db = dxSqliteDB.init(DB_PATH);
    }
    return _db;
}

function escapeText(value, maxLen) {
    if (value === null || value === undefined) return "NULL";
    let s = String(value);
    if (typeof maxLen === "number" && maxLen > 0 && s.length > maxLen) {
        s = s.slice(0, maxLen);
    }
    // Escape single quotes for SQLite strings
    s = s.replace(/'/g, "''");
    return "'" + s + "'";
}

function safeRollback(db) {
    if (!db) return;
    try {
        db.exec("ROLLBACK");
    } catch (e) {
        // ignore
    }
}

function ensureSchema() {
    const db = getDB();

    try {
        db.begin();

        // 1) device_config key/value (TEXT)
        db.exec(`
      CREATE TABLE IF NOT EXISTS device_config (
        key   TEXT PRIMARY KEY,
        value TEXT NOT NULL
      )
    `);

        // 2) user_credential (unique user_id + type + value)
        db.exec(`
      CREATE TABLE IF NOT EXISTS user_credential (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT NOT NULL,
        user_name TEXT DEFAULT '',
        type TEXT NOT NULL,
        value TEXT NOT NULL,
        period TEXT NOT NULL,
        created_at INTEGER DEFAULT 0,
        updated_at INTEGER DEFAULT 0,
        UNIQUE(user_id, type, value)
      )
    `);
        db.exec(`
      CREATE INDEX IF NOT EXISTS idx_user_credential_user_id
      ON user_credential(user_id)
    `);
        db.exec(`
      CREATE INDEX IF NOT EXISTS idx_user_credential_lookup
      ON user_credential(type, value)
    `);

        // 3) access_record (keep last 10000 rows)
        db.exec(`
      CREATE TABLE IF NOT EXISTS access_record (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT NOT NULL,
        name TEXT DEFAULT '',
        type TEXT NOT NULL,
        value TEXT NOT NULL,
        result INTEGER NOT NULL,
        time INTEGER NOT NULL,
        synced INTEGER DEFAULT 0
      )
    `);
        db.exec(`
      CREATE INDEX IF NOT EXISTS idx_access_record_time
      ON access_record(time)
    `);
        db.exec(`
      CREATE INDEX IF NOT EXISTS idx_access_record_synced
      ON access_record(synced)
    `);

        // 4) event_log (alarms / info)
        db.exec(`
      CREATE TABLE IF NOT EXISTS event_log (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        type TEXT NOT NULL,
        event TEXT,
        message TEXT,
        time INTEGER NOT NULL,
        synced INTEGER DEFAULT 0
      )
    `);
        db.exec(`
      CREATE INDEX IF NOT EXISTS idx_event_log_synced
      ON event_log(synced)
    `);

        db.commit();
    } catch (e) {
        safeRollback(db);
        log.error("AccessDB.ensureSchema failed", e);
        throw e;
    }
}

function nowSec() {
    return Math.floor(Date.now() / 1000);
}

function normalizeResult(result) {
    if (result === 1 || result === "1" || result === true) return 1;
    if (result === 0 || result === "0" || result === false) return 0;
    if (typeof result === "string") {
        const s = result.toLowerCase();
        if (s === "success") return 1;
        if (s === "fail" || s === "failed" || s === "error") return 0;
    }
    return Number(result) ? 1 : 0;
}

const AccessDB = {
    // Call once from main.js; other workers may call methods (lazy init).
    init() {
        ensureSchema();
    },

    // ---------------- device_config ----------------
    setConfig(key, value) {
        const db = getDB();
        const sql = `
      REPLACE INTO device_config (key, value)
      VALUES (${escapeText(key, 128)}, ${escapeText(value, 4096)})
    `;
        db.exec(sql);
    },

    getConfig(key) {
        const db = getDB();
        const rows = db.select(
            `SELECT value FROM device_config WHERE key=${escapeText(key, 128)}`
        );
        return rows && rows.length > 0 ? rows[0].value : null;
    },

    getAllConfig() {
        const db = getDB();
        const rows = db.select(`SELECT key, value FROM device_config ORDER BY key ASC`);
        const out = {};
        if (rows && rows.length > 0) {
            for (let i = 0; i < rows.length; i++) {
                out[String(rows[i].key)] = rows[i].value;
            }
        }
        return out;
    },

    deleteConfig(key) {
        const db = getDB();
        db.exec(`DELETE FROM device_config WHERE key=${escapeText(key, 128)}`);
    },

    // ---------------- user_credential ----------------

    /**
     * Upsert users (max 100 per call, enforced upstream)
     * @param {Array<{userId:string,name?:string,type:string,value:string,period:object}>} users
     */
    upsertUsers(users) {
        const list = Array.isArray(users) ? users : [];
        if (list.length === 0) return;

        const db = getDB();
        const ts = nowSec();

        try {
            db.begin();

            for (let i = 0; i < list.length; i++) {
                const u = list[i] || {};
                const userId = u.userId != null ? String(u.userId) : "";
                const userName = u.name != null ? String(u.name) : "";
                const type = u.type != null ? String(u.type) : "";
                const rawValue = u.value != null ? String(u.value) : "";
                const value = type === "nfc" ? rawValue.toUpperCase() : rawValue;
                const periodObj = u.period != null ? u.period : { type: 0 };
                let period = "{}";
                try {
                    period = JSON.stringify(periodObj);
                } catch (e) {
                    period = JSON.stringify({ type: 0 });
                }

                if (!userId || !type || !value) {
                    continue;
                }

                db.exec(`
          INSERT INTO user_credential (
            user_id, user_name, type, value, period, created_at, updated_at
          ) VALUES (
            ${escapeText(userId, 64)},
            ${escapeText(userName, 64)},
            ${escapeText(type, 16)},
            ${escapeText(value, 256)},
            ${escapeText(period, 4096)},
            ${ts},
            ${ts}
          )
          ON CONFLICT(user_id, type, value)
          DO UPDATE SET
            user_name=excluded.user_name,
            period=excluded.period,
            updated_at=excluded.updated_at
        `);
            }

            db.commit();
        } catch (e) {
            safeRollback(db);
            log.error("AccessDB.upsertUsers failed", e);
            throw e;
        }
    },

    deleteUser(userId) {
        if (!userId) return;
        const db = getDB();
        db.exec(`DELETE FROM user_credential WHERE user_id=${escapeText(String(userId), 64)}`);
    },

    deleteUserByIds(ids) {
        const list = Array.isArray(ids) ? ids : [];
        const cleaned = list.map((x) => Number(x) || 0).filter((x) => x > 0);
        if (cleaned.length === 0) return;
        const db = getDB();
        db.exec(`DELETE FROM user_credential WHERE id IN (${cleaned.join(",")})`);
    },

    clearUsers() {
        const db = getDB();
        db.exec("DELETE FROM user_credential");
    },

    /**
     * Paginated user credentials
     * @param {number} page 1-based
     * @param {number} size
     */
    listUsers(page = 1, size = 50, filters = {}) {
        const db = getDB();
        const p = Number(page) || 1;
        const s = Number(size) || 50;
        const offset = p <= 1 ? 0 : (p - 1) * s;

        // Dynamic WHERE
        const where = [];
        if (filters.userId && String(filters.userId).trim()) {
            where.push(`user_id LIKE ${escapeText('%' + String(filters.userId).trim() + '%')}`);
        }
        if (filters.name && String(filters.name).trim()) {
            where.push(`user_name LIKE ${escapeText('%' + String(filters.name).trim() + '%')}`);
        }
        if (filters.type && String(filters.type).trim()) {
            where.push(`type = ${escapeText(String(filters.type).trim(), 16)}`);
        }
        if (filters.value && String(filters.value).trim()) {
            where.push(`value LIKE ${escapeText('%' + String(filters.value).trim() + '%')}`);
        }
        const whereClause = where.length > 0 ? `WHERE ${where.join(' AND ')}` : '';

        const totalRows = db.select(`SELECT COUNT(*) AS cnt FROM user_credential ${whereClause}`);
        const total = totalRows && totalRows.length ? Number(totalRows[0].cnt) || 0 : 0;

        const rows = db.select(`
      SELECT id, user_id AS userId, user_name AS name, type, value, period
      FROM user_credential
      ${whereClause}
      ORDER BY user_id ASC, type ASC, value ASC
      LIMIT ${s} OFFSET ${offset}
    `);

        const list = (rows || []).map((r) => {
            let period = { type: 0 };
            try {
                period = r.period ? JSON.parse(r.period) : { type: 0 };
            } catch (e) {
                period = { type: 0 };
            }
            return {
                id: r.id,
                userId: r.userId,
                name: r.name || "",
                type: r.type,
                value: r.value,
                period,
            };
        });

        return { total, list };
    },

    /**
     * Find user by credential (NFC / PIN / QR / …)
     */
    findUserByCredential(type, value) {
        if (!type || !value) return null;
        const db = getDB();
        const normalizedValue = String(type) === "nfc" ? String(value).toUpperCase() : String(value);
        const rows = db.select(`
      SELECT user_id AS userId, user_name AS name, type, value, period
      FROM user_credential
      WHERE type=${escapeText(String(type), 16)} AND value=${escapeText(normalizedValue, 256)}
      LIMIT 1
    `);
        if (!rows || rows.length === 0) return null;
        const r = rows[0];
        let period = { type: 0 };
        try {
            period = r.period ? JSON.parse(r.period) : { type: 0 };
        } catch (e) {
            period = { type: 0 };
        }
        return { userId: r.userId, name: r.name || "", type: r.type, value: r.value, period };
    },

    // ---------------- access_record ----------------
    appendAccessRecord({ userId, name, type, value, result, time, synced }) {
        const db = getDB();
        const uid = userId != null ? String(userId) : "";
        const t = time != null ? Number(time) || 0 : nowSec();
        if (!type) return;

        const nm = name != null ? String(name) : "";
        const res = normalizeResult(result);
        const syn = Number(synced) ? 1 : 0;

        try {
            db.begin();

            db.exec(`
        INSERT INTO access_record (
          user_id, name, type, value, result, time, synced
        ) VALUES (
          ${escapeText(uid, 64)},
          ${escapeText(nm, 64)},
          ${escapeText(String(type), 16)},
          ${escapeText(String(value), 256)},
          ${res},
          ${t},
          ${syn}
        )
      `);

            // Trim to latest 10000 rows
            db.exec(`
        DELETE FROM access_record
        WHERE id NOT IN (
          SELECT id FROM access_record ORDER BY id DESC LIMIT 10000
        )
      `);

            db.commit();
        } catch (e) {
            safeRollback(db);
            log.error("AccessDB.appendAccessRecord failed", e);
            throw e;
        }
    },

    listAccess(page = 1, size = 100, filters = {}) {
        const db = getDB();
        const p = Number(page) || 1;
        const s = Number(size) || 100;
        const offset = p <= 1 ? 0 : (p - 1) * s;

        const where = [];
        if (filters.userId && String(filters.userId).trim()) {
            where.push(`user_id LIKE ${escapeText('%' + String(filters.userId).trim() + '%')}`);
        }
        if (filters.name && String(filters.name).trim()) {
            where.push(`name LIKE ${escapeText('%' + String(filters.name).trim() + '%')}`);
        }
        if (filters.type && String(filters.type).trim()) {
            where.push(`type = ${escapeText(String(filters.type).trim(), 16)}`);
        }
        if (filters.value && String(filters.value).trim()) {
            where.push(`value LIKE ${escapeText('%' + String(filters.value).trim() + '%')}`);
        }
        if (filters.result !== undefined && filters.result !== '') {
            const r = Number(filters.result);
            if (r === 0 || r === 1) where.push(`result = ${r}`);
        }
        const whereClause = where.length > 0 ? `WHERE ${where.join(' AND ')}` : '';

        const totalRows = db.select(`SELECT COUNT(*) AS cnt FROM access_record ${whereClause}`);
        const total = totalRows && totalRows.length ? Number(totalRows[0].cnt) || 0 : 0;

        const list = db.select(`
      SELECT id, user_id AS userId, name, type, value, result, time
      FROM access_record
      ${whereClause}
      ORDER BY time DESC, id DESC
      LIMIT ${s} OFFSET ${offset}
    `) || [];

        return { total, list };
    },

    clearAccess() {
        const db = getDB();
        db.exec("DELETE FROM access_record");
    },

    deleteAccessByIds(ids) {
        const list = Array.isArray(ids) ? ids : [];
        const cleaned = list.map((x) => Number(x) || 0).filter((x) => x > 0);
        if (cleaned.length === 0) return;
        const db = getDB();
        db.exec(`DELETE FROM access_record WHERE id IN (${cleaned.join(",")})`);
    },

    getUnsyncedAccess(limit = 100) {
        const db = getDB();
        const n = Number(limit) || 100;
        return db.select(`
      SELECT id, user_id AS userId, name, type, value, result, time
      FROM access_record
      WHERE synced=0
      ORDER BY time ASC, id ASC
      LIMIT ${n}
    `) || [];
    },

    markAccessSynced(ids) {
        const list = Array.isArray(ids) ? ids : [];
        const cleaned = list
            .map((x) => Number(x) || 0)
            .filter((x) => x > 0);
        if (cleaned.length === 0) return;
        const db = getDB();
        db.exec(`UPDATE access_record SET synced=1 WHERE id IN (${cleaned.join(",")})`);
    },

    // ---------------- event_log ----------------
    appendEvent({ type, event, message, time, synced }) {
        const t = time != null ? Number(time) || 0 : nowSec();
        const tp = type != null ? String(type) : "";
        if (!tp) return;

        const db = getDB();
        const ev = event != null ? String(event) : null;
        const msg = message != null ? String(message) : null;
        const syn = Number(synced) ? 1 : 0;

        db.exec(`
      INSERT INTO event_log (type, event, message, time, synced)
      VALUES (
        ${escapeText(tp, 16)},
        ${ev == null ? "NULL" : escapeText(ev, 64)},
        ${msg == null ? "NULL" : escapeText(msg, 512)},
        ${t},
        ${syn}
      )
    `);
    },

    getUnsyncedEvents(limit = 100) {
        const db = getDB();
        const n = Number(limit) || 100;
        return db.select(`
      SELECT id, type, event, message, time
      FROM event_log
      WHERE synced=0
      ORDER BY time ASC, id ASC
      LIMIT ${n}
    `) || [];
    },

    markEventsSynced(ids) {
        const list = Array.isArray(ids) ? ids : [];
        const cleaned = list
            .map((x) => Number(x) || 0)
            .filter((x) => x > 0);
        if (cleaned.length === 0) return;
        const db = getDB();
        db.exec(`UPDATE event_log SET synced=1 WHERE id IN (${cleaned.join(",")})`);
    },

    listEvents(page = 1, size = 100, filters = {}) {
        const db = getDB();
        const p = Number(page) || 1;
        const s = Number(size) || 100;
        const offset = p <= 1 ? 0 : (p - 1) * s;

        const where = [];
        if (filters.type && String(filters.type).trim()) {
            where.push(`type = ${escapeText(String(filters.type).trim(), 16)}`);
        }
        if (filters.message && String(filters.message).trim()) {
            where.push(`message LIKE ${escapeText('%' + String(filters.message).trim() + '%')}`);
        }
        const whereClause = where.length > 0 ? `WHERE ${where.join(' AND ')}` : '';

        const totalRows = db.select(`SELECT COUNT(*) AS cnt FROM event_log ${whereClause}`);
        const total = totalRows && totalRows.length ? Number(totalRows[0].cnt) || 0 : 0;

        const list = db.select(`
      SELECT id, type, event, message, time
      FROM event_log
      ${whereClause}
      ORDER BY time DESC, id DESC
      LIMIT ${s} OFFSET ${offset}
    `) || [];

        return { total, list };
    },

    deleteEventsByIds(ids) {
        const list = Array.isArray(ids) ? ids : [];
        const cleaned = list.map((x) => Number(x) || 0).filter((x) => x > 0);
        if (cleaned.length === 0) return;
        const db = getDB();
        db.exec(`DELETE FROM event_log WHERE id IN (${cleaned.join(",")})`);
    },

    clearEvents() {
        const db = getDB();
        db.exec("DELETE FROM event_log");
    },
};

export default AccessDB;

