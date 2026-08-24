import std from "../../dxmodules/dxStd.js";
import log from "../mylogger.js";
import bus from "../../dxmodules/dxEventBus.js";
import uart from "../../dxmodules/dxUart.js";
import dxDriver from "../../dxmodules/dxDriver.js";
import dxCommonUtils from "../../dxmodules/dxCommonUtils.js";
import LockBoardProtocol from "./LockBoardProtocol.js";
import {
  resolveCabinetToHardware,
  resolveHardwareToCabinet,
  getDoorOpenTimeoutSec,
} from "../db/FitLockService.js";
import FitLockDB from "../db/FitLockDB.js";
import { ACCESS_EVENT_TYPE, ALARM_EVENT_TYPE, BUS } from "../constants.js";

const UART_ID = "lockBoard";
const UART_PATH = dxDriver.CHANNEL.UART_PATH;
const DOOR_OPEN_WATCH_POLL_MS = 5000;

/** 柜门开/关告警去重：同一柜格连续相同 type 不再重复入队 */
const lastDoorAlarmTypeByCabinet = {};

/** 开柜超时监测：key=groupId:cabinetId → { groupId, cabinetId, openAtMs } */
const doorOpenWatchByCabinet = {};

function cabinetKey(groupId, cabinetId) {
  return `${groupId}:${cabinetId}`;
}

function addDoorOpenWatch(groupId, cabinetId) {
  const key = cabinetKey(groupId, cabinetId);
  doorOpenWatchByCabinet[key] = {
    groupId,
    cabinetId,
    openAtMs: Date.now(),
  };
}

function removeDoorOpenWatch(groupId, cabinetId) {
  delete doorOpenWatchByCabinet[cabinetKey(groupId, cabinetId)];
}

function emitDoorOpenTimeoutAlarm(entry) {
  if (!entry) return;
  const openAtSec = Math.floor(entry.openAtMs / 1000);
  bus.fire(BUS.MQTT_ALARM_EVENT_APPEND, {
    payload: {
      eventId: `evt_alarm_door_timeout_${entry.groupId}_${entry.cabinetId}_${Date.now()}`,
      groupId: entry.groupId,
      cabinetId: entry.cabinetId,
      timestamp: Math.floor(Date.now() / 1000),
      type: ALARM_EVENT_TYPE.DOOR_OPEN_TIMEOUT,
      extra: { openTimestamp: openAtSec },
    },
  });
}

function pollDoorOpenWatch() {
  const timeoutMs = getDoorOpenTimeoutSec() * 1000;
  const now = Date.now();
  const keys = Object.keys(doorOpenWatchByCabinet);
  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    const entry = doorOpenWatchByCabinet[key];
    if (!entry) continue;
    if (now - entry.openAtMs >= timeoutMs) {
      try {
        emitDoorOpenTimeoutAlarm(entry);
      } catch (e) {
        log.error("lockWorker: door open timeout alarm failed", entry, e);
      }
      delete doorOpenWatchByCabinet[key];
    }
  }
}

function emitDoorAlarmFromActiveReport(parsed) {
  const loc = resolveHardwareToCabinet(parsed.boardAddr, parsed.lockNo);
  if (!loc.groupId || !loc.cabinetId) {
    log.info("lockWorker: activeReport 无法映射柜格", parsed.boardAddr, parsed.lockNo);
    return;
  }
  const key = cabinetKey(loc.groupId, loc.cabinetId);
  const st = parsed.status & 0xff;
  let alarmType = null;
  if (st === 0x11) alarmType = ALARM_EVENT_TYPE.DOOR_OPEN;
  else if (st === 0x00) alarmType = ALARM_EVENT_TYPE.DOOR_CLOSE;
  else {
    log.info("lockWorker: activeReport 忽略未知状态", st);
    return;
  }
  if (lastDoorAlarmTypeByCabinet[key] === alarmType) return;

  try {
    const updated = FitLockDB.updateCabinetDoorOpen(
      loc.groupId,
      loc.cabinetId,
      alarmType === ALARM_EVENT_TYPE.DOOR_OPEN ? 1 : 0
    );
    if (!updated) {
      log.info("lockWorker: activeReport 对应柜格未配置，忽略", {
        boardAddr: parsed.boardAddr,
        lockNo: parsed.lockNo,
        groupId: loc.groupId,
        cabinetId: loc.cabinetId,
      });
      return;
    }
  } catch (e) {
    log.error("lockWorker: updateCabinetDoorOpen failed", loc, e);
    return;
  }
  lastDoorAlarmTypeByCabinet[key] = alarmType;

  if (alarmType === ALARM_EVENT_TYPE.DOOR_OPEN) {
    addDoorOpenWatch(loc.groupId, loc.cabinetId);
  } else {
    removeDoorOpenWatch(loc.groupId, loc.cabinetId);
  }

  bus.fire(BUS.MQTT_ALARM_EVENT_APPEND, {
    payload: {
      eventId: `evt_alarm_door_${alarmType}_${key.replace(":", "_")}_${Date.now()}`,
      groupId: loc.groupId,
      cabinetId: loc.cabinetId,
      timestamp: Math.floor(Date.now() / 1000),
      type: alarmType,
    },
  });
}

function initUart() {
  try {
    uart.open(uart.TYPE.UART, UART_PATH, UART_ID);
    uart.ioctl(uart.IOC_SET_CMD.CHANNEL_IOC_SET_UART_PARAM, "9600-8-N-1", UART_ID);
    log.info("lockWorker: UART init success on " + UART_PATH);
  } catch (e) {
    log.error("lockWorker: UART init failed", e);
  }
}

function sendFrame(frame) {
  if (!frame || frame.byteLength === 0) return;
  try {
    const hex = dxCommonUtils.codec.bytesToHex(Array.from(frame));
    log.info("lock.tx", hex);
    uart.send(frame.buffer, UART_ID);
  } catch (e) {
    log.error("lockWorker: uart.send failed", e);
  }
}

function emitOpenRequestAccess(groupId, cabinetId, userId, picPath) {
  const uid = String(userId || "").trim();
  if (!uid) {
    log.error("lockWorker: skip open request access: missing userId", {
      groupId,
      cabinetId,
    });
    return;
  }
  try {
    const payload = {
      eventId: `open-request-${groupId}-${cabinetId}-${Date.now()}`,
      userId: uid,
      groupId,
      cabinetId,
      timestamp: Math.floor(Date.now() / 1000),
      type: ACCESS_EVENT_TYPE.OPEN_REQUEST,
    };
    const capturePath = String(picPath || "").trim();
    if (capturePath) payload.picPath = capturePath;
    bus.fire(BUS.MQTT_ACCESS_EVENT_APPEND, {
      payload,
    });
  } catch (e) {
    log.error("lockWorker: append open request access failed", e);
  }
}

function handleCmd(cmd) {
  if (!cmd || !cmd.action) return;

  let boardAddr = cmd.boardAddr != null ? cmd.boardAddr : 0x01;
  let lockNo = cmd.lockNo;
  let frame = null;
  let openRequest = null;

  switch (cmd.action) {
    case "openAll": {
      frame = LockBoardProtocol.buildOpenAll(boardAddr);
      break;
    }
    case "openOne": {
      if (typeof cmd.lockNo !== "number") return;
      frame = LockBoardProtocol.buildOpenOne(boardAddr, cmd.lockNo);
      break;
    }
    case "openOneByCabinet": {
      const gid = Number(cmd.groupId);
      const cid = Number(cmd.cabinetId);
      const hw = resolveCabinetToHardware(gid, cid);
      if (!hw) {
        log.error("lockWorker: 柜格不存在或不可用", { groupId: gid, cabinetId: cid });
        return;
      }
      boardAddr = hw.boardAddr;
      lockNo = hw.lockNo;
      log.info("lockWorker: openOneByCabinet", { groupId: gid, cabinetId: cid, boardAddr, lockNo });
      frame = LockBoardProtocol.buildOpenOne(boardAddr, lockNo);
      if (cmd.reportAccess !== false) {
        openRequest = {
          groupId: gid,
          cabinetId: cid,
          userId: cmd.userId,
          picPath: cmd.picPath,
        };
      }
      break;
    }
    case "queryOne": {
      if (typeof cmd.lockNo !== "number") return;
      frame = LockBoardProtocol.buildQueryOne(boardAddr, cmd.lockNo);
      break;
    }
    case "queryOneByCabinet": {
      const gid = Number(cmd.groupId);
      const cid = Number(cmd.cabinetId);
      const hw = resolveCabinetToHardware(gid, cid);
      if (!hw) return;
      frame = LockBoardProtocol.buildQueryOne(hw.boardAddr, hw.lockNo);
      break;
    }
    default:
      log.error("lockWorker: 未知锁控命令", cmd.action);
      return;
  }

  if (frame) {
    if (openRequest) {
      emitOpenRequestAccess(
        openRequest.groupId,
        openRequest.cabinetId,
        openRequest.userId,
        openRequest.picPath
      );
    }
    sendFrame(frame);
  }
}

function handleUartData(buf) {
  if (!buf || buf.byteLength !== 5) return;

  const arr = Array.from(buf);
  const recvBcc = arr[4];
  const calc = LockBoardProtocol.calcBcc(arr.slice(0, 4));
  if (recvBcc !== calc) {
    log.error("lockWorker: BCC 校验失败");
    return;
  }

  const parsed = LockBoardProtocol.parseFrame(buf);
  if (parsed) {
    if (parsed.type === "activeReport") {
      try {
        emitDoorAlarmFromActiveReport(parsed);
      } catch (e) {
        log.error("lockWorker: door alarm emit failed", e);
      }
    }
  }
}

function startPollLoop() {
  std.setInterval(() => {
    try {
      const data = uart.receive(5, 100, UART_ID);
      if (data && data.byteLength > 0) handleUartData(data);
    } catch (e) {
      log.error("lockWorker: uart.receive error", e);
    }
  }, 20);
}

function startDoorOpenWatchLoop() {
  std.setInterval(() => {
    try {
      pollDoorOpenWatch();
    } catch (e) {
      log.error("lockWorker: door open watch poll error", e);
    }
  }, DOOR_OPEN_WATCH_POLL_MS);
}

bus.on(BUS.LOCK_CMD, (cmd) => {
  handleCmd(cmd);
});

initUart();
startPollLoop();
startDoorOpenWatchLoop();

log.info("lockWorker: started");
