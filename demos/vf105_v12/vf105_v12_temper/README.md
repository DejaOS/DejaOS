# **VF105 Temperature Demo (Face + HM UART)**

> **This document describes the QuickJS scripts under `src/`: on device boot, `main.js` starts two independent Workers—UI overlay plus face recognition—with UART-backed infrared temperature reads (`dxTemp`) tied to recognition callbacks. The runtime is DejaOS (QuickJS), not Node.js.**

## **Overview**

After the application loads, the entry script schedules two Workers through **`dxEventBus`**:

- **UI Worker**: `worker_test/uiworker.js` — initializes **`dxUi`**, draws a face-tracking overlay and a **Register** button, runs **`dxui.handler()`** on a short interval.
- **Face + temperature Worker**: `worker_test/faceworker.js` — initializes **`dxFacial`** and **`dxTemp`** (HM module over UART), polls **`face.loop()`**, and on **`onRecognition`** logs single-frame temperature, multi-frame **`measure(8)`**, thermal map data, and **`getRectTemp(event.rect)`**.

The entry point **`main.js`** only starts Workers; it **does not** implement measurement logic. All temperature and face handling lives in **`faceworker.js`**.

## **Directory Structure**

```
├── src/
│   ├── main.js                      # Entry: start UI + face Workers via event bus
│   └── worker_test/
│       ├── uiworker.js              # LVGL UI: face frame overlay, button → bus event
│       └── faceworker.js            # Face loop + dxTemp (getTemp, measure, map, rect temp)
├── dxmodules/                       # DX framework (dxUi, dxFacial, dxTemp, dxUart, …)
└── README.md                        # This file
```

## **How to Run**

1. Deploy the application bundle to the target device (paths below assume **`/app/code/`** layout as in **`main.js`**).
2. Ensure hardware prerequisites:
   - Visible camera + **`dxFacial`** stack usable from scripts.
   - HM infrared module reachable on the UART configured in **`dxTemp`** (default **`/dev/ttySLB3`**, **`115200-8-N-1`**—see **`dxmodules/dxTemp.js`** / **`dxTemp.md`** if present).
3. Launch the app so **`main.js`** executes and starts:

   - `bus.newWorker('screen', '/app/code/src/worker_test/uiworker.js')`
   - `bus.newWorker('face', '/app/code/src/worker_test/faceworker.js')`

4. Watch **`dxLogger`** output on **`faceworker`** when a face is recognized: temperature lines appear after **`onRecognition`**. On **`uiworker`**, tap **Register** to emit **`register_facial_recognition`** for enrollment logic in **`faceworker.js`**.

**Note**: Adjust **`/app/code/`** prefixes if your image mounts application code elsewhere.

## **Worker 1: `uiworker.js` (screen)**

**Imports**: **`dxUi.js`**, **`dxFacial.js`**, **`dxLogger.js`**, **`dxStd.js`**, **`dxEventBus.js`**.

**Behavior**:

- Builds a **`mainview`** layer and a **`faceview`** child used as a rectangular overlay (border + position/size).
- **`showFaceView()`** reads **`face.getDetectionData()`** every interval tick; if detection exists, aligns **`faceview`** to the first **`rect`**, otherwise hides it.
- **`register`** button **`CLICK`** fires **`bus.fire('register_facial_recognition')`** for the other Worker.

**Timing**: **`std.setInterval(..., 15)`** drives **`showFaceView()`** and **`dxui.handler()`**.

## **Worker 2: `faceworker.js` (face + temperature)**

**Imports**: **`dxFacial.js`**, **`dxTemp.js`**, **`dxLogger.js`**, **`dxStd.js`**, **`dxEventBus.js`**, **`dxCommonUtils.js`**.

**Startup**:

- **`face.init({ liv_enable: 0 })`**, **`temper.init()`**, then **`std.sleep(2000)`** before the recognition path runs.

**Recognition path (`onRecognition`)** (logged):

| Step | API | Purpose |
|------|-----|---------|
| 1 | **`temper.getTemp()`** | Single-frame full-FOV peak (°C). |
| 2 | **`temper.measure(8)`** | Multi-frame **max / min / avg** and **`samples`** (~125 ms between frames). |
| 3 | **`temper.getThermalMap()`** | Raw 32×32 map + hex dump via **`commonUtils.codec.arrayBufferToHex`**. |
| 4 | **`temper.getRectTemp(event.rect)`** | Face ROI temperature using visible-camera **`rect`**. |

**Enrollment**: **`bus.on('register_facial_recognition', …)`** runs **`getFeaByCap`** / **`addFea`** for a fixed **`testuser`** id.

**Timing**: **`std.setInterval(..., 20)`** calls **`face.loop()`**.

## **Relationship between Workers**

- **`uiworker`** publishes **`register_facial_recognition`**; **`faceworker`** subscribes on the same **`dxEventBus`** instance.
- **`dxFacial`** is referenced in **both** Workers (UI for **`getDetectionData`**, face Worker for **`init` / `loop` / callbacks**). Ensure your platform supports this split (same native singleton / documented threading rules).

## **Notes**

1. **`measure(8)`** blocks for roughly **7 × 125 ms** (plus UART time) inside the recognition callback; total recognition handling may exceed **~1 s**.
2. **`getThermalMap()`** and **`getRectTemp()`** may return **`null`** on UART/CRC errors; **`faceworker.js`** guards thermal map access accordingly.
3. **Logs as instrumentation**: there is no **`[PASS]` / `[FAIL]`** harness here unlike the TCP unit-test demo; verification is by inspecting **`dxLogger`** lines on device.
4. **`temper.init()`** options (path, baud rate, timeout) can be overridden by passing a parameter object—see **`dxmodules/dxTemp.js`** header comments.

## **Related API Modules**

- **Temperature**: **`dxmodules/dxTemp.js`** — **`init`**, **`deinit`**, **`setCompensation`**, **`getTemp`**, **`measure`**, **`getThermalMap`**, **`getRectTemp`** (UART protocol documented in module comments).
- **Face**: **`dxmodules/dxFacial.js`** — **`init`**, **`loop`**, **`setCallbacks`**, **`getDetectionData`**, feature enrollment APIs used in **`faceworker.js`**.
- **UI**: **`dxmodules/dxUi.js`** — views, alignment, events, **`handler`** pump.
- **IPC**: **`dxmodules/dxEventBus.js`** — **`newWorker`**, **`fire`**, **`on`**.

For module-level API tables and protocol constants, see each file’s header and any companion **`dxTemp.md`** in the repository.
