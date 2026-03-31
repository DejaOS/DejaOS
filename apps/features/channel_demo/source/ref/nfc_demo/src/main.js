import bus from "../dxmodules/dxEventBus.js";
import log from "../dxmodules/dxLogger.js";
import std from "../dxmodules/dxStd.js";
function init() {
    log.info("NFC Demo Main Worker Initializing...");
}

try {
    init();
} catch (e) {
    log.error("init error", e);
}

// 启动 UI Worker
bus.newWorker("uiWorker", "/app/code/src/uiWorker.js");

// 启动独立的 NFC Worker
bus.newWorker("nfcWorker", "/app/code/src/nfcWorker.js");

log.info("All Workers started");