/**
 * lockRule：tempDelay（临时柜租期）+ timeDelay（期满后的延时锁定）。
 * 占用时仅写 end_time = start + tempDelay；锁定时刻由 computeLockDeadline 在扫描时计算。
 */

export const CONFIG_KEY_LOCK_RULE = "fitlock.lockRule";

export const LOCK_RULE_TYPE_TIMEOUT = "timeout";
export const LOCK_RULE_TYPE_STATIC = "static";

const DEFAULT_TEMP_DELAY = 12;
const DEFAULT_TIME_DELAY_VALUE = { hour: 24, minute: 0 };

function defaultTimeDelay() {
  return {
    enable: false,
    type: LOCK_RULE_TYPE_TIMEOUT,
    value: { ...DEFAULT_TIME_DELAY_VALUE },
  };
}

function normalizedTimeDelayType(raw) {
  return String(raw || "").trim().toLowerCase() === LOCK_RULE_TYPE_STATIC
    ? LOCK_RULE_TYPE_STATIC
    : LOCK_RULE_TYPE_TIMEOUT;
}

/**
 * @param {*} raw
 * @param {string} type
 * @returns {string|null}
 */
export function validateTimeDelayValue(raw, type) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return "lockRule.timeDelay.value 须为包含 hour、minute 的对象";
  }
  if (raw.hour === undefined || raw.minute === undefined) {
    return "lockRule.timeDelay.value.hour 和 minute 均须提供";
  }
  const hour = Number(raw.hour);
  const minute = Number(raw.minute);
  if (!Number.isFinite(hour) || Math.floor(hour) !== hour) {
    return "lockRule.timeDelay.value.hour 须为整数";
  }
  if (!Number.isFinite(minute) || Math.floor(minute) !== minute || minute < 0 || minute > 59) {
    return "lockRule.timeDelay.value.minute 须为 0-59 的整数";
  }

  if (normalizedTimeDelayType(type) === LOCK_RULE_TYPE_STATIC) {
    if (hour < 0 || hour > 24 || (hour === 24 && minute !== 0)) {
      return "static 模式 hour 须为 0-24，且 hour=24 时 minute 只能为 0";
    }
    return null;
  }

  if (hour < 0 || hour > 720 || (hour === 0 && minute === 0) || (hour === 720 && minute !== 0)) {
    return "timeout 模式须大于 0 分钟且不超过 720 小时";
  }
  return null;
}

/**
 * @param {*} raw
 * @param {string} type
 * @returns {{hour:number, minute:number}}
 */
export function normalizeTimeDelayValue(raw, type) {
  if (validateTimeDelayValue(raw, type)) return { ...DEFAULT_TIME_DELAY_VALUE };
  return {
    hour: Math.floor(Number(raw.hour)),
    minute: Math.floor(Number(raw.minute)),
  };
}

/**
 * @param {object} [raw]
 * @returns {{ tempDelay: number, timeDelay: { enable: boolean, type: string, value: {hour:number, minute:number} } }}
 */
export function normalizeLockRule(raw) {
  if (!raw || typeof raw !== "object") {
    return { tempDelay: DEFAULT_TEMP_DELAY, timeDelay: defaultTimeDelay() };
  }

  let tempDelay = Number(raw.tempDelay);
  if (!Number.isFinite(tempDelay)) tempDelay = DEFAULT_TEMP_DELAY;
  tempDelay = Math.floor(tempDelay);
  if (tempDelay < 1) tempDelay = DEFAULT_TEMP_DELAY;
  if (tempDelay > 720) tempDelay = 720;

  const td = raw.timeDelay && typeof raw.timeDelay === "object" ? raw.timeDelay : {};
  const type = normalizedTimeDelayType(td.type);
  const value = normalizeTimeDelayValue(td.value, type);

  return {
    tempDelay,
    timeDelay: {
      enable: Boolean(td.enable),
      type,
      value,
    },
  };
}

/**
 * 临时柜新占用：写入 cabinet.end_time（仅 tempDelay，不含 timeDelay 宽限）。
 * @param {number} startSec
 * @param {{ tempDelay: number }} [rule]
 */
export function computeTempEndTime(startSec, rule) {
  const start = Number(startSec);
  const r = normalizeLockRule(rule);
  const base = Number.isFinite(start) && start > 0 ? start : Math.floor(Date.now() / 1000);
  return base + r.tempDelay * 3600;
}

/**
 * 以 end_time 为锚点计算最终锁定时刻（lockDeadline）。
 * @param {number} endSec cabinet.end_time
 * @param {{ timeDelay: { enable: boolean, type: string, value: {hour:number, minute:number} } }} [rule]
 */
export function computeLockDeadline(endSec, rule) {
  const end = Number(endSec);
  if (!Number.isFinite(end) || end <= 0) return 0;
  const r = normalizeLockRule(rule);
  if (!r.timeDelay.enable) return end;

  const td = r.timeDelay;
  if (td.type === LOCK_RULE_TYPE_TIMEOUT) {
    return end + (td.value.hour * 60 + td.value.minute) * 60;
  }
  const anchor = new Date(end * 1000);
  if (td.value.hour >= 24) {
    const deadline = new Date(anchor);
    deadline.setHours(0, 0, 0, 0);
    deadline.setDate(deadline.getDate() + 1);
    return Math.floor(deadline.getTime() / 1000);
  }
  const hour = td.value.hour;
  const minute = td.value.minute;
  const deadline = new Date(anchor);
  deadline.setHours(hour, minute, 0, 0);
  if (deadline.getTime() <= anchor.getTime()) {
    deadline.setDate(deadline.getDate() + 1);
  }
  return Math.floor(deadline.getTime() / 1000);
}

/**
 * @param {number} endTimestampSec 名义租期截止（end_time）
 * @param {number} [nowSec]
 * @returns {string} 未到期时返回剩余文案；已到期返回空串
 */
export function formatTempLockerRemainText(endTimestampSec, nowSec) {
  const et = Number(endTimestampSec);
  if (!Number.isFinite(et) || et <= 0) return "";
  const now = nowSec != null ? Number(nowSec) : Math.floor(Date.now() / 1000);
  const sec = et - now;
  if (sec <= 0) return "";
  const hours = Math.floor(sec / 3600);
  const mins = Math.floor((sec % 3600) / 60);
  if (hours > 0 && mins > 0) return `${hours}小时${mins}分钟`;
  if (hours > 0) return `${hours}小时`;
  if (mins > 0) return `${mins}分钟`;
  return "不足1分钟";
}

/**
 * @param {number} endTimestampSec
 * @param {number} [nowSec]
 */
export function isPastNominalEnd(endTimestampSec, nowSec) {
  const et = Number(endTimestampSec);
  if (!Number.isFinite(et) || et <= 0) return false;
  const now = nowSec != null ? Number(nowSec) : Math.floor(Date.now() / 1000);
  return now >= et;
}
