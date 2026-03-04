# DejaOS Application Development Prompt

## 1. What is DejaOS?

DejaOS is a JavaScript runtime for embedded devices, built on:

- **QuickJS** (JS engine)
- **LVGL** (graphics library)

It exposes dozens of JS components that wrap underlying C libraries.  
Developers can build apps entirely with ES6+ and these JS components, without touching C directly.

---

## 2. Basic application structure

```text
app/
├── app.dxproj              # App configuration: which components and versions to use
├── dxmodules/              # All component JS and .so files, auto-downloaded from config.
│                           # You should only call them, never modify them.
├── resource/               # App resources: images, fonts, wav audio, etc.
│   ├── font
│       ├── font.ttf        # If UI text is not pure English, usually must provide a TTF font
├── src/
│   ├── main.js             # Entry point (must exist)
```

The `src` directory is synchronized to the device at absolute path `/app/code/src`.  
All data files are conventionally stored under `/app/data`.

### 2.1 Supported device types

- DW200_V20  
- VF105_V12  
- VF203_V12  
- VF202_V12  
- VF114_V12  

The developer must first confirm which device model is being targeted.

### 2.2 `app.dxproj` format

Different device types use different example `app.dxproj` files, each listing all optional components and their latest versions.  
For example, for **DW200_V20**, refer to `DW200_V20-app.dxproj`.

### 2.3 Component overview

- **Base modules (required)**  
  `dxLogger` (logging, replaces `console.log`),  
  `dxStd` (standard system utilities),  
  `dxOs` (OS-related APIs),  
  `dxDriver` (hardware driver access),  
  `dxMap` (shared memory across workers),  
  `dxEventBus` (message passing across workers),  
  `dxCommonUtils` (common algorithms and utilities).

- **UI**  
  `dxUi` (must be selected if you need a UI).

- **Data storage**  
  `dxSqliteDB` (SQLite data access),  
  `dxKeyValueDB` (simple key–value storage).

- **Networking**  
  `dxNetwork` (network manager, required if you use networking),  
  `dxHttpClient` (HTTP client),  
  `dxHttpServer` (HTTP server),  
  `dxMqttClient` (MQTT client).

- **Audio playback**  
  `dxAudio` (WAV playback, TTS).

- **GPIO**  
  `dxGpio` (GPIO output control),  
  `dxGpioKey` (GPIO input monitoring).

- **Others**  
  `dxBarcode` (barcode/QR recognition),  
  `dxNfc` (NFC control),  
  `dxUart` (UART communication),  
  `dxPwm` (PWM control — buzzer, lights, etc.),  
  `dxWatchdog` (watchdog),  
  `dxNtp` (time sync),  
  `dxOta` (OTA updates),  
  `dxConfiguration` (config read/write).

> When generating a new `app.dxproj`:  
> If the user has no special needs, **select only the base modules**.  
> If the app needs a UI, select `dxUi` on top of the base modules.

---

### 2.4 Application notes

#### 2.4.1 General notes

- DejaOS has a VSCode extension. Select components and versions in `app.dxproj` (usually latest), then click `install`.  
  The extension will auto-download JS sources for all components into `dxmodules`. You can read those sources as API reference.  
  If a JS file is missing in `dxmodules`, remind the user to enable the corresponding component in `app.dxproj` and click `install` again.

- Unlike **Node.js** (single-thread event loop), a DejaOS app runs with **multiple workers**. Each worker is still single-threaded.  
  `dxStd.setTimeout` and `dxStd.setInterval` exist, but within a single worker they are effectively *pseudo-async* (execution is still sequential).

- `main.js` should only initialize components and workers; **do not** put business logic in it.

- Do **not** use QuickJS’s native worker initialization. Use `dxEventBus.newWorker` instead.

- Most apps do not need every component; pick only what you actually need.

- All resources (images, fonts, etc.) should be under the `resource` directory next to `src`.

- When loading resources (images, fonts), always use absolute paths, for example:
  ```js
  dxui.Image.build('img1', parent).source('/app/code/resource/logo.png');
  ```

#### 2.4.2 UI

- UI runs in a dedicated worker, not in the main thread.

- Required JS for UI: `dxmodules/dxUi.js` plus all `dxmodules/ui*.js`, including:

  - `uiBase.js`: Base class for all controls; provides size, position, events, style, etc.
  - `uiButton.js`: Button control.
  - `uiButtons.js`: Button matrix (group) control.
  - `uiCheckbox.js`: Checkbox.
  - `uiDropdown.js`: Dropdown.
  - `uiFont.js`: Font wrapper.
  - `uiImage.js`: Image display.
  - `uiKeyboard.js`: On-screen keyboard (with pinyin support).
  - `uiLabel.js`: Text label.
  - `uiLine.js`: Line drawing.
  - `uiList.js`: List control.
  - `uiSlider.js`: Slider.
  - `uiStyle.js`: Style wrapper for controls.
  - `uiSwitch.js`: Switch.
  - `uiTextarea.js`: Multi-line text input.
  - `uiUtils.js`: UI utility class (constants, enums, init helpers, etc.).
  - `uiView.js`: Base container view (like a `div`).

- For page management, use `UIManager.js` as reference. It implements a single-screen, multi-page stack.

- Font files:
  - Prefer smaller font files.
  - **If your UI text contains Chinese or any non-English characters, you must provide a matching TTF font** (typically at `/app/code/resource/font/font.ttf`).
  - Use `UIManager.font(size, style)` to get font objects.
  - If the developer’s language is not English, remind them to prepare the proper TTF.

- `uiButton` has **no `text` property**. To show text on a button:
  - Create a `Label` inside the button.
  - Set `text` / `textFont` on that `Label`.

- `uiImage` does **not** support click events directly. To make it clickable:
  - Wrap it in a transparent `View`.
  - Register click events on that `View`.

- If you create a UI control whose parent is `dxui.Utils.LAYER.TOP`, it will always appear on the **topmost layer** of the screen. This is useful for popups, overlays, and status bars.

- `uiImage` does not auto-scale the image. The image asset size should match the `Image` control size.

- `uiView` has padding **on by default**. Before positioning child widgets, call:
  ```js
  view.padAll(0);
  ```
  Scrolling is also on by default; usually:
  ```js
  view.scroll(false);
  ```

---

### 2.5 Serial (UART) communication

- Use a dedicated worker for UART; do **not** send/receive data in the main thread.

- Use `dxmodules/dxUart.js` as the main UART interface.  
  For a reference implementation see `dxmodules/vgUartWorker.js`.

- UART-related device parameters come from `dxmodules/dxDriver.js` (e.g. `dxDriver.CHANNEL`).

- UART send/receive are asynchronous. Use `dxmodules/dxEventBus.js` (events or RPC) to pass data between UART worker and UI/business workers.

- For encoding/decoding (hex, binary, etc.), use `dxmodules/dxCommonUtils.js`’s `codec` helpers.

- To set UART parameters, use e.g.:
  ```js
  dxUart.ioctl(6, '921600-8-N-1');
  ```

- `receive` is special:  
  If fewer than `size` bytes are available, it keeps waiting until enough bytes arrive or timeout triggers.  
  With a short timeout, it may return empty data because the full packet didn’t arrive in time.

---

### 2.6 Database

- Prefer `dxmodules/dxSqliteDB.js` for CRUD.  
  For very simple, small key-based data, consider `dxmodules/dxKeyValueDB.js` or `dxmodules/kvdbWorker.js`.  
  Key–value is faster but has no SQL and is not suitable for complex queries.

- You don’t always need a dedicated DB worker:
  - Simple, quick queries or small writes can be done directly in any worker.
  - For heavy batch operations or high-frequency writes, use a dedicated DB worker.

- If you use a dedicated DB worker, use `dxmodules/dxEventBus.js` (events or RPC) between UI/business workers and the DB worker.

- Convention: store DB files under `/app/data/`.

---

### 2.7 Logging

- Always use `dxmodules/dxLogger.js`; **do not** use `console.log` in business code.

  Example:
  ```js
  import log from "../../dxmodules/dxLogger.js";
  log.debug(...);
  log.info(...);
  log.error(...);
  ```

- Logging functions support multiple arguments:
  ```js
  log.info("HomePage onShow", data);
  ```
  No need to build strings manually.

- For `Error` objects, just call:
  ```js
  log.error(e);
  ```
  The logger will automatically expand `message` and `stack`.

---

### 2.8 Time / date

- For time sync and system time setting, use `dxmodules/dxNtp.js`:  
  It handles NTP sync, setting system time, and simple timezone/offset configuration (enough for most apps).

- For full timezone logic (world clock, multi-city time switching, etc.), use `dxmodules/dxTimeZones.js`, which includes full timezone data and conversions.

---

### 2.9 Network management

- Network connectivity is managed by the app using `dxmodules/dxNetwork.js`.

- After you start the network, it will automatically try to connect.  
  If the connection drops and comes back, it auto-reconnects. No need to re-call connect manually.

---

### 2.10 Face recognition

- Recommended reference demo:  
  `test/src/worker/faceworker.js` + `test/src/worker/uiworker.js`.

- Core component: `dxmodules/dxFacial.js`.

- **Threading principle**:
  - Run `face.loop()` in a dedicated `faceWorker`.
  - UI worker only does rendering/interaction; if you need to draw a rectangle on the face, use `face.getDetectionData()` in UI.

- **Core APIs**:
  - `face.init()`
  - `face.loop()`
  - `face.setCallbacks({ onRecognition })`

- **Handling recognition result**:
  - In `onRecognition(event)`, you’ll receive fields like:
    - `event.userId`
    - `event.picPath`
    - `event.compareScore`
    - `event.rect`
    - `event.is_rec`
    - `event.isCompare`
  - Forward `event` to UI/business via `dxEventBus` to continue your flow (e.g. open door, weigh items, record logs).

- **Enrollment (optional, 2 approaches)**:

  1. **Capture from camera**  
     ```js
     const res = face.getFeaByCap(timeoutMs);
     face.addFea(userId, res.feature);
     ```
     Before overwriting an existing user, you can call `face.deleteFea(userId)` or `face.updateFea`.

  2. **From face image file**  
     ```js
     const res = face.getFeaByFile(filePath);
     face.addFea(userId, res.feature);
     ```
     Here `filePath` is a local image file path.

---

### 2.11 Watchdog

- Core component: `dxmodules/dxWatchdog.js`.

- Purpose: provide hardware/software watchdog to auto-reboot if the app hangs or deadlocks.

- Multi-channel support: multiple independent channels (for different workers).  
  Only when **all** enabled channels are fed in time will the system avoid reboot.

- Recommended usage:

  - In `main.js` (main thread), call:
    ```js
    watchdog.init();
    ```
  - Enable a channel:
    ```js
    watchdog.enable(channel, true);
    ```
  - Set global timeout:
    ```js
    watchdog.start(timeoutMs);
    ```
  - Feed the watchdog periodically (e.g. every 5s):
    ```js
    watchdog.restart(channel);
    ```

---

### 2.12 HTTP

- Core component: `dxmodules/dxHttpClient.js`.

- It is stateless. Each call creates its own native instance, making it thread-safe.

- Return structure for all HTTP methods (`get`, `post`, `request`, etc.):

  ```ts
  {
    code,     // Native result code: 0 = success, others = network timeout, DNS failure, etc.
    status,   // HTTP status code, e.g. 200 = success
    message,  // Error description
    data,     // Response body string (often JSON)
  }
  ```

  Typically you will parse it with:

  ```js
  const json = JSON.parse(result.data);
  ```

---

## 3. Core code templates

### 3.1 Standard UI page (with UIManager)

```javascript
import dxui from "../../dxmodules/dxUi.js";
import log from "../../dxmodules/dxLogger.js";
import dxDriver from "../../dxmodules/dxDriver.js";
import utils from "../../dxmodules/dxCommonUtils.js";
import UIManager from "../UIManager.js"; // Assume UIManager is under src/pages or src

const MyPage = {
  id: "myhomePage",

  // Page init, runs once
  init: function () {
    // 1. Use UIManager root as parent
    const parent = UIManager.getRoot();

    // 2. Create root View (full screen)
    this.root = dxui.View.build(this.id, parent);
    this.root.setSize(dxDriver.DISPLAY.WIDTH, dxDriver.DISPLAY.HEIGHT);
    this.root.radius(0);
    this.root.borderWidth(0);
    this.root.padAll(0);

    this.root.bgColor(0x000000); // Background color

    // 3. Create children
    this.initView();

    // 4. Must return root
    return this.root;
  },

  initView: function () {
    // Example: Button (Button + inner Label)
    this.btn = dxui.Button.build(this.id + "_btn", this.root);
    this.btn.setSize(100, 50);
    this.btn.align(dxui.Utils.ALIGN.CENTER, 0, 0);

    // Label inside button
    this.btnLabel = dxui.Label.build(this.id + "_btn_label", this.btn);
    this.btnLabel.textFont(UIManager.font(16, dxui.Utils.FONT_STYLE.BOLD));
    this.btnLabel.text("Click me");
    this.btnLabel.align(dxui.Utils.ALIGN.CENTER, 0, 0);

    // Button click
    this.btn.on(dxui.Utils.EVENT.CLICK, () => {
      log.info("Button clicked");
    });

    // Example: Clickable icon (Image + transparent View wrapper)
    this.iconArea = dxui.View.build(this.id + "_icon_area", this.root);
    this.iconArea.setSize(48, 48);
    this.iconArea.bgOpa(0);
    this.iconArea.radius(0);
    this.iconArea.borderWidth(0);
    this.iconArea.padAll(0);
    // Use absolute coordinates for top-right corner instead of align
    this.iconArea.setPos(dxDriver.DISPLAY.WIDTH - 48 - 16, 16);

    this.iconImage = dxui.Image.build(this.id + "_icon", this.iconArea);
    this.iconImage.source("/app/code/resource/image/icon_admin.png");
    this.iconImage.align(dxui.Utils.ALIGN.CENTER, 0, 0);

    // Example: alignTo — label below the icon
    this.iconLabel = dxui.Label.build(this.id + "_icon_label", this.iconArea);
    this.iconLabel.text("Admin");
    this.iconLabel.textFont(UIManager.font(14, dxui.Utils.FONT_STYLE.NORMAL));
    // Place text below the icon, centered, offset downward by 4px
    this.iconLabel.alignTo(this.iconImage, dxui.Utils.ALIGN.BOTTOM_MID, 0, 4);

    this.iconArea.on(dxui.Utils.EVENT.CLICK, () => {
      log.info("Click admin icon");
    });
  },

  // Called when page is shown; data is the parameter passed in
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

### 3.2 UI worker entry (`uiWorker.js`)

```javascript
import dxui from "../dxmodules/dxUi.js";
import log from "../dxmodules/dxLogger.js";
import std from "../dxmodules/dxStd.js";
import UIManager from "./UIManager.js";   // Assume UIManager is under src
import HomePage from "./pages/HomePage.js"; // Import your page

try {
  // UI init config (orientation depends on device)
  dxui.init({ orientation: 1 });

  // 1. Init UIManager
  UIManager.init();

  // 2. Register pages
  UIManager.register("home", HomePage);

  // 3. Open home
  UIManager.open("home");

  // 4. UI event loop
  std.setInterval(() => {
    dxui.handler();
  }, 20);
} catch (error) {
  log.error(error);
}
```

### 3.3 Main thread (`main.js`)

```javascript
import bus from "../dxmodules/dxEventBus.js";
import log from "../dxmodules/dxLogger.js";

function init() {
  // Hardware init: GPIO, PWM, etc.
}

try {
  // 1. Hardware initialization
  init();
} catch (e) {
  log.error("init error", e);
}

// 2. Create UI worker
const uiWorker = bus.newWorker("uiWorker", "/app/code/src/uiWorker.js");
```

