import dxMap from "../../dxmodules/dxMap.js";
import LockerDB from "./LockerDB.js";
import LogProxy from "../log/LogProxy.js";
import bus from "../../dxmodules/dxEventBus.js";

/**
 * LockerService
 *
 * Responsibilities:
 * - Centrally manage configuration / statistics that are tightly coupled with business logic.
 * - Some values come from SQLite config table, some from other tables, some only exist in memory.
 * - Use dxMap as a cross‑worker in‑memory cache; business code only depends on these APIs and not on persistence details.
 *
 * Design:
 * - Initialization: in main.js call LockerDB.init() first to create tables; LockerService itself is a stateless singleton.
 * - dxMap topic name is fixed to "__smartlocker_config__".
 */

const CONFIG_MAP_TOPIC = "__smartlocker_config__";
const map = dxMap.get(CONFIG_MAP_TOPIC);

// Internal keys in dxMap for statistics; business layer does not care about these names.
const KEY_TOTAL_CABINET = "__stat_totalCabinetCount__";
const KEY_FREE_CABINET = "__stat_freeCabinetCount__";

// Key used in config table for group configuration.
// Stored as JSON string, e.g. "[30,40,30]".
const CONFIG_KEY_GROUP_COUNTS = "locker.groupCounts";
// Key used in config table for admin password.
const CONFIG_KEY_ADMIN_PASSWORD = "locker.adminPassword";

const LockerService = {

    /**
     * Invalidate one key in in‑memory cache (does not touch DB), to force reload in special cases.
     * Normally you do not need to call this.
     */
    invalidate(key) {
        if (!key) return;
        map.del(key);
    },

    /**
     * Get all cached keys (from dxMap point of view; may be only a subset).
     * Mainly for debugging or admin UI display.
     * @returns {string[]}
     */
    listCachedKeys() {
        return map.keys();
    },

    /**
     * Get current total cabinet count.
     * - First read from dxMap cache.
     * - On miss, sum from group config via getGroupCabinetCounts() and write back to cache.
     * @returns {number}
     */
    getTotalCabinetCount() {
        const cached = map.get(KEY_TOTAL_CABINET);
        if (cached !== undefined) {
            return Number(cached) || 0;
        }
        const groups = this.getGroupCabinetCounts([]);
        const value = groups.reduce((sum, n) => sum + (Number(n) || 0), 0);
        map.put(KEY_TOTAL_CABINET, value);
        return value;
    },

    /**
     * Get current free (available) cabinet count.
     * - First read from dxMap cache.
     * - On miss: free = total - occupied, then write back to cache,
     *   where total is from group config and occupied from LockerDB.getOccupiedCabinetCount().
     * @returns {number}
     */
    getFreeCabinetCount() {
        const cached = map.get(KEY_FREE_CABINET);
        if (cached !== undefined) {
            return Number(cached) || 0;
        }
        const total = this.getTotalCabinetCount();
        const occupied = LockerDB.getOccupiedCabinetCount();
        const free = total - occupied;
        const normalized = free > 0 ? free : 0;
        map.put(KEY_FREE_CABINET, normalized);
        return normalized;
    },

    // ---------- Admin password ----------

    /**
     * Get current admin password.
     * - Default password is "000000".
     * - If a value exists in config table, return that instead.
     * @returns {string}
     */
    getAdminPassword() {
        try {
            const fromDb = LockerDB.getConfig(CONFIG_KEY_ADMIN_PASSWORD);
            if (fromDb && typeof fromDb === "string" && fromDb.length > 0) {
                return fromDb;
            }
        } catch (e) {
            LogProxy.error("locker.admin", "failed to get admin password", {
                error: e && e.message ? e.message : String(e),
            });
        }
        // Use default password when not configured or on error
        return "000000";
    },

    /**
     * Set admin password: write to config table and optionally update local cache.
     * @param {string} newPassword 6‑digit numeric string.
     */
    setAdminPassword(newPassword) {
        const pwd = String(newPassword || "").trim();
        if (pwd.length !== 6) {
            throw new Error("Admin password must be a 6‑digit number");
        }
        try {
            LockerDB.setConfig(CONFIG_KEY_ADMIN_PASSWORD, pwd);
            // Optionally cache in dxMap as well
            map.put(CONFIG_KEY_ADMIN_PASSWORD, pwd);
            LogProxy.info("locker.admin", "admin password updated");
        } catch (e) {
            LogProxy.error("locker.admin", "failed to set admin password", {
                error: e && e.message ? e.message : String(e),
            });
            throw e;
        }
    },

    // ---------- Record queries (thin wrapper around LockerDB) ----------

    /**
     * Get total record count.
     * - If cabinetNo is omitted, count all records.
     * - If cabinetNo is provided, count only records of that cabinet.
     *
     * @param {number} [cabinetNo]
     * @returns {number}
     */
    getRecordsTotalCount(cabinetNo) {
        try {
            return LockerDB.getRecordCount(cabinetNo);
        } catch (e) {
            LogProxy.error("locker.records", "failed to get record total count", {
                cabinetNo,
                error: e && e.message ? e.message : String(e),
            });
            return 0;
        }
    },

    /**
     * Paginate store/pickup records ordered by store_time DESC.
     *
     * @param {Object} options
     * @param {number} [options.pageIndex=0] Page index starting from 0.
     * @param {number} [options.pageSize=4] Page size, default 4.
     * @param {number} [options.cabinetNo] Optional: filter by cabinet number.
     * @returns {object[]} Record list.
     */
    getRecordsPage(options = {}) {
        try {
            return LockerDB.getRecordsPage(options) || [];
        } catch (e) {
            LogProxy.error("locker.records", "failed to query records page", {
                options,
                error: e && e.message ? e.message : String(e),
            });
            return [];
        }
    },

    // ---------- Group configuration (from config table) ----------

    /**
     * Get "total cabinet count per group" array.
     * - Persisted in config table under key "locker.groupCounts".
     * - Stored as JSON string, e.g. "[30,40,30]".
     * - Returned as number array, e.g. [30, 40, 30].
     * - Result is also cached in dxMap under CONFIG_KEY_GROUP_COUNTS.
     *
     * @param {number[]} [defaultValue=[]] Default value when config is missing or invalid.
     * @returns {number[]}
     */
    getGroupCabinetCounts(defaultValue = []) {
        const cached = map.get(CONFIG_KEY_GROUP_COUNTS);
        if (cached !== undefined) {
            // dxMap will de‑serialize arrays automatically, just return it.
            return cached;
        }

        const raw = LockerDB.getConfig(CONFIG_KEY_GROUP_COUNTS);
        if (!raw) {
            return defaultValue;
        }

        let parsed;
        try {
            parsed = JSON.parse(raw);
        } catch (e) {
            return defaultValue;
        }

        if (!Array.isArray(parsed)) {
            return defaultValue;
        }

        const normalized = parsed
            .map((n) => Number(n) || 0)
            .filter((n) => n > 0);

        if (normalized.length === 0) {
            return defaultValue;
        }

        // Cache normalized result (arrays can be stored directly into dxMap).
        map.put(CONFIG_KEY_GROUP_COUNTS, normalized);
        return normalized;
    },

    /**
     * Set "total cabinet count per group".
     * - counts is a number array, e.g. [30,40,30].
     * - Will normalize (keep only >0 integers).
     * - Persist as JSON string in config table and update dxMap cache.
     *
     * @param {number[]} counts
     */
    setGroupCabinetCounts(counts) {
        if (!Array.isArray(counts)) {
            return;
        }

        const before = this.getGroupCabinetCounts([]);

        const normalized = counts
            .map((n) => Number(n) || 0)
            .filter((n) => n > 0);

        if (normalized.length === 0) {
            // Equivalent to "delete" the config.
            LockerDB.setConfig(CONFIG_KEY_GROUP_COUNTS, null);
            map.del(CONFIG_KEY_GROUP_COUNTS);
            map.del(KEY_TOTAL_CABINET);
            map.del(KEY_FREE_CABINET);

            LogProxy.event("config.groupCounts.cleared", {
                before,
            });
            return;
        }

        const str = JSON.stringify(normalized);
        LockerDB.setConfig(CONFIG_KEY_GROUP_COUNTS, str);
        map.put(CONFIG_KEY_GROUP_COUNTS, normalized);

        // When group config changes, cached total and free cabinet counts must be invalidated.
        map.del(KEY_TOTAL_CABINET);
        map.del(KEY_FREE_CABINET);

        LogProxy.event("config.groupCounts.updated", {
            before,
            after: normalized,
        });
    },

    // ---------- Store flow business logic ----------

    /**
     * Common handling after store password is successfully set:
     * 1. Send open‑lock command to lockWorker (fire‑and‑forget; on failure just log).
     * 2. Update current cabinet status table (occupied, store time, plain‑text password).
     *
     * Records table is updated in pickup stage so we can store pickup result (success/failure).
     *
     * @param {number} cabinetNo Global cabinet number
     * @param {string} password Store password (plain, 6‑digit number)
     */
    handleStoreSuccess(cabinetNo, password) {
        const c = Number(cabinetNo) || 0;
        if (!c || !password) {
            LogProxy.warn("locker.store", "handleStoreSuccess invalid arguments", {
                cabinetNo,
                passwordLength: password ? String(password).length : 0,
            });
            return;
        }

        const now = Date.now();

        // 1. Send open‑lock command first (do not wait for result, just log).
        this.openCabinet(c);

        // 2. Update DB (current cabinet status); on failure only log, UI flow continues.
        try {
            // Mark cabinet as occupied.
            LockerDB.upsertCabinetStatus({
                cabinetNo: c,
                isOccupied: 1,
                storeTime: now,
                storePassword: String(password),
            });

            // Occupied count changed, free‑cabinet cache must be invalidated.
            map.del(KEY_FREE_CABINET);

            LogProxy.info("locker.store", "store DB status updated", {
                cabinetNo: c,
                storeTime: now,
            });
        } catch (e) {
            LogProxy.error("locker.store", "failed to update store DB status", {
                cabinetNo: c,
                error: e && e.message ? e.message : String(e),
            });
        }
    },

    // ---------- Generic "open cabinet" operation ----------

    /**
     * Open specified cabinet; maps to lockWorker "openOne" command.
     * Fire‑and‑forget; only responsible for sending command and logging.
     *
     * Notes:
     * - cabinetNo is a global cabinet number (start from 1, continuous across groups).
     * - We calculate:
     *     - boardAddr: controller board address (start from 1),
     *     - lockNo:    local lock number on that board (start from 1),
     *   from locker.groupCounts,
     *   then call bus.fire("lock/cmd", { action:"openOne", boardAddr, lockNo }).
     *
     * @param {number} cabinetNo Global cabinet number.
     */
    openCabinet(cabinetNo) {
        const c = Number(cabinetNo) || 0;
        if (!c || c < 0) {
            LogProxy.warn("locker.open", "openCabinet invalid arguments", {
                cabinetNo,
            });
            return;
        }
        try {
            // Calculate board address and local lock number from group config.
            // Example: groupCounts = [50, 30]
            //  - 1..50  => boardAddr=1, lockNo=1..50
            //  - 51..80 => boardAddr=2, lockNo=1..30
            const groups = this.getGroupCabinetCounts([]);
            if (!groups || groups.length === 0) {
                LogProxy.warn("locker.open", "no groups configured; cannot compute board address", {
                    cabinetNo: c,
                });
                return;
            }

            let sum = 0;
            let boardAddr = 0;
            let localLockNo = 0;
            for (let i = 0; i < groups.length; i++) {
                const size = Number(groups[i]) || 0;
                if (size <= 0) continue;
                const start = sum + 1;
                const end = sum + size;
                if (c >= start && c <= end) {
                    boardAddr = i + 1; // board address starts from 1
                    localLockNo = c - sum; // relative lock number on that board
                    break;
                }
                sum = end;
            }

            if (!boardAddr || !localLockNo) {
                LogProxy.warn("locker.open", "openCabinet: cabinet number out of configured range", {
                    cabinetNo: c,
                    totalConfigured: sum,
                    groups,
                });
                return;
            }

            bus.fire("lock/cmd", {
                action: "openOne",
                boardAddr,
                lockNo: localLockNo,
            });
            LogProxy.info("locker.open", "open‑lock command sent", {
                cabinetNo: c,
                boardAddr,
                lockNo: localLockNo,
            });
        } catch (e) {
            LogProxy.error("locker.open", "failed to send open‑lock command", {
                cabinetNo: c,
                error: e && e.message ? e.message : String(e),
            });
        }
    },

    // ---------- Pickup flow business logic ----------

    /**
     * Check whether a cabinet is valid for pickup.
     *
     * Rules:
     * - If no group is configured or total cabinets <= 0: return { ok:false, reason:"NO_CONFIG" }.
     * - If cabinet number is not in [1, total]: return { ok:false, reason:"OUT_OF_RANGE", total }.
     * - If cabinet has no stored item (no status row or is_occupied != 1): return { ok:false, reason:"NO_ITEM" }.
     * - Otherwise return { ok:true, status }.
     *
     * Note: This only performs data / rule checks and does not touch UI.
     *
     * @param {number} cabinetNo
     * @returns {{ok: boolean, reason?: string, total?: number, status?: object}}
     */
    checkCabinetForPickup(cabinetNo) {
        const c = Number(cabinetNo) || 0;
        if (!c || c < 0) {
            return { ok: false, reason: "INVALID_NO" };
        }

        const total = this.getTotalCabinetCount();
        if (total <= 0) {
            return { ok: false, reason: "NO_CONFIG" };
        }

        if (c < 1 || c > total) {
            return { ok: false, reason: "OUT_OF_RANGE", total };
        }

        const status = LockerDB.getCabinetStatus(c);
        if (!status || Number(status.is_occupied) !== 1) {
            return { ok: false, reason: "NO_ITEM" };
        }

        return { ok: true, status };
    },

    /**
     * Handle pickup by password: validate password + send open‑lock command + update two tables (status & records).
     *
     * Rules:
     * - If cabinet is not eligible (unconfigured / out of range / no item), return reason from checkCabinetForPickup.
     * - If password is wrong: append a record (result=0), do not open lock, do not clear status.
     * - If password is correct:
     *   - Send open‑lock command (fire‑and‑forget),
     *   - Append a record (result=1),
     *   - Delete status row for this cabinet (free it).
     *
     * @param {number} cabinetNo
     * @param {string} password Pickup password (6‑digit number)
     * @returns {{ok: boolean, reason?: string}}
     */
    handlePickupByPassword(cabinetNo, password) {
        const c = Number(cabinetNo) || 0;
        if (!c || !password) {
            return { ok: false, reason: "INVALID_PARAM" };
        }

        // Reuse existing cabinet‑check logic first.
        const check = this.checkCabinetForPickup(c);
        if (!check.ok) {
            return check;
        }

        const status = check.status;
        const realPwd = status && status.store_password != null
            ? String(status.store_password)
            : "";
        const inputPwd = String(password);
        const now = Date.now();

        const storeTime = status && status.store_time != null
            ? Number(status.store_time) || now
            : now;

        const success = inputPwd === realPwd;

        // 1. Always append a record, regardless of password correctness.
        try {
            LockerDB.appendRecord({
                cabinetNo: c,
                storeTime,
                storePassword: realPwd,
                pickupTime: now,
                result: success ? 1 : 0,
            });
        } catch (e) {
            LogProxy.error("locker.pick", "failed to append pickup record", {
                cabinetNo: c,
                error: e && e.message ? e.message : String(e),
            });
        }

        if (!success) {
            // Wrong password: do not open, do not clear status, just return reason.
            return { ok: false, reason: "PWD_ERROR" };
        }

        // 2. Correct password: send open‑lock command (fire‑and‑forget through openCabinet).
        this.openCabinet(c);

        // 3. Clear current cabinet status (free cabinet) and invalidate free‑cabinet cache.
        try {
            LockerDB.clearCabinetStatus(c);
            map.del(KEY_FREE_CABINET);
            LogProxy.info("locker.pick", "cabinet status cleared after pickup", { cabinetNo: c });
        } catch (e) {
            LogProxy.error("locker.pick", "failed to clear cabinet status after pickup", {
                cabinetNo: c,
                error: e && e.message ? e.message : String(e),
            });
        }

        return { ok: true };
    },
};

export default LockerService;



