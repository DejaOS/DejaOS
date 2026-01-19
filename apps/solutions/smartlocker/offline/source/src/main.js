import bus from "../dxmodules/dxEventBus.js";
import log from "../dxmodules/dxLogger.js";
import pwm from "../dxmodules/dxPwm.js";
import LockerDB from "./lock/LockerDB.js";

// Hardware initialization (e.g. GPIO, PWM); only runs once in the main thread
function initHardware() {
  // Initialize PWM channel 0 for global key beeps and other sound prompts
  pwm.init(0);
}

// 1. Initialize hardware related modules such as GPIO, PWM, etc.
initHardware();
// 2. Initialize database (create tables, etc.); only runs once in the main thread
LockerDB.init();

// 3. Create UI worker to host all UI logic
const uiWorker = bus.newWorker("uiWorker", "/app/code/src/uiWorker.js");
// 4. Create lock control worker to communicate with the lock board over RS‑485
const lockWorker = bus.newWorker("lockWorker", "/app/code/src/lock/lockWorker.js");

export default uiWorker;
