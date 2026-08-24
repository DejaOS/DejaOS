/**
 * MQTT Worker：连接参数来自 ConfigService；
 * 订阅 fitlock/v1/cmd/{deviceId}/#，校验后 dispatch 指令；
 * 订阅 fitlock/v1/event/{deviceId}/access_reply、faceSync_reply、alarm_reply；出队仅在收到业务应答后删本地队列。
 */

import std from "../../dxmodules/dxStd.js";
import log from "../mylogger.js";
import bus from "../../dxmodules/dxEventBus.js";
import dxMap from "../../dxmodules/dxMap.js";
import dxNetwork from "../../dxmodules/dxNetwork.js";
import mqtt from "../../dxmodules/dxMqttClient.js";
import commonUtils from "../../dxmodules/dxCommonUtils.js";

import ConfigService from "../lock/ConfigService.js";
import {
  ACCESS_EVENT_TYPE,
  ALARM_EVENT_TYPE,
  BUS,
  FITLOCK_MQTT_APP_VERSION,
  FITLOCK_MQTT_MODEL,
  isAlarmPendingEventId,
  isFaceSyncPendingEventId,
  PENDING_EVENT_ID_PREFIX_ALARM,
  PENDING_EVENT_ID_PREFIX_FACE_SYNC,
} from "../constants.js";
import { routeIncomingMqtt } from "./fitlockMqttRouter.js";
import { dispatchFitlockCmd, publishFitlockCmdError } from "./fitlockMqttCmdHandlers.js";
import FitLockDB from "../db/FitLockDB.js";
import { getDeviceSn, mqttPayloadToString } from "../utils.js";

const MQTT_MAP_TOPIC = "MQTT";
const mqttMap = dxMap.get(MQTT_MAP_TOPIC);
const MQTT_TOPIC_VERSION = ConfigService.FITLOCK_TOPIC_VERSION || "fitlock/v1";

function eventPublishTopicForEventId(eventId) {
  if (isFaceSyncPendingEventId(eventId)) {
    return `${MQTT_TOPIC_VERSION}/event/faceSync`;
  }
  if (isAlarmPendingEventId(eventId)) {
    return `${MQTT_TOPIC_VERSION}/event/alarm`;
  }
  return `${MQTT_TOPIC_VERSION}/event/access`;
}

let shouldReconnect = false;
let flushingPendingEvents = false;
let pendingEventsChanged = false;
let lastPendingPublishAt = 0;

/** 库内 extra 存 TEXT；上行 event/access 时解析为 JSON 对象 */
function extraForMqttPayload(extraRaw) {
  if (extraRaw == null || extraRaw === "") return undefined;
  if (typeof extraRaw === "object") return extraRaw;
  const s = String(extraRaw).trim();
  if (!s) return undefined;
  if (s.charAt(0) === "{") {
    try {
      return JSON.parse(s);
    } catch (e) {
      return undefined;
    }
  }
  return undefined;
}

function removeCaptureForPendingRow(row) {
  if (!row || !row.payload) return;
  let item = null;
  try {
    item = JSON.parse(String(row.payload));
  } catch (e) {
    log.error("[mqttWorker] cleanup capture: bad pending payload", row.id, e);
    return;
  }
  if (!item || Number(item.type) !== ACCESS_EVENT_TYPE.OPEN_REQUEST) return;
  const picPath = String(item.picPath || "").trim();
  if (!picPath) return;
  try {
    const rc = std.remove(picPath);
    if (rc === 0) {
      log.info("[mqttWorker] access capture removed", picPath);
    } else {
      log.error("[mqttWorker] access capture remove failed", picPath, rc);
    }
  } catch (e) {
    log.error("[mqttWorker] access capture remove failed", picPath, e);
  }
}

function buildPendingItemForPublish(item, topic) {
  const outbound = { ...item };
  const picPath = String(outbound.picPath || outbound.pic_path || "").trim();
  delete outbound.picPath;
  delete outbound.pic_path;

  if (
    topic === `${MQTT_TOPIC_VERSION}/event/access` &&
    Number(outbound.type) === ACCESS_EVENT_TYPE.OPEN_REQUEST &&
    picPath
  ) {
    const captureImage = commonUtils.fs.fileToBase64(picPath);
    if (!captureImage) {
      throw new Error(`capture image is empty: ${picPath}`);
    }
    outbound.captureImage = captureImage;
  }
  return outbound;
}

function pendingEventPayloadForLog(envelope) {
  const logEnvelope = { ...envelope };
  const sourceData = Array.isArray(envelope.data) ? envelope.data : [];
  logEnvelope.data = sourceData.map((item) => {
    if (!item || typeof item !== "object") return item;
    const logItem = { ...item };
    if (typeof logItem.captureImage === "string" && logItem.captureImage) {
      logItem.captureImage = `[base64 length=${logItem.captureImage.length}]`;
    }
    return logItem;
  });
  return JSON.stringify(logEnvelope);
}

/**
 * 处理平台下行 `event/{uuid}/access_reply`、`faceSync_reply` 或 `alarm_reply`：按 serialNo 删除 pending_mqtt_event。
 * @returns {boolean} 为事件应答 topic 则 true，上层应跳过后续 cmd 路由
 */
function handleEventReplyTopic(topic, payloadRaw) {
  const deviceId = String(getDeviceId() || "").trim();
  if (!deviceId || deviceId === "unknown") return false;
  const accessSuffix = `/event/${deviceId}/access_reply`;
  const faceSuffix = `/event/${deviceId}/faceSync_reply`;
  const alarmSuffix = `/event/${deviceId}/alarm_reply`;
  let replyKind = "";
  if (topic && typeof topic === "string" && topic.endsWith(alarmSuffix)) {
    replyKind = "alarm_reply";
  } else if (topic && typeof topic === "string" && topic.endsWith(faceSuffix)) {
    replyKind = "faceSync_reply";
  } else if (topic && typeof topic === "string" && topic.endsWith(accessSuffix)) {
    replyKind = "access_reply";
  } else {
    return false;
  }

  let env = null;
  try {
    env = JSON.parse(mqttPayloadToString(payloadRaw));
  } catch (e) {
    log.error("[mqttWorker] event reply JSON parse failed", replyKind, e);
    return true;
  }
  if (!env || typeof env !== "object") return true;

  const bodyUuid = String(env.uuid || "").trim();
  if (bodyUuid && bodyUuid !== deviceId) {
    log.info("[mqttWorker] event reply uuid mismatch, ignore", replyKind, bodyUuid, deviceId);
    return true;
  }

  const serialNo = env.serialNo != null ? String(env.serialNo).trim() : "";
  if (!serialNo) {
    log.info("[mqttWorker] event reply missing serialNo", replyKind);
    return true;
  }
  const rowId = parseInt(serialNo, 10);
  if (!Number.isFinite(rowId) || rowId <= 0) {
    log.info("[mqttWorker] event reply invalid serialNo", replyKind, serialNo);
    return true;
  }

  const code = env.code != null ? String(env.code) : "";
  if (code && code !== "000000") {
    log.info("[mqttWorker] event reply non-success code, keep pending row", replyKind, rowId, code, env.message || "");
    return true;
  }

  try {
    let pendingRow = null;
    if (replyKind === "access_reply") {
      pendingRow = FitLockDB.getPendingMqttEvent(rowId);
    }
    FitLockDB.deletePendingMqttEvents([rowId]);
    log.info("[mqttWorker] event reply ok, removed pending id=", replyKind, rowId);
    if (pendingRow) removeCaptureForPendingRow(pendingRow);
  } catch (e) {
    log.error("[mqttWorker] event reply delete pending failed", replyKind, rowId, e);
  }
  return true;
}

function getDeviceId() {
  return getDeviceSn("unknown");
}

function getClientId() {
  return getDeviceId();
}

function buildOfflineWill() {
  // fitlock mqtt 协议文档 §2.7 遗嘱：fitlock/v1/event/offline
  return {
    topic: `${ConfigService.FITLOCK_TOPIC_VERSION || "fitlock/v1"}/event/offline`,
    payload: JSON.stringify({
      serialNo: std.genRandomStr(10),
      uuid: getDeviceId(),
      time: Math.floor(Date.now() / 1000),
      sign: "",
    }),
  };
}

function connectBroker() {
  try {
    if (!dxNetwork || !dxNetwork.isConnected || !dxNetwork.isConnected()) {
      return;
    }
    log.info("[mqttWorker] connectBroker......");
    const url = ConfigService.getMqttBrokerUrl();
    if (!url) {
      log.info("[mqttWorker] 未配置 MQTT Broker，跳过连接");
      return;
    }

    const cfg = ConfigService.getMqttConfig();
    const will = buildOfflineWill();
    log.info("[mqttWorker] connect try", "clientId=", getClientId(), "keepAlive=", cfg.keepAlive, "isConnected=", mqtt.isConnected && mqtt.isConnected());
    mqtt.connect({
      username: cfg.user || undefined,
      password: cfg.pass || undefined,
      will: {
        topic: will.topic,
        payload: will.payload,
        qos: cfg.qos,
        retained: true,
      },
      cleanSession: cfg.cleanSession,
      keepAlive: cfg.keepAlive,
    });
    log.info("[mqttWorker] connect done", "isConnected=", mqtt.isConnected && mqtt.isConnected());
  } catch (e) {
    log.error("[mqttWorker] connectBroker failed", e);
  }
}

function publishConnectEvent() {
  const topic = `${ConfigService.FITLOCK_TOPIC_VERSION}/event/connect`;
  const uuid = getDeviceId();
  let ip = "";
  try {
    const p = dxNetwork.getNetParam && dxNetwork.getNetParam();
    if (p && p.ip) ip = String(p.ip);
  } catch (e) { }
  const payload = JSON.stringify({
    serialNo: std.genRandomStr(10),
    uuid,
    time: Math.floor(Date.now() / 1000),
    sign: "",
    data: {
      model: FITLOCK_MQTT_MODEL,
      appVersion: FITLOCK_MQTT_APP_VERSION,
      ip,
    },
  });
  try {
    bus.fire(BUS.MQTT_PUBLISH, { topic, payload });
    log.info("[mqttWorker] publish connect", topic);
  } catch (e) {
    log.error("[mqttWorker] publish connect failed", e);
  }
}

function subscribeTopics() {
  const deviceId = getDeviceId();
  const pattern = ConfigService.buildCmdSubscribePattern(deviceId);
  if (!pattern) {
    log.error("[mqttWorker] 无法生成订阅 topic（deviceId 为空）");
    return;
  }
  const cfg = ConfigService.getMqttConfig();
  try {
    mqtt.subscribe(pattern, { qos: cfg.qos });
    log.info("[mqttWorker] subscribed", pattern);
  } catch (e) {
    log.error("[mqttWorker] subscribe failed", e);
  }
}

/** 订阅平台对 event/access、event/faceSync、event/alarm 的业务应答 */
function subscribeEventReplyTopics() {
  const deviceId = String(getDeviceId() || "").trim();
  if (!deviceId || deviceId === "unknown") {
    log.error("[mqttWorker] skip event reply subscribe: invalid deviceId");
    return;
  }
  const cfg = ConfigService.getMqttConfig();
  const topics = [
    `${MQTT_TOPIC_VERSION}/event/${deviceId}/access_reply`,
    `${MQTT_TOPIC_VERSION}/event/${deviceId}/faceSync_reply`,
    `${MQTT_TOPIC_VERSION}/event/${deviceId}/alarm_reply`,
  ];
  for (let i = 0; i < topics.length; i++) {
    try {
      mqtt.subscribe(topics[i], { qos: cfg.qos });
      log.info("[mqttWorker] subscribed", topics[i]);
    } catch (e) {
      log.error("[mqttWorker] subscribe event reply failed", topics[i], e);
    }
  }
}

function publishPendingMqttEventsOnce() {
  if (flushingPendingEvents) return;
  if (!(mqtt.getNative && mqtt.getNative() && mqtt.isConnected && mqtt.isConnected())) return;

  pendingEventsChanged = false;
  lastPendingPublishAt = Date.now();
  flushingPendingEvents = true;
  try {
    const rows = FitLockDB.peekPendingMqttEvents(10);
    if (!rows || rows.length === 0) return;

    let queued = 0;
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      if (!r) continue;
      const rowId = Number(r.id) || 0;
      if (!rowId) continue;

      let item = null;
      try {
        item = JSON.parse(String(r.payload || "{}"));
      } catch (e) {
        log.error("[mqttWorker] bad pending payload", r.id, e);
        continue;
      }
      if (!item || typeof item !== "object") continue;
      const eventId = String(r.event_id || item.eventId || "").trim();
      const topic = eventPublishTopicForEventId(eventId);
      let outboundItem = null;
      try {
        outboundItem = buildPendingItemForPublish(item, topic);
      } catch (e) {
        log.error("[mqttWorker] prepare pending event failed", rowId, e);
        continue;
      }
      const data = [outboundItem];

      const envelope = {
        serialNo: String(rowId),
        uuid: getDeviceId(),
        time: Math.floor(Date.now() / 1000),
        sign: "",
        data,
      };
      const payload = JSON.stringify(envelope);

      log.info("[mqttWorker] publish event", topic, pendingEventPayloadForLog(envelope));
      mqtt.publish(topic, payload, { qos: ConfigService.FIXED_MQTT_QOS });
      queued += 1;
    }
    if (queued > 0) {
      log.info("[mqttWorker] queued pending event publishes", queued);
    }
  } catch (e) {
    log.error("[mqttWorker] publish pending events failed", e);
  } finally {
    flushingPendingEvents = false;
  }
}

function run() {
  const url = ConfigService.getMqttBrokerUrl();
  if (!url) {
    log.info("[mqttWorker] MQTT Broker 未配置，run() 跳过");
    return;
  }

  const clientId = getClientId();
  log.info("[mqttWorker] init", url, "clientId=", clientId);

  mqtt.init(url, clientId);

  mqtt.setCallbacks({
    onMessage: (topic, payload, qos, retained) => {
      try {
        log.info("[mqttWorker] onMessage", topic,payload);
        if (handleEventReplyTopic(topic, payload)) {
          return;
        }
        const routed = routeIncomingMqtt(topic, payload, getDeviceId);
        if (routed && routed.kind === "uuid_mismatch" && routed.env && routed.cmdTail) {
          const localSn = getDeviceId();
          publishFitlockCmdError(
            routed.cmdTail,
            { serialNo: routed.env.serialNo, uuid: localSn },
            `uuid 与设备 SN 不一致: ${String(routed.env.uuid || "")} != ${localSn}`
          );
          return;
        }
        if (routed && routed.kind === "ok" && routed.env && routed.cmdTail) {
          dispatchFitlockCmd(routed.cmdTail, routed.env);
        }
      } catch (e) {
        log.error("[mqttWorker] onMessage fire failed", e);
      }
    },
    onDelivery: (token) => {
      //log.info("[mqttWorker] mqtt publish delivery token=", token);
    },
    onConnectionLost: (cause) => {
      log.error("[mqttWorker] connection lost:", cause);
      mqttMap.put("MQTT_STATUS", "disconnected");
      try {
        bus.fire(BUS.MQTT_CONNECTED, { connected: false });
      } catch (e) { }
    },
    onConnectSuccess: () => {
      log.info("[mqttWorker] broker connected");
      mqttMap.put("MQTT_STATUS", "connected");
      mqttMap.put("MQTT_CLIENT_ID", getClientId());
      try {
        bus.fire(BUS.MQTT_CONNECTED, { connected: true });
      } catch (e) { }
      subscribeTopics();
      subscribeEventReplyTopics();
      publishConnectEvent();
      publishPendingMqttEventsOnce();
    },
  });

  connectBroker();
}

function resetClient() {
  try {
    mqtt.disconnect();
  } catch (e) { }
  mqttMap.put("MQTT_STATUS", "disconnected");
  try {
    bus.fire(BUS.MQTT_CONNECTED, { connected: false });
  } catch (e2) { }
  try {
    mqtt.deinit();
  } catch (e) { }
}

function mqttLoop() {
  std.setInterval(() => {
    try {
      if (mqtt.getNative && mqtt.getNative()) {
        mqtt.loop();
      }
    } catch (e) {
      log.error("[mqttWorker] loop error", e);
    }
  }, 50);
}

function connectPoll() {
  std.setInterval(() => {
    try {
      if (shouldReconnect) {
        log.info("[mqttWorker] reconnect scheduled");
        shouldReconnect = false;
        resetClient();
      }
      const url = ConfigService.getMqttBrokerUrl();
      if (!url) return;
      if (!mqtt.getNative || !mqtt.getNative()) {
        run();
        return;
      }
      if (mqtt.getNative && mqtt.getNative() && !mqtt.isConnected()) {
        connectBroker();
      }
    } catch (e) {
      log.error("[mqttWorker] connectPoll error", e);
    }
  }, 5000);
}

function bindBus() {
  bus.on(BUS.NET_STATUS, (data) => {
    if (!data || !data.connected) {
      mqttMap.put("MQTT_STATUS", "disconnected");
      try {
        mqtt.disconnect();
      } catch (e) { }
      try {
        bus.fire(BUS.MQTT_CONNECTED, { connected: false });
      } catch (e2) { }
      return;
    }
  });

  bus.on(BUS.MQTT_REINIT, () => {
    log.info("[mqttWorker] mqtt reinit");
    shouldReconnect = true;
  });

  bus.on(BUS.MQTT_PUBLISH, (data) => {
    const topic = data && data.topic;
    const payload = data && data.payload;
    if (!topic) return;
    if (mqtt.getNative && mqtt.isConnected && mqtt.isConnected()) {
      mqtt.publish(
        topic,
        typeof payload === "string" ? payload : JSON.stringify(payload),
        { qos: ConfigService.FIXED_MQTT_QOS }
      );
      log.info("[mqttWorker] publish", topic);
    }
  });

  bus.on(BUS.MQTT_ACCESS_EVENT_APPEND, (evt) => {
    try {
      if (!evt || typeof evt !== "object") return;
      const payload =
        evt.payload && typeof evt.payload === "object"
          ? evt.payload
          : {
              eventId: String(evt.eventId || evt.event_id || `${getDeviceId()}-${Date.now()}`),
              userId: String(evt.userId || evt.user_id || "").trim(),
              groupId: evt.groupId != null ? Number(evt.groupId) : evt.group_id != null ? Number(evt.group_id) : undefined,
              cabinetId:
                evt.cabinetId != null ? Number(evt.cabinetId) : evt.cabinet_id != null ? Number(evt.cabinet_id) : undefined,
              timestamp: Number(evt.timestamp) || Math.floor(Date.now() / 1000),
              type: Number(evt.type) || 0,
              picPath: String(evt.picPath || evt.pic_path || "").trim(),
              extra: evt.extra,
            };
      const eventType = Number(payload.type) || 0;
      if (
        eventType !== ACCESS_EVENT_TYPE.OPEN_REQUEST &&
        eventType !== ACCESS_EVENT_TYPE.TEMP_OCCUPY &&
        eventType !== ACCESS_EVENT_TYPE.TEMP_RELEASE &&
        eventType !== ACCESS_EVENT_TYPE.CABINET_LOCKED
      ) {
        log.info("[mqttWorker] skip access append: invalid type", eventType);
        return;
      }
      if (!payload.userId && eventType !== ACCESS_EVENT_TYPE.CABINET_LOCKED) {
        log.info("[mqttWorker] skip access append: missing userId");
        return;
      }
      if (!Number.isFinite(payload.groupId) || !Number.isFinite(payload.cabinetId)) {
        log.info("[mqttWorker] skip access append: missing groupId/cabinetId");
        return;
      }
      const picPath = String(payload.picPath || payload.pic_path || "").trim();
      delete payload.pic_path;
      if (picPath) payload.picPath = picPath;
      else delete payload.picPath;
      FitLockDB.appendPendingMqttEvent({
        event_id: payload.eventId,
        payload,
        created_at: Date.now(),
      });
      pendingEventsChanged = true;
    } catch (e) {
      log.error("[mqttWorker] append access event failed", e);
    }
  });

  bus.on(BUS.MQTT_FACE_SYNC_EVENT_APPEND, (evt) => {
    try {
      if (!evt || typeof evt !== "object") return;
      const raw = evt.payload && typeof evt.payload === "object" ? evt.payload : evt;
      const userId = String(raw.userId || raw.user_id || "").trim();
      if (!userId) {
        log.info("[mqttWorker] skip faceSync append: missing userId");
        return;
      }
      const md5 = String(raw.faceImageMd5 || raw.face_image_md5 || "").trim();
      if (!md5) {
        log.info("[mqttWorker] skip faceSync append: missing faceImageMd5");
        return;
      }
      const payload = {
        eventId: String(
          raw.eventId || raw.event_id || `${PENDING_EVENT_ID_PREFIX_FACE_SYNC}${userId}_${Date.now()}`
        ),
        userId,
        timestamp: Number(raw.timestamp) || Math.floor(Date.now() / 1000),
        faceImageMd5: md5,
        code: String(raw.code != null ? raw.code : ""),
      };
      const url = String(raw.faceImageUrl || raw.face_image_url || "").trim();
      if (url) payload.faceImageUrl = url;
      const msg = raw.message != null ? String(raw.message) : "";
      if (msg) payload.message = msg;

      FitLockDB.appendPendingMqttEvent({
        event_id: payload.eventId,
        payload,
        created_at: Date.now(),
      });
      pendingEventsChanged = true;
    } catch (e) {
      log.error("[mqttWorker] append faceSync event failed", e);
    }
  });

  bus.on(BUS.MQTT_ALARM_EVENT_APPEND, (evt) => {
    try {
      if (!evt || typeof evt !== "object") return;
      const raw = evt.payload && typeof evt.payload === "object" ? evt.payload : evt;
      const userId = String(raw.userId || raw.user_id || "").trim();
      const type = Number(raw.type);
      const isAdminOperation =
        type === ALARM_EVENT_TYPE.OPEN_SPECIFIC_CABINET ||
        type === ALARM_EVENT_TYPE.OPEN_ALL_CABINETS ||
        type === ALARM_EVENT_TYPE.RELEASE_LOCKED_CABINETS;
      const isDoorAlarm =
        type === ALARM_EVENT_TYPE.DOOR_OPEN ||
        type === ALARM_EVENT_TYPE.DOOR_CLOSE ||
        type === ALARM_EVENT_TYPE.DOOR_OPEN_TIMEOUT;
      if (
        !isAdminOperation &&
        !isDoorAlarm
      ) {
        log.info("[mqttWorker] skip alarm append: invalid type", type);
        return;
      }
      if (isAdminOperation && !userId) {
        log.info("[mqttWorker] skip alarm append: missing userId");
        return;
      }

      const payload = {
        eventId: String(
          raw.eventId || raw.event_id || `${PENDING_EVENT_ID_PREFIX_ALARM}${Date.now()}`
        ),
        timestamp: Number(raw.timestamp) || Math.floor(Date.now() / 1000),
        type,
      };
      if (isAdminOperation) payload.userId = userId;

      if (type === ALARM_EVENT_TYPE.OPEN_SPECIFIC_CABINET || isDoorAlarm) {
        const groupId = Number(raw.groupId != null ? raw.groupId : raw.group_id);
        const cabinetId = Number(raw.cabinetId != null ? raw.cabinetId : raw.cabinet_id);
        if (!Number.isFinite(groupId) || !Number.isFinite(cabinetId)) {
          log.info("[mqttWorker] skip alarm append: missing groupId/cabinetId");
          return;
        }
        payload.groupId = groupId;
        payload.cabinetId = cabinetId;
        if (isDoorAlarm && raw.extra && typeof raw.extra === "object") {
          payload.extra = raw.extra;
        }
      } else {
        const extra = raw.extra && typeof raw.extra === "object" ? raw.extra : {};
        const cabinetCount = Number(extra.cabinetCount);
        if (!Number.isFinite(cabinetCount) || cabinetCount < 1) {
          log.info("[mqttWorker] skip alarm append: invalid cabinetCount", cabinetCount);
          return;
        }
        payload.extra = { cabinetCount: Math.floor(cabinetCount) };
      }

      FitLockDB.appendPendingMqttEvent({
        event_id: payload.eventId,
        payload,
        created_at: Date.now(),
      });
      pendingEventsChanged = true;
    } catch (e) {
      log.error("[mqttWorker] append alarm event failed", e);
    }
  });

}

function eventUploadLoop() {
  std.setInterval(() => {
    try {
      const periodicRetryDue =
        !lastPendingPublishAt || Date.now() - lastPendingPublishAt >= 30000;
      if (!pendingEventsChanged && !periodicRetryDue) return;
      publishPendingMqttEventsOnce();
    } catch (e) {
      log.error("[mqttWorker] eventUploadLoop error", e);
    }
  }, 5000);
}

function emitLockedCabinetAccessEvents(lockedRows) {
  if (!lockedRows || !lockedRows.length) return;
  const ts = Math.floor(Date.now() / 1000);
  for (let i = 0; i < lockedRows.length; i++) {
    const r = lockedRows[i];
    if (!r) continue;
    const userId = String(r.userId || "").trim();
    const groupId = Number(r.groupId);
    const cabinetId = Number(r.cabinetId);
    if (!Number.isFinite(groupId) || !Number.isFinite(cabinetId)) {
      log.info("[mqttWorker] skip cabinet locked event: missing cabinet key", r);
      continue;
    }
    bus.fire(BUS.MQTT_ACCESS_EVENT_APPEND, {
      payload: {
        eventId: `cabinet-locked-${groupId}-${cabinetId}-${ts}-${i}`,
        userId,
        groupId,
        cabinetId,
        timestamp: ts,
        type: ACCESS_EVENT_TYPE.CABINET_LOCKED,
      },
    });
  }
}

function runCabinetExpirySweep() {
  const locked = FitLockDB.sweepExpiredOccupiedCabinets();
  emitLockedCabinetAccessEvents(locked);
}

function cabinetExpiryLoop() {
  std.setInterval(() => {
    try {
      runCabinetExpirySweep();
    } catch (e) {
      log.error("[mqttWorker] cabinetExpiryLoop error", e);
    }
  }, 5 * 60 * 1000);
}

try {
  bindBus();
  run();
  mqttLoop();
  connectPoll();
  eventUploadLoop();
  try {
    runCabinetExpirySweep();
  } catch (e) {
    log.error("[mqttWorker] initial cabinet expiry sweep failed", e);
  }
  cabinetExpiryLoop();
  log.info("[mqttWorker] started");
} catch (e) {
  log.error("[mqttWorker] init failed", e);
}
