/**
 * doorOpenTimeout：柜门打开后未关超时（秒），默认/最小 30。
 */

export const CONFIG_KEY_DOOR_OPEN_TIMEOUT = "fitlock.doorOpenTimeout";

export const DEFAULT_DOOR_OPEN_TIMEOUT_SEC = 30;
export const MIN_DOOR_OPEN_TIMEOUT_SEC = 30;

/**
 * @param {number|{ value?: * }} [raw]
 * @returns {number} 秒
 */
export function normalizeDoorOpenTimeoutSec(raw) {
  let v;
  if (raw != null && typeof raw === "object" && !Array.isArray(raw)) {
    v = Number(raw.value);
  } else {
    v = Number(raw);
  }
  if (!Number.isFinite(v)) v = DEFAULT_DOOR_OPEN_TIMEOUT_SEC;
  v = Math.floor(v);
  if (v < MIN_DOOR_OPEN_TIMEOUT_SEC) v = MIN_DOOR_OPEN_TIMEOUT_SEC;
  if (v > 86400) v = 86400;
  return v;
}
