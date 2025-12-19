import dxSqliteDB from "../../dxmodules/dxSqliteDB.js";
import log from "../../dxmodules/dxLogger.js";

// Application‑specific database file path
const DB_PATH = "/app/data/smartlocker.db";

// Note: dxSqliteDB itself already manages "one path shared across threads" via dxMap,
// here _db is only a local cache inside this JS thread.
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
    // Escape single quotes for SQLite string literal
    s = s.replace(/'/g, "''");
    return "'" + s + "'";
}

// Convention: LockerDB.init() is only called once at startup from main.js;
// other workers just call the business methods directly.
function ensureSchema() {
    const db = getDB();

    try {
        db.begin();

        // 1. Config table: key / value (both stored as TEXT)
        db.exec(`
      CREATE TABLE IF NOT EXISTS config (
        key   TEXT PRIMARY KEY,
        value TEXT
      )
    `);

        // 2. Current cabinet status table (no group id, use global cabinet number only)
        // cabinet_no: cabinet number (global unique)
        // is_occupied: occupied flag (0 free, 1 occupied)
        // store_time: store timestamp (only valid when occupied, ms timestamp or similar)
        // store_password: store password (plain text)
        db.exec(`
      CREATE TABLE IF NOT EXISTS cabinet_status (
        cabinet_no     INTEGER PRIMARY KEY,
        is_occupied    INTEGER NOT NULL DEFAULT 0,
        store_time     INTEGER,
        store_password TEXT
      )
    `);

        // 3. Store / pickup records table
        // One row per record; not reused. Business logic guarantees "max 100 rows per cabinet".
        db.exec(`
      CREATE TABLE IF NOT EXISTS records (
        id             INTEGER PRIMARY KEY AUTOINCREMENT,
        cabinet_no     INTEGER NOT NULL,
        store_time     INTEGER,
        store_password TEXT,
        pickup_time    INTEGER,
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
    // Must be called only once from main.js at startup; do not call elsewhere.
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

    // ---------- Current cabinet status table ----------

    upsertCabinetStatus({
        cabinetNo,
        isOccupied,
        storeTime,
        storePassword,
    }) {
        const db = getDB();

        const c = Number(cabinetNo) || 0;
        const occ = Number(isOccupied) ? 1 : 0;

        // When free, clear store time and password
        const st =
            occ === 1 && storeTime != null
                ? Number(storeTime) || 0
                : null;
        const sp =
            occ === 1 && storePassword != null ? escapeText(storePassword, 32) : "NULL";

        const sql = `
      REPLACE INTO cabinet_status (
        cabinet_no, is_occupied, store_time, store_password
      ) VALUES (
        ${c},
        ${occ},
        ${st == null ? "NULL" : Number(st)},
        ${sp}
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
     * Get current "occupied cabinet" count.
     * Implementation: count rows in cabinet_status where is_occupied = 1.
     * Note: total cabinet count comes from config (locker.groupCounts); here we only care which cabinets are occupied.
     */
    getOccupiedCabinetCount() {
        const db = getDB();
        const rows = db.select(
            `SELECT COUNT(*) AS cnt FROM cabinet_status WHERE is_occupied=1`
        );
        return rows && rows.length > 0 ? Number(rows[0].cnt) || 0 : 0;
    },

    /**
     * Find the first free cabinet number in range 1..totalCabinets.
     * Rules:
     * - If no row exists in cabinet_status for that number, treat as "never used → free".
     * - If a row exists but is_occupied != 1 (includes 0 or invalid), treat as free.
     * - If all are occupied or totalCabinets <= 0, return null.
     *
     * @param {number} totalCabinets Total cabinet count from configuration.
     * @returns {number|null} First free cabinet number, or null if none.
     */
    findFirstFreeCabinet(totalCabinets) {
        const total = Number(totalCabinets) || 0;
        if (total <= 0) {
            return null;
        }

        const db = getDB();

        // First select cabinets that already have status rows in 1..total
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
                // No row means "never used yet → free"
                return i;
            }
            const occ = statusMap.get(i);
            if (occ !== 1) {
                // Only is_occupied === 1 is treated as occupied; everything else is free
                return i;
            }
        }

        return null;
    },

    // ---------- Store / pickup records table (max 100 per cabinet) ----------

    appendRecord({
        cabinetNo,
        storeTime,
        storePassword,
        pickupTime,
        result,
    }) {
        const db = getDB();

        const c = Number(cabinetNo) || 0;
        const st = storeTime != null ? Number(storeTime) || 0 : null;
        const pt = pickupTime != null ? Number(pickupTime) || 0 : null;
        const res = Number(result) ? 1 : 0;

        const sp =
            storePassword != null ? escapeText(storePassword, 32) : "NULL";

        try {
            db.begin();

            db.exec(`
        INSERT INTO records (
          cabinet_no, store_time, store_password, pickup_time, result
        ) VALUES (
          ${c},
          ${st == null ? "NULL" : st},
          ${sp},
          ${pt == null ? "NULL" : pt},
          ${res}
        )
      `);

            // Keep only latest 100 records for this cabinet; delete the oldest extras
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
     * Query total count of store/pickup records (optionally filter by cabinet).
     * @param {number} [cabinetNo] If provided, only count records for this cabinet; otherwise count all.
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
     * Paginate store/pickup records, ordered by store_time DESC (fallback to id DESC).
     * @param {Object} options
     * @param {number} [options.pageIndex=0] Page index starting from 0.
     * @param {number} [options.pageSize=4] Page size, default 4.
     * @param {number} [options.cabinetNo] Optional: filter for a specific cabinet number.
     * @returns {object[]} Record list.
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

        // Prefer ordering by store_time DESC; for old data without time, use id DESC to keep order stable.
        const sql = `
      SELECT *
      FROM records
      ${where}
      ORDER BY store_time DESC, id DESC
      LIMIT ${pageSize} OFFSET ${offset}
    `;

        return db.select(sql);
    },

    // ---------- Cabinet status helper operations ----------

    /**
     * Clear current status row for given cabinet (used after successful pickup to free it),
     * equivalent to DELETE FROM cabinet_status WHERE cabinet_no=...
     * If no row exists, do nothing.
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

    // ---------- Test / debug helpers (call manually during development only) ----------

    /**
     * Print all rows in config table (usually small; SELECT * is fine).
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
     * Print all rows in cabinet_status table (current cabinet status).
     */
    debugPrintCabinetStatus() {
        try {
            const db = getDB();
            const rows = db.select(
                `SELECT cabinet_no, is_occupied, store_time, store_password
           FROM cabinet_status
           ORDER BY cabinet_no ASC`
            );
            log.info("LockerDB.debugPrintCabinetStatus: cabinet_status rows =", rows);
        } catch (e) {
            log.error("LockerDB.debugPrintCabinetStatus failed", e);
        }
    },

    /**
     * Print a subset of rows in records table (up to 100, to avoid huge logs),
     * ordered by id DESC (latest first) by default.
     * @param {number} [limit=100]
     */
    debugPrintRecords(limit = 100) {
        try {
            const db = getDB();
            const n = Number(limit) || 100;
            const rows = db.select(
                `SELECT id, cabinet_no, store_time, store_password, pickup_time, result
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
     * Print key data from the 3 tables at once: config / cabinet_status / records (latest 100 rows).
     * Recommended to be called only from a debug helper in main.js.
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



