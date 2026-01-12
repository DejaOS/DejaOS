import dxNfcCard from "../dxmodules/dxNfcCard.js";
import bus from "../dxmodules/dxEventBus.js";
import std from "../dxmodules/dxStd.js";
import log from "../dxmodules/dxLogger.js";
import utils from "../dxmodules/dxCommonUtils.js";
import pwm from "../dxmodules/dxPwm.js";
import dxDriver from "../dxmodules/dxDriver.js";

let lastCardInfo = null;

try {
    log.info("NFC Worker Initializing...");

    // 0. Initialize buzzer (PWM)
    try {
        pwm.init(dxDriver.PWM.BUZZER_CHANNEL);
        log.info("Buzzer initialized");
    } catch (e) {
        log.error("Failed to initialize buzzer:", e);
    }

    // 1. Initialize NFC
    dxNfcCard.init();

    // 2. Set Callbacks and emit events via EventBus
    dxNfcCard.setCallbacks({
        onCardDetected: (cardInfo) => {
            log.info("NFC Worker: Card Detected", cardInfo);
            lastCardInfo = cardInfo;

            // Beep when card detected (short beep)
            try {
                pwm.pressBeep(50, dxDriver.PWM.BUZZER_CHANNEL);
            } catch (e) {
                log.error("Beep error:", e);
            }

            bus.fire("nfc:card_detected", cardInfo);
        }
    });

    // 3. Start polling loop for card events
    std.setInterval(() => {
        dxNfcCard.loop();
    }, 100);

    // 4. Monitor card presence status
    let lastCardInState = false;
    std.setInterval(() => {
        const isIn = dxNfcCard.isCardIn();
        if (isIn !== lastCardInState) {
            lastCardInState = isIn;
            bus.fire("nfc:card_status", { isCardIn: isIn });
            log.info("NFC Worker: Card Status Changed", isIn ? "IN" : "OUT");
        }
    }, 200);

    // 5. Register RPC function to read blocks
    std.setTimeout(() => {
        bus.rpc.register("readBlocks", ({ startBlock, count }) => {
            log.info("NFC Worker: Reading blocks", startBlock, count);
            const blocks = [];
            const defaultKey = utils.codec.hexToArrayBuffer("FFFFFFFFFFFF");

            for (let i = 0; i < count; i++) {
                const blockNum = startBlock + i;
                try {
                    const data = dxNfcCard.m1ReadBlock(blockNum, defaultKey, 0x60);
                    const hexStr = utils.codec.arrayBufferToHex(data);
                    blocks.push({
                        blockNum: blockNum,
                        data: hexStr,
                        success: true
                    });
                    log.info(`Block ${blockNum}: ${hexStr}`);
                    std.sleep(200);//wait for 200ms to avoid rate limit
                } catch (e) {
                    log.error(`Failed to read block ${blockNum}:`, e);
                    blocks.push({
                        blockNum: blockNum,
                        data: "",
                        success: false,
                        error: String(e)
                    });
                }
            }
            return blocks;
        });
    }, 100);

    log.info("NFC Worker Loop Started");
} catch (error) {
    log.error("NFC Worker Error:", error);
}
