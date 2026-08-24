/**
 * 业务侧配置封装：统一走 FitLockService.getConfig / setConfig（供 mqttWorker、NetworkConfigPage 等使用）。
 */

import * as FitLock from "../db/FitLockService.js";

/** SQLite / FitLockService 底层键名（与现有 NetworkConfigPage、networkWorker 一致） */
export const CONFIG_KEYS = {
  NET_TYPE: "net.type",
  NET_DHCP: "net.dhcp",
  NET_SSID: "net.ssid",
  NET_PSK: "net.psk",
  NET_IP: "net.ip",
  NET_MASK: "net.mask",
  NET_GW: "net.gw",
  NET_DNS: "net.dns",
  MQTT_HOST: "mqtt.host",
  MQTT_PORT: "mqtt.port",
  MQTT_USER: "mqtt.user",
  MQTT_PASS: "mqtt.pass",
  MQTT_CLEAN_SESSION: "mqtt.cleanSession",
};

/** FitLock 协议 topic 版本前缀 */
export const FITLOCK_TOPIC_VERSION = "fitlock/v1";
/** MQTT QoS 固定为 1，不开放配置。 */
export const FIXED_MQTT_QOS = 1;
/** MQTT Keep Alive 固定为 60 秒，不对外读写。 */
export const FIXED_MQTT_KEEP_ALIVE = 60;

/**
 * @returns {{
 *   netType: string,
 *   dhcp: boolean,
 *   ssid: string,
 *   psk: string,
 *   ip: string,
 *   mask: string,
 *   gw: string,
 *   dns: string,
 * }}
 */
export function getNetworkConfig() {
  const full = FitLock.loadNetworkSettings();
  return {
    netType: full.netType === "WIFI" ? "WIFI" : "ETH",
    dhcp: !!full.dhcp,
    ssid: full.ssid || "",
    psk: full.psk || "",
    ip: full.ip || "",
    mask: full.mask || "",
    gw: full.gw || "",
    dns: full.dns || "",
  };
}

/**
 * @param {Partial<ReturnType<typeof getNetworkConfig>>} patch
 */
export function setNetworkConfig(patch) {
  if (!patch || typeof patch !== "object") return getNetworkConfig();
  const p = { ...patch };
  if (p.netType !== undefined) p.netType = p.netType === "WIFI" ? "WIFI" : "ETH";
  return FitLock.saveNetworkSettings(p);
}

/**
 * @returns {{
 *   host: string,
 *   port: string,
 *   user: string,
 *   pass: string,
 *   qos: number,
 *   cleanSession: boolean,
 *   keepAlive: number,
 * }}
 */
export function getMqttConfig() {
  const full = FitLock.loadNetworkSettings();
  return {
    host: (full.mqttHost || "").trim(),
    port: String(full.mqttPort || "1883").trim(),
    user: full.mqttUser || "",
    pass: full.mqttPass || "",
    qos: FIXED_MQTT_QOS,
    cleanSession: FitLock.getConfig(CONFIG_KEYS.MQTT_CLEAN_SESSION, "1") !== "0",
    keepAlive: FIXED_MQTT_KEEP_ALIVE,
  };
}

/**
 * @param {Partial<ReturnType<typeof getMqttConfig>>} patch
 */
export function setMqttConfig(patch) {
  if (!patch || typeof patch !== "object") return getMqttConfig();
  if (patch.clientId !== undefined || patch.qos !== undefined ) {
    throw new Error("mqtt.clientId和mqtt.qos不允许修改");
  }
  const out = {};
  if (patch.host !== undefined) out.mqttHost = patch.host;
  if (patch.port !== undefined) out.mqttPort = String(patch.port);
  if (patch.user !== undefined) out.mqttUser = patch.user;
  if (patch.pass !== undefined) out.mqttPass = patch.pass;
  FitLock.saveNetworkSettings(out);
  if (patch.cleanSession !== undefined) FitLock.setConfig(CONFIG_KEYS.MQTT_CLEAN_SESSION, patch.cleanSession ? "1" : "0");
  return getMqttConfig();
}

/**
 * dxMqttClient 常用的 tcp://host:port 地址串。
 * @returns {string}  host 为空时返回 ""
 */
export function getMqttBrokerUrl() {
  const c = getMqttConfig();
  if (!c.host) return "";
  return `tcp://${c.host}:${c.port || "1883"}`;
}

/**
 * 设备订阅下行指令的 topic 过滤串（含多级 #）。
 * @param {string} deviceId 一般为设备 SN，与协议 {#device_sn}/{#uuid} 对齐由上层传入
 */
export function buildCmdSubscribePattern(deviceId) {
  const id = String(deviceId || "").trim();
  if (!id) return "";
  return `${FITLOCK_TOPIC_VERSION}/cmd/${id}/#`;
}

export default {
  CONFIG_KEYS,
  FITLOCK_TOPIC_VERSION,
  FIXED_MQTT_QOS,
  FIXED_MQTT_KEEP_ALIVE,
  getNetworkConfig,
  setNetworkConfig,
  getMqttConfig,
  setMqttConfig,
  getMqttBrokerUrl,
  buildCmdSubscribePattern,
};
