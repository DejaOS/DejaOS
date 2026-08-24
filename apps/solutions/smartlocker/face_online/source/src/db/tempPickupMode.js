/**
 * tempPickupMode：临时柜是否支持「临时取」（仅开柜、不释放）。
 * value=1（默认）支持；value=0 时已有占用仅询问是否取物，确认后释放并开柜。
 */

export const CONFIG_KEY_TEMP_PICKUP_MODE = "fitlock.tempPickupMode";

export const TEMP_PICKUP_MODE_RETAIN = 1;
export const TEMP_PICKUP_MODE_RELEASE_ONLY = 0;

/**
 * @param {number|{ value?: * }} [raw]
 * @returns {0|1}
 */
export function normalizeTempPickupModeValue(raw) {
  let v;
  if (raw != null && typeof raw === "object" && !Array.isArray(raw)) {
    v = Number(raw.value);
  } else {
    v = Number(raw);
  }
  if (v === 0) return TEMP_PICKUP_MODE_RELEASE_ONLY;
  return TEMP_PICKUP_MODE_RETAIN;
}

export function isTempRetainPickupEnabled(raw) {
  return normalizeTempPickupModeValue(raw) !== TEMP_PICKUP_MODE_RELEASE_ONLY;
}
