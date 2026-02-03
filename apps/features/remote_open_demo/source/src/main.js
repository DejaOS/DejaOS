// main.js - Remote Open Demo Main Entry
import bus from "../dxmodules/dxEventBus.js";
import log from "../dxmodules/dxLogger.js";

log.info("Remote Open Demo Starting...");

// Start UI Worker
const uiWorker = bus.newWorker("uiWorker", "/app/code/src/uiWorker.js");
log.info("UI Worker started");

// Start Network Worker
const networkWorker = bus.newWorker("networkWorker", "/app/code/src/worker/networkWorker.js");
log.info("Network Worker started");

// Start Door Worker
const doorWorker = bus.newWorker("doorWorker", "/app/code/src/worker/doorWorker.js");
log.info("Door Worker started");

// Start HTTP Server Worker
const httpWorker = bus.newWorker("httpWorker", "/app/code/src/worker/httpWorker.js");
log.info("HTTP Server Worker started");
