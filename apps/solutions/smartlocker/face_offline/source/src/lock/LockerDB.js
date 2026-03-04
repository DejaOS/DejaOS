import dxSqliteDB from "../../dxmodules/dxSqliteDB.js";
import log from "../../dxmodules/dxLogger.js";

// App database file path
const DB_PATH = "/data/smartlocker.db";

// Note: dxSqliteDB uses dxMap for cross-thread path sharing;
// _db here is a local cache in the current JS thread.
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
    // SQLite: escape single quotes
    s = s.replace(/'/g, "''");
    return "'" + s + "'";
}

// Convention: call LockerDB.init() once at startup in main.js;
// other workers use the API methods directly.
function ensureSchema() {
    const db = getDB();

    try {
        db.begin();

        // 1. Config table: key / value (strings)
        db.exec(`
      CREATE TABLE IF NOT EXISTS config (
        key   TEXT PRIMARY KEY,
        value TEXT
      )
    `);

        // 2. Cabinet status table (global cabinet no only)
        // cabinet_no, is_occupied (0 free, 1 occupied), store_time, user_id, pic_path
        db.exec(`
      CREATE TABLE IF NOT EXISTS cabinet_status (
        cabinet_no     INTEGER PRIMARY KEY,
        is_occupied    INTEGER NOT NULL DEFAULT 0,
        store_time     INTEGER,
        user_id        TEXT,
        pic_path       TEXT
      )
    `);

        // 3. Store/pick records table; at most 100 per cabinet (enforced by business logic)
        db.exec(`
      CREATE TABLE IF NOT EXISTS records (
        id             INTEGER PRIMARY KEY AUTOINCREMENT,
        cabinet_no     INTEGER NOT NULL,
        store_time     INTEGER,
        user_id        TEXT,
        pic_path       TEXT,
        pickup_time    INTEGER,
        pick_type      INTEGER NOT NULL DEFAULT 0,
        result         INTEGER NOT NULL
      )
    `);
        db.exec(`
      CREATE INDEX IF NOT EXISTS idx_records_cab_time
      ON records (cabinet_no, store_time)
    `);

        db.commit();
    } catch (e) {
        try {
            db.rollback();
        } catch (e2) {
            // ignore
        }
        log.error("LockerDB.ensureSchema failed", e);
        throw e;
    }
}

const LockerDB = {
    // Call only once at startup in main.js
    init() {
        ensureSchema();
        //this.debugPrintAll()
    },

    // ---------- Config table ----------

    setConfig(key, value) {
        const db = getDB();
        const sql = `
      REPLACE INTO config (key, value)
      VALUES (${escapeText(key)}, ${escapeText(value, 4096)})
    `;
        db.exec(sql);
    },

    getConfig(key) {
        const db = getDB();
        const rows = db.select(
            `SELECT value FROM config WHERE key = ${escapeText(key)}`
        );
        if (rows && rows.length > 0) {
            return rows[0].value;
        }
        return null;
    },

    // ---------- Cabinet status table ----------

    upsertCabinetStatus({
        cabinetNo,
        isOccupied,
        storeTime,
        userId,
        picPath,
    }) {
        const db = getDB();

        const c = Number(cabinetNo) || 0;
        const occ = Number(isOccupied) ? 1 : 0;

        // When free, clear store time and face info
        const st =
            occ === 1 && storeTime != null
                ? Number(storeTime) || 0
                : null;
        const uid =
            occ === 1 && userId != null ? escapeText(userId, 64) : "NULL";
        const pp =
            occ === 1 && picPath != null ? escapeText(picPath, 256) : "NULL";

        const sql = `
      REPLACE INTO cabinet_status (
        cabinet_no, is_occupied, store_time, user_id, pic_path
      ) VALUES (
        ${c},
        ${occ},
        ${st == null ? "NULL" : Number(st)},
        ${uid},
        ${pp}
      )
    `;
        db.exec(sql);
    },

    getCabinetStatus(cabinetNo) {
        const db = getDB();
        const c = Number(cabinetNo) || 0;
        const rows = db.select(
            `SELECT * FROM cabinet_status WHERE cabinet_no=${c}`
        );
        return rows && rows.length > 0 ? rows[0] : null;
    },

    /**
     * Get count of occupied cabinets (cabinet_status where is_occupied = 1).
     * Total count comes from config (locker.groupCounts).
     */
    getOccupiedCabinetCount() {
        const db = getDB();
        const rows = db.select(
            `SELECT COUNT(*) AS cnt FROM cabinet_status WHERE is_occupied=1`
        );
        return rows && rows.length > 0 ? Number(rows[0].cnt) || 0 : 0;
    },

    /**
     * Find first free cabinet in 1..totalCabinets.
     * No row or is_occupied != 1 means free.
     *
     * @param {number} totalCabinets Total from config
     * @returns {number|null} First free cabinet no, or null
     */
    findFirstFreeCabinet(totalCabinets) {
        const total = Number(totalCabinets) || 0;
        if (total <= 0) {
            return null;
        }

        const db = getDB();

        // Query cabinets 1..total that have status
        const rows = db.select(`
      SELECT cabinet_no, is_occupied
      FROM cabinet_status
      WHERE cabinet_no >= 1 AND cabinet_no <= ${total}
      ORDER BY cabinet_no ASC
    `);

        const statusMap = new Map();
        if (rows && rows.length > 0) {
            for (let i = 0; i < rows.length; i++) {
                const r = rows[i];
                const no = Number(r.cabinet_no) || 0;
                if (no <= 0) continue;
                statusMap.set(no, Number(r.is_occupied) || 0);
            }
        }

        for (let i = 1; i <= total; i++) {
            if (!statusMap.has(i)) {
                // No row = never used = free
                return i;
            }
            const occ = statusMap.get(i);
            if (occ !== 1) {
                // Only is_occupied === 1 is occupied; else free
                return i;
            }
        }

        return null;
    },

    // ---------- Store/pick records (max 100 per cabinet) ----------

    appendRecord({
        cabinetNo,
        storeTime,
        userId,
        picPath,
        pickupTime,
        pickType,
        result,
    }) {
        const db = getDB();

        const c = Number(cabinetNo) || 0;
        const st = storeTime != null ? Number(storeTime) || 0 : null;
        const pt = pickupTime != null ? Number(pickupTime) || 0 : null;
        const ptype = Number(pickType) ? 1 : 0;
        const res = Number(result) ? 1 : 0;

        const uid = userId != null ? escapeText(userId, 64) : "NULL";
        const pp = picPath != null ? escapeText(picPath, 256) : "NULL";

        try {
            db.begin();

            db.exec(`
        INSERT INTO records (
          cabinet_no, store_time, user_id, pic_path, pickup_time, pick_type, result
        ) VALUES (
          ${c},
          ${st == null ? "NULL" : st},
          ${uid},
          ${pp},
          ${pt == null ? "NULL" : pt},
          ${ptype},
          ${res}
        )
      `);

            // Keep latest 100 per cabinet, delete older
            const oldRows = db.select(`
        SELECT id FROM records
        WHERE cabinet_no=${c}
        ORDER BY store_time DESC, id DESC
        LIMIT -1 OFFSET 100
      `);

            if (oldRows && oldRows.length > 0) {
                const ids = oldRows.map((r) => Number(r.id) || 0).filter((id) => id > 0);
                if (ids.length > 0) {
                    db.exec(`DELETE FROM records WHERE id IN (${ids.join(",")})`);
                }
            }

            db.commit();
        } catch (e) {
            try {
                db.rollback();
            } catch (e2) {
                // ignore
            }
            log.error("LockerDB.appendRecord failed", e);
            throw e;
        }
    },

    /**
     * Get total record count (optional filter by cabinetNo).
     * @param {number} [cabinetNo] If provided, count that cabinet only
     * @returns {number}
     */
    getRecordCount(cabinetNo) {
        const db = getDB();
        if (cabinetNo === undefined || cabinetNo === null) {
            const rows = db.select(`SELECT COUNT(*) AS cnt FROM records`);
            return rows && rows.length > 0 ? Number(rows[0].cnt) || 0 : 0;
        }
        const c = Number(cabinetNo) || 0;
        const rows = db.select(
            `SELECT COUNT(*) AS cnt FROM records WHERE cabinet_no=${c}`
        );
        return rows && rows.length > 0 ? Number(rows[0].cnt) || 0 : 0;
    },

    /**
     * Paginated records, order by store_time desc (id desc fallback).
     * @param {Object} options pageIndex (0-based), pageSize (default 4), optional cabinetNo
     * @returns {object[]}
     */
    getRecordsPage(options = {}) {
        const db = getDB();
        const pageIndex =
            options.pageIndex === undefined || options.pageIndex === null
                ? 0
                : Number(options.pageIndex) || 0;
        const pageSize =
            options.pageSize === undefined || options.pageSize === null
                ? 4
                : Number(options.pageSize) || 4;

        const offset = pageIndex < 0 ? 0 : pageIndex * pageSize;

        let where = "";
        if (options.cabinetNo !== undefined && options.cabinetNo !== null) {
            const c = Number(options.cabinetNo) || 0;
            where = `WHERE cabinet_no=${c}`;
        }

        // Order by store_time desc, then id desc for stability
        const sql = `
      SELECT *
      FROM records
      ${where}
      ORDER BY store_time DESC, id DESC
      LIMIT ${pageSize} OFFSET ${offset}
    `;

        return db.select(sql);
    },

    /**
     * Get all cabinets occupied by userId (ordered by cabinet_no asc).
     * @param {string} userId
     * @returns {object[]} cabinet_no, store_time, pic_path, etc.
     */
    getCabinetsByUserId(userId) {
        if (!userId) return [];
        const db = getDB();
        const uid = escapeText(String(userId), 64);
        const rows = db.select(
            `SELECT cabinet_no, store_time, pic_path
       FROM cabinet_status
       WHERE is_occupied=1 AND user_id=${uid}
       ORDER BY cabinet_no ASC`
        );
        return rows || [];
    },

    // ---------- Cabinet status helpers ----------

    /**
     * Clear one cabinet's status (after pickup). DELETE WHERE cabinet_no=...
     * @param {number} cabinetNo
     */
    clearCabinetStatus(cabinetNo) {
        const c = Number(cabinetNo) || 0;
        if (!c) return;
        try {
            const db = getDB();
            db.exec(`DELETE FROM cabinet_status WHERE cabinet_no=${c}`);
            log.info("LockerDB.clearCabinetStatus: deleted", { cabinetNo: c });
        } catch (e) {
            log.error("LockerDB.clearCabinetStatus failed", e);
        }
    },

    /**
     * Clear all cabinet_status rows (admin "clear all permissions").
     */
    clearAllCabinetStatus() {
        try {
            const db = getDB();
            db.exec("DELETE FROM cabinet_status");
            log.info("LockerDB.clearAllCabinetStatus: deleted all");
        } catch (e) {
            log.error("LockerDB.clearAllCabinetStatus failed", e);
        }
    },

    // ---------- Debug helpers (manual use in dev) ----------

    /**
     * Print all config rows (small table, SELECT * ok).
     */
    debugPrintConfig() {
        try {
            const db = getDB();
            const rows = db.select(`SELECT key, value FROM config ORDER BY key ASC`);
            log.info("LockerDB.debugPrintConfig: config rows =", rows);
        } catch (e) {
            log.error("LockerDB.debugPrintConfig failed", e);
        }
    },

    /**
     * Print all cabinet_status rows (current cabinet state).
     */
    debugPrintCabinetStatus() {
        try {
            const db = getDB();
            const rows = db.select(
                `SELECT cabinet_no, is_occupied, store_time, user_id, pic_path
           FROM cabinet_status
           ORDER BY cabinet_no ASC`
            );
            log.info("LockerDB.debugPrintCabinetStatus: cabinet_status rows =", rows);
        } catch (e) {
            log.error("LockerDB.debugPrintCabinetStatus failed", e);
        }
    },

    /**
     * Print some records (default 100, avoid huge log). Order by id desc.
     * @param {number} [limit=100]
     */
    debugPrintRecords(limit = 100) {
        try {
            const db = getDB();
            const n = Number(limit) || 100;
            const rows = db.select(
                `SELECT id, cabinet_no, store_time, user_id, pic_path, pickup_time, pick_type, result
           FROM records
           ORDER BY id DESC
           LIMIT ${n}`
            );
            log.info(
                `LockerDB.debugPrintRecords: latest ${n} record rows =`,
                rows
            );
        } catch (e) {
            log.error("LockerDB.debugPrintRecords failed", e);
        }
    },

    /**
     * Print key data from all 3 tables (config, cabinet_status, records first 100).
     * Call manually from debug code in main.js.
     */
    debugPrintAll() {
        log.info("LockerDB.debugPrintAll: BEGIN");
        this.debugPrintConfig();
        this.debugPrintCabinetStatus();
        this.debugPrintRecords(100);
        log.info("LockerDB.debugPrintAll: END");
    },
};

export default LockerDB;



