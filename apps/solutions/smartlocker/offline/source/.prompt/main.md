# dejaOS Development Guide

## 1. What is dejaOS

dejaOS is a JavaScript runtime running on embedded devices.  
It is built on top of the quickjs engine and the lvgl graphics library, and provides dozens of JS components that bridge C libraries to JavaScript.  
Developers can build device applications using ES6+ and these JS components only.

---

## 2. Basic Application Structure

```
app/
├── app.dxproj              # App config: selected components and versions
├── dxmodules/              # All component .js and .so files, auto-downloaded from config; can be called but MUST NOT be modified
├── resource/               # App resources: images, fonts, audio (wav), etc.
│   ├── font
│       ├── font.ttf        # If you need non-English text, usually you must provide a font file
├── src/
│   ├── main.js             # Entry point, required
```

`src` is synced to the device at absolute path `/app/code/src`.  
By convention, data files are stored under `/app/data`.

---

### 2.1 Supported Device Types

`DW200_V20, VF105_V12, VF203_V12, VF202_V12, VF114_V12`

You must decide the target device type before development.

---

### 2.2 `app.dxproj` Format

Different device types have different example files that list all available components and latest versions.  
For example, for `DW200_V20`, refer to `DW200_V20-app.dxproj`.

---

### 2.3 Module Overview

- **Core modules (required)**:  
  `dxLogger` (logging, instead of `console.log`),  
  `dxStd` (standard system utilities),  
  `dxOs` (OS related),  
  `dxDriver` (drivers),  
  `dxMap` (shared memory across workers),  
  `dxEventBus` (cross-worker messaging),  
  `dxCommonUtils` (common algorithms and utils).

- **UI**:  
  `dxUi` (required if you need UI).

- **Data storage**:  
  `dxSqliteDB` (SQLite data module),  
  `dxKeyValueDB` (simple key/value data storage).

- **Networking**:  
  `dxNetwork` (network manager, required),  
  `dxHttpClient` (HTTP client),  
  `dxHttpServer` (HTTP server),  
  `dxMqttClient` (MQTT client).

- **Audio playback**:  
  `dxAudio` (WAV playback, TTS).

- **GPIO control**:  
  `dxGpio` (GPIO output),  
  `dxGpioKey` (GPIO input monitoring).

- **Others**:  
  `dxBarcode` (QR / barcode recognition),  
  `dxNfc` (NFC),  
  `dxUart` (UART / serial),  
  `dxPwm` (PWM, mainly buzzer and light),  
  `dxWatchdog` (watchdog),  
  `dxNtp` (time sync),  
  `dxOta` (OTA upgrade),  
  `dxConfiguration` (configuration read/write).

> When generating a new `app.dxproj`:  
> If the user has no special requirements, **only select the core modules**.  
> If UI is needed, add `dxUi` on top of the core modules.

---

### 2.4 App Notes

1. General description:

- VSCode provides a dejaOS extension.  
  Select the required components and versions in `app.dxproj` (usually use latest), then click `install`.  
  This will download all component JS sources into `dxmodules`.  
  You can refer to those JS files for APIs.  
  If you cannot find a JS file under `dxmodules`, ask the user to check the corresponding component in `app.dxproj` and click `install` again.

- Unlike **Node.js** single-thread event loop, a dejaOS app uses multiple workers.  
  Inside a single worker it is still single-threaded.  
  Although `dxStd.setTimeout` and `dxStd.setInterval` are supported, they are "pseudo-async" within one worker (executed sequentially).

- `main.js` should _only_ handle initialization for modules and workers, not business logic.

- Do **not** use quickjs native worker init APIs; always use `dxEventBus.newWorker` instead.

- Most apps do not need all components; only select what is necessary.

- All resources (images, fonts, etc.) are placed in the `resource` directory next to `src`.

- When referring to resources (images, fonts) in code, use absolute paths, e.g.:  
  `dxui.Image.build('img1', parent).source('/app/code/resource/logo.png')`

---

## 3. UI

- UI should run in a **separate worker**, not in the main thread.

- Required JS files: `dxmodules/dxUi.js` and all `dxmodules/ui*.js`, including:

  - `uiBase.js`: base UI class, all controls inherit from this; provides size, position, events, style, etc.
  - `uiButton.js`: button.
  - `uiButtons.js`: button matrix / group.
  - `uiCheckbox.js`: checkbox.
  - `uiDropdown.js`: dropdown.
  - `uiFont.js`: font wrapper.
  - `uiImage.js`: image display.
  - `uiKeyboard.js`: on-screen keyboard (supports pinyin).
  - `uiLabel.js`: text label.
  - `uiLine.js`: line.
  - `uiList.js`: list.
  - `uiSlider.js`: slider.
  - `uiStyle.js`: style wrapper, used to configure control styles.
  - `uiSwitch.js`: switch.
  - `uiTextarea.js`: multi-line text input.
  - `uiUtils.js`: UI utils, constants, enums, init and helpers.
  - `uiView.js`: basic container view, similar to `div`.

- UI page management: see `UIManager.js`, which implements a single-screen multi-page stack.

- Font files should be as small as possible.  
  **If UI text contains Chinese or other non-English characters, you MUST provide a corresponding TTF font file**, usually at `/app/code/resource/font/font.ttf`.  
  In code, always get font via `UIManager.font(size, style)`.  
  If the developer uses a non-English language, remind them to prepare a suitable TTF file.

- `uiButton` does **not** have a `text` property.  
  If you need text, create a `Label` inside the button and set `text` / `textFont` on that label.

- `uiImage` does **not** support click events by itself.  
  Wrap it with a transparent `View` and register click events on that `View`.

- If a UI control's parent is `dxui.Utils.LAYER.TOP`, it will always be on top of other layers, typically used for dialogs or status bars.

---

## 4. UART / Serial

- UART communication is recommended to run in a **separate worker**; do not send/receive directly in main thread.

- Main UART interface: `dxmodules/dxUart.js`.  
  For reference, see `dxmodules/vgUartWorker.js`.

- Device-related UART parameters can be found at `dxmodules/dxDriver.js` → `dxDriver.CHANNEL`.

- UART send/receive is asynchronous; use `dxmodules/dxEventBus.js` event/rpc for coordination.

- For binary/encoding handling, use codec utilities from `dxmodules/dxCommonUtils.js`.

- Example for setting UART parameters:  
  `dxUart.ioctl(6, '921600-8-N-1')`

- `receive` is special:  
  if the received data length is less than `size`, it will wait until it reaches `size`.  
  But if `timeout` is short, it might end early with empty data.

---

## 5. Database

- Prefer using `dxmodules/dxSqliteDB.js` for CRUD.  
  For very simple, small key/value data, you can use `dxmodules/dxKeyValueDB.js` or `dxmodules/kvdbWorker.js`.  
  Key/value is faster but has no SQL and does not suit complex queries.

- DB read/write does not always need its own worker:  
  Simple, fast queries or small writes can run in any worker.  
  Only heavy batch operations or high-frequency writes should go to a dedicated DB worker.

- If you put DB read/write in a dedicated worker, use `dxmodules/dxEventBus.js` event/rpc to pass data between UI/business workers and the DB worker.

- DB files are conventionally placed under `/app/data/`.

---

## 6. Logging

- Always use `dxmodules/dxLogger.js`; do **not** call `console.log` from business code.  
  Recommended:  
  `import log from "../../dxmodules/dxLogger.js";` then `log.debug / log.info / log.error`.

- Logging functions support multiple parameters, e.g.:  
  `log.info("HomePage onShow", data)` — no need to concatenate strings manually.

- For `Error` objects, just call `log.error(e)`; logger will automatically expand `message` and `stack`.

---

## 7. Time

- Time sync and system time settings are usually done via `dxmodules/dxNtp.js`,  
  which handles NTP sync, setting system time, and simple timezone/offset (good enough for most apps).

- For full timezone support (world clock, multiple cities, etc.), use `dxmodules/dxTimeZones.js`, which includes complete timezone data and conversion logic.

---

## 3. Core Code Templates

### 3.1 Standard UI Page Pattern (with `UIManager`)

```javascript
import dxui from "../../dxmodules/dxUi.js";
import log from "../../dxmodules/dxLogger.js";
import dxDriver from "../../dxmodules/dxDriver.js";
import utils from "../../dxmodules/dxCommonUtils.js";
import UIManager from "../UIManager.js"; // assume UIManager is under src

const MyPage = {
  id: "myhomePage",
  // Page init, called once
  init: function () {
    // 1. Get UIManager root as parent
    const parent = UIManager.getRoot();

    // 2. Create full-screen root View
    this.root = dxui.View.build(this.id, parent);
    this.root.setSize(dxDriver.DISPLAY.WIDTH, dxDriver.DISPLAY.HEIGHT);
    this.root.radius(0);
    this.root.borderWidth(0);
    this.root.padAll(0);

    this.root.bgColor(0x000000); // background

    // 3. Create children
    this.initView();

    // 4. Must return root
    return this.root;
  },

  initView: function () {
    // Example: button (Button + inner Label)
    this.btn = dxui.Button.build(this.id + "_btn", this.root);
    this.btn.setSize(100, 50);
    this.btn.align(dxui.Utils.ALIGN.CENTER, 0, 0);

    // Button text label
    this.btnLabel = dxui.Label.build(this.id + "_btn_label", this.btn);
    this.btnLabel.textFont(UIManager.font(16, dxui.Utils.FONT_STYLE.BOLD));
    this.btnLabel.text("Click Me");
    this.btnLabel.align(dxui.Utils.ALIGN.CENTER, 0, 0);

    // Button click
    this.btn.on(dxui.Utils.EVENT.CLICK, () => {
      log.info("Button clicked");
    });

    // Example: clickable icon (Image + outer transparent View)
    this.iconArea = dxui.View.build(this.id + "_icon_area", this.root);
    this.iconArea.setSize(48, 48);
    this.iconArea.bgOpa(0);
    this.iconArea.radius(0);
    this.iconArea.borderWidth(0);
    this.iconArea.padAll(0);
    // Place at top-right using absolute coordinates instead of align
    this.iconArea.setPos(dxDriver.DISPLAY.WIDTH - 48 - 16, 16);

    this.iconImage = dxui.Image.build(this.id + "_icon", this.iconArea);
    this.iconImage.source("/app/code/resource/image/icon_admin.png");
    this.iconImage.align(dxui.Utils.ALIGN.CENTER, 0, 0);

    // Example of alignTo: label below icon
    this.iconLabel = dxui.Label.build(this.id + "_icon_label", this.iconArea);
    this.iconLabel.text("Admin");
    this.iconLabel.textFont(UIManager.font(14, dxui.Utils.FONT_STYLE.NORMAL));
    // Align text under icon, centered, with 4px offset
    this.iconLabel.alignTo(this.iconImage, dxui.Utils.ALIGN.BOTTOM_MID, 0, 4);

    this.iconArea.on(dxui.Utils.EVENT.CLICK, () => {
      log.info("Click admin icon");
    });
  },

  // Called when page is shown; data holds parameters
  onShow: function (data) {
    if (data) {
      log.info("Received data:", data);
    }
  },

  // Called when page is hidden
  onHide: function () {},
};

export default MyPage;
```

---

### 3.2 UI Worker Entry (`uiWorker.js`)

```javascript
import dxui from "../dxmodules/dxUi.js";
import log from "../dxmodules/dxLogger.js";
import std from "../dxmodules/dxStd.js";
import UIManager from "./UIManager.js"; // assume UIManager is under src
import HomePage from "./pages/HomePage.js"; // import page

try {
  // UI init config
  dxui.init({ orientation: 1 });

  // 1. Init UIManager
  UIManager.init();

  // 2. Register pages
  UIManager.register("home", HomePage);

  // 3. Open home
  UIManager.open("home");

  // 4. Start UI event loop
  std.setInterval(() => {
    dxui.handler();
  }, 20);
} catch (error) {
  log.error(error);
}
```

---

### 3.3 Main Thread (`main.js`)

```javascript
import bus from "../dxmodules/dxEventBus.js";
import log from "../dxmodules/dxLogger.js";
function init() {}
// 1. Initialize hardware (GPIO, PWM, etc.)
try {
  init();
} catch (e) {
  log.error("init error", e);
}
// 2. Create worker
const uiWorker = bus.newWorker("uiWorker", "/app/code/src/uiWorker.js");
```
