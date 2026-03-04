import bus from "../dxmodules/dxEventBus.js";
import log from "../dxmodules/dxLogger.js";
import LockerDB from "./lock/LockerDB.js";
import watchdog from "../dxmodules/dxWatchdog.js";
import std from "../dxmodules/dxStd.js";
import pwm from "../dxmodules/dxPwm.js";
import dxDriver from "../dxmodules/dxDriver.js";

const WATCHDOG_CHANNEL_MAIN = 0;
// Hardware init (GPIO, PWM, etc.), run once in main thread
function initHardware() {

  // Init and start watchdog, 60s timeout, feed every 5s
  try {
    pwm.init(dxDriver.PWM.NIR_SUPPLEMENT_CHANNEL);
    // Increase IR supplement brightness
    pwm.setPower(70, dxDriver.PWM.NIR_SUPPLEMENT_CHANNEL);

    watchdog.init();
    watchdog.enable(WATCHDOG_CHANNEL_MAIN, true);
    watchdog.start(60000);
    std.setInterval(() => {
      watchdog.restart(WATCHDOG_CHANNEL_MAIN);
    }, 5000);
    log.info("main: Watchdog started and feeding loop initialized");
  } catch (e) {
    log.error("main: Failed to start watchdog:", e);
  }
}

// 1. Hardware init (GPIO, PWM, etc.)
initHardware();
// 2. DB init (tables, etc.), run once in main thread
LockerDB.init();

// 3. UI Worker for all UI logic
bus.newWorker("uiWorker", "/app/code/src/uiWorker.js");
// 4. Lock control UART Worker (485 to lock board)
bus.newWorker("lockWorker", "/app/code/src/lock/lockWorker.js");
// 5. Face recognition Worker
bus.newWorker("faceWorker", "/app/code/src/faceWorker.js");
