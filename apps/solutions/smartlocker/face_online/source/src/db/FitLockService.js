import dxMap from "../../dxmodules/dxMap.js";
import log from "../mylogger.js";
import audio from "../../dxmodules/dxAudio.js";
import FitLockDB from "./FitLockDB.js";
import {
  CONFIG_KEY_LOCK_RULE,
  normalizeLockRule,
  computeTempEndTime,
  computeLockDeadline,
  formatTempLockerRemainText,
  isPastNominalEnd,
  validateTimeDelayValue,
  normalizeTimeDelayValue,
} from "./tempLockRule.js";
import { formatLocalDateTime } from "../utils.js";
import {
  CONFIG_KEY_OPEN_MODEL,
  CONFIG_KEY_CABINET_STRATEGY,
  normalizeOpenModel,
  normalizeCabinetStrategyMode,
  OPEN_MODEL_FACE,
  OPEN_MODEL_PIN,
} from "./userValidate.js";
import {
  CONFIG_KEY_DOOR_OPEN_TIMEOUT,
  normalizeDoorOpenTimeoutSec,
} from "./doorOpenTimeout.js";
import {
  CONFIG_KEY_TEMP_PICKUP_MODE,
  normalizeTempPickupModeValue,
  isTempRetainPickupEnabled,
  TEMP_PICKUP_MODE_RETAIN,
} from "./tempPickupMode.js";
import { CABINET_STATUS } from "../constants.js";

export {
  CONFIG_KEY_LOCK_RULE,
  normalizeLockRule,
  computeTempEndTime,
  computeLockDeadline,
  formatTempLockerRemainText,
  isPastNominalEnd,
  validateTimeDelayValue,
  normalizeTimeDelayValue,
  formatLocalDateTime,
  CONFIG_KEY_OPEN_MODEL,
  CONFIG_KEY_CABINET_STRATEGY,
  normalizeOpenModel,
  OPEN_MODEL_FACE,
  OPEN_MODEL_PIN,
  CONFIG_KEY_TEMP_PICKUP_MODE,
  normalizeTempPickupModeValue,
  isTempRetainPickupEnabled,
  TEMP_PICKUP_MODE_RETAIN,
};

const MAP_TOPIC = "__fitlock_service__";
const map = dxMap.get(MAP_TOPIC);

export const CONFIG_KEY_SYSTEM_VOLUME = "system.volume";

export function invalidate(key) {
  if (!key) return;
  map.del(key);
}

export function getConfig(key, defaultValue = null) {
  if (!key) return defaultValue;
  const cached = map.get(key);
  if (cached !== undefined && cached !== null) return cached;
  try {
    const fromDb = FitLockDB.getConfig(key);
    if (fromDb != null) {
      map.put(key, fromDb);
      return fromDb;
    }
  } catch (e) {
    log.error("[FitLockService] getConfig", key, e);
  }
  return defaultValue;
}

export function setConfig(key, value) {
  if (!key) return;
  const s = value == null ? "" : String(value);
  FitLockDB.setConfig(key, s);
  map.put(key, s);
}

export function getSystemVolumeLevel() {
  try {
    const raw = getConfig(CONFIG_KEY_SYSTEM_VOLUME, "8");
    const n = parseInt(String(raw), 10);
    if (Number.isFinite(n) && n >= 0 && n <= 10) return n;
  } catch (e) {}
  return 8;
}

export function setSystemVolumeLevel(level) {
  const n = Number(level);
  if (!Number.isFinite(n) || n < 0 || n > 10 || Math.floor(n) !== n) {
    throw new Error("音量须为 0-10 的整数");
  }
  setConfig(CONFIG_KEY_SYSTEM_VOLUME, String(n));
}

export function mapAudioOutputVolume(level0to10) {
  const n = Number(level0to10);
  if (!Number.isFinite(n)) return null;
  const clamped = Math.min(10, Math.max(0, Math.round(n)));
  if (clamped >= 1 && clamped <= 5) return 6;
  return clamped;
}

export function applyAudioOutputVolume(level0to10) {
  const outputLevel = mapAudioOutputVolume(level0to10);
  if (outputLevel == null) return;
  try {
    audio.setVolume(outputLevel);
  } catch (e) {
    log.info("[FitLockService] applyAudioOutputVolume failed", e);
  }
}

const NET_DEFAULTS_OBJ = () => ({
  netType: "ETH",
  dhcp: true,
  ssid: "",
  psk: "",
  ip: "",
  mask: "",
  gw: "",
  dns: "",
  mqttHost: "",
  mqttPort: "1883",
  mqttUser: "",
  mqttPass: "",
});

export function loadNetworkSettings() {
  const o = NET_DEFAULTS_OBJ();
  const nt = getConfig("net.type", "ETH");
  o.netType = nt === "WIFI" ? "WIFI" : "ETH";
  o.dhcp = getConfig("net.dhcp", "1") !== "0";
  o.ssid = getConfig("net.ssid", "") || "";
  o.psk = getConfig("net.psk", "") || "";
  o.ip = getConfig("net.ip", "") || "";
  o.mask = getConfig("net.mask", "") || "";
  o.gw = getConfig("net.gw", "") || "";
  o.dns = getConfig("net.dns", "") || "";
  o.mqttHost = getConfig("mqtt.host", "") || "";
  o.mqttPort = getConfig("mqtt.port", "1883") || "1883";
  o.mqttUser = getConfig("mqtt.user", "") || "";
  o.mqttPass = getConfig("mqtt.pass", "") || "";
  return o;
}

export function saveNetworkSettings(patch) {
  const p = patch || {};
  if (p.netType !== undefined) setConfig("net.type", p.netType === "WIFI" ? "WIFI" : "ETH");
  if (p.dhcp !== undefined) setConfig("net.dhcp", p.dhcp ? "1" : "0");
  if (p.ssid !== undefined) setConfig("net.ssid", p.ssid || "");
  if (p.psk !== undefined) setConfig("net.psk", p.psk || "");
  if (p.ip !== undefined) setConfig("net.ip", p.ip || "");
  if (p.mask !== undefined) setConfig("net.mask", p.mask || "");
  if (p.gw !== undefined) setConfig("net.gw", p.gw || "");
  if (p.dns !== undefined) setConfig("net.dns", p.dns || "");
  if (p.mqttHost !== undefined) setConfig("mqtt.host", p.mqttHost || "");
  if (p.mqttPort !== undefined) setConfig("mqtt.port", String(p.mqttPort || "1883"));
  if (p.mqttUser !== undefined) setConfig("mqtt.user", p.mqttUser || "");
  if (p.mqttPass !== undefined) setConfig("mqtt.pass", p.mqttPass || "");
  return loadNetworkSettings();
}

/**
 * 锁板映射：boardAddr = groupId，lockNo = cabinetId
 * @returns {{ groupId: number, cabinetId: number, boardAddr: number, lockNo: number } | null}
 */
export function resolveCabinetToHardware(groupId, cabinetId) {
  const gid = Number(groupId);
  const cid = Number(cabinetId);
  if (!Number.isFinite(gid) || gid < 1 || !Number.isFinite(cid) || cid < 1) return null;
  const row = FitLockDB.getCabinetRow(gid, cid);
  if (!row) return null;
  const st = Number(row.status);
  if (st === CABINET_STATUS.FAULT || st === CABINET_STATUS.BLANK) return null;
  return {
    groupId: gid,
    cabinetId: cid,
    boardAddr: gid & 0xff,
    lockNo: cid & 0xff,
  };
}

export function resolveHardwareToCabinet(boardAddr, lockNo) {
  const b = Number(boardAddr);
  const l = Number(lockNo);
  if (!Number.isFinite(b) || b < 1 || !Number.isFinite(l) || l < 1) {
    return { groupId: 0, cabinetId: 0 };
  }
  return { groupId: b, cabinetId: l };
}

export function listOperationalCabinets() {
  const all = FitLockDB.listCabinets({});
  const out = [];
  for (let i = 0; i < all.length; i++) {
    const c = all[i];
    if (!c) continue;
    const st = Number(c.status);
    if (st !== CABINET_STATUS.FAULT && st !== CABINET_STATUS.BLANK) {
      out.push(c);
    }
  }
  return out;
}

/**
 * 释放当前全部已锁定柜格，并返回本次实际释放的柜格快照。
 * 先按 status=LOCKED 筛选，避免影响空闲、占用、故障或空白柜格。
 */
export function releaseAllLockedCabinets() {
  const locked = FitLockDB.listCabinets({ status: CABINET_STATUS.LOCKED });
  const released = [];
  for (let i = 0; i < locked.length; i++) {
    const cabinet = locked[i];
    if (!cabinet) continue;
    FitLockDB.releaseCabinet(cabinet.groupId, cabinet.cabinetId);
    released.push(cabinet);
  }
  return released;
}

export function getLockRule() {
  try {
    const raw = getConfig(CONFIG_KEY_LOCK_RULE, "");
    if (!raw || !String(raw).trim()) return normalizeLockRule();
    return normalizeLockRule(JSON.parse(raw));
  } catch (e) {
    log.error("[FitLockService] getLockRule parse failed", e);
    return normalizeLockRule();
  }
}

export function setLockRule(rule) {
  const cur = getLockRule();
  const incoming = rule && typeof rule === "object" ? rule : {};
  const merged = {
    tempDelay: incoming.tempDelay != null ? incoming.tempDelay : cur.tempDelay,
    timeDelay: {
      enable:
        incoming.timeDelay != null && incoming.timeDelay.enable != null
          ? incoming.timeDelay.enable
          : cur.timeDelay.enable,
      type:
        incoming.timeDelay != null && incoming.timeDelay.type != null
          ? incoming.timeDelay.type
          : cur.timeDelay.type,
      value:
        incoming.timeDelay != null && incoming.timeDelay.value != null
          ? incoming.timeDelay.value
          : cur.timeDelay.value,
    },
  };
  const normalized = normalizeLockRule(merged);
  setConfig(CONFIG_KEY_LOCK_RULE, JSON.stringify(normalized));
  return normalized;
}

export function getOpenModel() {
  try {
    return normalizeOpenModel(getConfig(CONFIG_KEY_OPEN_MODEL, OPEN_MODEL_FACE));
  } catch (e) {
    return OPEN_MODEL_FACE;
  }
}

export function setOpenModel(model) {
  const m = normalizeOpenModel(model);
  setConfig(CONFIG_KEY_OPEN_MODEL, m);
  return m;
}

export function getCabinetStrategy() {
  try {
    const raw = getConfig(CONFIG_KEY_CABINET_STRATEGY, "");
    if (!raw || !String(raw).trim()) return { mode: 0 };
    const parsed = JSON.parse(raw);
    return { mode: normalizeCabinetStrategyMode(parsed) };
  } catch (e) {
    return { mode: 0 };
  }
}

export function setCabinetStrategy(strategy) {
  const mode = normalizeCabinetStrategyMode(strategy);
  setConfig(CONFIG_KEY_CABINET_STRATEGY, JSON.stringify({ mode }));
  return { mode };
}

export function getDoorOpenTimeout() {
  try {
    const raw = getConfig(CONFIG_KEY_DOOR_OPEN_TIMEOUT, "");
    if (!raw || !String(raw).trim()) return { value: normalizeDoorOpenTimeoutSec(null) };
    return { value: normalizeDoorOpenTimeoutSec(JSON.parse(raw)) };
  } catch (e) {
    return { value: normalizeDoorOpenTimeoutSec(null) };
  }
}

export function getDoorOpenTimeoutSec() {
  return getDoorOpenTimeout().value;
}

export function setDoorOpenTimeout(cfg) {
  const cur = getDoorOpenTimeout();
  const incoming = cfg && typeof cfg === "object" ? cfg : {};
  const value = normalizeDoorOpenTimeoutSec(
    incoming.value != null ? incoming.value : cur.value
  );
  const normalized = { value };
  setConfig(CONFIG_KEY_DOOR_OPEN_TIMEOUT, JSON.stringify(normalized));
  return normalized;
}

export function getTempPickupMode() {
  try {
    const raw = getConfig(CONFIG_KEY_TEMP_PICKUP_MODE, "");
    if (!raw || !String(raw).trim()) return { value: TEMP_PICKUP_MODE_RETAIN };
    return { value: normalizeTempPickupModeValue(JSON.parse(raw)) };
  } catch (e) {
    return { value: TEMP_PICKUP_MODE_RETAIN };
  }
}

export function setTempPickupMode(cfg) {
  const value = normalizeTempPickupModeValue(cfg);
  const normalized = { value };
  setConfig(CONFIG_KEY_TEMP_PICKUP_MODE, JSON.stringify(normalized));
  return normalized;
}

export function isCabinetLocked(cabinet) {
  return FitLockDB.isCabinetLocked(cabinet);
}
