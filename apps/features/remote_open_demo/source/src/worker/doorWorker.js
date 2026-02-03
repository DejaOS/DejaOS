/**
 * doorWorker - GPIO relay control for door opening/closing
 *
 * Responsibilities:
 * 1. GPIO control of relay: open door (high level), auto close after delay (low level)
 * 3. Listen for door open requests via EventBus
 */

import std from "../../dxmodules/dxStd.js";
import log from "../../dxmodules/dxLogger.js";
import bus from "../../dxmodules/dxEventBus.js";
import dxDriver from "../../dxmodules/dxDriver.js";
import dxGpio from "../../dxmodules/dxGpio.js";

// Hardware constants from dxDriver
/** GPIO pin for relay control (high = door open, low = door closed) */
const RELAY_GPIO = dxDriver.GPIO.RELAY;
/** Auto close delay in milliseconds */
const AUTO_CLOSE_DELAY_MS = 5000;

/**
 * Initialize GPIO for relay control
 */
function initGpio() {
    try {
        if (!dxGpio.init()) {
            log.error("[doorWorker] dxGpio.init failed");
            return false;
        }

        if (!dxGpio.request(RELAY_GPIO)) {
            log.error("[doorWorker] dxGpio.request(" + RELAY_GPIO + ") failed");
            return false;
        }

        // Initial state: door closed (low level)
        dxGpio.setValue(RELAY_GPIO, 0);
        log.info("[doorWorker] GPIO initialized successfully, RELAY_GPIO=" + RELAY_GPIO);
        return true;
    } catch (e) {
        log.error("[doorWorker] GPIO initialization error", e);
        return false;
    }
}


/**
 * Open door and automatically close after delay
 */
function openAndCloseDoor() {
    try {
        // Open door (set relay high)
        dxGpio.setValue(RELAY_GPIO, 1);
        log.info("[doorWorker] Door opened, will auto-close in " + (AUTO_CLOSE_DELAY_MS / 1000) + " seconds");

        bus.fire("DOOR_STATE_CHANGED", { isOpen: true });

        // Schedule automatic door closing
        std.setTimeout(() => {
            try {
                dxGpio.setValue(RELAY_GPIO, 0);
                log.info("[doorWorker] Door closed (auto)");
                bus.fire("DOOR_STATE_CHANGED", { isOpen: false });
            } catch (e) {
                log.error("[doorWorker] Error during auto door close", e);
            }
        }, AUTO_CLOSE_DELAY_MS);

    } catch (e) {
        log.error("[doorWorker] Door open failed", e);
    }
}


// Initialize door sensor monitoring
initGpio();


// Listen for door open requests
bus.on("DOOR_OPEN_REQUEST", (data) => {
    openAndCloseDoor();
});

log.info("[doorWorker] Started successfully");