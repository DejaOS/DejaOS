import std from "../../dxmodules/dxStd.js";
import log from "../mylogger.js";
import bus from "../../dxmodules/dxEventBus.js";
import { BUS } from "../constants.js";

export const DEFAULT_CABINET_OPEN_INTERVAL_MS = 700;

function callCallback(callback, payload, name) {
  if (typeof callback !== "function") return;
  try {
    callback(payload);
  } catch (e) {
    log.error(`[CabinetOpenSequence] ${name} callback failed`, e);
  }
}

/**
 * 按固定间隔依次向 lockWorker 发送开柜指令。
 * 返回的控制器只负责中断尚未发送的开柜指令，不回滚已完成的业务操作。
 */
export function startCabinetOpenSequence(cabinets, options = {}) {
  const userId = String(options.userId || "").trim();
  const reportAccess = options.reportAccess !== false;
  const source = Array.isArray(cabinets) ? cabinets : [];
  const queue = [];
  for (let i = 0; i < source.length; i++) {
    const cabinet = source[i];
    if (!cabinet) continue;
    const groupId = Number(cabinet.groupId);
    const cabinetId = Number(cabinet.cabinetId);
    if (!Number.isFinite(groupId) || !Number.isFinite(cabinetId)) continue;
    queue.push({ groupId, cabinetId });
  }

  const configuredInterval = Number(options.intervalMs);
  const intervalMs =
    Number.isFinite(configuredInterval) && configuredInterval > 0
      ? configuredInterval
      : DEFAULT_CABINET_OPEN_INTERVAL_MS;

  let timer = null;
  let index = 0;
  let running = queue.length > 0;

  const controller = {
    cancel() {
      if (!running) return false;
      running = false;
      if (timer != null) {
        std.clearTimeout(timer);
        timer = null;
      }
      return true;
    },
    isRunning() {
      return running;
    },
    getProgress() {
      return { index, total: queue.length };
    },
  };

  const finish = () => {
    if (!running) return;
    running = false;
    timer = null;
    callCallback(options.onComplete, { total: queue.length }, "onComplete");
  };

  const openNext = () => {
    if (!running) return;
    const cabinet = queue[index];
    index += 1;
    try {
      bus.fire(BUS.LOCK_CMD, {
        action: "openOneByCabinet",
        groupId: cabinet.groupId,
        cabinetId: cabinet.cabinetId,
        userId,
        reportAccess,
      });
    } catch (e) {
      log.error("[CabinetOpenSequence] open cabinet failed", cabinet, e);
    }

    callCallback(
      options.onProgress,
      { index, total: queue.length, cabinet },
      "onProgress"
    );

    if (index >= queue.length) {
      finish();
      return;
    }
    timer = std.setTimeout(openNext, intervalMs);
  };

  if (!running) {
    callCallback(options.onComplete, { total: 0 }, "onComplete");
    return controller;
  }

  openNext();
  return controller;
}
