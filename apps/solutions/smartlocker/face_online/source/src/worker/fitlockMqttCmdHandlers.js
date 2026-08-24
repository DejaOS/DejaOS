/**
 * FitLock 下行指令处理（V1.0）
 */

import std from "../../dxmodules/dxStd.js";
import log from "../mylogger.js";
import bus from "../../dxmodules/dxEventBus.js";
import ota from "../../dxmodules/dxOta.js";
import httpclient from "../../dxmodules/dxHttpClient.js";
import ntp from "../../dxmodules/dxNtp.js";
import * as FitLock from "../db/FitLockService.js";
import ConfigService from "../lock/ConfigService.js";
import FitLockDB from "../db/FitLockDB.js";
import { parseUserUpsertRow } from "../db/userValidate.js";
import {
  ACCESS_EVENT_TYPE,
  BUS,
  FITLOCK_CONFIG_RESTORE_PATH,
  FITLOCK_MQTT_APP_VERSION,
  FITLOCK_MQTT_MODEL,
} from "../constants.js";
import { formatDeviceLocalTime, getDeviceSn } from "../utils.js";
import dxOs from "../../dxmodules/dxOs.js";
import { startCabinetOpenSequence } from "../lock/CabinetOpenSequence.js";

const USER_BATCH_MAX = 100;
const CABINET_BATCH_MAX = 100;
const ADMIN_PIN_KEY = "admin.pin";
const DEVICE_ID_FALLBACK = "unknown";
const CONNECTIVITY_APPLY_DELAY_MS = 2000;
const OTA_DOWNLOAD_TEMP_PATH = "/data/fitlock_ota_download.temp";

const CMD_ROOT = `${ConfigService.FITLOCK_TOPIC_VERSION}/cmd`;

function hasNetworkConfigChanged(before, after) {
  const keys = ["netType", "dhcp", "ssid", "psk", "ip", "mask", "gw", "dns"];
  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    if (before[key] !== after[key]) return true;
  }
  return false;
}

function applyConnectivityConfigAfterReply(needNetworkReconnect, needMqttReinit) {
  if (!needNetworkReconnect && !needMqttReinit) return;
  std.setTimeout(() => {
    if (needNetworkReconnect) {
      try {
        bus.fire(BUS.NET_CONNECT_REQUEST);
      } catch (e) {
        log.error("[fitlockCmd] NET_CONNECT_REQUEST fire failed", e);
      }
    }
    if (needMqttReinit) {
      try {
        bus.fire(BUS.MQTT_REINIT);
      } catch (e) {
        log.error("[fitlockCmd] MQTT_REINIT fire failed", e);
      }
    }
  }, CONNECTIVITY_APPLY_DELAY_MS);
}

function wipeDataRootContents() {
  const rc = dxOs.systemBlocked("rm -rf /data/*");
  if (rc !== 0) throw new Error(`wipe_data_failed:${rc}`);
}

function wipeDataRootPreservingConfig() {
  const snapshot = FitLockDB.getAllConfigEntries();
  wipeDataRootContents();
  std.saveFile(
    FITLOCK_CONFIG_RESTORE_PATH,
    JSON.stringify({
      version: 1,
      createdAt: Date.now(),
      config: snapshot,
    }),
    true
  );
  log.info("[fitlockCmd] config restore file saved", "count=", snapshot.length);
}

function rebootAfterControlDelay() {
  try {
    dxOs.asyncReboot(2);
  } catch (e) {
    log.error("[fitlockCmd] control reboot", e);
  }
}

function getSysinfoObject() {
  return {
    sn: getDeviceSn(),
    model: FITLOCK_MQTT_MODEL,
    appVersion: FITLOCK_MQTT_APP_VERSION,
  };
}

function getNetworkObject() {
  const nc = ConfigService.getNetworkConfig();
  return {
    netType: nc.netType,
    dhcp: nc.dhcp,
    ssid: nc.ssid,
    psk: nc.psk,
    ip: nc.ip,
    mask: nc.mask,
    gw: nc.gw,
    dns: nc.dns,
  };
}

function getMqttObject() {
  const mc = ConfigService.getMqttConfig();
  return {
    host: mc.host,
    port: String(mc.port),
    user: mc.user,
    pass: mc.pass,
    clientId: getDeviceSn(DEVICE_ID_FALLBACK),
    qos: ConfigService.FIXED_MQTT_QOS,
    cleanSession: mc.cleanSession,
  };
}

function publishCmdReply(cmdTail, env, code, message, data) {
  const topic = `${CMD_ROOT}/${cmdTail}_reply`;
  const body = {
    serialNo: env.serialNo,
    uuid: String(env.uuid || ""),
    time: Math.floor(Date.now() / 1000),
    sign: "",
    code: String(code || "000000"),
    message: message != null ? String(message) : "",
  };
  if (data !== undefined) body.data = data;
  try {
    bus.fire(BUS.MQTT_PUBLISH, { topic, payload: JSON.stringify(body) });
    log.info("[fitlockCmd] reply", topic, code);
  } catch (e) {
    log.error("[fitlockCmd] publish reply failed", topic, e);
  }
}

export function publishFitlockCmdError(cmdTail, env, message) {
  publishCmdReply(cmdTail, env, "100000", message || "request rejected");
}

function emitUserChanged(detail) {
  try {
    bus.fire(BUS.USER_CHANGED, detail || {});
  } catch (e) {
    log.error("[fitlockCmd] USER_CHANGED fire failed", e);
  }
}

function emitCabinetChanged() {
  try {
    bus.fire(BUS.CABINET_CHANGED, {});
  } catch (e) {}
}

function emitOtaStatus(status, message) {
  try {
    bus.fire(BUS.OTA_STATUS, {
      status: String(status || ""),
      message: String(message || ""),
    });
  } catch (e) {
    log.error("[fitlockCmd] OTA_STATUS fire failed", e);
  }
}

function getOtaFailureDisplayMessage(error) {
  const raw = String(error && error.message ? error.message : error || "");
  if (raw.includes("MD5 verification failed")) {
    return "应用升级失败：升级包校验不通过";
  }
  if (raw.includes("Download failed")) {
    return "应用升级失败：升级包下载失败";
  }
  if (raw.includes("Insufficient disk space")) {
    return "应用升级失败：设备存储空间不足";
  }
  return "应用升级失败，请检查升级地址和升级包";
}

function removeOtaFileIfExists(path) {
  try {
    if (std.exist(path)) std.remove(path);
  } catch (e) {
    log.info("[fitlockCmd] remove ota file failed", path, e);
  }
}

function downloadAndPrepareOta(url, md5) {
  removeOtaFileIfExists(OTA_DOWNLOAD_TEMP_PATH);
  removeOtaFileIfExists(ota.UPGRADE_TARGET);

  let result;
  try {
    result = httpclient.download(url, OTA_DOWNLOAD_TEMP_PATH, 60000);
  } catch (e) {
    removeOtaFileIfExists(OTA_DOWNLOAD_TEMP_PATH);
    throw new Error(
      "Download failed: " + String(e && e.message ? e.message : e)
    );
  }

  log.info("[fitlockCmd] upgrade download result", JSON.stringify(result));
  if (!result || result.code !== 0 || result.status !== 200) {
    removeOtaFileIfExists(OTA_DOWNLOAD_TEMP_PATH);
    const code = result ? result.code : "";
    const status = result ? result.status : "";
    throw new Error(`Download failed: code=${code}, status=${status}`);
  }

  try {
    ota.updateFile(OTA_DOWNLOAD_TEMP_PATH, md5);
  } catch (e) {
    removeOtaFileIfExists(OTA_DOWNLOAD_TEMP_PATH);
    throw e;
  }
}

function emitUserFaceClear() {
  try {
    bus.fire(BUS.USER_FACE_CLEAR, {});
  } catch (e) {
    log.error("[fitlockCmd] USER_FACE_CLEAR fire failed", e);
  }
}

function handleUserList(env) {
  const tail = "user/list";
  try {
    const d = env.data;
    const filter =
      d && typeof d === "object" && !Array.isArray(d) ? d : {};
    const list = FitLockDB.listUsers(filter);
    publishCmdReply(tail, env, "000000", "success", list);
  } catch (e) {
    log.error("[fitlockCmd] user/list", e);
    publishCmdReply(tail, env, "100000", String(e && e.message ? e.message : e));
  }
}

function handleUserUpsert(env) {
  const tail = "user/upsert";
  const d = env.data;
  try {
    if (!Array.isArray(d)) {
      publishCmdReply(tail, env, "100000", "data 须为数组");
      return;
    }
    if (d.length > USER_BATCH_MAX) {
      publishCmdReply(tail, env, "100000", `单次最多 ${USER_BATCH_MAX} 条`);
      return;
    }
    const faceChangeByUser = Object.create(null);
    const faceChangeOrder = [];
    const now = Date.now();
    const seenPhone = Object.create(null);
    for (let i = 0; i < d.length; i++) {
      const parsed = parseUserUpsertRow(d[i]);
      if (!parsed.ok) continue;
      if (parsed.phone) {
        if (seenPhone[parsed.phone]) continue;
        seenPhone[parsed.phone] = true;
      }
      const existing = FitLockDB.getUser(parsed.userId);
      const oldMd5 = existing && existing.face_image_md5 ? String(existing.face_image_md5).trim() : "";
      const faceImageUrl = parsed.hasFace
        ? parsed.face_image_url
        : existing && existing.face_image_url
          ? String(existing.face_image_url).trim()
          : "";
      const faceImageMd5 = parsed.hasFace
        ? parsed.face_image_md5
        : oldMd5;
      const faceEnrolled =
        !parsed.hasFace
          ? Number(existing && existing.face_enrolled)
            ? 1
            : 0
          : faceImageMd5 &&
              oldMd5 &&
              faceImageMd5 === oldMd5 &&
              Number(existing && existing.face_enrolled) === 1
            ? 1
            : 0;
      FitLockDB.replaceUser({
        user_id: parsed.userId,
        name: parsed.hasName
          ? parsed.name
          : existing && existing.name != null
            ? String(existing.name)
            : "",
        face_image_url: faceImageUrl || null,
        face_image_md5: faceImageMd5 || null,
        phone: parsed.hasPhonePin
          ? parsed.phone || null
          : existing && existing.phone
            ? String(existing.phone)
            : null,
        pin: parsed.hasPhonePin
          ? parsed.pin || null
          : existing && existing.pin
            ? String(existing.pin)
            : null,
        role: parsed.hasRole
          ? parsed.role
          : existing
            ? Number(existing.role) === 1 ? 1 : 0
            : 0,
        face_enrolled: faceEnrolled,
        updated_at: now,
      });
      if (parsed.hasFace) {
        if (!faceChangeByUser[parsed.userId]) faceChangeOrder.push(parsed.userId);
        faceChangeByUser[parsed.userId] =
          parsed.face_image_url && parsed.face_image_md5
            ? {
                action: "upsert",
                item: {
                  userId: parsed.userId,
                  face_image_url: parsed.face_image_url,
                  face_image_md5: parsed.face_image_md5,
                },
              }
            : { action: "delete" };
      }
    }
    publishCmdReply(tail, env, "000000", "success");
    const faceDeleteUserIds = [];
    const syncItems = [];
    for (let j = 0; j < faceChangeOrder.length; j++) {
      const userId = faceChangeOrder[j];
      const change = faceChangeByUser[userId];
      if (!change) continue;
      if (change.action === "delete") faceDeleteUserIds.push(userId);
      else if (change.item) syncItems.push(change.item);
    }
    if (faceDeleteUserIds.length) {
      emitUserChanged({ action: "delete", userIds: faceDeleteUserIds });
    }
    if (syncItems.length) emitUserChanged({ action: "upsert", items: syncItems });
  } catch (e) {
    log.error("[fitlockCmd] user/upsert", e);
    publishCmdReply(tail, env, "100000", String(e && e.message ? e.message : e));
  }
}

function handleUserDelete(env) {
  const tail = "user/delete";
  const d = env.data;
  try {
    if (!Array.isArray(d)) {
      publishCmdReply(tail, env, "100000", "data 须为数组");
      return;
    }
    const touched = [];
    for (let i = 0; i < d.length; i++) {
      const uid = d[i] && String(d[i].userId || d[i].user_id || "").trim();
      if (!uid) continue;
      FitLockDB.deleteUser(uid);
      touched.push(uid);
    }
    publishCmdReply(tail, env, "000000", "success");
    if (touched.length) emitUserChanged({ action: "delete", userIds: touched });
  } catch (e) {
    log.error("[fitlockCmd] user/delete", e);
    publishCmdReply(tail, env, "100000", String(e && e.message ? e.message : e));
  }
}

function handleUserClear(env) {
  const tail = "user/clear";
  try {
    const prevIds = FitLockDB.getAllUserIds();
    FitLockDB.clearUsers();
    publishCmdReply(tail, env, "000000", "success");
    emitUserChanged({ action: "clear", userIds: prevIds });
  } catch (e) {
    log.error("[fitlockCmd] user/clear", e);
    publishCmdReply(tail, env, "100000", String(e && e.message ? e.message : e));
  }
}

function handleCabinetList(env) {
  const tail = "cabinet/list";
  try {
    const d = env.data;
    const filter =
      d && typeof d === "object" && !Array.isArray(d) ? d : {};
    const list = FitLockDB.listCabinets(filter);
    publishCmdReply(tail, env, "000000", "success", list);
  } catch (e) {
    log.error("[fitlockCmd] cabinet/list", e);
    publishCmdReply(tail, env, "100000", String(e && e.message ? e.message : e));
  }
}

function handleCabinetUpsert(env) {
  const tail = "cabinet/upsert";
  const d = env.data;
  try {
    if (!Array.isArray(d)) {
      publishCmdReply(tail, env, "100000", "data 须为数组");
      return;
    }
    if (d.length > CABINET_BATCH_MAX) {
      publishCmdReply(tail, env, "100000", `单次最多 ${CABINET_BATCH_MAX} 条`);
      return;
    }
    for (let i = 0; i < d.length; i++) {
      FitLockDB.upsertCabinet(d[i]);
    }
    publishCmdReply(tail, env, "000000", "success");
    emitCabinetChanged();
  } catch (e) {
    log.error("[fitlockCmd] cabinet/upsert", e);
    publishCmdReply(tail, env, "100000", String(e && e.message ? e.message : e));
  }
}

function handleCabinetDelete(env) {
  const tail = "cabinet/delete";
  const d = env.data;
  try {
    if (!Array.isArray(d)) {
      publishCmdReply(tail, env, "100000", "data 须为数组");
      return;
    }
    for (let i = 0; i < d.length; i++) {
      const row = d[i];
      const gid = Number(row && (row.groupId != null ? row.groupId : row.group_id));
      const cid = Number(row && (row.cabinetId != null ? row.cabinetId : row.cabinet_id));
      if (Number.isFinite(gid) && Number.isFinite(cid)) {
        FitLockDB.deleteCabinet(gid, cid);
      }
    }
    publishCmdReply(tail, env, "000000", "success");
    emitCabinetChanged();
  } catch (e) {
    log.error("[fitlockCmd] cabinet/delete", e);
    publishCmdReply(tail, env, "100000", String(e && e.message ? e.message : e));
  }
}

function handleCabinetClear(env) {
  const tail = "cabinet/clear";
  try {
    FitLockDB.clearCabinets();
    publishCmdReply(tail, env, "000000", "success");
    emitCabinetChanged();
  } catch (e) {
    log.error("[fitlockCmd] cabinet/clear", e);
    publishCmdReply(tail, env, "100000", String(e && e.message ? e.message : e));
  }
}

function getConfigSnapshot() {
  return {
    sysinfo: getSysinfoObject(),
    network: getNetworkObject(),
    mqtt: getMqttObject(),
    time: { value: formatDeviceLocalTime() },
    audio: { volume: FitLock.getSystemVolumeLevel() },
    lockRule: FitLock.getLockRule(),
    openModel: { value: FitLock.getOpenModel() },
    cabinetStrategy: FitLock.getCabinetStrategy(),
    doorOpenTimeout: FitLock.getDoorOpenTimeout(),
    tempPickupMode: FitLock.getTempPickupMode(),
  };
}

function handleGetConfig(env) {
  const tail = "getConfig";
  try {
    const data = env.data;
    const snapshot = getConfigSnapshot();
    if (typeof data === "string" && data.trim()) {
      const key = data.trim();
      if (snapshot[key] !== undefined) {
        publishCmdReply(tail, env, "000000", "success", { [key]: snapshot[key] });
        return;
      }
      publishCmdReply(tail, env, "100000", "unsupported config key");
      return;
    }
    publishCmdReply(tail, env, "000000", "success", snapshot);
  } catch (e) {
    log.error("[fitlockCmd] getConfig", e);
    publishCmdReply(tail, env, "100000", String(e && e.message ? e.message : e));
  }
}

function handleSetConfig(env) {
  const tail = "setConfig";
  try {
    const d = env.data;
    if (!d || typeof d !== "object" || Array.isArray(d)) {
      publishCmdReply(tail, env, "100000", "data 须为对象");
      return;
    }

    if (d.sysinfo !== undefined) {
      publishCmdReply(tail, env, "100000", "sysinfo 只读");
      return;
    }
    if (
      d.mqtt != null &&
      typeof d.mqtt === "object" &&
      (d.mqtt.clientId !== undefined || d.mqtt.qos !== undefined )
    ) {
      publishCmdReply(tail, env, "100000", "mqtt.clientId 和 mqtt.qos");
      return;
    }

    if (d.adminPin != null && typeof d.adminPin === "object") {
      const ap = d.adminPin;
      const oldPwd = String(ap.oldPwd || ap.old_pwd || "").trim();
      const newPwd = String(ap.newPwd || ap.new_pwd || "").trim();
      if (!/^\d{6}$/.test(oldPwd) || !/^\d{6}$/.test(newPwd)) {
        publishCmdReply(tail, env, "100000", "adminPin 须为 6 位数字");
        return;
      }
      const current = FitLock.getConfig(ADMIN_PIN_KEY, "000000") || "000000";
      if (oldPwd !== String(current)) {
        publishCmdReply(tail, env, "100000", "旧密码不正确");
        return;
      }
      FitLock.setConfig(ADMIN_PIN_KEY, newPwd);
    }

    if (d.time != null) {
      const ts = String(d.time.value != null ? d.time.value : "").trim();
      if (!ts) {
        publishCmdReply(tail, env, "100000", "time.value 不能为空");
        return;
      }
      try {
        ntp.setTime(ts, true);
      } catch (e) {
        publishCmdReply(tail, env, "100000", String(e && e.message ? e.message : e));
        return;
      }
    }

    let needNetworkReconnect = false;
    let needMqttReinit = false;
    if (d.network != null && typeof d.network === "object") {
      const beforeNetwork = ConfigService.getNetworkConfig();
      ConfigService.setNetworkConfig(d.network);
      const afterNetwork = ConfigService.getNetworkConfig();
      needNetworkReconnect = hasNetworkConfigChanged(beforeNetwork, afterNetwork);
      if (needNetworkReconnect) needMqttReinit = true;
    }
    if (d.mqtt != null && typeof d.mqtt === "object") {
      ConfigService.setMqttConfig(d.mqtt);
      needMqttReinit = true;
    }

    if (d.audio != null && typeof d.audio === "object" && d.audio.volume !== undefined) {
      const n = Number(d.audio.volume);
      if (!Number.isFinite(n) || n < 0 || n > 10 || Math.floor(n) !== n) {
        publishCmdReply(tail, env, "100000", "audio.volume 须为 0-10 整数");
        return;
      }
      FitLock.setSystemVolumeLevel(n);
      FitLock.applyAudioOutputVolume(n);
    }

    if (d.lockRule != null && typeof d.lockRule === "object") {
      const td = d.lockRule.timeDelay;
      if (td !== undefined && (!td || typeof td !== "object" || Array.isArray(td))) {
        publishCmdReply(tail, env, "100000", "lockRule.timeDelay 须为对象");
        return;
      }
      if (td && td.value !== undefined) {
        const currentType = FitLock.getLockRule().timeDelay.type;
        const effectiveType = td.type != null ? td.type : currentType;
        const valueError = FitLock.validateTimeDelayValue(td.value, effectiveType);
        if (valueError) {
          publishCmdReply(tail, env, "100000", valueError);
          return;
        }
      }
      FitLock.setLockRule(d.lockRule);
    }

    let needOpenModelReboot = false;
    if (d.openModel != null && typeof d.openModel === "object") {
      const om = String(d.openModel.value != null ? d.openModel.value : "").trim().toLowerCase();
      if (om !== "face" && om !== "pin") {
        publishCmdReply(tail, env, "100000", "openModel.value 须为 face 或 pin");
        return;
      }
      if (FitLock.getOpenModel() !== om) {
        FitLock.setOpenModel(om);
        needOpenModelReboot = true;
      }
    }

    if (d.cabinetStrategy != null && typeof d.cabinetStrategy === "object") {
      FitLock.setCabinetStrategy(d.cabinetStrategy);
    }

    if (d.doorOpenTimeout != null && typeof d.doorOpenTimeout === "object") {
      const sec = Number(d.doorOpenTimeout.value);
      if (!Number.isFinite(sec) || Math.floor(sec) !== sec) {
        publishCmdReply(tail, env, "100000", "doorOpenTimeout.value 须为整数秒");
        return;
      }
      if (sec < 30) {
        publishCmdReply(tail, env, "100000", "doorOpenTimeout.value 最小为 30");
        return;
      }
      FitLock.setDoorOpenTimeout(d.doorOpenTimeout);
    }

    if (d.tempPickupMode != null && typeof d.tempPickupMode === "object") {
      const v = Number(d.tempPickupMode.value);
      if (v !== 0 && v !== 1) {
        publishCmdReply(tail, env, "100000", "tempPickupMode.value 须为 0 或 1");
        return;
      }
      FitLock.setTempPickupMode(d.tempPickupMode);
    }

    publishCmdReply(tail, env, "000000", "success");
    applyConnectivityConfigAfterReply(needNetworkReconnect, needMqttReinit);
    if (needOpenModelReboot) rebootAfterControlDelay();
  } catch (e) {
    log.error("[fitlockCmd] setConfig", e);
    publishCmdReply(tail, env, "100000", String(e && e.message ? e.message : e));
  }
}

function parseControlExtra(extra) {
  if (extra == null) return {};
  if (typeof extra === "object" && !Array.isArray(extra)) return extra;
  if (typeof extra === "string" && extra.trim()) {
    try {
      const obj = JSON.parse(extra);
      return obj && typeof obj === "object" ? obj : {};
    } catch (e) {
      return {};
    }
  }
  return {};
}

function appendControlReleaseEvents(cabinets, eventPrefix) {
  const now = Date.now();
  const timestamp = Math.floor(now / 1000);
  for (let i = 0; i < cabinets.length; i++) {
    const cabinet = cabinets[i];
    try {
      bus.fire(BUS.MQTT_ACCESS_EVENT_APPEND, {
        eventId: `${eventPrefix}-${cabinet.groupId}-${cabinet.cabinetId}-${now}-${i}`,
        userId: "system",
        groupId: cabinet.groupId,
        cabinetId: cabinet.cabinetId,
        timestamp,
        type: ACCESS_EVENT_TYPE.TEMP_RELEASE,
      });
    } catch (e) {
      log.error("[fitlockCmd] append batch release event failed", cabinet, e);
    }
  }
}

function handleControl(env) {
  const tail = "control";
  try {
    const d = env.data;
    if (!d || typeof d !== "object" || Array.isArray(d)) {
      publishCmdReply(tail, env, "100000", "data 须为对象");
      return;
    }
    const command = Number(d.command);
    const extra = parseControlExtra(d.extra);
    const groupId = Number(extra.groupId != null ? extra.groupId : extra.group_id);
    const cabinetId = Number(extra.cabinetId != null ? extra.cabinetId : extra.cabinet_id);

    if (command === 0) {
      publishCmdReply(tail, env, "000000", "success");
      rebootAfterControlDelay();
      return;
    }

    if (command === 3) {
      emitUserFaceClear();
      wipeDataRootPreservingConfig();
      publishCmdReply(tail, env, "000000", "success");
      rebootAfterControlDelay();
      return;
    }

    if (command === 4) {
      emitUserFaceClear();
      wipeDataRootContents();
      publishCmdReply(tail, env, "000000", "success");
      rebootAfterControlDelay();
      return;
    }

    if (command === 5) {
      const released = FitLock.releaseAllLockedCabinets();
      if (released.length > 0) {
        emitCabinetChanged();
        appendControlReleaseEvents(released, "control-release-locked");
        startCabinetOpenSequence(released, { userId: "remote" });
      }
      publishCmdReply(tail, env, "000000", "success", {
        releasedCount: released.length,
      });
      return;
    }

    if (command === 1 || command === 2) {
      if (!Number.isFinite(groupId) || !Number.isFinite(cabinetId)) {
        publishCmdReply(tail, env, "100000", "extra 须含 groupId 与 cabinetId");
        return;
      }
      bus.fire(BUS.LOCK_CMD, {
        action: "openOneByCabinet",
        groupId,
        cabinetId,
        userId: "remote",
      });
      if (command === 2) {
        FitLockDB.releaseCabinet(groupId, cabinetId);
        emitCabinetChanged();
        bus.fire(BUS.MQTT_ACCESS_EVENT_APPEND, {
          eventId: `control-release-${Date.now()}`,
          userId: "system",
          groupId,
          cabinetId,
          timestamp: Math.floor(Date.now() / 1000),
          type: ACCESS_EVENT_TYPE.TEMP_RELEASE,
        });
      }
      publishCmdReply(tail, env, "000000", "success");
      return;
    }

    publishCmdReply(tail, env, "100000", `暂不支持的 command: ${command}`);
  } catch (e) {
    log.error("[fitlockCmd] control", e);
    publishCmdReply(tail, env, "100000", String(e && e.message ? e.message : e));
  }
}

function handleUpgradeFirmware(env) {
  const tail = "upgradeFirmware";
  try {
    const d = env.data;
    if (!d || typeof d !== "object" || Array.isArray(d)) {
      emitOtaStatus("error", "应用升级失败：升级参数格式错误");
      publishCmdReply(tail, env, "100000", "data 须为对象");
      return;
    }
    const type = Number(d.type);
    if (!Number.isFinite(type) || type !== 0) {
      emitOtaStatus("error", "应用升级失败：不支持的升级类型");
      publishCmdReply(tail, env, "100000", "仅支持 type=0 本机升级");
      return;
    }
    const url = String(d.url || "").trim();
    const md5 = String(d.md5 || "").trim();
    if (!url || !md5) {
      emitOtaStatus("error", "应用升级失败：升级地址或 MD5 为空");
      publishCmdReply(tail, env, "100000", "url 与 md5 必填");
      return;
    }
    emitOtaStatus("progress", "正在下载并校验升级包，请勿断电");
    downloadAndPrepareOta(url, md5);
    emitOtaStatus("success", "升级包校验成功，设备即将重启");
    publishCmdReply(tail, env, "000000", "success");
    std.setTimeout(() => {
      try {
        ota.reboot();
      } catch (e2) {
        log.error("[fitlockCmd] upgrade reboot", e2);
        emitOtaStatus("error", "升级包已下载，但设备重启失败");
      }
    }, 2000);
  } catch (e) {
    log.error("[fitlockCmd] upgradeFirmware", e);
    emitOtaStatus("error", getOtaFailureDisplayMessage(e));
    publishCmdReply(tail, env, "100000", String(e && e.message ? e.message : e));
  }
}

function handleDebugAccessEventAppend(env) {
  const tail = "debug/accessEvent/append";
  try {
    const d = env.data;
    if (!d || typeof d !== "object" || Array.isArray(d)) {
      publishCmdReply(tail, env, "100000", "data 须为对象");
      return;
    }
    const userId = String(d.userId || d.user_id || "").trim();
    const eventType = Number(d.type) || 0;
    const groupId = Number(d.groupId != null ? d.groupId : d.group_id);
    const cabinetId = Number(d.cabinetId != null ? d.cabinetId : d.cabinet_id);
    if (
      eventType !== ACCESS_EVENT_TYPE.TEMP_OCCUPY &&
      eventType !== ACCESS_EVENT_TYPE.TEMP_RELEASE &&
      eventType !== ACCESS_EVENT_TYPE.OPEN_REQUEST &&
      eventType !== ACCESS_EVENT_TYPE.CABINET_LOCKED
    ) {
      publishCmdReply(tail, env, "100000", "仅支持 access type=1、2、3、6");
      return;
    }
    if (
      !userId &&
      eventType !== ACCESS_EVENT_TYPE.CABINET_LOCKED
    ) {
      publishCmdReply(tail, env, "100000", "userId 必填");
      return;
    }
    if (!Number.isFinite(groupId) || !Number.isFinite(cabinetId)) {
      publishCmdReply(tail, env, "100000", "groupId 与 cabinetId 必填");
      return;
    }
    const payload = {
      eventId: String(d.eventId || d.event_id || `${env.uuid || DEVICE_ID_FALLBACK}-${Date.now()}`),
      userId,
      timestamp: Number(d.timestamp) || Math.floor(Date.now() / 1000),
      type: eventType,
    };
    if (Number.isFinite(groupId) && Number.isFinite(cabinetId)) {
      payload.groupId = groupId;
      payload.cabinetId = cabinetId;
    }
    if (d.extra != null) payload.extra = d.extra;
    bus.fire(BUS.MQTT_ACCESS_EVENT_APPEND, { payload });
    publishCmdReply(tail, env, "000000", "success", { eventId: payload.eventId });
  } catch (e) {
    log.error("[fitlockCmd] debug/accessEvent/append", e);
    publishCmdReply(tail, env, "100000", String(e && e.message ? e.message : e));
  }
}

const HANDLERS = {
  "getConfig": handleGetConfig,
  "setConfig": handleSetConfig,
  "control": handleControl,
  "upgradeFirmware": handleUpgradeFirmware,
  "user/list": handleUserList,
  "user/upsert": handleUserUpsert,
  "user/delete": handleUserDelete,
  "user/clear": handleUserClear,
  "cabinet/list": handleCabinetList,
  "cabinet/upsert": handleCabinetUpsert,
  "cabinet/delete": handleCabinetDelete,
  "cabinet/clear": handleCabinetClear,
  "debug/accessEvent/append": handleDebugAccessEventAppend,
};

export function dispatchFitlockCmd(cmdTail, env) {
  if (!cmdTail || !env) return;
  const fn = HANDLERS[cmdTail];
  if (fn) {
    fn(env);
    return;
  }
  log.info("[fitlockCmd] no handler", cmdTail);
}
