# SDK 2.0 Runtime and Application Structure

## Contents

- Runtime model
- Worker design
- Startup structure
- UI
- Components and boundaries
- Large-application patterns
- Review checklist

## Runtime Model

SDK 2.0 is based on QuickJS. Each Worker is a single-threaded, synchronous runtime; use multiple isolated Workers for concurrent responsibilities.

Workers:

- Do not share memory or JavaScript objects.
- Cannot directly call functions in another Worker.
- Communicate through `dxEventBus` messages.
- Use asynchronous message chains for cross-Worker requests and responses.

Use:

```js
dxEventBus.newWorker('./uiWorker.js')
```

Do not use raw QuickJS Worker APIs outside the component wrapper. Before creating a Worker, verify the signature in the project's `dxmodules/dxEventBus.js`.

`dxStd.setTimeout` and `dxStd.setInterval` only schedule callbacks within the current Worker's event handling. They do not make synchronous heavy work parallel.

## Worker Design

Recommended long-lived responsibility split:

- Main Worker: configuration, logging, Worker creation, and top-level failure handling.
- UI Worker: `dxUi`, pages, and the short-period UI handler.
- Device Worker: UART, GPIO, barcode, card-reader, and similar hardware loops.
- Facial Worker: camera, recognition, and enrollment state.
- Network Worker: MQTT, HTTP, and background synchronization.

Boundary rules:

- Initialize and own each native component in one clearly designated Worker.
- Use stable, business-meaningful EventBus topic names.
- Keep message payloads small; avoid large images and objects.
- For requests that need results, design request IDs, response topics, timeouts, and failure paths.
- Consumers must tolerate duplicate, delayed, or out-of-order messages.
- The UI Worker must not perform long loops, blocking I/O, or large database batches.

## Startup Structure

Keep `src/main.js` small:

1. Initialize `dxLogger` and required base configuration.
2. Install top-level `try/catch` handling.
3. Create Workers by responsibility.
4. Do not place UI, UART loops, or the complete business implementation in the main Worker.

Inside each Worker:

1. Import only required components.
2. Initialize in dependency order.
3. Subscribe to EventBus topics.
4. Start short, bounded timer tasks.
5. Log exceptions and restart-relevant state clearly.

## UI

- Put UI in a dedicated Worker.
- Call `dxui.init(options, context)` before creating controls.
- Share one context across all UI files.
- Call `dxui.handler()` periodically when required by the project wrapper.
- Use `assets/UIManager.js` for a single-screen, multi-page app when appropriate.
- A page should expose `init()` and return its root View; it may expose `onShow(data)` and `onHide()`.
- Reuse font objects instead of recreating them on every page.
- Use `/app/code/resource/font/font.ttf` for Chinese UI.

Common control constraints:

- Put a `Label` inside `uiButton`; do not set button text directly.
- Wrap `uiImage` in a transparent `View` for click handling.
- Use `dxui.Utils.LAYER.TOP` for true top-level overlays.
- For precise layout, use `padAll(0)` and normally disable scrolling.
- Match image-control size to asset size.

## Components and Boundaries

- Common base modules: `dxLogger`, `dxStd`, `dxOs`, `dxDriver`, `dxMap`, `dxEventBus`, `dxCommonUtils`.
- Common UI module: `dxUi`.
- Common storage modules: `dxSqliteDB`, `dxKeyValueDB`.
- Common network modules: `dxNetwork`, `dxHttpClient`, `dxHttpServer`, `dxMqttClient`.
- Common hardware modules: `dxUart`, `dxGpio`, `dxGpioKey`, `dxPwm`, `dxNfc`, `dxBarcode`.
- Common system modules: `dxWatchdog`, `dxNtp`, `dxOta`, `dxConfiguration`, `dxAudio`.

These names are navigation hints only. They do not prove that the target model or project includes them. Actual exports and functions come from the project `dxmodules`.

Use `try/catch` at these boundaries:

- Worker creation and EventBus handling
- UART, GPIO, card reading, barcode, and facial processing
- Files, SQLite, and configuration
- MQTT, HTTP, and network switching
- UI callbacks and timers

## Large-Application Patterns

### UI, business, and device layers

Recommended:

```text
UI Worker
  <-> business topics
Business/network Worker
  <-> device commands and state topics
Device Worker
```

UI presents state and emits user intent. The device Worker owns native handles. The business Worker manages workflows, retries, and persistence.

### MQTT offline queue

- Store pending events in SQLite.
- Give every event a unique business ID.
- Delete only after successful publish and business acknowledgement.
- Bound queue length, retries, and backoff.
- Replay in a stable order after reconnecting without blocking UI.

### Lock control and door state

- Record commands separately from physical state.
- Apply a timeout to unlock commands. Do not equate "command sent" with "door open."
- Debounce input changes.
- Give timeout, rejection, offline device, and duplicate command distinct outcomes.

### Facial enrollment

- Let the facial Worker own enrollment state.
- Establish `dxFacial.setStatus(true)` when enrollment begins.
- Let UI request enrollment and show progress through messages.
- Handle partial-success rollback when saving features, photos, and business records.
- Restore normal recognition according to the project API when enrollment ends, but never use `setStatus(false)` in place of the required enrollment state.

## Review Checklist

- Does the code incorrectly assume shared variables between Workers?
- Does it use `dxEventBus.newWorker` rather than raw Worker APIs?
- Do topics handle timeout, failure, and duplicates?
- Does the UI Worker run long loops or blocking I/O?
- Is a native component initialized by multiple Workers?
- Does application code use `console.log`?
- Does every call exist in the project `dxmodules`?
- Is the font installed for Chinese UI?
- Is the facial preview hidden by opaque UI?
- Were on-device execution and logs actually completed?
