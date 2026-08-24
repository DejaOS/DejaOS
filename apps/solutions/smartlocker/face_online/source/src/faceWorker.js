import face from "../dxmodules/dxFacial.js";
import bus from "../dxmodules/dxEventBus.js";
import std from "../dxmodules/dxStd.js";
import log from "./mylogger.js";
import httpclient from "../dxmodules/dxHttpClient.js";
import {
  BUS,
  FACE_CACHE_DIR,
  FACE_ERROR_CODE,
  FACE_SYNC_CODE_SUCCESS,
  PENDING_EVENT_ID_PREFIX_FACE_SYNC,
} from "./constants.js";
import FitLockDB from "./db/FitLockDB.js";

let inited = false;
let running = false;

function safeInit() {
  if (inited) return;
  try {
    face.init();
    inited = true;
    log.info("faceWorker: dxFacial init ok");
  } catch (e) {
    log.error("faceWorker: dxFacial init failed", e);
  }
}

safeInit();

function faceCacheFileForUser(userId) {
  const id = String(userId || "").trim();
  if (!id) return "";
  return FACE_CACHE_DIR + id + ".jpg";
}

function downloadFileToPath(url, localPath, timeout = 30000) {
  try {
    const result = httpclient.download(url, localPath, timeout);
    if (!result || result.code !== 0 || result.status !== 200) {
      return {
        ok: false,
        error: "DOWNLOAD_FAILED",
        code: result ? result.code : undefined,
        httpCode: result ? result.status : undefined,
      };
    }
    return { ok: true };
  } catch (e) {
    return {
      ok: false,
      error: String(e && e.message ? e.message : e),
    };
  }
}

function deleteAlgoFea(userId) {
  if (!userId) return;
  try {
    face.deleteFea(userId);
  } catch (e) {
    log.info("faceWorker: deleteFea", userId, e);
  }
}

function removeFaceCacheFile(userId) {
  const p = faceCacheFileForUser(userId);
  if (!p) return;
  try {
    if (std.exist(p)) {
      const rc = std.remove(p);
      if (rc !== 0) log.info("faceWorker: remove cache", p, rc);
    }
  } catch (e) {
    log.info("faceWorker: remove cache file", p, e);
  }
}

function reportFaceSync(userId, url, md5, code, message) {
  const uid = String(userId || "").trim();
  if (!uid) return;
  try {
    bus.fire(BUS.MQTT_FACE_SYNC_EVENT_APPEND, {
      payload: {
        eventId: `${PENDING_EVENT_ID_PREFIX_FACE_SYNC}${uid}_${Date.now()}`,
        userId: uid,
        timestamp: Math.floor(Date.now() / 1000),
        faceImageMd5: md5 || "",
        faceImageUrl: url || "",
        code: code != null ? String(code) : "",
        message: message != null ? String(message) : "",
      },
    });
  } catch (e) {
    log.error("faceWorker: MQTT_FACE_SYNC_EVENT_APPEND failed", uid, e);
  }
}

function failFaceEnroll(userId, url, md5, code, message) {
  FitLockDB.updateUserFaceEnrolled(userId, 0);
  reportFaceSync(userId, url, md5, code, message);
}

function wipeFaceCacheDirFiles() {
  const dir = FACE_CACHE_DIR.replace(/\/$/, "");
  if (!std.exist(dir)) return;
  const [names, err] = std.readdir(dir);
  if (err !== 0) return;
  for (let i = 0; i < names.length; i++) {
    const name = names[i];
    if (name === "." || name === "..") continue;
    const full = dir + "/" + name;
    const [st, e] = std.stat(full);
    if (e !== 0) continue;
    if ((st.mode & std.S_IFMT) === std.S_IFREG) {
      std.remove(full);
    }
  }
}

function syncOneUserFace(item) {
  const userId = item && String(item.userId || "").trim();
  const url = item && String(item.face_image_url || "").trim();
  const md5Expected = item && String(item.face_image_md5 || "").trim();
  if (!userId || !url) {
    log.info("faceWorker: skip sync, missing userId or url", item);
    return;
  }

  const row = FitLockDB.getUser(userId);
  if (!row) {
    log.info("faceWorker: skip sync, user not in DB", userId);
    return;
  }

  const rowMd5 = row.face_image_md5 != null ? String(row.face_image_md5).trim() : "";
  const md5 = md5Expected || rowMd5;
  if (md5Expected && rowMd5 && md5Expected === rowMd5 && Number(row.face_enrolled) === 1) {
    log.info("faceWorker: skip download, md5 unchanged & enrolled", userId);
    reportFaceSync(userId, url, md5, FACE_SYNC_CODE_SUCCESS, "md5 unchanged, already enrolled");
    return;
  }

  log.info("faceWorker: start enroll user face", userId, url);

  try {
    if (!std.exist(FACE_CACHE_DIR)) {
      std.mkdir(FACE_CACHE_DIR);
    }
  } catch (e) {
    log.error("faceWorker: mkdir cache failed", e);
  }

  const localPath = faceCacheFileForUser(userId);

  const dl = downloadFileToPath(url, localPath, 30000);
  if (!dl.ok) {
    log.error("faceWorker: download face image failed", userId, dl.error);
    failFaceEnroll(userId, url, md5, FACE_ERROR_CODE.DOWNLOAD_FAILED, dl.error || "");
    return;
  }

  let res = null;
  try {
    res = face.getFeaByFile(localPath);
  } catch (e) {
    log.error("faceWorker: getFeaByFile threw", userId, e);
    const msg = e && e.message ? String(e.message) : String(e);
    failFaceEnroll(userId, url, md5, FACE_ERROR_CODE.DETECT_FAILED, msg);
    return;
  }

  if (!res || !res.feature || String(res.feature).length < 100) {
    log.error("faceWorker: getFeaByFile failed or bad feature", userId);
    failFaceEnroll(userId, url, md5, FACE_ERROR_CODE.FEATURE_INVALID, "");
    return;
  }

  deleteAlgoFea(userId);
  const algoRes = face.addFea(userId, res.feature);
  if (algoRes !== 0) {
    log.error("faceWorker: addFea failed", userId, algoRes);
    failFaceEnroll(userId, url, md5, FACE_ERROR_CODE.ADD_FEA_FAILED, String(algoRes));
    return;
  }

  FitLockDB.updateUserFaceEnrolled(userId, 1);
  log.info("faceWorker: user face enrolled", userId);
  reportFaceSync(userId, url, md5, FACE_SYNC_CODE_SUCCESS, "success");
}

/** 清空算法库全部特征并删除本地人脸缓存目录 */
function clearAllFaceLibrary(reason) {
  const tag = reason ? String(reason) : "clear";
  try {
    if (typeof face.cleanFea === "function") {
      face.cleanFea();
      log.info("faceWorker: cleanFea", tag);
    }
  } catch (e) {
    log.info("faceWorker: cleanFea failed", tag, e);
  }
  wipeFaceCacheDirFiles();
}

function handleUserChanged(evt) {
  if (!evt || !evt.action) return;

  if (evt.action === "delete" && Array.isArray(evt.userIds)) {
    for (let i = 0; i < evt.userIds.length; i++) {
      const uid = String(evt.userIds[i] || "").trim();
      deleteAlgoFea(uid);
      removeFaceCacheFile(uid);
    }
    return;
  }

  if (evt.action === "clear") {
    const ids = Array.isArray(evt.userIds) ? evt.userIds : [];
    if (ids.length) {
      for (let j = 0; j < ids.length; j++) {
        deleteAlgoFea(String(ids[j] || "").trim());
      }
      wipeFaceCacheDirFiles();
    } else {
      clearAllFaceLibrary("USER_CHANGED");
    }
    return;
  }

  if (evt.action === "upsert" && Array.isArray(evt.items)) {
    for (let k = 0; k < evt.items.length; k++) {
      try {
        syncOneUserFace(evt.items[k]);
      } catch (e) {
        log.error("faceWorker: syncOneUserFace failed", evt.items[k], e);
        const it = evt.items[k];
        const uid = it && String(it.userId || "").trim();
        if (uid) {
          failFaceEnroll(
            uid,
            String(it.face_image_url || "").trim(),
            String(it.face_image_md5 || "").trim(),
            FACE_ERROR_CODE.DETECT_FAILED,
            e && e.message ? String(e.message) : String(e)
          );
        }
      }
    }
  }
}

face.setCallbacks({
  onRecognition: (event) => {
    try {
      if (!running) return;
      const uid = event && (event.userId || event.user_id || "");
      log.info("faceWorker: onRecognition", uid ? `success userId=${uid}` : "failed");
      bus.fire(BUS.FACE_RECOGNIZED, event);
    } catch (e) {
      log.error("faceWorker: fire FACE_RECOGNIZED failed", e);
    }
  },
});

bus.on(BUS.FACE_START, () => {
  running = true;
});

bus.on(BUS.FACE_STOP, () => {
  running = false;
});

bus.on(BUS.USER_CHANGED, (evt) => {
  try {
    handleUserChanged(evt);
  } catch (e) {
    log.error("faceWorker: USER_CHANGED handler failed", e);
  }
});

bus.on(BUS.USER_FACE_CLEAR, () => {
  try {
    clearAllFaceLibrary("USER_FACE_CLEAR");
  } catch (e) {
    log.error("faceWorker: USER_FACE_CLEAR handler failed", e);
  }
});

std.setInterval(() => {
  try {
    face.loop();
  } catch (e) {
    log.error("faceWorker: loop error", e);
  }
}, 50);
