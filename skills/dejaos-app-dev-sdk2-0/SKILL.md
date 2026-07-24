---
name: dejaos-app-dev-sdk2-0
description: Create, build, modify, run, debug, or review DejaOS SDK 2.0 embedded JavaScript applications with the dejaos CLI. Use when working with new or existing DejaOS apps, device-model project scaffolding, USB sync and logs, dxmodules, QuickJS workers, LVGL UI via dxUi, app.dxproj component selection, UIManager page flows, UART, SQLite, MQTT, HTTP, facial recognition, watchdogs, device resources, or embedded runtime constraints.
---

# DejaOS SDK 2.0 App Development

Use this skill for DejaOS SDK 2.0 embedded JavaScript apps. DejaOS runs on QuickJS with native `dxmodules` wrappers for UI, hardware, storage, network, MQTT, HTTP, audio, face recognition, UART, watchdog, and related device features.

## CLI-First Workflow

Treat device execution as the normal development loop, not an optional final step.

1. Before creating or changing an app, check whether the CLI is available with `dejaos --version`.
2. If it is unavailable, tell the user that Node.js 18+ and `dejaos-cli` are required. Ask whether to install it, then, after approval, run `npm install -g dejaos-cli` and verify again with `dejaos --version`. Do not claim installation succeeded without the verification result.
3. For a new app, ask for the exact target device model before creating files. Do not limit the user to a hard-coded model list because the CLI obtains the current supported models from the DejaOS tools service.
4. Collect or reasonably derive the project name, project directory, whether the app has a UI, and SDK version. Default the SDK to `2.0` when the user does not specify it.
5. Create the complete project with `dejaos new <model> <name> <directory> 2.0`. Run it from the intended parent directory or use explicit absolute paths. Do not hand-create `app.dxproj` or `dxmodules/` when `dejaos new` can create them.
6. If the app has a UI, create `resource/font/` and download one font as `resource/font/font.ttf`:
   - For a Chinese conversation or Chinese UI, use `https://raw.githubusercontent.com/DejaOS/DejaOS/main/tools/font_cn.ttf`.
   - For an English conversation and English-only UI, use `https://raw.githubusercontent.com/DejaOS/DejaOS/main/tools/font_en.ttf`.
   - If the requested UI contains non-English glyphs that the English font may not cover, prefer the Chinese font or ask which font coverage is required.
   - Verify the downloaded file exists and is non-empty. Keep code references at `/app/code/resource/font/font.ttf`.
7. After project creation, ask whether the correct target device is connected by USB. Do not attempt device mutation until the user confirms.
8. When confirmed, run `dejaos run --project <project-directory>` to connect, sync changed files, and start the app. Use `dejaos sync --all --project <project-directory>` for the first deployment or when incremental state may be stale, followed by `dejaos start --project <project-directory>` if needed.
9. Capture device output with `dejaos logs --project <project-directory>` for a bounded observation period. Because logs may stream continuously, stop the observation after enough startup output has been collected. Report clear errors and warnings with their evidence; do not equate a quiet log window with proof that the app is correct.

After every material code or resource change, repeat syntax or static checks, then attempt `dejaos run --project <project-directory>` and inspect a bounded `dejaos logs` sample when a confirmed USB-connected device remains available. If the device is unavailable, say that runtime validation is pending rather than claiming completion.

Read `references/dejaos-cli-workflow.md` when installing the CLI, creating a project, downloading fonts, synchronizing a device, or capturing logs.

## Project Checks

1. Confirm the target device model before changing project structure or `app.dxproj`.
2. Inspect the existing `app.dxproj` and `dxmodules/` before importing a component.
3. If a required `dxmodules/*.js` file is missing, update components through `dejaos edit` or a deliberate `app.dxproj` edit, then run `dejaos install`. Inspect the result instead of modifying `dxmodules/` manually.
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

1. Follow the CLI-first workflow and start with `dejaos new`; inspect its generated `app.dxproj` and `dxmodules/` before adding code.
2. Include only base modules by default; add `dxUi` only when UI is needed; add hardware/network modules only when required.
3. Create `src/main.js`.
4. If UI is needed, create `src/uiWorker.js`, copy or adapt `assets/UIManager.js`, register pages, call `dxui.handler()` in a short interval, and install the conversation-language font.
5. Put resources in `resource/`, especially fonts and images.
6. Ask for USB confirmation, deploy and start with the CLI, then inspect startup logs.

When modifying an existing app:

1. Check `dejaos --version`, then read nearby code and follow existing worker boundaries.
2. Check whether the needed component is already present in `dxmodules/`.
3. Preserve existing page manager, event bus topics, and data directory conventions unless the user asks for a refactor.
4. Verify JavaScript syntax with the available runtime when possible.
5. After each material change, attempt the CLI run-and-logs validation loop when the correct device connection has been confirmed.

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

- `references/dejaos-cli-workflow.md`: Exact CLI installation, project creation, font, device-run, and bounded-log workflow. Read for any create, deploy, run, or debug task.
- `references/dejaos-guide.md`: English DejaOS SDK 2.0 development guide with module notes and code templates. Read when the task involves unfamiliar DejaOS modules or when building a new app structure.
- `references/fitlock-patterns.md`: English patterns distilled from a production-style FitLock cabinet app in this workspace. Read when designing larger apps with UI, MQTT, SQLite, face recognition, lock control, pending event queues, or multi-worker coordination.
- `assets/UIManager.js`: Reusable UIManager page-stack template.
- `assets/DW200_V20-app.dxproj`: Example `app.dxproj` for DW200_V20.
- `assets/VF105_V12-app.dxproj`: Example `app.dxproj` for VF105_V12.
