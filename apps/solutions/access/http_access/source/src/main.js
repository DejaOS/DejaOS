// main.js - Access control app entry
import bus from "../dxmodules/dxEventBus.js";
import log from "../dxmodules/dxLogger.js";
import pwm from "../dxmodules/dxPwm.js";
import AccessDB from "./service/AccessDB.js";

log.info("Access control starting...");

// PWM channel 0 for key beeps and similar feedback
pwm.init(0);

// Database (call once at startup)
try {
    AccessDB.init();
    log.info("Database ready");
} catch (e) {
    log.error("Database init failed:", e);
}

// Hardware worker
const hardwareWorker = bus.newWorker("hardwareWorker", "/app/code/src/worker/hardwareWorker.js");
log.info("Hardware worker started");
// UI worker
const uiWorker = bus.newWorker("uiWorker", "/app/code/src/uiWorker.js");
log.info("UI worker started");

// Network worker
const networkWorker = bus.newWorker("networkWorker", "/app/code/src/worker/networkWorker.js");
log.info("Network worker started");

// HTTP server worker
const httpWorker = bus.newWorker("httpWorker", "/app/code/src/worker/httpWorker.js");
log.info("HTTP worker started");

import * as os from "os"
import std from "../dxmodules/dxStd.js"
std.setInterval(() => {
    os.exec(["free", "-k"])
    os.exec(["uptime"])
}, 60000);
