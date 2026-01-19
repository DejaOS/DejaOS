import std from "../../dxmodules/dxStd.js";
import log from "../../dxmodules/dxLogger.js";
import bus from "../../dxmodules/dxEventBus.js";
import uart from "../../dxmodules/dxUart.js";
import dxDriver from "../../dxmodules/dxDriver.js";
import dxCommonUtils from "../../dxmodules/dxCommonUtils.js";
import LockBoardProtocol from "./LockBoardProtocol.js";
import LogProxy from "../log/LogProxy.js";

const UART_ID = "lockBoard";
// Get UART device path from dxDriver.CHANNEL to avoid hard‑coding
const UART_PATH = dxDriver.CHANNEL.UART_PATH;

// Public topics (UI or other workers can subscribe if needed)
const TOPIC_CMD = "lock/cmd"; // Send command: { action, boardAddr, lockNo }
const TOPIC_EVENT = "lock/event"; // Receive board feedback: { type, ... }
const TOPIC_ERROR = "lock/error"; // UART / protocol error

function initUart() {
    try {
        // Open UART (RS‑485) channel; type is UART; path follows device docs and dxDriver.
        uart.open(uart.TYPE.UART, UART_PATH, UART_ID);
        // Set UART params in "baud‑data‑parity‑stop" format (see `.prompt/main.md` example).
        // Here we use 9600‑8‑N‑1 per protocol: 9600 baud, 8 data bits, no parity, 1 stop bit.
        uart.ioctl(
            uart.IOC_SET_CMD.CHANNEL_IOC_SET_UART_PARAM,
            "9600-8-N-1",
            UART_ID
        );
        log.info("lockWorker: UART init success on " + UART_PATH);
    } catch (e) {
        log.error("lockWorker: UART init failed", e);
        // Do not stop worker on error; UI can display error later if needed.
    }
}

function sendFrame(frame) {
    if (!frame || frame.byteLength === 0) return;
    try {
        const hex = dxCommonUtils.codec.bytesToHex(Array.from(frame));
        // Log raw TX frame (hex string) for future troubleshooting
        LogProxy.info("lock.tx", "send lock command", { hex });
        uart.send(frame.buffer, UART_ID);
    } catch (e) {
        log.error("lockWorker: uart.send failed", e);
        bus.fire(TOPIC_ERROR, {
            source: "send",
                message: "failed to send UART data",
            detail: "" + (e && e.message ? e.message : e),
        });
    }
}

function handleCmd(cmd) {
    if (!cmd || !cmd.action) return;

    const boardAddr = cmd.boardAddr || 0x01;
    let frame = null;

    switch (cmd.action) {
        case "openAll": {
            frame = LockBoardProtocol.buildOpenAll(boardAddr);
            break;
        }
        case "openOne": {
            if (typeof cmd.lockNo !== "number") {
                bus.fire(TOPIC_ERROR, {
                    source: "cmd",
                    message: "openOne missing lockNo",
                    detail: cmd,
                });
                return;
            }
            frame = LockBoardProtocol.buildOpenOne(boardAddr, cmd.lockNo);
            break;
        }
        case "queryOne": {
            if (typeof cmd.lockNo !== "number") {
                bus.fire(TOPIC_ERROR, {
                    source: "cmd",
                    message: "queryOne missing lockNo",
                    message: "queryOne missing lockNo",
                    detail: cmd,
                });
                return;
            }
            frame = LockBoardProtocol.buildQueryOne(boardAddr, cmd.lockNo);
            break;
        }
        default: {
            bus.fire(TOPIC_ERROR, {
                source: "cmd",
                message: "unknown lock command: " + cmd.action,
                detail: cmd,
            });
            return;
        }
    }

    if (frame) {
        sendFrame(frame);
    }
}

function handleUartData(buf) {
    if (!buf || buf.byteLength === 0) {
        return;
    }

    // Current implementation only supports fixed‑length 5‑byte reply frames:
    // 8A addr lock status bcc / 80 addr lock status bcc / 81 addr lock status bcc
    if (buf.byteLength !== 5) {
        log.error(
            `lockWorker: unexpected frame length=${buf.byteLength}, expect 5`
        );
        return;
    }

    const arr = Array.from(buf);
    const hex = dxCommonUtils.codec.bytesToHex(arr);

    // Log raw RX frame (hex string)
    LogProxy.info("lock.rx", "receive lock reply frame", { hex });

    const recvBcc = arr[4];
    const calc = LockBoardProtocol.calcBcc(arr.slice(0, 4));
    if (recvBcc !== calc) {
        log.error(
            `lockWorker: BCC check failed, recv=0x${recvBcc.toString(
                16
            )}, calc=0x${calc.toString(16)}`
        );
        bus.fire(TOPIC_ERROR, {
            source: "receive",
            message: "lock board BCC check failed",
            detail: {
                raw: arr,
                recvBcc,
                calc,
            },
        });
        return;
    }

    const parsed = LockBoardProtocol.parseFrame(buf);
    if (parsed) {
        bus.fire(TOPIC_EVENT, parsed);
    } else {
        log.info("lockWorker: unrecognized 5‑byte reply frame", arr);
    }
}

function startPollLoop() {
    // Follow vgUartWorker pattern: fixed‑interval polling timer.
    // Note: uart.receive(5, 50) may block up to 100ms; the interval here is just an upper bound trigger rate.
    std.setInterval(() => {
        try {
            // Protocol reply is fixed at 5 bytes; read exactly 5 bytes.
            // If we don't get enough bytes within timeout, this returns empty and next tick will retry.
            const data = uart.receive(5, 100, UART_ID);
            if (data && data.byteLength > 0) {
                handleUartData(data);
            }
        } catch (e) {
            // UART may not be opened yet; this will keep throwing. Do basic log + event.
            log.error("lockWorker: uart.receive error: ", e);
            bus.fire(TOPIC_ERROR, {
                source: "receive",
                message: "UART receive failed",
                detail: "" + (e && e.message ? e.message : e),
            });
        }
    }, 20);
}

// Subscribe command topic so UI / business threads can fire commands in.
bus.handlers[TOPIC_CMD] = function (cmd) {
    handleCmd(cmd);
};

// Initialize UART and start polling loop
initUart();
startPollLoop();

log.info("lockWorker: started");


