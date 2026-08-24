---
name: dejaos-app-dev-sdk2-0
description: Create, build, modify, run, debug, or review DejaOS SDK 2.0 embedded JavaScript applications with the dejaos CLI. Use when working with new or existing DejaOS apps, device-model and SKU capability selection, USB sync and logs, generated dxmodules API validation, QuickJS workers, LVGL UI via dxUi, app.dxproj components, UIManager page flows, UART, SQLite, MQTT, HTTP, facial recognition, watchdogs, device resources, or embedded runtime constraints.
---

# DejaOS SDK 2.0 App Development

Use this skill for DejaOS SDK 2.0 embedded JavaScript apps. DejaOS runs on QuickJS with native `dxmodules` wrappers for UI, hardware, storage, network, MQTT, HTTP, audio, face recognition, UART, watchdog, and related device features.

## Reference Boundary

- Use only guides, scripts, assets, templates, and reference projects bundled inside this Skill directory as Skill-provided local references.
- Do not require an external reference checkout or an author-specific local path. If required knowledge is absent from the bundled resources and public APIs, state what is missing instead of inventing it.
- Treat the user's DejaOS app as task input, not as a Skill reference dependency. The app may be located at any user-selected path; inspect its own `app.dxproj`, `dxmodules/`, source, and resources normally.
- Resolve bundled resources relative to this Skill directory. Resolve project files relative to the user's selected app root or pass that app root explicitly to commands.

## CLI-First Workflow

Treat device execution as the normal development loop, not an optional final step.

1. Before creating or changing an app, try `dejaos --version`.
2. A failed direct command does not prove that the CLI is uninstalled because Codex or another restricted shell may not inherit the user's terminal `PATH`. Before offering installation, follow `references/dejaos-cli-workflow.md`: check shell lookup, `where.exe`/`command -v`, `npm prefix -g`, Windows `%APPDATA%\npm\dejaos.cmd`, and `npm list -g dejaos-cli --depth=0`.
   - If an executable exists, use its absolute path for all later CLI commands. If the restricted environment denies execution, request elevated execution or ask the user to run `<absolute-path> --version` in their normal terminal. Report "installed but not callable from the current execution environment," not "not installed."
   - Only when every discovery check fails, tell the user that Node.js 18+ and `dejaos-cli` are required. Ask whether to install it, then, after approval, run `npm install -g dejaos-cli` and verify the installed executable. Do not claim installation succeeded without verification.
3. For a new app, ask for the exact target device model before creating files. Do not limit the user to a hard-coded model list because the CLI obtains the current supported models from the DejaOS tools service. Read `references/tools-http-api.md` when model, SDK, or component discovery details are needed.
4. Read `references/device-sku-capabilities.md` for `VF105_V12`, `VF114_V12`, `VF203_V12`, or `VF202_V12`. Ask which optional SKU features are physically present when the requested app depends on them. Reject features that the selected model does not support; for example, do not design Wi-Fi behavior for `VF202_V12`.
5. Collect or reasonably derive the project name, project directory, whether the app has a UI, and SDK version. Default the SDK to `2.0` when the user does not specify it.
6. Create the complete project with `dejaos new <model> <name> <directory> 2.0`. Run it from the intended parent directory or use explicit absolute paths. Do not hand-create `app.dxproj` or `dxmodules/` when `dejaos new` can create them.
7. If the app has a UI, create `resource/font/` and download one font as `resource/font/font.ttf`:
   - For a Chinese conversation or Chinese UI, use `https://raw.githubusercontent.com/DejaOS/DejaOS/main/tools/font_cn.ttf`.
   - For an English conversation and English-only UI, use `https://raw.githubusercontent.com/DejaOS/DejaOS/main/tools/font_en.ttf`.
   - If the requested UI contains non-English glyphs that the English font may not cover, prefer the Chinese font or ask which font coverage is required.
   - Verify the downloaded file exists and is non-empty. Keep code references at `/app/code/resource/font/font.ttf`.
8. Before finishing code, validate every imported component and API call against the installed project-local `dxmodules/*.js` files.
9. After project creation, ask whether the correct target device is connected by USB. Do not attempt device mutation until the user confirms.
10. When confirmed, run `dejaos run --project <project-directory>` to connect, sync changed files, and start the app. Use `dejaos sync --all --project <project-directory>` for the first deployment or when incremental state may be stale, followed by `dejaos start --project <project-directory>` if needed.
11. Capture device output with `dejaos logs --project <project-directory>` for a bounded observation period. Because logs may stream continuously, stop the observation after enough startup output has been collected. Report clear errors and warnings with their evidence; do not equate a quiet log window with proof that the app is correct.

After every material code or resource change, repeat syntax or static checks, then attempt `dejaos run --project <project-directory>` and inspect a bounded `dejaos logs` sample when a confirmed USB-connected device remains available. If the device is unavailable, say that runtime validation is pending rather than claiming completion.

Read `references/dejaos-cli-workflow.md` when installing the CLI, creating a project, downloading fonts, synchronizing a device, or capturing logs.

## Project Checks

1. Confirm the target device model before changing project structure or `app.dxproj`.
2. Use the model to eliminate impossible capabilities, then confirm the device's optional SKU selections before relying on optional hardware or services. Do not confuse “supported option” with “installed on this unit.”
3. Inspect the existing `app.dxproj` and `dxmodules/` before importing a component.
4. If a required `dxmodules/*.js` file is missing, update components through `dejaos edit` or a deliberate `app.dxproj` edit, then run `dejaos install`. Inspect the result instead of modifying `dxmodules/` manually.
5. Treat `dxmodules/` as generated, project-specific, read-only vendor code. Use it as the authoritative API definition for the installed component versions.
6. For every component call, open the corresponding `dxmodules/*.js` file and verify the exported object, function name, argument order/count, return shape, constants, and required initialization. Do not invent a function because it exists in another SDK version, example, or similarly named module.
7. Search all app imports and component member calls before completion. Flag any imported module absent from `dxmodules/` and any called member not defined by the installed wrapper.
8. Keep app code under `src/` and resources under `resource/`. Use `/data` as the default runtime data root for device models beginning with `VF`; use `/app/data` for other model families unless the target project or device documentation defines another path.
9. Use absolute runtime resource paths such as `/app/code/resource/logo.png`.

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
- Copy `assets/UIManager.js` to `src/UIManager.js` as the standard single-screen, multi-page UI manager when a project does not already have one.
- A UI page should expose `init()`, return its root `View`, and may implement `onShow(data)` and `onHide()`.
- `uiButton` does not have a direct text property. Create a `Label` inside the button.
- `uiImage` is not clickable by itself. Wrap it in a transparent `View` and register the click on the wrapper.
- For topmost overlays, use `dxui.Utils.LAYER.TOP`.
- For `uiView`, call `padAll(0)` and usually `scroll(false)` when doing exact layout.
- Match image control sizes to image asset sizes because `uiImage` does not automatically scale by default.

## Face Recognition Rules

- Treat the live face-camera preview as a full-screen image on the bottommost display layer by default. Normal UI pages and opaque backgrounds render above it and will hide it.
- When the preview must be visible, make the covering UI page/root background transparent. For a camera window instead of a full-screen view, use a background asset with a transparent region or an equivalent transparent UI region so only that part reveals the bottom camera layer.
- For apps that use face recognition, show the live camera preview by default unless the user explicitly chooses another interaction. Recognition without preview usually gives poor feedback while the person aligns or moves their face.
- Decide whether to show a face-detection/tracking rectangle from the product experience; it is optional, unlike the live preview default.
- During face enrollment/registration, call `dxFacial.setStatus(true)`. Never pass `false` for the enrollment state because registration will not work correctly.
- Verify the exact preview, tracking, enrollment, and `setStatus` APIs against the installed `dxmodules/dxFacial.js` before coding; keep `dxmodules/` read-only.

## Common Components

- Base modules: `dxLogger`, `dxStd`, `dxOs`, `dxDriver`, `dxMap`, `dxEventBus`, `dxCommonUtils`.
- UI: `dxUi`.
- Storage: `dxSqliteDB` for relational data; `dxKeyValueDB` for simple key-value data.
- Network: `dxNetwork`, `dxHttpClient`, `dxHttpServer`, `dxMqttClient`.
- Hardware: `dxUart`, `dxGpio`, `dxGpioKey`, `dxPwm`, `dxNfc`, `dxBarcode`.
- System: `dxWatchdog`, `dxNtp`, `dxOta`, `dxConfiguration`, `dxAudio`.

## Task Guidance

When creating a new app:

1. Follow the CLI-first workflow: confirm model and required SKU options, then start with `dejaos new`.
2. Inspect the generated `app.dxproj` and `dxmodules/` before adding code. Include only modules backed by the target model, the actual SKU, and the requested behavior.
3. Create `src/main.js`.
4. If UI is needed, create `src/uiWorker.js`, copy `assets/UIManager.js` to `src/UIManager.js`, register pages, call `dxui.handler()` in a short interval, and install the conversation-language font.
5. Put resources in `resource/`, especially fonts and images.
6. Validate every component function call against the generated `dxmodules/*.js`.
7. Ask for USB confirmation, deploy and start with the CLI, then inspect startup logs.

When modifying an existing app:

1. Check `dejaos --version`, then read nearby code and follow existing worker boundaries.
2. Confirm that the requested feature is valid for the target model and actual SKU.
3. Check whether the needed component is already present in `dxmodules/`, then verify each used API against that file.
4. Preserve existing page manager, event bus topics, and data directory conventions unless the user asks for a refactor.
5. Verify JavaScript syntax with the available runtime when possible.
6. After each material change, repeat the dxmodules API audit, then attempt the CLI run-and-logs validation loop when the correct device connection has been confirmed.

When reviewing DejaOS code, prioritize:

- Missing `try/catch` around device and worker boundary code.
- Features unsupported by the selected model or unconfirmed optional SKU.
- Imported components absent from the installed `dxmodules/`.
- Component functions, constants, parameters, or return values that do not match the installed `dxmodules/*.js` definitions.
- Incorrect relative imports into `dxmodules`.
- UI code running in the main worker.
- Face recognition screens that unintentionally hide the bottom-layer camera preview behind an opaque UI background.
- Face recognition flows with no live preview and no explicit product reason for omitting it.
- Face enrollment/registration code that calls `dxFacial.setStatus(false)` or does not establish `setStatus(true)`.
- Direct `console.log`.
- Missing font handling for Chinese UI.
- Resource paths that are not runtime absolute paths.
- `uiButton` text set directly instead of via a child `Label`.
- Click handlers attached directly to `uiImage`.
- Long loops or heavy work in UI workers.

## Bundled Resources

- `references/tools-http-api.md`: Self-contained DejaOS Tools HTTP API contract for resolving device model to main model, SDK, latest component list, component versions, and downloads. Read for model/SDK/component discovery or when diagnosing CLI metadata requests.
- `references/device-sku-capabilities.md`: Hardware and service capability matrix for VF105_V12, VF114_V12, VF203_V12, and VF202_V12. Read before planning features for these models.
- `references/dejaos-cli-workflow.md`: Exact CLI installation, project creation, font, device-run, and bounded-log workflow. Read for any create, deploy, run, or debug task.
- `references/dejaos-guide.md`: English DejaOS SDK 2.0 development guide with module notes and code templates. Read when the task involves unfamiliar DejaOS modules or when building a new app structure.
- `references/fitlock-patterns.md`: Bundled English patterns distilled from a production-style FitLock cabinet app. Read when designing larger apps with UI, MQTT, SQLite, face recognition, lock control, pending event queues, or multi-worker coordination.
- `assets/UIManager.js`: Reusable UIManager page-stack template intended for `src/UIManager.js`.
- `assets/DW200_V20-app.dxproj`: Example `app.dxproj` for DW200_V20.
- `assets/VF105_V12-app.dxproj`: Example `app.dxproj` for VF105_V12.
