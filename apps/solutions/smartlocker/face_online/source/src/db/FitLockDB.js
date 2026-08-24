import dxSqliteDB from "../../dxmodules/dxSqliteDB.js";
import log from "../mylogger.js";
import std from "../../dxmodules/dxStd.js";
import {
  CABINET_STATUS,
  CABINET_TYPE,
  FITLOCK_CONFIG_RESTORE_PATH,
  FITLOCK_DB_PATH,
} from "../constants.js";
import { normalizeCabinetStrategyMode } from "./userValidate.js";
import {
  CONFIG_KEY_LOCK_RULE,
  normalizeLockRule,
  computeLockDeadline,
} from "./tempLockRule.js";

const DB_PATH = FITLOCK_DB_PATH;

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
  s = s.replace(/'/g, "''");
  return "'" + s + "'";
}

function escapeInt(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? String(Math.floor(n)) : String(fallback);
}

function nowSec() {
  return Math.floor(Date.now() / 1000);
}

function rowToCabinetApi(r) {
  if (!r) return null;
  return {
    groupId: Number(r.group_id),
    groupName: r.group_name != null ? String(r.group_name) : "",
    cabinetId: Number(r.cabinet_id),
    cabinetName: r.cabinet_name != null ? String(r.cabinet_name) : "",
    row: r.row != null ? Number(r.row) : 0,
    col: r.col != null ? Number(r.col) : 0,
    status: Number(r.status),
    type: Number(r.type),
    userId: r.user_id != null ? String(r.user_id) : "",
    startTimestamp: r.start_time != null ? Number(r.start_time) : 0,
    endTimestamp: r.end_time != null ? Number(r.end_time) : 0,
    doorOpen: Number(r.door_open) ? 1 : 0,
  };
}

function rowToUserApi(r) {
  if (!r) return null;
  return {
    userId: r.user_id != null ? String(r.user_id) : "",
    name: r.name != null ? String(r.name) : "",
    faceImageUrl: r.face_image_url != null ? String(r.face_image_url) : "",
    faceImageMd5: r.face_image_md5 != null ? String(r.face_image_md5) : "",
    phone: r.phone != null ? String(r.phone) : "",
    pin: r.pin != null ? String(r.pin) : "",
    role: Number(r.role) === 1 ? 1 : 0,
    faceEnrolled: Number(r.face_enrolled) ? 1 : 0,
  };
}

function getLockRuleFromConfig() {
  try {
    const db = getDB();
    const rows = db.select(`SELECT value FROM config WHERE key = ${escapeText(CONFIG_KEY_LOCK_RULE)}`);
    const raw = rows && rows.length > 0 ? rows[0].value : "";
    if (!raw || !String(raw).trim()) return normalizeLockRule();
    return normalizeLockRule(JSON.parse(raw));
  } catch (e) {
    return normalizeLockRule();
  }
}

function shouldLockOccupiedRow(row, rule) {
  if (!row) return false;
  const st = Number(row.status);
  const et = Number(row.end_time);
  if (st !== CABINET_STATUS.OCCUPIED || et <= 0) return false;
  const lockDeadline = computeLockDeadline(et, rule);
  return lockDeadline > 0 && nowSec() >= lockDeadline;
}

function lockOccupiedRowInDb(row) {
  const db = getDB();
  db.exec(`
    UPDATE cabinet SET status = ${CABINET_STATUS.LOCKED}
    WHERE group_id = ${escapeInt(row.group_id)} AND cabinet_id = ${escapeInt(row.cabinet_id)}
  `);
  row.status = CABINET_STATUS.LOCKED;
}

function ensureSchema() {
  const db = getDB();
  try {
    db.begin();

    db.exec(`
      CREATE TABLE IF NOT EXISTS config (
        key   TEXT PRIMARY KEY,
        value TEXT
      )
    `);

    db.exec(`
      CREATE TABLE IF NOT EXISTS user (
        user_id          TEXT PRIMARY KEY,
        name             TEXT,
        face_image_url   TEXT,
        face_image_md5   TEXT,
        phone            TEXT,
        pin              TEXT,
        role             INTEGER NOT NULL DEFAULT 0,
        face_enrolled    INTEGER DEFAULT 0,
        updated_at       INTEGER
      )
    `);

    db.exec(`
      CREATE TABLE IF NOT EXISTS cabinet (
        group_id     INTEGER NOT NULL,
        group_name   TEXT,
        cabinet_id   INTEGER NOT NULL,
        cabinet_name TEXT,
        row          INTEGER DEFAULT 0,
        col          INTEGER DEFAULT 0,
        status       INTEGER NOT NULL DEFAULT 1,
        type         INTEGER NOT NULL DEFAULT 2,
        user_id      TEXT DEFAULT '',
        start_time   INTEGER DEFAULT 0,
        end_time     INTEGER DEFAULT 0,
        door_open    INTEGER NOT NULL DEFAULT 0,
        PRIMARY KEY (group_id, cabinet_id)
      )
    `);

    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_cabinet_user_id
      ON cabinet(user_id)
      WHERE user_id IS NOT NULL AND user_id != ''
    `);

    db.exec(`
      CREATE TABLE IF NOT EXISTS pending_mqtt_event (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        event_id    TEXT NOT NULL,
        payload     TEXT NOT NULL,
        created_at  INTEGER NOT NULL
      )
    `);

    db.commit();
  } catch (e) {
    try {
      db.rollback();
    } catch (e2) {}
    log.error("[FitLockDB] ensureSchema failed", e);
    throw e;
  }
}

function logLongDbRow(prefix, row) {
  let text = "";
  try {
    text = JSON.stringify(row);
  } catch (e) {
    text = String(row);
  }
  const chunkSize = 700;
  const parts = Math.max(1, Math.ceil(text.length / chunkSize));
  for (let i = 0; i < parts; i++) {
    log.info(
      `${prefix} part=${i + 1}/${parts}`,
      text.slice(i * chunkSize, (i + 1) * chunkSize)
    );
  }
}

function getCabinetStrategyModeFromDb() {
  try {
    const db = getDB();
    const rows = db.select(`SELECT value FROM config WHERE key = 'fitlock.cabinetStrategy'`);
    const raw = rows && rows.length > 0 ? rows[0].value : "";
    if (!raw || !String(raw).trim()) return 0;
    return normalizeCabinetStrategyMode(JSON.parse(raw));
  } catch (e) {
    return 0;
  }
}

function restoreConfigSnapshotIfPresent() {
  try {
    if (!std.exist(FITLOCK_CONFIG_RESTORE_PATH)) return false;

    const raw = std.loadFile(FITLOCK_CONFIG_RESTORE_PATH);
    const backup = JSON.parse(String(raw || ""));
    const entries = Array.isArray(backup)
      ? backup
      : backup && Array.isArray(backup.config)
        ? backup.config
        : null;
    if (!entries) {
      throw new Error("invalid config restore file");
    }

    const db = getDB();
    let restored = 0;
    try {
      db.begin();
      for (let i = 0; i < entries.length; i++) {
        const row = entries[i];
        const key = row && row.key != null ? String(row.key) : "";
        if (!key) continue;
        const value = row.value != null ? String(row.value) : "";
        db.exec(`
          REPLACE INTO config (key, value)
          VALUES (${escapeText(key, 256)}, ${escapeText(value, 8192)})
        `);
        restored++;
      }
      db.commit();
    } catch (e) {
      try {
        db.rollback();
      } catch (e2) {}
      throw e;
    }

    const removeResult = std.remove(FITLOCK_CONFIG_RESTORE_PATH);
    if (removeResult !== 0) {
      log.info("[FitLockDB] config restored but restore file remove failed", removeResult);
    }
    log.info("[FitLockDB] config restore success", "count=", restored);
    return true;
  } catch (e) {
    log.error("[FitLockDB] config restore failed", e);
    return false;
  }
}

const FitLockDB = {
  init() {
    ensureSchema();
    restoreConfigSnapshotIfPresent();
    // 调试用：正式版本请注释掉下一行。
    //this.printAll();
  },

  printAll() {
    const db = getDB();
    try {
      const tables =
        db.select(`
          SELECT name
          FROM sqlite_master
          WHERE type = 'table' AND name NOT LIKE 'sqlite_%'
          ORDER BY name ASC
        `) || [];
      log.info("[FitLockDB] printAll BEGIN", "tables=", tables.length);
      for (let i = 0; i < tables.length; i++) {
        const tableName = tables[i] && tables[i].name != null ? String(tables[i].name) : "";
        if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(tableName)) {
          log.error("[FitLockDB] printAll skip invalid table name", tableName);
          continue;
        }
        try {
          const rows = db.select(`SELECT * FROM "${tableName}"`) || [];
          log.info(`[FitLockDB] table=${tableName} rows=${rows.length}`);
          for (let rowIndex = 0; rowIndex < rows.length; rowIndex++) {
            logLongDbRow(
              `[FitLockDB] table=${tableName} row=${rowIndex + 1}/${rows.length}`,
              rows[rowIndex]
            );
          }
        } catch (e) {
          log.error(`[FitLockDB] printAll table=${tableName} failed`, e);
        }
      }
      log.info("[FitLockDB] printAll END");
    } catch (e) {
      log.error("[FitLockDB] printAll failed", e);
    }
  },

  setConfig(key, value) {
    const db = getDB();
    db.exec(`
      REPLACE INTO config (key, value)
      VALUES (${escapeText(key)}, ${escapeText(value, 8192)})
    `);
  },

  getConfig(key) {
    const db = getDB();
    const rows = db.select(`SELECT value FROM config WHERE key = ${escapeText(key)}`);
    if (rows && rows.length > 0) return rows[0].value;
    return null;
  },

  getAllConfigEntries() {
    const db = getDB();
    const rows = db.select(`SELECT key, value FROM config ORDER BY key ASC`) || [];
    const out = [];
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      if (!r || r.key == null) continue;
      out.push({ key: String(r.key), value: r.value != null ? String(r.value) : "" });
    }
    return out;
  },

  // --- user ---

  replaceUser(row) {
    const db = getDB();
    const uid = escapeText(row.user_id || row.userId, 128);
    const name = escapeText(row.name, 256);
    const urlRaw = row.face_image_url || row.faceImageUrl;
    const md5Raw = row.face_image_md5 || row.faceImageMd5;
    const url =
      urlRaw != null && String(urlRaw).trim() !== "" ? escapeText(String(urlRaw).trim(), 512) : "NULL";
    const md5 =
      md5Raw != null && String(md5Raw).trim() !== "" ? escapeText(String(md5Raw).trim(), 64) : "NULL";
    const phoneRaw = row.phone;
    const pinRaw = row.pin;
    const phoneSql =
      phoneRaw != null && String(phoneRaw).trim() !== "" ? escapeText(String(phoneRaw).trim(), 32) : "NULL";
    const pinSql =
      pinRaw != null && String(pinRaw).trim() !== "" ? escapeText(String(pinRaw).trim(), 16) : "NULL";
    const role = Number(row.role) === 1 ? 1 : 0;
    const fe = Number(row.face_enrolled || row.faceEnrolled) ? 1 : 0;
    const ua = row.updated_at != null ? Number(row.updated_at) : Date.now();
    db.exec(`
      REPLACE INTO user (
        user_id, name, face_image_url, face_image_md5, phone, pin, role, face_enrolled, updated_at
      ) VALUES (${uid}, ${name}, ${url}, ${md5}, ${phoneSql}, ${pinSql}, ${role}, ${fe}, ${ua})
    `);
  },

  getUser(userId) {
    if (!userId) return null;
    const db = getDB();
    const rows =
      db.select(
        `SELECT user_id, name, face_image_url, face_image_md5, phone, pin, role, face_enrolled, updated_at
         FROM user WHERE user_id = ${escapeText(String(userId), 128)} LIMIT 1`
      ) || [];
    return rows.length > 0 ? rows[0] : null;
  },

  getUserByPhonePin(phone, pin) {
    const p = String(phone || "").trim();
    const pinCode = String(pin || "").trim();
    if (!/^\d{11}$/.test(p) || !/^\d{6}$/.test(pinCode)) return null;
    const db = getDB();
    const rows =
      db.select(
        `SELECT user_id, name, face_image_url, face_image_md5, phone, pin, role, face_enrolled, updated_at
         FROM user WHERE phone = ${escapeText(p, 32)} AND pin = ${escapeText(pinCode, 16)} LIMIT 1`
      ) || [];
    return rows.length > 0 ? rows[0] : null;
  },

  getAllUserIds() {
    const db = getDB();
    const rows = db.select(`SELECT user_id FROM user`) || [];
    const out = [];
    for (let i = 0; i < rows.length; i++) {
      const id = rows[i] && rows[i].user_id != null ? String(rows[i].user_id) : "";
      if (id) out.push(id);
    }
    return out;
  },

  listUsers(filter) {
    const db = getDB();
    const f = filter && typeof filter === "object" ? filter : {};
    const wh = [];
    if (f.userId != null && String(f.userId).trim() !== "") {
      wh.push(`user_id = ${escapeText(String(f.userId).trim(), 128)}`);
    }
    if (f.phone != null && String(f.phone).trim() !== "") {
      wh.push(`phone = ${escapeText(String(f.phone).trim(), 32)}`);
    }
    if (f.role != null && f.role !== "") {
      wh.push(`role = ${escapeInt(f.role)}`);
    }
    const where = wh.length ? `WHERE ${wh.join(" AND ")}` : "";
    const rows =
      db.select(
        `SELECT user_id, name, face_image_url, face_image_md5, phone, pin, role, face_enrolled
         FROM user ${where}
         ORDER BY user_id ASC`
      ) || [];
    const out = [];
    for (let i = 0; i < rows.length; i++) {
      const api = rowToUserApi(rows[i]);
      if (api) out.push(api);
    }
    return out;
  },

  updateUserFaceEnrolled(userId, faceEnrolled) {
    if (!userId) return;
    const db = getDB();
    const fe = Number(faceEnrolled) ? 1 : 0;
    db.exec(`
      UPDATE user SET face_enrolled = ${fe}, updated_at = ${Date.now()}
      WHERE user_id = ${escapeText(String(userId), 128)}
    `);
  },

  isUserAdmin(userId) {
    const row = this.getUser(userId);
    return !!(row && Number(row.role) === 1);
  },

  deleteUser(userId) {
    if (!userId) return;
    const db = getDB();
    db.exec(`DELETE FROM user WHERE user_id = ${escapeText(String(userId), 128)}`);
  },

  clearUsers() {
    const db = getDB();
    db.exec("DELETE FROM user");
  },

  // --- cabinet ---

  getCabinetRow(groupId, cabinetId) {
    const db = getDB();
    const rows =
      db.select(
        `SELECT * FROM cabinet
         WHERE group_id = ${escapeInt(groupId)} AND cabinet_id = ${escapeInt(cabinetId)}
         LIMIT 1`
      ) || [];
    return rows.length > 0 ? rows[0] : null;
  },

  listCabinets(filter) {
    const db = getDB();
    const f = filter && typeof filter === "object" ? filter : {};
    const wh = [];
    if (f.groupId != null && f.groupId !== "") {
      wh.push(`group_id = ${escapeInt(f.groupId)}`);
    }
    if (f.cabinetId != null && f.cabinetId !== "" && f.groupId != null) {
      wh.push(`cabinet_id = ${escapeInt(f.cabinetId)}`);
    }
    if (f.status != null && f.status !== "") {
      wh.push(`status = ${escapeInt(f.status)}`);
    }
    if (f.type != null && f.type !== "") {
      wh.push(`type = ${escapeInt(f.type)}`);
    }
    if (f.userId != null && String(f.userId).trim() !== "") {
      wh.push(`user_id = ${escapeText(String(f.userId).trim(), 128)}`);
    }
    const where = wh.length ? `WHERE ${wh.join(" AND ")}` : "";
    const rows =
      db.select(
        `SELECT * FROM cabinet ${where} ORDER BY group_id ASC, cabinet_id ASC`
      ) || [];
    const out = [];
    for (let i = 0; i < rows.length; i++) {
      const api = rowToCabinetApi(rows[i]);
      if (api) out.push(api);
    }
    return out;
  },

  upsertCabinet(item) {
    //log.info("[FitLockDB] upsertCabinet", item);
    const incomingStatus = item && item.status != null ? Number(item.status) : null;
    const canSkipMissingIds =
      incomingStatus === CABINET_STATUS.FAULT ||
      incomingStatus === CABINET_STATUS.BLANK;
    const gid = Number(item.groupId != null ? item.groupId : item.group_id);
    const cid = Number(item.cabinetId != null ? item.cabinetId : item.cabinet_id);
    if (!Number.isFinite(gid) || gid < 1 || !Number.isFinite(cid) || cid < 1) {
      if (canSkipMissingIds) {
        log.info("[FitLockDB] skip upsertCabinet without groupId/cabinetId", item);
        return;
      }
      throw new Error("groupId/cabinetId 无效");
    }

    const existing = this.getCabinetRow(gid, cid);
    const status =
      item.status != null
        ? Number(item.status)
        : existing
          ? Number(existing.status)
          : CABINET_STATUS.IDLE;
    const type =
      item.type != null
        ? Number(item.type)
        : existing
          ? Number(existing.type)
          : CABINET_TYPE.TEMP;
    const userId =
      item.userId != null
        ? String(item.userId)
        : item.user_id != null
          ? String(item.user_id)
          : existing
            ? String(existing.user_id || "")
            : "";
    const startTime =
      item.startTimestamp != null
        ? Number(item.startTimestamp)
        : item.start_time != null
          ? Number(item.start_time)
          : existing
            ? Number(existing.start_time)
            : 0;
    const endTime =
      item.endTimestamp != null
        ? Number(item.endTimestamp)
        : item.end_time != null
          ? Number(item.end_time)
          : existing
            ? Number(existing.end_time)
            : 0;
    const doorOpen =
      item.doorOpen != null
        ? Number(item.doorOpen) ? 1 : 0
        : existing
          ? Number(existing.door_open) ? 1 : 0
          : 0;

    const db = getDB();
    const gn =
      item.groupName != null
        ? escapeText(String(item.groupName), 128)
        : item.group_name != null
          ? escapeText(String(item.group_name), 128)
          : existing && existing.group_name
            ? escapeText(String(existing.group_name), 128)
            : "NULL";
    const cn =
      item.cabinetName != null
        ? escapeText(String(item.cabinetName), 128)
        : item.cabinet_name != null
          ? escapeText(String(item.cabinet_name), 128)
          : existing && existing.cabinet_name
            ? escapeText(String(existing.cabinet_name), 128)
            : "NULL";
    const rowNum = item.row != null ? escapeInt(item.row) : existing ? escapeInt(existing.row) : "0";
    const colNum = item.col != null ? escapeInt(item.col) : existing ? escapeInt(existing.col) : "0";
    const uidSql = userId.trim() ? escapeText(userId.trim(), 128) : "''";

    db.exec(`
      REPLACE INTO cabinet (
        group_id, group_name, cabinet_id, cabinet_name, row, col,
        status, type, user_id, start_time, end_time, door_open
      ) VALUES (
        ${escapeInt(gid)}, ${gn}, ${escapeInt(cid)}, ${cn}, ${rowNum}, ${colNum},
        ${escapeInt(status)}, ${escapeInt(type)}, ${uidSql},
        ${escapeInt(startTime)}, ${escapeInt(endTime)}, ${doorOpen ? 1 : 0}
      )
    `);
  },

  deleteCabinet(groupId, cabinetId) {
    const db = getDB();
    db.exec(`
      DELETE FROM cabinet
      WHERE group_id = ${escapeInt(groupId)} AND cabinet_id = ${escapeInt(cabinetId)}
    `);
  },

  clearCabinets() {
    const db = getDB();
    db.exec("DELETE FROM cabinet");
  },

  /** 长期专属：type=1 且 user 匹配，status 2 或 3（可多条） */
  listLongTermCabinetsByUser(userId) {
    const uid = String(userId || "").trim();
    if (!uid) return [];
    const db = getDB();
    const rows =
      db.select(
        `SELECT * FROM cabinet
         WHERE type = ${CABINET_TYPE.LONG}
         AND user_id = ${escapeText(uid, 128)}
         AND status IN (${CABINET_STATUS.OCCUPIED}, ${CABINET_STATUS.LOCKED})
         ORDER BY group_id ASC, cabinet_id ASC`
      ) || [];
    const out = [];
    for (let i = 0; i < rows.length; i++) {
      out.push(rowToCabinetApi(rows[i]));
    }
    return out;
  },

  findLongTermCabinetByUser(userId) {
    const list = this.listLongTermCabinetsByUser(userId);
    return list.length > 0 ? list[0] : null;
  },

  findTempCabinetByUser(userId) {
    const uid = String(userId || "").trim();
    if (!uid) return null;
    const db = getDB();
    const rows =
      db.select(
        `SELECT * FROM cabinet
         WHERE type = ${CABINET_TYPE.TEMP}
         AND user_id = ${escapeText(uid, 128)}
         AND status IN (${CABINET_STATUS.OCCUPIED}, ${CABINET_STATUS.LOCKED})
         LIMIT 1`
      ) || [];
    return rows.length > 0 ? rowToCabinetApi(rows[0]) : null;
  },

  /** 分配临时柜：type=2 status=1 无 user，非故障/空格 */
  findAvailableTempCabinet() {
    const db = getDB();
    const rows =
      db.select(
        `SELECT * FROM cabinet
         WHERE type = ${CABINET_TYPE.TEMP}
         AND status = ${CABINET_STATUS.IDLE}
         AND (user_id IS NULL OR user_id = '')
         ORDER BY group_id ASC, cabinet_id ASC
         LIMIT 1`
      ) || [];
    return rows.length > 0 ? rowToCabinetApi(rows[0]) : null;
  },

  countTempCabinetStats() {
    const db = getDB();
    const rows =
      db.select(
        `SELECT status, type, user_id FROM cabinet WHERE type = ${CABINET_TYPE.TEMP}`
      ) || [];
    let total = 0;
    let free = 0;
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      if (!r) continue;
      const st = Number(r.status);
      if (st === CABINET_STATUS.FAULT || st === CABINET_STATUS.BLANK) continue;
      total += 1;
      const uid = r.user_id != null ? String(r.user_id).trim() : "";
      if (st === CABINET_STATUS.IDLE && !uid) free += 1;
    }
    return { total, free };
  },

  occupyTempCabinet(groupId, cabinetId, userId, startTime, endTime) {
    const db = getDB();
    db.exec(`
      UPDATE cabinet SET
        status = ${CABINET_STATUS.OCCUPIED},
        type = ${CABINET_TYPE.TEMP},
        user_id = ${escapeText(String(userId), 128)},
        start_time = ${escapeInt(startTime)},
        end_time = ${escapeInt(endTime)}
      WHERE group_id = ${escapeInt(groupId)} AND cabinet_id = ${escapeInt(cabinetId)}
    `);
  },

  releaseCabinet(groupId, cabinetId) {
    const row = this.getCabinetRow(groupId, cabinetId);
    if (!row) return;
    const prevType = Number(row.type);
    const mode = getCabinetStrategyModeFromDb();
    let nextType = prevType;
    if (mode === 0 && prevType === CABINET_TYPE.LONG) {
      nextType = CABINET_TYPE.TEMP;
    }
    const db = getDB();
    db.exec(`
      UPDATE cabinet SET
        status = ${CABINET_STATUS.IDLE},
        type = ${nextType},
        user_id = '',
        start_time = 0,
        end_time = 0
      WHERE group_id = ${escapeInt(groupId)} AND cabinet_id = ${escapeInt(cabinetId)}
    `);
  },

  updateCabinetDoorOpen(groupId, cabinetId, doorOpen) {
    const db = getDB();
    const sw = Number(doorOpen) ? 1 : 0;
    const existing = this.getCabinetRow(groupId, cabinetId);
    if (!existing) return false;
    db.exec(`
      UPDATE cabinet SET door_open = ${sw}
      WHERE group_id = ${escapeInt(groupId)} AND cabinet_id = ${escapeInt(cabinetId)}
    `);
    return true;
  },

  isCabinetLocked(cabinetApi) {
    if (!cabinetApi) return false;
    return Number(cabinetApi.status) === CABINET_STATUS.LOCKED;
  },

  /**
   * 扫描全部占用柜，将已过 lockDeadline 的行置为 status=3；供 mqttWorker 定时调用。
   * @returns {{ groupId: number, cabinetId: number, userId: string }[]}
   */
  sweepExpiredOccupiedCabinets() {
    const db = getDB();
    const rule = getLockRuleFromConfig();
    const rows =
      db.select(`
        SELECT * FROM cabinet
        WHERE status = ${CABINET_STATUS.OCCUPIED} AND end_time > 0
      `) || [];
    const locked = [];
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      if (!row || !shouldLockOccupiedRow(row, rule)) continue;
      const gid = Number(row.group_id);
      const cid = Number(row.cabinet_id);
      const userId = row.user_id != null ? String(row.user_id).trim() : "";
      lockOccupiedRowInDb(row);
      locked.push({ groupId: gid, cabinetId: cid, userId });
    }
    if (locked.length > 0) {
      log.info("[FitLockDB] sweepExpiredOccupiedCabinets locked", locked.length);
    }
    return locked;
  },

  // --- pending_mqtt_event ---

  appendPendingMqttEvent(row) {
    const db = getDB();
    const eid = escapeText(row.event_id || row.eventId, 128);
    const payloadObj = row.payload;
    if (!payloadObj || typeof payloadObj !== "object") {
      throw new Error("appendPendingMqttEvent: payload 必填");
    }
    const payload = escapeText(JSON.stringify(payloadObj), 8192);
    const ca = Number(row.created_at) || Date.now();
    db.exec(`
      INSERT INTO pending_mqtt_event (event_id, payload, created_at)
      VALUES (${eid}, ${payload}, ${ca})
    `);
  },

  peekPendingMqttEvents(limit = 10) {
    const db = getDB();
    const n = Math.min(Math.max(Number(limit) || 10, 1), 50);
    return (
      db.select(`
        SELECT id, event_id, payload, created_at
        FROM pending_mqtt_event
        ORDER BY id ASC
        LIMIT ${n}
      `) || []
    );
  },

  getPendingMqttEvent(id) {
    const db = getDB();
    const rowId = Number(id) || 0;
    if (rowId <= 0) return null;
    const rows =
      db.select(`
        SELECT id, event_id, payload, created_at
        FROM pending_mqtt_event
        WHERE id = ${Math.floor(rowId)}
        LIMIT 1
      `) || [];
    return rows.length > 0 ? rows[0] : null;
  },

  deletePendingMqttEvents(ids) {
    if (!ids || ids.length === 0) return;
    const db = getDB();
    const parts = ids.map((id) => Number(id) || 0).filter((id) => id > 0);
    if (parts.length === 0) return;
    db.exec(`DELETE FROM pending_mqtt_event WHERE id IN (${parts.join(",")})`);
  },

  clearPendingMqttEvents() {
    const db = getDB();
    db.exec("DELETE FROM pending_mqtt_event");
  },
};

export default FitLockDB;
