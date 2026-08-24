/**
 * FitLock 下行 MQTT：解析 cmd topic 与 JSON 信封（serialNo / uuid / time；data 可省略；sign 本期不校验）。
 * 返回 env 供 mqttWorker 调用 dispatch；本模块不写库、不发 reply。
 */

import log from "../mylogger.js";
import ConfigService from "../lock/ConfigService.js";
import { mqttPayloadToString } from "../utils.js";

const CMD_PREFIX = `${ConfigService.FITLOCK_TOPIC_VERSION}/cmd/`;

function validateEnvelope(env) {
  if (!env || typeof env !== "object") {
    return { ok: false, reason: "body_not_object" };
  }
  if (env.serialNo == null || String(env.serialNo).trim() === "") {
    return { ok: false, reason: "missing_serialNo" };
  }
  if (env.uuid == null || String(env.uuid).trim() === "") {
    return { ok: false, reason: "missing_uuid" };
  }
  if (env.time == null || env.time === "") {
    return { ok: false, reason: "missing_time" };
  }
  // `data` 可省略：如 user/clear、cabinet/clear 等
  return { ok: true };
}

/**
 * @param {string} topic
 * @param {string|ArrayBuffer|Uint8Array} payloadRaw
 * @param {() => string} getDeviceId
 * @returns {{ kind: string, cmdTail?: string, reason?: string }}
 */
export function routeIncomingMqtt(topic, payloadRaw, getDeviceId) {
  const deviceId = String(getDeviceId() || "").trim();

  if (!topic || typeof topic !== "string") {
    log.info("[fitlockRouter] skip: empty topic");
    return { kind: "skip", reason: "empty_topic" };
  }

  if (!topic.startsWith(CMD_PREFIX)) {
    log.info("[fitlockRouter] non-cmd topic (ignored by router)", topic);
    return { kind: "skip", reason: "not_fitlock_cmd" };
  }

  const rest = topic.slice(CMD_PREFIX.length);
  const segments = rest.split("/").filter((s) => s.length > 0);
  if (segments.length < 2) {
    log.info("[fitlockRouter] cmd topic too short", topic);
    return { kind: "bad_topic", reason: "short_segments" };
  }

  const topicDeviceId = segments[0];
  const cmdTail = segments.slice(1).join("/");

  if (deviceId && topicDeviceId !== deviceId) {
    log.info("[fitlockRouter] topic deviceId != local SN", topicDeviceId, deviceId, topic);
  }

  const text = mqttPayloadToString(payloadRaw);
  let env = null;
  try {
    env = JSON.parse(text);
  } catch (e) {
    log.error("[fitlockRouter] JSON parse failed", topic, String(e && e.message ? e.message : e));
    return { kind: "bad_json", cmdTail };
  }

  const v = validateEnvelope(env);
  if (!v.ok) {
    log.info("[fitlockRouter] invalid envelope", v.reason, "topic=", topic);
    return { kind: "bad_envelope", cmdTail, reason: v.reason };
  }

  const bodyUuid = String(env.uuid || "").trim();
  if (deviceId && bodyUuid && bodyUuid !== deviceId) {
    log.info("[fitlockRouter] body uuid != local SN", bodyUuid, deviceId);
    return { kind: "uuid_mismatch", cmdTail, reason: "uuid_mismatch", env };
  }

  log.info("[fitlockRouter] cmd ok", cmdTail, "serialNo=", env.serialNo);
  return { kind: "ok", cmdTail, env };
}
