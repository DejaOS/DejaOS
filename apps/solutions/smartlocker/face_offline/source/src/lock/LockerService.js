import dxMap from "../../dxmodules/dxMap.js";
import LockerDB from "./LockerDB.js";
import LogProxy from "../log/LogProxy.js";
import bus from "../../dxmodules/dxEventBus.js";

/**
 * LockerService
 *
 * Responsibilities:
 * - Centralize business-related config / stats
 * - Some from SQLite config table, some from other tables, some in-memory only
 * - Use dxMap for cross-worker cache; business code uses these APIs only
 *
 * Design:
 * - Init: call LockerDB.init() first in main.js; LockerService is stateless singleton
 * - dxMap topic name: "__smartlocker_config__"
 */

const CONFIG_MAP_TOPIC = "__smartlocker_config__";
const map = dxMap.get(CONFIG_MAP_TOPIC);

// Internal keys for stats in dxMap (business layer need not know names)
const KEY_TOTAL_CABINET = "__stat_totalCabinetCount__";
const KEY_FREE_CABINET = "__stat_freeCabinetCount__";

// Config table key for cabinet group counts
// Stored as JSON string e.g. "[30,40,30]"
const CONFIG_KEY_GROUP_COUNTS = "locker.groupCounts";
// Config table key for admin password
const CONFIG_KEY_ADMIN_PASSWORD = "locker.adminPassword";
// Max cabinets per user (1-9), stored as string "1".."9"
const CONFIG_KEY_USER_MAX_CABINET = "locker.userMaxCabinet";

const LockerService = {

    /**
     * Invalidate one key in memory cache (does not touch DB). Use for force reload.
     * Normally not needed.
     */
    invalidate(key) {
        if (!key) return;
        map.del(key);
    },

    /**
     * Get all cached config keys (dxMap view only, may be partial).
     * Mainly for debug or admin UI.
     * @returns {string[]}
     */
    listCachedKeys() {
        return map.keys();
    },

    /**
     * Get total cabinet count.
     * - Read from dxMap cache first
     * - On miss: sum from getGroupCabinetCounts() and write back
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
     * Get free (available) cabinet count.
     * - Read from dxMap cache first
     * - On miss: free = total - occupied, then write back
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
     * - Default "000000"
     * - If config exists, return config value
     * @returns {string}
     */
    getAdminPassword() {
        try {
            const fromDb = LockerDB.getConfig(CONFIG_KEY_ADMIN_PASSWORD);
            if (fromDb && typeof fromDb === "string" && fromDb.length > 0) {
                return fromDb;
            }
        } catch (e) {
            LogProxy.error("locker.admin", "Get admin password failed", {
                error: e && e.message ? e.message : String(e),
            });
        }
        // Use default when not configured or on error
        return "000000";
    },

    /**
     * Set admin password: write to config table, optionally refresh cache.
     * @param {string} newPassword 6-digit string
     */
    setAdminPassword(newPassword) {
        const pwd = String(newPassword || "").trim();
        if (pwd.length !== 6) {
            throw new Error("Admin password must be 6 digits");
        }
        try {
            LockerDB.setConfig(CONFIG_KEY_ADMIN_PASSWORD, pwd);
            // Can also cache in dxMap if needed
            map.put(CONFIG_KEY_ADMIN_PASSWORD, pwd);
            LogProxy.info("locker.admin", "Admin password updated");
        } catch (e) {
            LogProxy.error("locker.admin", "Set admin password failed", {
                error: e && e.message ? e.message : String(e),
            });
            throw e;
        }
    },

    /**
     * Get max cabinets per user (1-9), default 3.
     * @returns {number}
     */
    getUserMaxCabinetCount() {
        try {
            const raw = LockerDB.getConfig(CONFIG_KEY_USER_MAX_CABINET);
            if (raw != null && raw !== "") {
                const n = parseInt(String(raw), 10);
                if (Number.isFinite(n) && n >= 1 && n <= 9) return n;
            }
        } catch (e) {
            LogProxy.error("locker.admin", "Get user max cabinet count failed", { error: e && e.message ? e.message : String(e) });
        }
        return 3;
    },

    /**
     * Set max cabinets per user (1-9).
     * @param {number} count 1-9
     */
    setUserMaxCabinetCount(count) {
        const n = Number(count);
        if (!Number.isFinite(n) || n < 1 || n > 9) {
            throw new Error("User max cabinet count must be 1-9");
        }
        try {
            LockerDB.setConfig(CONFIG_KEY_USER_MAX_CABINET, String(n));
            LogProxy.info("locker.admin", "User max cabinet count updated", { count: n });
        } catch (e) {
            LogProxy.error("locker.admin", "Set user max cabinet count failed", { error: e && e.message ? e.message : String(e) });
            throw e;
        }
    },

    // ---------- Store/pick records (wrap LockerDB) ----------

    /**
     * Get total record count.
     * - No cabinetNo: count all
     * - With cabinetNo: count that cabinet only
     *
     * @param {number} [cabinetNo]
     * @returns {number}
     */
    getRecordsTotalCount(cabinetNo) {
        try {
            return LockerDB.getRecordCount(cabinetNo);
        } catch (e) {
            LogProxy.error("locker.records", "Get record count failed", {
                cabinetNo,
                error: e && e.message ? e.message : String(e),
            });
            return 0;
        }
    },

    /**
     * Paginated store/pick records, ordered by store_time newest first.
     *
     * @param {Object} options
     * @param {number} [options.pageIndex=0] Page index from 0
     * @param {number} [options.pageSize=4] Page size, default 4
     * @param {number} [options.cabinetNo] Optional: filter by cabinet
     * @returns {object[]} Record array
     */
    getRecordsPage(options = {}) {
        try {
            return LockerDB.getRecordsPage(options) || [];
        } catch (e) {
            LogProxy.error("locker.records", "Get records page failed", {
                options,
                error: e && e.message ? e.message : String(e),
            });
            return [];
        }
    },

    // ---------- Cabinet group config (from config table) ----------

    /**
     * Get per-group cabinet counts.
     * - Stored in config as "locker.groupCounts", JSON e.g. "[30,40,30]"
     * - Returns number array e.g. [30, 40, 30], cached in dxMap
     *
     * @param {number[]} [defaultValue=[]] Default when not configured or invalid
     * @returns {number[]}
     */
    getGroupCabinetCounts(defaultValue = []) {
        const cached = map.get(CONFIG_KEY_GROUP_COUNTS);
        if (cached !== undefined) {
            // dxMap restores array, return as-is
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

        // Write to cache (array can go to dxMap)
        map.put(CONFIG_KEY_GROUP_COUNTS, normalized);
        return normalized;
    },

    /**
     * Set per-group cabinet counts.
     * - counts: number array e.g. [30,40,30], validated and normalized (>0 integers)
     * - Written to config as JSON and dxMap cache updated
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
            // Equivalent to delete config
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

        // Invalidate total/free cache when groups change
        map.del(KEY_TOTAL_CABINET);
        map.del(KEY_FREE_CABINET);

        LogProxy.event("config.groupCounts.updated", {
            before,
            after: normalized,
        });
    },

    // ---------- Store flow ----------

    /**
     * After store success: send open command to lockWorker, update cabinet status.
     * Store/pick records are written at pickup time.
     *
     * @param {number} cabinetNo Global cabinet number
     * @param {string} userId User ID from face
     * @param {string} picPath Face snapshot path
     */
    handleStoreSuccess(cabinetNo, userId, picPath) {
        const c = Number(cabinetNo) || 0;
        if (!c || !userId) {
            LogProxy.warn("locker.store", "handleStoreSuccess invalid params", {
                cabinetNo,
                userId: userId || "",
            });
            return;
        }

        const now = Date.now();

        // 1. Send open command (no wait, log only)
        this.openCabinet(c);

        // 2. Update DB (cabinet status); on failure log only, no UI change
        try {
            LockerDB.upsertCabinetStatus({
                cabinetNo: c,
                isOccupied: 1,
                storeTime: now,
                userId: String(userId),
                picPath: picPath ? String(picPath) : null,
            });

            // Occupied count changed, invalidate free cache
            map.del(KEY_FREE_CABINET);

            LogProxy.info("locker.store", "Store DB status updated", {
                cabinetNo: c,
                storeTime: now,
                userId,
            });
        } catch (e) {
            LogProxy.error("locker.store", "Update store DB status failed", {
                cabinetNo: c,
                error: e && e.message ? e.message : String(e),
            });
        }
    },

    // ---------- Open cabinet ----------

    /**
     * Open one cabinet (lockWorker openOne command).
     * Does not wait for result; sends command and logs.
     * cabinetNo is global (1-based across groups); compute boardAddr and lockNo from group config.
     *
     * @param {number} cabinetNo Global cabinet number
     */
    openCabinet(cabinetNo) {
        const c = Number(cabinetNo) || 0;
        if (!c || c < 0) {
            LogProxy.warn("locker.open", "openCabinet invalid params", {
                cabinetNo,
            });
            return;
        }
        try {
            // Compute board addr and local lock no from group config, e.g. [50, 30]:
            //  - 1~50  => boardAddr=1, lockNo=1~50
            //  - 51~80 => boardAddr=2, lockNo=1~30
            const groups = this.getGroupCabinetCounts([]);
            if (!groups || groups.length === 0) {
                LogProxy.warn("locker.open", "No group config, cannot compute board addr", {
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
                    boardAddr = i + 1; // Board addr 1-based
                    localLockNo = c - sum; // Local lock no on board
                    break;
                }
                sum = end;
            }

            if (!boardAddr || !localLockNo) {
                LogProxy.warn("locker.open", "openCabinet: cabinet no out of config range", {
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
            LogProxy.info("locker.open", "Open command sent", {
                cabinetNo: c,
                boardAddr,
                lockNo: localLockNo,
            });
        } catch (e) {
            LogProxy.error("locker.open", "Send open command failed", {
                cabinetNo: c,
                error: e && e.message ? e.message : String(e),
            });
        }
    },

    /**
     * Admin: clear one cabinet's occupied state (release cabinet, clear user_id/pic_path).
     * @param {number} cabinetNo Cabinet number
     */
    clearCabinetStatusForAdmin(cabinetNo) {
        const c = Number(cabinetNo) || 0;
        if (!c || c < 0) return;
        try {
            LockerDB.clearCabinetStatus(c);
            map.del(KEY_FREE_CABINET);
            LogProxy.info("locker.admin", "Cleared cabinet permission", { cabinetNo: c });
        } catch (e) {
            LogProxy.error("locker.admin", "Clear cabinet permission failed", {
                cabinetNo: c,
                error: e && e.message ? e.message : String(e),
            });
        }
    },

    /**
     * Admin: clear all cabinet occupied state (release all permissions).
     * Single DELETE to clear table.
     */
    clearAllCabinetStatusForAdmin() {
        const total = this.getTotalCabinetCount();
        if (!total || total <= 0) return;
        try {
            LockerDB.clearAllCabinetStatus();
            map.del(KEY_FREE_CABINET);
            LogProxy.info("locker.admin", "Cleared all cabinet permissions", { total });
        } catch (e) {
            LogProxy.error("locker.admin", "Clear all cabinet permissions failed", {
                error: e && e.message ? e.message : String(e),
            });
        }
    },

    // ---------- Pickup flow ----------

    /**
     * Check if cabinet can be used for pickup.
     * Returns { ok:false, reason } for NO_CONFIG / OUT_OF_RANGE / NO_ITEM; else { ok:true, status }.
     * Data/rule only, no UI.
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
     * Execute pickup by face: validate userId, send open command, update status & records.
     * On cabinet invalid: return reason. On userId mismatch: add record result=0, no open.
     * On match: send open, add record result=1, clear cabinet status.
     *
     * @param {number} cabinetNo
     * @param {string} userId User ID from face
     * @param {number} [pickType=1] 0 temp use, 1 clear use
     * @returns {{ok: boolean, reason?: string}}
     */
    handlePickupByFace(cabinetNo, userId, pickType) {
        const c = Number(cabinetNo) || 0;
        if (!c || !userId) {
            return { ok: false, reason: "INVALID_PARAM" };
        }

        const check = this.checkCabinetForPickup(c);
        if (!check.ok) {
            return check;
        }

        const status = check.status;
        const storedUserId = status && status.user_id != null
            ? String(status.user_id)
            : "";
        const inputUserId = String(userId);
        const now = Date.now();

        const storeTime = status && status.store_time != null
            ? Number(status.store_time) || now
            : now;

        const success = inputUserId === storedUserId;

        // 1. Write store/pick record (one record whether match or not)
        try {
            LockerDB.appendRecord({
                cabinetNo: c,
                storeTime,
                userId: storedUserId,
                picPath: status && status.pic_path != null ? String(status.pic_path) : null,
                pickupTime: now,
                pickType: Number(pickType) ? 1 : 0,
                result: success ? 1 : 0,
            });
        } catch (e) {
            LogProxy.error("locker.pick", "Write store/pick record failed", {
                cabinetNo: c,
                error: e && e.message ? e.message : String(e),
            });
        }

        if (!success) {
            return { ok: false, reason: "FACE_MISMATCH" };
        }

        // 2. Face match: send open command
        this.openCabinet(c);

        const isClear = Number(pickType) === 1;

        // 3. Temp use: open only, keep cabinet state (retain ownership)
        if (!isClear) {
            LogProxy.info("locker.pick", "Temp use, keep cabinet state", { cabinetNo: c });
            return { ok: true };
        }

        // 4. Clear use: release cabinet
        try {
            LockerDB.clearCabinetStatus(c);
            map.del(KEY_FREE_CABINET);
            LogProxy.info("locker.pick", "Cabinet state cleared", { cabinetNo: c });
        } catch (e) {
            LogProxy.error("locker.pick", "Clear cabinet state failed", {
                cabinetNo: c,
                error: e && e.message ? e.message : String(e),
            });
        }

        // 5. If user has no more cabinets, clear face feature
        try {
            const remaining = LockerDB.getCabinetsByUserId(inputUserId);
            if (!remaining || remaining.length === 0) {
                LogProxy.info("locker.pick", "User has no cabinets, notify clear face feature", { userId: inputUserId });
                bus.fire("FACE_CLEAR_FEA", { userId: inputUserId });
            }
        } catch (e) {
            LogProxy.error("locker.pick", "Query user remaining cabinets failed", {
                userId: inputUserId,
                error: e && e.message ? e.message : String(e),
            });
        }

        return { ok: true };
    },
};

export default LockerService;



