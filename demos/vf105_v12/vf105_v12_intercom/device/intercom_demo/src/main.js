/**
 * main.js — UI entry (main thread)
 *
 * Purpose
 * -------
 * This demo shows a minimal pattern for a visual intercom app on DejaOS:
 *   - Main thread: LVGL UI only (dxUi), periodic dxui.handler().
 *   - Worker thread: network, camera pipeline, audio, display preview, WebRTC intercom.
 *   - Cross-thread messaging: dxEventBus (fire / on).
 *
 * Why split UI and intercom?
 * --------------------------
 * Intercom (dxIntercom) and related drivers often block or run callbacks; keeping them in a
 * worker avoids freezing the UI. The UI sends commands and receives log lines + session id.
 *
 * Event bus topics (contract between main.js and intercomWorker.js)
 * -----------------------------------------------------------------
 *   Main -> worker:
 *     worker.connect   { webrtcSerno, webrtcCustomerSerno } — init stack + Ethernet DHCP
 *     worker.answer    { sessionId } — answer incoming call
 *     worker.hangup    { sessionId } — hang up
 *
 *   Worker -> main:
 *     ui.log           { message } — one line of text for the log textarea
 *     ui.session       { sessionId | null } — current call session (for Answer/Hangup)
 *
 *
 * Notes
 * -----
 * - Worker script path passed to bus.newWorker must exist on device (see app packaging).
 * - UI strings and comments here are in English for consistency with module docs.
 */

import dxui from "../dxmodules/dxUi.js";
import dxDriver from "../dxmodules/dxDriver.js";
import std from "../dxmodules/dxStd.js";
import log from "../dxmodules/dxLogger.js";
import bus from "../dxmodules/dxEventBus.js";

// ---------------------------------------------------------------------------
// Configuration — change for your device / platform registration
// ---------------------------------------------------------------------------
/** Device serial reported to the WebRTC / intercom service (platform-specific format). */
const WEBRTC_SERNO = "KDZN-00-1K4V-HBNJ-00000004";
/** WebRTC service URL. */
const WEBRTC_URL = "webrtc.dxiot.com:6699";

// ---------------------------------------------------------------------------
// UI runtime state (main thread only)
// ---------------------------------------------------------------------------
const context = {
    id: "intercom_main",
    /** Mirrored from worker via ui.session; used when firing worker.answer / worker.hangup. */
    sessionId: null,
    logLines: [],
    /** When appendLog exceeds this count, the log buffer is cleared and only the new line remains. */
    logMaxLines: 20,
};

function nowTimeString() {
    const d = new Date();
    const hh = String(d.getHours()).padStart(2, "0");
    const mm = String(d.getMinutes()).padStart(2, "0");
    const ss = String(d.getSeconds()).padStart(2, "0");
    return `${hh}:${mm}:${ss}`;
}

function setLogText() {
    if (!context.textarea) return;
    context.textarea.text(context.logLines.join("\n"));
}

function appendLog(message) {
    const line = `[${nowTimeString()}] ${message}`;
    context.logLines.push(line);
    if (context.logLines.length > context.logMaxLines) {
        context.logLines = [line];
    }
    setLogText();
}

/** Runs fn; on throw logs to dxLogger and appends a line to the UI log. */
function safeCall(fn, onErrorMessage) {
    try {
        return fn();
    } catch (e) {
        log.error(onErrorMessage, e);
        appendLog(`${onErrorMessage}: ${String(e)}`);
        return null;
    }
}

/**
 * Starts the intercom worker and subscribes to topics the worker publishes.
 * Call once after initUi() so the user sees "worker created" in the log.
 */
function setupWorkerBridge() {
    safeCall(() => {
        bus.newWorker("intercomWorker", "/app/code/src/intercomWorker.js");
        appendLog("intercomWorker created.");
    }, "Create worker failed");

    bus.on("ui.log", (payload) => {
        if (!payload || !payload.message) return;
        appendLog(payload.message);
    });

    bus.on("ui.session", (payload) => {
        if (!payload) return;
        context.sessionId = payload.sessionId || null;
    });
}

/**
 * Builds a single full-screen page: read-only log textarea + three action buttons.
 *
 * Screen geometry uses dxDriver.DISPLAY; orientation 0 matches portrait 800x1280 on vf105.
 * If your product uses landscape, set dxui.init({ orientation: 1 }) and adjust layout.
 */
function initUi() {
    dxui.init({ orientation: 0 }, context);

    const W = dxDriver.DISPLAY.WIDTH;
    const H = dxDriver.DISPLAY.HEIGHT;

    context.root = dxui.View.build(context.id, dxui.Utils.LAYER.MAIN);
    context.root.setSize(W, H);
    context.root.setPos(0, 0);
    context.root.radius(0);
    context.root.borderWidth(0);
    context.root.padAll(0);
    context.root.bgColor(0x101317);
    context.root.bgOpa(0);

    const margin = Math.round(W * 0.03);
    const gap = Math.round(W * 0.02);
    const bottomBarH = Math.round(H * 0.12);
    const bottomBarW = W - margin * 2;

    context.textarea = dxui.Textarea.build(context.id + "_log", context.root);
    context.textarea.setPos(margin, margin);
    context.textarea.setSize(W - margin * 2, H - margin * 2 - bottomBarH - gap);
    context.textarea.bgColor(0x0b0f14);
    context.textarea.bgOpa(0);
    context.textarea.radius(10);
    context.textarea.borderWidth(2);
    context.textarea.borderColor(0x223046);
    context.textarea.textColor(0xd6dde6);
    const logFont = dxui.Font.build("/app/code/resource/font/font.ttf", 24, dxui.Utils.FONT_STYLE.NORMAL);
    context.textarea.textFont(logFont);
    context.textarea.padAll(12);
    context.textarea.setAlign(dxui.Utils.TEXT_ALIGN.LEFT);
    context.textarea.setCursorClickPos(false);
    context.textarea.clickable(false);
    context.textarea.disable(true);

    context.bottomBar = dxui.View.build(context.id + "_bottom", context.root);
    context.bottomBar.setPos(margin, H - margin - bottomBarH);
    context.bottomBar.setSize(bottomBarW, bottomBarH);
    context.bottomBar.bgOpa(0);
    context.bottomBar.radius(0);
    context.bottomBar.borderWidth(0);
    context.bottomBar.padAll(0);
    context.bottomBar.scroll(false);

    const btnW = Math.floor((bottomBarW - gap * 2) / 3);
    const btnH = bottomBarH;
    const btnRadius = 12;

    context.btnConnect = dxui.Button.build(context.id + "_btn_connect", context.bottomBar);
    context.btnConnect.setPos(0, 0);
    context.btnConnect.setSize(btnW, btnH);
    context.btnConnect.bgColor(0x2563eb);
    context.btnConnect.radius(btnRadius);
    context.btnConnectLabel = dxui.Label.build(context.id + "_lbl_connect", context.btnConnect);
    context.btnConnectLabel.text("Network");
    context.btnConnectLabel.textColor(0xffffff);
    context.btnConnectLabel.align(dxui.Utils.ALIGN.CENTER, 0, 0);

    context.btnAnswer = dxui.Button.build(context.id + "_btn_answer", context.bottomBar);
    context.btnAnswer.setPos(btnW + gap, 0);
    context.btnAnswer.setSize(btnW, btnH);
    context.btnAnswer.bgColor(0x16a34a);
    context.btnAnswer.radius(btnRadius);
    context.btnAnswerLabel = dxui.Label.build(context.id + "_lbl_answer", context.btnAnswer);
    context.btnAnswerLabel.text("Answer");
    context.btnAnswerLabel.textColor(0xffffff);
    context.btnAnswerLabel.align(dxui.Utils.ALIGN.CENTER, 0, 0);

    context.btnHangup = dxui.Button.build(context.id + "_btn_hangup", context.bottomBar);
    context.btnHangup.setPos((btnW + gap) * 2, 0);
    context.btnHangup.setSize(btnW, btnH);
    context.btnHangup.bgColor(0xdc2626);
    context.btnHangup.radius(btnRadius);
    context.btnHangupLabel = dxui.Label.build(context.id + "_lbl_hangup", context.btnHangup);
    context.btnHangupLabel.text("Hangup");
    context.btnHangupLabel.textColor(0xffffff);
    context.btnHangupLabel.align(dxui.Utils.ALIGN.CENTER, 0, 0);

    context.btnConnect.on(dxui.Utils.EVENT.CLICK, onConnectClick);
    context.btnAnswer.on(dxui.Utils.EVENT.CLICK, onAnswerClick);
    context.btnHangup.on(dxui.Utils.EVENT.CLICK, onHangupClick);

    dxui.loadMain(context.root);

    appendLog("UI ready.");
    appendLog(`Buttons ready. bar=${bottomBarW}x${bottomBarH}, btn=${btnW}x${btnH}`);
    appendLog("Tap Network to start Ethernet + intercom in the worker.");
}

/** Ask the worker to initialize network and intercom, then bring up Ethernet (DHCP). */
function onConnectClick() {
    appendLog("Network clicked.");
    bus.fire("worker.connect", {
        webrtcSerno: WEBRTC_SERNO,
        webrtcUrl: WEBRTC_URL,
    });
}

function onAnswerClick() {
    if (!context.sessionId) {
        appendLog("Answer clicked, but there is no active incoming session.");
        return;
    }
    bus.fire("worker.answer", { sessionId: context.sessionId });
    appendLog(`Answer requested: sessionId=${context.sessionId}`);
}

function onHangupClick() {
    if (!context.sessionId) {
        appendLog("Hangup clicked, but there is no active session.");
        return;
    }
    const sid = context.sessionId;
    bus.fire("worker.hangup", { sessionId: sid });
    appendLog(`Hangup requested: sessionId=${sid}`);
}

/** LVGL timer pump; must run periodically on the UI thread. */
function startLoops() {
    std.setInterval(() => {
        dxui.handler();
    }, 30);
}

initUi();
setupWorkerBridge();
startLoops();
log.info("App started.");
