import bus from "../dxmodules/dxEventBus.js";
import log from "./mylogger.js";
import pwm from "../dxmodules/dxPwm.js";
import dxDriver from "../dxmodules/dxDriver.js";
import audio from "../dxmodules/dxAudio.js";
import std from "../dxmodules/dxStd.js";
import watchdog from "../dxmodules/dxWatchdog.js";
import FitLockDB from "./db/FitLockDB.js";
import * as FitLock from "./db/FitLockService.js";
import { USER_WAV } from "./constants.js";

const WATCHDOG_CHANNEL_MAIN = 0;

function initHardware() {
  try {
    pwm.init(dxDriver.PWM.WHITE_SUPPLEMENT_CHANNEL);
    pwm.setPower(30, dxDriver.PWM.WHITE_SUPPLEMENT_CHANNEL);
  } catch (e) {
    log.info("fitlock: pwm init failed", e);
  }
  try {
    const level = FitLock.getSystemVolumeLevel();
    audio.init(FitLock.mapAudioOutputVolume(level));
    audio.play(USER_WAV.WELCOME);
  } catch (e) {
    log.error("fitlock: audio init failed", e);
  }

  // 看门狗逻辑暂不启用，联调稳定后再放开。
  try {
    watchdog.init();
    watchdog.enable(WATCHDOG_CHANNEL_MAIN, true);
    watchdog.start(60000);
    std.setInterval(() => {
      watchdog.restart(WATCHDOG_CHANNEL_MAIN);
    }, 5000);
    log.info("fitlock: watchdog started");
  } catch (e) {
    log.error("fitlock: watchdog failed", e);
  }
}

try {
  log.info("fitlock: main start");
  FitLockDB.init();
  initHardware();

  bus.newWorker("uiWorker", "/app/code/src/uiWorker.js");
  bus.newWorker("faceWorker", "/app/code/src/faceWorker.js");
  bus.newWorker("networkWorker", "/app/code/src/worker/networkWorker.js");
  bus.newWorker("mqttWorker", "/app/code/src/worker/mqttWorker.js");
  bus.newWorker("lockWorker", "/app/code/src/lock/lockWorker.js");
  log.info("fitlock: workers created");
} catch (e) {
  log.error("fitlock: main init failed", e);
}
