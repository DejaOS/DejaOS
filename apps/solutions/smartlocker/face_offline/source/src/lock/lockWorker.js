import std from "../../dxmodules/dxStd.js";
import log from "../../dxmodules/dxLogger.js";
import bus from "../../dxmodules/dxEventBus.js";
import uart from "../../dxmodules/dxUart.js";
import dxDriver from "../../dxmodules/dxDriver.js";
import dxCommonUtils from "../../dxmodules/dxCommonUtils.js";
import LockBoardProtocol from "./LockBoardProtocol.js";
import LogProxy from "../log/LogProxy.js";

const UART_ID = "lockBoard";
// UART path from dxDriver.CHANNEL
const UART_PATH = dxDriver.CHANNEL.UART_PATH;

// Event topics for UI/other workers
const TOPIC_CMD = "lock/cmd";   // Send: { action, boardAddr, lockNo }
const TOPIC_EVENT = "lock/event"; // Board response: { type, ... }
const TOPIC_ERROR = "lock/error"; // UART or protocol error

function initUart() {
    try {
        // Open UART (485)
        uart.open(uart.TYPE.UART, UART_PATH, UART_ID);
        // 9600-8-N-1
        uart.ioctl(
            uart.IOC_SET_CMD.CHANNEL_IOC_SET_UART_PARAM,
            "9600-8-N-1",
            UART_ID
        );
        log.info("lockWorker: UART init success on " + UART_PATH);
    } catch (e) {
        log.error("lockWorker: UART init failed", e);
        // Do not stop worker; UI can show hint later
    }
}

function sendFrame(frame) {
    if (!frame || frame.byteLength === 0) return;
    try {
        const hex = dxCommonUtils.codec.bytesToHex(Array.from(frame));
        LogProxy.info("lock.tx", "Send lock command", { hex });
        uart.send(frame.buffer, UART_ID);
    } catch (e) {
        log.error("lockWorker: uart.send failed", e);
        bus.fire(TOPIC_ERROR, {
            source: "send",
            message: "UART send failed",
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
                message: "Unknown lock command: " + cmd.action,
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

    // Only 5-byte fixed response frames: 8A/80/81 addr lock status bcc
    if (buf.byteLength !== 5) {
        log.error(
            `lockWorker: unexpected frame length=${buf.byteLength}, expect 5`
        );
        return;
    }

    const arr = Array.from(buf);
    const hex = dxCommonUtils.codec.bytesToHex(arr);

    LogProxy.info("lock.rx", "Lock board response frame", { hex });

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
            message: "Lock board response BCC check failed",
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
        log.info("lockWorker: Unparsed 5-byte response frame", arr);
    }
}

function startPollLoop() {
    // Poll loop: uart.receive(5, 100) blocks up to 100ms
    std.setInterval(() => {
        try {
            const data = uart.receive(5, 100, UART_ID);
            if (data && data.byteLength > 0) {
                handleUartData(data);
            }
        } catch (e) {
            log.error("lockWorker: uart.receive error: ", e);
            bus.fire(TOPIC_ERROR, {
                source: "receive",
                message: "UART read failed",
                detail: "" + (e && e.message ? e.message : e),
            });
        }
    }, 20);
}

// Subscribe to command topic (UI/business fire)
bus.handlers[TOPIC_CMD] = function (cmd) {
    handleCmd(cmd);
};

// Init UART and start poll loop
initUart();
startPollLoop();

log.info("lockWorker: started");


