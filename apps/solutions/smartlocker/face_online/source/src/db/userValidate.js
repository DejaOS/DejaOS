/**
 * user/upsert 字段校验及开柜方式 openModel 配置
 */

function hasOwn(row, key) {
  return Object.prototype.hasOwnProperty.call(row, key);
}

function hasField(row, camelKey, snakeKey) {
  return hasOwn(row, camelKey) || hasOwn(row, snakeKey);
}

function getField(row, camelKey, snakeKey) {
  return hasOwn(row, camelKey) ? row[camelKey] : row[snakeKey];
}

export function validateUserUpsertRow(row) {
  if (!row || typeof row !== "object") {
    return "人员项无效";
  }
  const uid = String(row.userId != null ? row.userId : row.user_id != null ? row.user_id : "").trim();
  if (!uid) {
    return "缺少 userId";
  }

  const hasFaceUrl = hasField(row, "faceImageUrl", "face_image_url");
  const hasFaceMd5 = hasField(row, "faceImageMd5", "face_image_md5");
  if (hasFaceUrl !== hasFaceMd5) {
    return "faceImageUrl 与 faceImageMd5 须同时提供或同时省略";
  }
  const url = hasFaceUrl
    ? String(getField(row, "faceImageUrl", "face_image_url") || "").trim()
    : "";
  const md5In = hasFaceMd5
    ? String(getField(row, "faceImageMd5", "face_image_md5") || "").trim()
    : "";
  if (!!url !== !!md5In) {
    return "faceImageUrl 与 faceImageMd5 须同时有值或同时为空";
  }
  if (md5In && !/^[a-fA-F0-9]{32}$/.test(md5In)) {
    return "faceImageMd5 格式非法";
  }

  const hasPhone = hasOwn(row, "phone");
  const hasPin = hasOwn(row, "pin");
  if (hasPhone !== hasPin) {
    return "phone 与 pin 须同时提供或同时省略";
  }
  const phone = hasPhone ? String(row.phone || "").trim() : "";
  const pin = hasPin ? String(row.pin || "").trim() : "";
  if (!!phone !== !!pin) {
    return "phone 与 pin 须同时有值或同时为空";
  }
  if (phone && !/^\d{11}$/.test(phone)) {
    return "phone 须为 11 位数字";
  }
  if (pin && !/^\d{6}$/.test(pin)) {
    return "pin 须为 6 位数字";
  }

  return null;
}

export function parseUserUpsertRow(row) {
  const err = validateUserUpsertRow(row);
  if (err) return { ok: false, message: err };

  const uid = String(row.userId || row.user_id || "").trim();
  const hasName = hasOwn(row, "name");
  const hasFace = hasField(row, "faceImageUrl", "face_image_url");
  const hasPhonePin = hasOwn(row, "phone");
  const hasRole = hasOwn(row, "role");
  const name = hasName ? String(row.name || "").trim() : "";
  const url = hasFace
    ? String(getField(row, "faceImageUrl", "face_image_url") || "").trim()
    : "";
  const md5In = hasFace
    ? String(getField(row, "faceImageMd5", "face_image_md5") || "").trim()
    : "";
  const phone = hasPhonePin ? String(row.phone || "").trim() : "";
  const pin = hasPhonePin ? String(row.pin || "").trim() : "";
  const role = hasRole && Number(row.role) === 1 ? 1 : 0;

  return {
    ok: true,
    userId: uid,
    hasName,
    hasFace,
    hasPhonePin,
    hasRole,
    name,
    face_image_url: url,
    face_image_md5: md5In ? md5In.toLowerCase() : "",
    phone,
    pin,
    role,
  };
}

export const CONFIG_KEY_OPEN_MODEL = "fitlock.openModel";
export const CONFIG_KEY_CABINET_STRATEGY = "fitlock.cabinetStrategy";

export const OPEN_MODEL_FACE = "face";
export const OPEN_MODEL_PIN = "pin";

/** @returns {"face"|"pin"} */
export function normalizeOpenModel(raw) {
  const s = String(raw || "").trim().toLowerCase();
  return s === OPEN_MODEL_PIN ? OPEN_MODEL_PIN : OPEN_MODEL_FACE;
}

/** @returns {0|1|2} */
export function normalizeCabinetStrategyMode(raw) {
  const n = Number(raw && raw.mode != null ? raw.mode : raw);
  if (n === 1) return 1;
  if (n === 2) return 2;
  return 0;
}
