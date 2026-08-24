import baseLogger from "../dxmodules/dxLogger.js";
import dxMap from "../dxmodules/dxMap.js";

const DEBUG_LOG_MAX_COUNT = 500;
const DEBUG_LOG_PRUNE_BATCH = 50;
const DEBUG_LOG_PRUNE_INTERVAL = 50;
const debugLogMap = dxMap.get("__debug_log_buffer__");
const debugLogSourceId = `${Date.now()}_${Math.floor(Math.random() * 1000000)}`;
let debugLogSequence = 0;
let debugLogWritesSincePrune = 0;

function getContent(message) {
  if (message === undefined) return "undefined";
  if (message === null) return "null";
  if (typeof message === "object") {
    if (Object.prototype.toString.call(message) === "[object Error]") {
      let errorString = message.message || "Error";
      if (message.stack) errorString += "\n" + message.stack;
      return errorString;
    }
    try {
      return JSON.stringify(message);
    } catch (e) {
      return String(message);
    }
  }
  return String(message);
}

function getTime() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const hours = String(now.getHours()).padStart(2, "0");
  const minutes = String(now.getMinutes()).padStart(2, "0");
  const seconds = String(now.getSeconds()).padStart(2, "0");
  const milliseconds = String(now.getMilliseconds()).padStart(3, "0");
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}.${milliseconds}`;
}

function getSortedDebugLogKeys() {
  return debugLogMap.keys()
    .filter((key) => String(key).startsWith("log_"))
    .sort();
}

function pruneDebugLogs() {
  const keys = getSortedDebugLogKeys();
  if (keys.length <= DEBUG_LOG_MAX_COUNT) return;
  const overflow = keys.length - DEBUG_LOG_MAX_COUNT;
  const deleteCount = Math.ceil(overflow / DEBUG_LOG_PRUNE_BATCH) * DEBUG_LOG_PRUNE_BATCH;
  const count = Math.min(deleteCount, keys.length);
  for (let i = 0; i < count; i++) {
    debugLogMap.del(keys[i]);
  }
}

function captureDebugLog(level, data) {
  try {
    let message = data.map((item) => getContent(item)).join(" ");
    if (message.includes("\n\n")) {
      message = message.replace(/\n{2,}/g, "\n");
    }
    const content = `[${level} ${getTime()}]: ${message}`.trimEnd();
    const maxLength = Number(baseLogger.max_length) || 1024;
    const outputContent = content.length > maxLength
      ? content.slice(0, maxLength - 3) + "..."
      : content;
    const now = String(Date.now()).padStart(13, "0");
    const seq = String(debugLogSequence++).padStart(8, "0");
    debugLogMap.put(`log_${now}_${debugLogSourceId}_${seq}`, outputContent);

    debugLogWritesSincePrune++;
    if (debugLogWritesSincePrune >= DEBUG_LOG_PRUNE_INTERVAL) {
      debugLogWritesSincePrune = 0;
      pruneDebugLogs();
    }
  } catch (e) {
    // 调试缓存异常不能影响正常日志输出。
  }
}

const logger = {
  max_length: baseLogger.max_length,

  setDebug(isDebug = true) {
    return baseLogger.setDebug(isDebug);
  },

  debug(...data) {
    captureDebugLog("DEBUG", data);
    return baseLogger.debug(...data);
  },

  info(...data) {
    captureDebugLog("INFO", data);
    return baseLogger.info(...data);
  },

  error(...data) {
    captureDebugLog("ERROR", data);
    return baseLogger.error(...data);
  },

  getBufferedLogs(limit = DEBUG_LOG_MAX_COUNT) {
    try {
      pruneDebugLogs();
      const max = Math.max(
        1,
        Math.min(DEBUG_LOG_MAX_COUNT, Number(limit) || DEBUG_LOG_MAX_COUNT)
      );
      const keys = getSortedDebugLogKeys();
      const selected = keys.slice(Math.max(0, keys.length - max));
      const result = [];
      for (let i = 0; i < selected.length; i++) {
        const value = debugLogMap.get(selected[i]);
        if (value !== undefined) {
          result.push({ key: selected[i], text: String(value) });
        }
      }
      return result;
    } catch (e) {
      return [];
    }
  },

  clearBufferedLogs() {
    try {
      const keys = getSortedDebugLogKeys();
      for (let i = 0; i < keys.length; i++) {
        debugLogMap.del(keys[i]);
      }
      return true;
    } catch (e) {
      return false;
    }
  },
};

export default logger;
