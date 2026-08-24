/**
 * 跨模块小工具（单文件集中，避免重复实现）。
 */
import dxOs from "../dxmodules/dxOs.js";

export function pad2(n) {
  return n < 10 ? "0" + n : "" + n;
}

/** Unix 秒 → `YYYY-MM-DD HH:mm`（临时柜截止时间展示等） */
export function formatLocalDateTime(sec) {
  const d = new Date(Number(sec) * 1000);
  return (
    `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())} ` +
    `${pad2(d.getHours())}:${pad2(d.getMinutes())}`
  );
}

/** 当前本地时间，含秒（getConfig `time` 等） */
export function formatDeviceLocalTime() {
  const d = new Date();
  return (
    `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())} ` +
    `${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`
  );
}

/**
 * @param {string} [fallback] 读 SN 失败或为空时的默认值
 */
export function getDeviceSn(fallback = "") {
  try {
    const s = String(dxOs.getSn() || "").trim();
    return s || fallback;
  } catch (e) {
    return fallback;
  }
}

/** MQTT 下行 payload 转字符串 */
export function mqttPayloadToString(raw) {
  if (typeof raw === "string") return raw;
  return "";
}
