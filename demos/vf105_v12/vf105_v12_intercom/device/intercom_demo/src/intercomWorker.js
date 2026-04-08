/**
 * intercomWorker.js — network + media + intercom (worker thread)
 *
 * Role
 * ----
 * This file runs inside an os.Worker created by dxEventBus.newWorker from main.js.
 * It owns everything that should not block the UI thread:
 *   - dxNetwork: Ethernet (this demo uses DHCP via connectEthWithDHCP)
 *   - dxIvcore, dxCapturer, dxAudio, dxDisplay: pipeline expected by intercom / preview
 *   - dxIntercom: WebRTC-based visual intercom (init, setCallbacks, loop, answer, hangup)
 *
 * Main thread must never call these directly if you adopt this pattern; use bus.fire instead.
 *
 * Initialization order (recommended)
 * -----------------------------------
 *   1. dxNet.init() + setCallbacks — once
 *   2. Media stack: ivcore, capturer, audio, display — before dxIntercom.init when using video
 *   3. dxIntercom.init({ webrtc: { serno, customerserno, ... } }) — see dxIntercom.js for full config
 *   4. dxIntercom.setCallbacks(...) — incoming call, service online/offline, call lifecycle
 *   5. dxNet.connectEthWithDHCP() or connectEth(...) — after init
 *
 * Polling
 * -------
 * dxIntercom.loop() must be called periodically (e.g. every 30 ms) on this same thread so native
 * events become JS callbacks. If you rely on dxNetwork.getEvent / setCallbacks, also call
 * dxNet.loop() on the same interval in this worker (see dxNetwork.js).
 *
 * Session handling
 * ----------------
 * sessionId identifies one call. The worker keeps state.sessionId and notifies the UI with
 * bus.fire("ui.session", { sessionId }). Answer/Hangup from the UI include that id.
 *
 * Test this demo
 * -------------------
 *  https://webrtc.dxiot.com:8443/videocall/KDZN-00-1K4V-HBNJ-00000004
 */

import std from "../dxmodules/dxStd.js";
import log from "../dxmodules/dxLogger.js";
import bus from "../dxmodules/dxEventBus.js";
import dxNet from "../dxmodules/dxNetwork.js";
import dxIntercom from "../dxmodules/dxIntercom.js";
import dxIvcore from "../dxmodules/dxIvcore.js";
import dxCapture from "../dxmodules/dxCapturer.js";
import dxAudio from "../dxmodules/dxAudio.js";
import dxDisplay from "../dxmodules/dxDisplay.js";

const state = {
  netInited: false,
  intercomInited: false,
  sessionId: null,
};

function sendLog(message) {
  bus.fire("ui.log", { message: `[worker] ${message}` });
}

function sendSession() {
  bus.fire("ui.session", { sessionId: state.sessionId });
}

function safeCall(fn, errorPrefix) {
  try {
    return fn();
  } catch (e) {
    log.error(errorPrefix, e);
    sendLog(`${errorPrefix}: ${String(e)}`);
    return null;
  }
}

function initNetworkIfNeeded() {
  if (state.netInited) return;
  safeCall(() => {
    dxNet.init();
    dxNet.setCallbacks({
      onStatusChange: function (netType, status) {
        sendLog(`Network status: ${netType} -> ${status}`);
      },
    });
    state.netInited = true;
    sendLog("Network module initialized.");
  }, "Network init failed");
}

/**
 * One-time setup for intercom and its media dependencies.
 * webrtcSerno / webrtcUrl come from main (or extend payload with initstring, servers, etc.).
 */
function initIntercomIfNeeded(webrtcSerno, webrtcUrl) {
  if (state.intercomInited) return;
  safeCall(() => {
    dxIvcore.init();
    dxCapture.init();
    dxAudio.init();
    dxDisplay.init();

    dxIntercom.init({
      webrtc: {
        serno: webrtcSerno,
        servers: webrtcUrl,
      },
    });

    dxIntercom.setCallbacks({
      onServiceStatus: function (status) {
        sendLog(`Intercom service: ${status}`);
      },
      onIncoming: function (sessionId, action) {
        sendLog(`Incoming: sessionId=${sessionId}, action=${action}`);
        if (action === "start") {
          state.sessionId = sessionId;
          sendSession();
          dxIntercom.setAudio(true, true);
          dxIntercom.setVideo(true);
        }
        if (action === "end" && state.sessionId === sessionId) {
          state.sessionId = null;
          sendSession();
          dxIntercom.setAudio(false, false);
          dxIntercom.setVideo(false);
        }
      },
      onCallStart: function (sessionId) {
        sendLog(`Call started: sessionId=${sessionId}`);
        state.sessionId = sessionId;
        sendSession();
      },
      onCallEnd: function (sessionId) {
        sendLog(`Call ended: sessionId=${sessionId}`);
        if (state.sessionId === sessionId) {
          state.sessionId = null;
          sendSession();
        }
      },
      onCallFail: function (sessionId, reason) {
        sendLog(`Call failed: sessionId=${sessionId}, reason=${reason}`);
        if (state.sessionId === sessionId) {
          state.sessionId = null;
          sendSession();
        }
      },
    });

    state.intercomInited = true;
    sendLog("Intercom module initialized.");
  }, "Intercom init failed");
}

bus.on("worker.connect", (payload) => {
  const webrtcSerno = payload ? payload.webrtcSerno : "";
  const webrtcUrl = payload ? payload.webrtcUrl : "";

  initNetworkIfNeeded();
  initIntercomIfNeeded(webrtcSerno, webrtcUrl);

  safeCall(() => {
    dxNet.connectEthWithDHCP();
    sendLog("Ethernet connecting (DHCP).");
  }, "Ethernet connect failed");
});

bus.on("worker.answer", (payload) => {
  const sessionId = payload ? payload.sessionId : null;
  if (!sessionId) {
    sendLog("Answer ignored: no sessionId.");
    return;
  }
  safeCall(() => {
    dxIntercom.answer(sessionId);
    sendLog(`Answer sent: sessionId=${sessionId}`);
  }, "Answer failed");
});

bus.on("worker.hangup", (payload) => {
  const sessionId = payload ? payload.sessionId : null;
  if (!sessionId) {
    sendLog("Hangup ignored: no sessionId.");
    return;
  }
  safeCall(() => {
    dxIntercom.hangup(sessionId);
    sendLog(`Hangup sent: sessionId=${sessionId}`);
  }, "Hangup failed");
});

std.setInterval(() => {
  if (state.netInited) {
    safeCall(() => dxNet.loop(), "Network loop error");
  }
  if (state.intercomInited) {
    safeCall(() => dxIntercom.loop(), "Intercom loop error");
  }
}, 30);

sendLog("intercomWorker ready.");
