# DejaOS SDK 2.0 Development Guide

This reference summarizes practical rules for building DejaOS SDK 2.0 applications with JavaScript. DejaOS runs on embedded devices using QuickJS, LVGL, and native `dxmodules` wrappers.

## 1. Application Structure

Typical project layout:

```text
app/
  app.dxproj
  dxmodules/
  resource/
    font/
      font.ttf
  src/
    main.js
```

Runtime path conventions:

- `src/` is deployed to `/app/code/src`.
- `resource/` is deployed to `/app/code/resource`.
- Runtime data should be stored under `/app/data`.
- Resource paths in code should be absolute runtime paths, for example `/app/code/resource/image/logo.png`.

Supported device models include:

- `DW200_V20`
- `VF105_V12`
- `VF203_V12`
- `VF202_V12`
- `VF114_V12`

Always confirm the target device model before selecting components or copying project templates.

## 2. app.dxproj

`app.dxproj` declares the target model and selected components. Component JavaScript and native files are downloaded into `dxmodules/` by the DejaOS VSCode plugin.

Rules:

- Inspect `app.dxproj` before adding imports.
- Do not modify files under `dxmodules/`.
- If a required module is missing from `dxmodules/`, tell the user to enable that component in `app.dxproj` and run install from the DejaOS VSCode plugin.
- For new apps, start with base modules only unless the user asks for UI, network, storage, or hardware features.
- Add `dxUi` only when the app has a UI.

Example `app.dxproj` files are bundled in `assets/`.

## 3. Common Components

Base modules:

- `dxLogger`: logging. Use instead of `console.log`.
- `dxStd`: standard utilities, timers, files, shell-like helpers.
- `dxOs`: system-level features.
- `dxDriver`: device-specific constants such as display size, UART path, PWM channels.
- `dxMap`: shared key-value memory across workers.
- `dxEventBus`: cross-worker events and RPC.
- `dxCommonUtils`: common algorithms and codecs.

UI:

- `dxUi`: LVGL UI wrapper and UI controls.

Storage:

- `dxSqliteDB`: SQLite storage for relational data.
- `dxKeyValueDB`: simple key-value storage for lightweight configuration.

Network and communication:

- `dxNetwork`: network management.
- `dxHttpClient`: HTTP client and file download.
- `dxHttpServer`: HTTP server.
- `dxMqttClient`: MQTT client.

Hardware and device features:

- `dxAudio`: WAV playback and TTS support.
- `dxGpio`, `dxGpioKey`: GPIO output and input.
- `dxUart`: serial communication.
- `dxPwm`: PWM output.
- `dxNfc`, `dxNfcCard`: NFC features.
- `dxBarcode`: barcode and QR recognition.
- `dxWatchdog`: hardware/software watchdog.
- `dxNtp`: time synchronization.
- `dxOta`: OTA upgrade.
- `dxConfiguration`: configuration read/write.

## 4. Worker Model

DejaOS apps use multiple workers. Each worker is single-threaded. `dxStd.setTimeout` and `dxStd.setInterval` are pseudo-async inside one worker and still run sequentially.

Recommended worker split:

- `main.js`: initialize storage, hardware, watchdog, and create workers.
- `uiWorker.js`: initialize `dxUi`, register pages, run `dxui.handler()`.
- Dedicated workers for long loops: UART, MQTT, network management, face recognition, database-heavy work, or protocol processing.

Rules:

- Create workers with `dxEventBus.newWorker(...)`.
- Avoid native QuickJS worker APIs in app code.
- Keep `main.js` small.
- Put hardware loops and UI loops in separate workers.
- Wrap worker event handlers and timer bodies in `try/catch`.

Minimal `main.js` pattern:

```javascript
import bus from "../dxmodules/dxEventBus.js";
import log from "../dxmodules/dxLogger.js";

try {
  log.info("app start");
  bus.newWorker("uiWorker", "/app/code/src/uiWorker.js");
} catch (e) {
  log.error("main init failed", e);
}
```

## 5. Logging

Use `dxLogger`:

```javascript
import log from "../dxmodules/dxLogger.js";

log.info("message", data);
log.error("operation failed", error);
```

Rules:

- Do not use `console.log`.
- Pass `Error` objects directly to `log.error`; the logger can expand message and stack.
- Prefer structured multi-argument logging over manual string concatenation.

## 6. Imports

DejaOS does not use Node-style `node_modules` resolution.

Rules:

- Import `dxmodules` with relative paths based on file depth.
- From `src/main.js`: `../dxmodules/dxLogger.js`.
- From `src/pages/HomePage.js`: `../../dxmodules/dxLogger.js`.
- Be careful when moving files because relative module depth changes.

## 7. UI Development

Run UI in a dedicated worker.

Basic `uiWorker.js` pattern:

```javascript
import dxui from "../dxmodules/dxUi.js";
import log from "../dxmodules/dxLogger.js";
import std from "../dxmodules/dxStd.js";
import UIManager from "./UIManager.js";
import HomePage from "./pages/HomePage.js";

try {
  dxui.init({ orientation: 0 });
  UIManager.init();
  UIManager.register("home", HomePage);
  UIManager.open("home");

  std.setInterval(() => {
    dxui.handler();
  }, 20);
} catch (e) {
  log.error("uiWorker init failed", e);
}
```

UI page pattern:

```javascript
import dxui from "../../dxmodules/dxUi.js";
import dxDriver from "../../dxmodules/dxDriver.js";
import log from "../../dxmodules/dxLogger.js";
import UIManager from "../UIManager.js";

const MyPage = {
  id: "myPage",

  init: function () {
    const parent = UIManager.getRoot();
    this.root = dxui.View.build(this.id, parent);
    this.root.setSize(dxDriver.DISPLAY.WIDTH, dxDriver.DISPLAY.HEIGHT);
    this.root.radius(0);
    this.root.borderWidth(0);
    this.root.padAll(0);
    this.root.scroll(false);

    this.initView();
    return this.root;
  },

  initView: function () {
    this.btn = dxui.Button.build(this.id + "_btn", this.root);
    this.btn.setSize(120, 50);
    this.btn.align(dxui.Utils.ALIGN.CENTER, 0, 0);

    this.btnLabel = dxui.Label.build(this.id + "_btn_label", this.btn);
    this.btnLabel.text("OK");
    this.btnLabel.textFont(UIManager.font(18, dxui.Utils.FONT_STYLE.BOLD));
    this.btnLabel.align(dxui.Utils.ALIGN.CENTER, 0, 0);

    this.btn.on(dxui.Utils.EVENT.CLICK, () => {
      log.info("button clicked");
    });
  },

  onShow: function (data) {},
  onHide: function () {},
};

export default MyPage;
```

UI rules:

- Use a page manager such as `assets/UIManager.js` unless the project already has one.
- A page `init()` must return a root UI object.
- Put page-specific UI creation inside the page object.
- `uiButton` has no direct text property; create a child `Label`.
- `uiImage` is not directly clickable; wrap it with a transparent `View`.
- For overlays or modal UI, use `dxui.Utils.LAYER.TOP`.
- `uiView` has default padding and scrolling; call `padAll(0)` and usually `scroll(false)` for exact layout.
- `uiImage` does not automatically scale by default; size the image control and asset intentionally.
- If UI text is not pure English, provide a suitable TTF font, usually `/app/code/resource/font/font.ttf`.
- Cache font objects through `UIManager.font(size, style)`.

## 8. Resources

Rules:

- Place images, fonts, and audio under `resource/`.
- Use compressed images where possible.
- Use PNG for icons/transparency and JPEG for photo-like content.
- Avoid large bitmap assets on constrained devices.
- Keep font files small. For Chinese UI, provide a Chinese-capable TTF file.
- Reference resources with runtime absolute paths, for example `/app/code/resource/font/font.ttf`.

## 9. SQLite and Data

Use `dxSqliteDB` for structured data and `dxKeyValueDB` for simple key-value data.

Rules:

- Put database files under `/app/data/`.
- Keep quick reads/writes local when safe.
- Use a dedicated worker or service layer for heavy batch operations or high-frequency writes.
- Provide small escape/normalization helpers if writing SQL manually.
- Initialize schema on startup with `CREATE TABLE IF NOT EXISTS`.
- Keep API-facing row conversion in one place.

## 10. UART

Use a dedicated worker for serial communication.

Rules:

- Use `dxmodules/dxUart.js`.
- Use `dxDriver.CHANNEL` for device-specific paths.
- Use `dxCommonUtils` codec helpers for binary/hex processing.
- Use `dxEventBus` to send commands from UI/business logic to the UART worker.
- `receive(size, timeout, id)` waits for the requested size, but short timeouts may return empty or partial data. Design framing carefully.
- Validate checksums before handling frames.
- Keep protocol encode/decode separate from worker loop code.

Example baud-rate setup:

```javascript
dxUart.ioctl(6, "921600-8-N-1");
```

## 11. Network and MQTT

Use `dxNetwork` to manage connectivity. Once started, the network normally reconnects automatically after disconnection.

MQTT worker recommendations:

- Keep MQTT connection logic in its own worker.
- Store broker configuration in a service layer.
- Subscribe after successful connection.
- Use event bus topics for publish requests from other workers.
- Queue critical outbound events in SQLite before publishing.
- Delete queued events only after receiving a business acknowledgement.
- Poll `mqtt.loop()` frequently in a timer.
- Reinitialize MQTT on configuration changes through an event bus signal.

## 12. HTTP Client

Use `dxHttpClient`.

Typical response shape:

```javascript
{
  code: 0,
  status: 200,
  message: "",
  data: "..."
}
```

Rules:

- `code === 0` means the native request succeeded.
- `status === 200` means HTTP success.
- Parse `data` with `JSON.parse` when it contains JSON.
- For downloads, verify both native result and HTTP status.

## 13. Face Recognition

Use `dxFacial` in a dedicated face worker.

Core APIs:

- `face.init()`
- `face.loop()`
- `face.setCallbacks({ onRecognition })`
- `face.getFeaByCap(timeoutMs)`
- `face.getFeaByFile(filePath)`
- `face.addFea(userId, feature)`
- `face.deleteFea(userId)`

Recommended pattern:

- Initialize `dxFacial` once in the face worker.
- Keep `face.loop()` in a timer.
- Use event bus topics such as `FACE_START` and `FACE_STOP` to control recognition.
- In `onRecognition(event)`, forward the event to UI/business logic through `dxEventBus`.
- For photo enrollment, download the image to a local file, extract a feature with `getFeaByFile`, then call `addFea`.
- Track enrollment state in local storage when the app synchronizes users from a backend.
- On delete/clear operations, remove both algorithm features and local cache files.

## 14. Watchdog

Use `dxWatchdog` for crash recovery.

Recommended pattern:

- Initialize the watchdog in `main.js`.
- Enable one or more channels.
- Start with a global timeout.
- Feed the watchdog with `watchdog.restart(channel)` on a stable interval.
- If using multiple worker channels, ensure every enabled channel is fed.

## 15. Review Checklist

When reviewing DejaOS SDK 2.0 code, check:

- Is the target model known and reflected in `app.dxproj`?
- Are all imported `dxmodules` selected and installed?
- Are `dxmodules` treated as read-only vendor files?
- Is UI isolated in a UI worker?
- Are UART, MQTT, face recognition, and other loops isolated from UI?
- Are hardware/network/file/database boundaries wrapped in `try/catch`?
- Are resource paths absolute runtime paths?
- Is Chinese or non-English UI backed by a font file?
- Are `uiButton` labels implemented with child `Label` controls?
- Are clickable images wrapped by `View` controls?
- Does `main.js` only initialize and create workers?
- Are outbound events persisted before publish if delivery matters?
- Are queued events deleted only after acknowledgement?
- Are long loops bounded and device-friendly?
