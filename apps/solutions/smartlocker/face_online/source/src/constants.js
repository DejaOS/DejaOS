/**
 * 全局常量：UI、设备数据路径与音效路径、EventBus 事件名（跨页面 / worker）。
 */
import dxDriver from "../dxmodules/dxDriver.js";

export const COLORS = {
  cardBg: 0xffffff,
  pageBgGray: 0xebebeb,
  text: 0x333333,
  textSecondary: 0x757575,
  textMuted: 0x777777,
  cancelLabel: 0x888888,
  primary: 0xffa31f,
};

export const UI_FONT_RATIO = {
  adminTitleBold: 0.044,
  adminCancel: 0.024,
  adminTip: 0.026,
  adminActionBold: 0.032,
  adminLoginMainBtn: 0.03,
};

export const ADMIN_LAYOUT = {
  titleYRatio: 0.018,
  contentShiftRatio: 0.025,
};

export const FITLOCK_MQTT_APP_VERSION = "1.1.4";
export const FITLOCK_MQTT_MODEL = dxDriver.DRIVER.MODEL + "_fitLock_pro";

export const DATA_ROOT = "/data";
export const FITLOCK_DB_PATH = `${DATA_ROOT}/fitlock.db`;
export const FITLOCK_CONFIG_RESTORE_PATH = `${DATA_ROOT}/fitlock_config_restore.json`;
export const FACE_CACHE_DIR = `${DATA_ROOT}/fitlock_faces/`;
export const FACE_CAPTURE_DIR = `${DATA_ROOT}/capture/`;

const USER_WAV_BASE = "/app/code/resource/wav";
export const USER_WAV = {
  WELCOME: `${USER_WAV_BASE}/welcome.wav`,
  NO_GROUP: `${USER_WAV_BASE}/no_group_config.wav`,
  NO_FREE: `${USER_WAV_BASE}/no_free_cabinet.wav`,
  FACE_OK: `${USER_WAV_BASE}/face_recog_success.wav`,
  FACE_FAIL: `${USER_WAV_BASE}/face_recog_fail.wav`,
  PWD_OK: `${USER_WAV_BASE}/pwd_success.wav`,
  PWD_FAIL: `${USER_WAV_BASE}/pwd_fail.wav`,
  STORE: `${USER_WAV_BASE}/store.wav`,
  PICK: `${USER_WAV_BASE}/pick.wav`,
};

export const BUS = {
  NET_STATUS: "NET_STATUS",
  NET_CONNECT_REQUEST: "NET_CONNECT_REQUEST",
  FACE_START: "FACE_START",
  FACE_STOP: "FACE_STOP",
  FACE_RECOGNIZED: "FACE_RECOGNIZED",
  MQTT_CONNECTED: "MQTT_CONNECTED",
  MQTT_REINIT: "MQTT_REINIT",
  MQTT_PUBLISH: "MQTT_PUBLISH",
  LOCK_CMD: "lock/cmd",
  MQTT_ACCESS_EVENT_APPEND: "MQTT_ACCESS_EVENT_APPEND",
  MQTT_FACE_SYNC_EVENT_APPEND: "MQTT_FACE_SYNC_EVENT_APPEND",
  MQTT_ALARM_EVENT_APPEND: "MQTT_ALARM_EVENT_APPEND",
  USER_CHANGED: "USER_CHANGED",
  OTA_STATUS: "OTA_STATUS",
  /** control cmd=3/4 等全量清业务数据前：清空算法人脸库与 /data/fitlock_faces 缓存 */
  USER_FACE_CLEAR: "USER_FACE_CLEAR",
  CABINET_CHANGED: "CABINET_CHANGED",
};

export const ACCESS_EVENT_TYPE = {
  OPEN_REQUEST: 1,
  TEMP_OCCUPY: 2,
  TEMP_RELEASE: 3,
  CABINET_LOCKED: 6,
};

export const ALARM_EVENT_TYPE = {
  OPEN_SPECIFIC_CABINET: 1,
  OPEN_ALL_CABINETS: 2,
  RELEASE_LOCKED_CABINETS: 3,
  DOOR_OPEN: 4,
  DOOR_CLOSE: 5,
  DOOR_OPEN_TIMEOUT: 6,
};

/** 柜格 status（协议 §4.3） */
export const CABINET_STATUS = {
  IDLE: 1,
  OCCUPIED: 2,
  LOCKED: 3,
  FAULT: 4,
  BLANK: 5,
};

/** 柜格 type（协议 §4.3） */
export const CABINET_TYPE = {
  LONG: 1,
  TEMP: 2,
};

export const FACE_SYNC_CODE_SUCCESS = "000000";

/** pending_mqtt_event：特殊事件用 event_id 前缀与 access 区分发布 topic */
export const PENDING_EVENT_ID_PREFIX_FACE_SYNC = "evt_face_sync_";
export const PENDING_EVENT_ID_PREFIX_ALARM = "evt_alarm_";

export function isFaceSyncPendingEventId(eventId) {
  return String(eventId || "").startsWith(PENDING_EVENT_ID_PREFIX_FACE_SYNC);
}

export function isAlarmPendingEventId(eventId) {
  return String(eventId || "").startsWith(PENDING_EVENT_ID_PREFIX_ALARM);
}

export const FACE_ERROR_CODE = {
  DOWNLOAD_FAILED: "FACE_DOWNLOAD_FAILED",
  DETECT_FAILED: "FACE_DETECT_FAILED",
  FEATURE_INVALID: "FACE_FEATURE_INVALID",
  ADD_FEA_FAILED: "FACE_ADD_FEA_FAILED",
};
