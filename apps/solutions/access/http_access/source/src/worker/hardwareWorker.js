/**
 * hardwareWorker.js - Hardware peripherals driver
 *
 * - GPIO relay: unlock (high), auto relock after delay (low)
 * - EventBus door-open requests
 * - Barcode: dxBarcode init + loop, results on bus
 * - NFC: dxNfcCard init + loop, tap results on bus
 */

import std from "../../dxmodules/dxStd.js";
import log from "../../dxmodules/dxLogger.js";
import bus from "../../dxmodules/dxEventBus.js";
import dxDriver from "../../dxmodules/dxDriver.js";
import dxGpio from "../../dxmodules/dxGpio.js";
import dxBarcode from "../../dxmodules/dxBarcode.js";
import dxNfcCard from "../../dxmodules/dxNfcCard.js";
import gpioKey from "../../dxmodules/dxGpioKey.js";
import common from "../../dxmodules/dxCommonUtils.js";
import pwm from "../../dxmodules/dxPwm.js";
import { getScanWifiShare, EVENT_WIFI_SHARE_SCANNED, EVENT_DOOR_OPEN_REQUEST, EVENT_UI_TIP } from "../constants.js";
import AccessService from "../service/AccessService.js";
import DeviceConfigService from "../service/DeviceConfigService.js";
import AccessDB from "../service/AccessDB.js";

// From dxDriver
/** Relay GPIO: high = unlocked, low = locked */
const RELAY_GPIO = dxDriver.GPIO.RELAY;
/** Auto-relock delay (ms) */
const AUTO_CLOSE_DELAY_MS = 5000;

/**
 * Parse phone WiFi share QR (WIFI:T:...;S:...;P:...;;)
 */
function parseWifiQrCode(text) {
    if (!text || !text.startsWith("WIFI:")) return null;
    const content = text.slice(5);           // strip "WIFI:"
    const fields = {};
    content.split(";").forEach((seg) => {
        const idx = seg.indexOf(":");
        if (idx < 0) return;
        const key = seg.slice(0, idx).toUpperCase();
        const val = seg.slice(idx + 1);
        fields[key] = val;
    });
    const ssid = fields["S"] || "";
    if (!ssid) return null;
    return {
        ssid: ssid,
        password: fields["P"] || "",
        authType: fields["T"] || "",
    };
}

function initGpio() {
    try {
        if (!dxGpio.init()) {
            log.error("[hardwareWorker] dxGpio.init failed");
            return false;
        }

        if (!dxGpio.request(RELAY_GPIO)) {
            log.error("[hardwareWorker] dxGpio.request(" + RELAY_GPIO + ") failed");
            return false;
        }

        dxGpio.setValue(RELAY_GPIO, 0);
        log.info("[hardwareWorker] GPIO OK RELAY_GPIO=" + RELAY_GPIO);
        return true;
    } catch (e) {
        log.error("[hardwareWorker] GPIO init error", e);
        return false;
    }
}


function openAndCloseDoor() {
    try {
        dxGpio.setValue(RELAY_GPIO, 1);
        log.info("[hardwareWorker] Door open, auto close in " + (AUTO_CLOSE_DELAY_MS / 1000) + "s");
        std.setTimeout(() => {
            try {
                dxGpio.setValue(RELAY_GPIO, 0);
                log.info("[hardwareWorker] Door closed (auto)");
            } catch (e) {
                log.error("[hardwareWorker] Auto close error", e);
            }
        }, AUTO_CLOSE_DELAY_MS);

    } catch (e) {
        log.error("[hardwareWorker] Open door failed", e);
    }
}


/**
 * Parse and verify door QR payload: { value, timestamp } or { value, timestamp, sign }
 * If barcodeConfig.key set: sign = md5(value + timestamp + key), sign required.
 * If key empty: sign optional.
 */
function verifyDoorQrCode(str) {
    let qr;
    try {
        qr = JSON.parse(str);
    } catch (e) {
        return { ok: false, error: "Invalid QR format" };
    }

    if (!qr.value || qr.timestamp == null || qr.timestamp === "") {
        return { ok: false, error: "QR missing required fields" };
    }

    let bcCfg = { key: "", timeout: 10 };
    try {
        const raw = DeviceConfigService.get("barcodeConfig") || "{}";
        bcCfg = Object.assign(bcCfg, JSON.parse(raw));
    } catch (e) { }

    const timeout = Number(bcCfg.timeout);
    if (timeout !== 0) {
        const nowMs = Date.now();
        const qrTsMs = Number(qr.timestamp);
        const diff = Math.abs(nowMs - qrTsMs);
        if (diff > timeout * 1000) {
            return { ok: false, error: "QR expired" };
        }
    }

    const keyStr = String(bcCfg.key != null ? bcCfg.key : "").trim();
    if (keyStr) {
        if (!qr.sign) {
            return { ok: false, error: "QR missing signature" };
        }
        const expected = common.crypto.md5(String(qr.value) + String(qr.timestamp) + keyStr);
        if (qr.sign !== expected) {
            return { ok: false, error: "QR signature invalid" };
        }
    }

    return { ok: true, value: String(qr.value) };
}

let lastCodeValue = { timestamp: 0, value: "" };

function initBarcode() {
    try {
        dxBarcode.init();
        dxBarcode.setCallbacks({
            onBarcodeDetected: function (barcode, type, quality, timestamp) {
                let str = common.codec.utf8HexToStr(common.codec.arrayBufferToHex(barcode))

                const now = Date.now();
                if (str === lastCodeValue.value && now - lastCodeValue.timestamp < 1000) {
                    return;
                }
                lastCodeValue = { timestamp: now, value: str };

                log.info("[hardwareWorker] scan:", str, "type:", type);

                if (getScanWifiShare()) {
                    const wifi = parseWifiQrCode(str);
                    if (wifi) {
                        log.info("[hardwareWorker] WiFi QR OK SSID:", wifi.ssid);
                        bus.fire(EVENT_WIFI_SHARE_SCANNED, wifi);
                        pwm.successBeep();
                    }
                } else {
                    const result = verifyDoorQrCode(str);
                    if (!result.ok) {
                        log.info("[hardwareWorker] QR verify failed:", result.error);
                        bus.fire(EVENT_UI_TIP, { level: "error", message: result.error });
                        pwm.failBeep();
                        AccessDB.appendAccessRecord({
                            userId: "",
                            name:   "",
                            type:   "qr",
                            value:  str.length > 128 ? str.slice(0, 128) : str,
                            result: 0,
                        });
                    } else {
                        const granted = AccessService.verifyAndOpen("qr", result.value);
                        if (granted) openAndCloseDoor();
                    }
                }
            },
        });

    } catch (e) {
        log.error("[hardwareWorker] Barcode init failed", e);
    }
}


function initNfc() {
    try {
        dxNfcCard.init();
        dxNfcCard.setCallbacks({
            onCardDetected: (cardInfo) => {
                log.info("[hardwareWorker] NFC tap:", cardInfo);
                pwm.pressBeep();
                const rawId = cardInfo && (cardInfo.uid || cardInfo.id || String(cardInfo));
                const cardId = rawId ? String(rawId).toUpperCase() : "";
                const ok = AccessService.verifyAndOpen("nfc", cardId);
                if (ok) openAndCloseDoor();
            },
        });
        log.info("[hardwareWorker] NFC ready");
    } catch (e) {
        log.error("[hardwareWorker] NFC init failed", e);
    }
}


initGpio();

initBarcode();

initNfc();

try {
    gpioKey.init();
    log.info("[hardwareWorker] gpioKey OK");
} catch (e) {
    log.error("[hardwareWorker] gpioKey init failed", e);
}

let lastGpioKeyTs = 0;

bus.on(EVENT_DOOR_OPEN_REQUEST, () => {
    openAndCloseDoor();
});

std.setInterval(() => {
    try {
        dxBarcode.loop();
    } catch (e) {
        log.error("[hardwareWorker] dxBarcode.loop error", e);
    }
    try {
        dxNfcCard.loop();
    } catch (e) {
        log.error("[hardwareWorker] dxNfcCard.loop error", e);
    }
    try {
        if (!gpioKey.msgIsEmpty()) {
            const now = Date.now();
            const msg = gpioKey.msgReceive();
            if (now - lastGpioKeyTs < 500) {
                log.info("[hardwareWorker] gpioKey debounced");
            } else {
                lastGpioKeyTs = now;
                log.info("[hardwareWorker] gpioKey:", JSON.stringify(msg));
                if (msg && msg.code === 30 && msg.type === 1) {
                    if (msg.value === 1) {
                        log.info("[hardwareWorker] door sensor open code=" + msg.code);
                        AccessDB.appendEvent({
                            type: "warning",
                            event: "door_open",
                            message: "Door sensor: door opened",
                        });
                    } else if (msg.value === 0) {
                        log.info("[hardwareWorker] door sensor closed code=" + msg.code);
                        AccessDB.appendEvent({
                            type: "info",
                            event: "door_close",
                            message: "Door sensor: door closed",
                        });
                    }
                }
            }
        }
    } catch (e) {
        log.error("[hardwareWorker] gpioKey.loop error", e);
    }
}, 50);

log.info("[hardwareWorker] started");
