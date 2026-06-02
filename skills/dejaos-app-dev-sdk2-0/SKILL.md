---
name: dejaos-app-dev-sdk2-0
description: Build, modify, or review DejaOS SDK 2.0 embedded JavaScript applications. Use when working with DejaOS SDK 2.0 app projects, dxmodules, QuickJS workers, LVGL UI via dxUi, app.dxproj component selection, UIManager page flows, UART, SQLite, MQTT, HTTP, facial recognition, watchdogs, device resources, or embedded runtime constraints.
---

# DejaOS SDK 2.0 App Development

Use this skill for DejaOS SDK 2.0 embedded JavaScript apps. DejaOS runs on QuickJS with native `dxmodules` wrappers for UI, hardware, storage, network, MQTT, HTTP, audio, face recognition, UART, watchdog, and related device features.

## First Checks

1. Confirm the target device model before changing project structure or `app.dxproj`: `DW200_V20`, `VF105_V12`, `VF203_V12`, `VF202_V12`, or `VF114_V12`.
2. Inspect the existing `app.dxproj` and `dxmodules/` before importing a component.
3. If a required `dxmodules/*.js` file is missing, tell the user to enable the component in `app.dxproj` and install modules with the DejaOS VSCode plugin.
4. Treat `dxmodules/` as vendor code: call it, but do not modify it.
5. Keep app code under `src/`, resources under `resource/`, and runtime data under `/app/data`.
6. Use absolute runtime resource paths such as `/app/code/resource/logo.png`.

## Project Rules

- Use `dxLogger` for logging; do not use `console.log` in app code.
- Wrap hardware, network, filesystem, database, UART, timer, and worker-boundary code in `try/catch`.
- Keep `main.js` focused on initialization and worker creation. Put UI, serial loops, face recognition loops, and long-running business logic in workers.
- Create workers with `dxEventBus.newWorker(...)` instead of native QuickJS worker APIs.
- Remember that each worker is single-threaded. `dxStd.setTimeout` and `dxStd.setInterval` are pseudo-async inside the same worker.
- Prefer small objects and bounded loops. DejaOS devices have limited memory and CPU.
- Use imports relative to file depth, for example `../../dxmodules/dxLogger.js`; there is no Node-style `node_modules` resolution.

## UI Rules

- Put UI in a dedicated UI worker.
- If UI text includes Chinese or other non-English text, ensure a TTF font exists, usually `/app/code/resource/font/font.ttf`.
- Prefer `UIManager.font(size, style)` to avoid repeatedly creating font objects.
- Use `assets/UIManager.js` as the standard single-screen, multi-page UI manager template when a project does not already have one.
- A UI page should expose `init()`, return its root `View`, and may implement `onShow(data)` and `onHide()`.
- `uiButton` does not have a direct text property. Create a `Label` inside the button.
- `uiImage` is not clickable by itself. Wrap it in a transparent `View` and register the click on the wrapper.
- For topmost overlays, use `dxui.Utils.LAYER.TOP`.
- For `uiView`, call `padAll(0)` and usually `scroll(false)` when doing exact layout.
- Match image control sizes to image asset sizes because `uiImage` does not automatically scale by default.

## Common Components

- Base modules: `dxLogger`, `dxStd`, `dxOs`, `dxDriver`, `dxMap`, `dxEventBus`, `dxCommonUtils`.
- UI: `dxUi`.
- Storage: `dxSqliteDB` for relational data; `dxKeyValueDB` for simple key-value data.
- Network: `dxNetwork`, `dxHttpClient`, `dxHttpServer`, `dxMqttClient`.
- Hardware: `dxUart`, `dxGpio`, `dxGpioKey`, `dxPwm`, `dxNfc`, `dxBarcode`.
- System: `dxWatchdog`, `dxNtp`, `dxOta`, `dxConfiguration`, `dxAudio`.

## Task Guidance

When creating a new app:

1. Start from the target model's `app.dxproj`.
2. Include only base modules by default; add `dxUi` only when UI is needed; add hardware/network modules only when required.
3. Create `src/main.js`.
4. If UI is needed, create `src/uiWorker.js`, copy or adapt `assets/UIManager.js`, register pages, and call `dxui.handler()` in a short interval.
5. Put resources in `resource/`, especially fonts and images.

When modifying an existing app:

1. Read nearby code first and follow existing worker boundaries.
2. Check whether the needed component is already present in `dxmodules/`.
3. Preserve existing page manager, event bus topics, and data directory conventions unless the user asks for a refactor.
4. Verify JavaScript syntax with the available runtime when possible.

When reviewing DejaOS code, prioritize:

- Missing `try/catch` around device and worker boundary code.
- Incorrect relative imports into `dxmodules`.
- UI code running in the main worker.
- Direct `console.log`.
- Missing font handling for Chinese UI.
- Resource paths that are not runtime absolute paths.
- `uiButton` text set directly instead of via a child `Label`.
- Click handlers attached directly to `uiImage`.
- Long loops or heavy work in UI workers.

## Bundled Resources

- `references/dejaos-guide.md`: English DejaOS SDK 2.0 development guide with module notes and code templates. Read when the task involves unfamiliar DejaOS modules or when building a new app structure.
- `references/fitlock-patterns.md`: English patterns distilled from a production-style FitLock cabinet app in this workspace. Read when designing larger apps with UI, MQTT, SQLite, face recognition, lock control, pending event queues, or multi-worker coordination.
- `assets/UIManager.js`: Reusable UIManager page-stack template.
- `assets/DW200_V20-app.dxproj`: Example `app.dxproj` for DW200_V20.
- `assets/VF105_V12-app.dxproj`: Example `app.dxproj` for VF105_V12.
