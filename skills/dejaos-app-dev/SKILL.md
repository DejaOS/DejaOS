---
name: dejaos-app-dev
description: Create, modify, migrate, run, debug, or review DejaOS SDK 2.0 and SDK 4.0 embedded JavaScript applications with the dejaos CLI. Use for new or existing DejaOS apps, device-model and SKU capability validation, SDK/component HTTP queries, app.dxproj, project-local dxmodules API audits, SDK 2.0 Worker/dxEventBus architecture, SDK 4.0 unified async runtime architecture, dxUi/LVGL UI, UART, SQLite, MQTT, HTTP, facial recognition, USB deployment, device logs, and embedded resource constraints.
---

# DejaOS App Development

Use one entry point to develop SDK 2.0 or SDK 4.0 applications. Determine the device and SDK first, then load the matching rules. Never mix the runtime architectures of the two versions.

## Reference Boundaries

- Treat only the guides, scripts, device mappings, templates, and assets inside this Skill directory as bundled Skill references.
- Never require a developer to access an external project or an author-specific absolute path on the maintainer's computer.
- Treat the developer's current DejaOS app as task input. Inspect its `app.dxproj`, `dxmodules/`, `src/`, and `resource/` as normal.
- Always treat `dxmodules/*.js` generated after installation in the target project as the highest-priority source for that project's component APIs.
- Treat `dxmodules/` as generated, versioned, read-only vendor code. Never modify it to accommodate incorrect application calls.

## Mandatory Pre-Development Gates

### 1. Confirm the device model

- The developer must provide or confirm the exact device model. Without it, stop project creation, code changes, and hardware-feature design.
- For an existing project, read `app.dxproj.model` as a candidate and ask the developer to confirm it. A configuration value does not replace the required confirmation.
- Use `scripts/resolve-device-sdk.mjs` or `references/tools-http-api.md` to normalize the input to the server-returned `deviceModel` and obtain `mainDeviceModel`.
- `deviceModel` identifies the project and physical device. `mainDeviceModel` is the SDK and component query key. A main-model mapping does not prove that a submodel has the same physical SKU.

### 2. Confirm the SDK version

- Only SDK `2.0` and `4.0` are allowed. SDK `3.0` is unsupported; stop if the developer selects it.
- If the developer is unsure, first explain that the architectures differ substantially:
  - 2.0 uses multiple Workers and `dxEventBus`.
  - 4.0 uses one JavaScript runtime, Promises, component events, and internal asynchronous scheduling; Workers are prohibited.
- After explaining the difference, continue with SDK 2.0 by default and explicitly tell the developer which version was selected. Never default silently.

### 3. Query the SDK and components

1. Resolve the exact model to its main model.
2. Query the SDK by main model and SDK version.
3. Query the latest component list with `sdkId`.
4. Continue only when the component list is non-empty.
5. If the HTTP request fails, the target SDK is missing, or the component list is empty, treat the selected SDK as unsupported for that model according to the current query. Report the original error or empty result and stop. Do not guess components; a maintainer may later adjust the data or rules manually.

Read `references/tools-http-api.md` when querying or troubleshooting. The current device-mapping snapshot is in `references/device-models.md`, but runtime support decisions must come from a live query.

### 4. Confirm the SKU

- Read `references/device-sku-capabilities.md`.
- Standard features may be used. Treat optional hardware and services as unavailable until the developer confirms that the physical device includes or enables them.
- Do not implement a requested feature unless it is standard or a confirmed option.
- If a submodel has no independent SKU information, ask the developer; never inherit the main model's SKU automatically.
- After validating physical capabilities, still check the selected SDK's component list and the project's `dxmodules/`.

### 5. Confirm the data directory

- Determine the default data directory from the API-mapped `mainDeviceModel`.
- If the main model starts with `VF`, use `/data`.
- For other main models, use `/app/data`.
- If the target project or official device documentation explicitly specifies another location, follow that more specific evidence.

### 6. Confirm USB status

- Ask whether the correct device is connected by USB.
- `dejaos connect` only verifies that a device is connected to the computer by USB. It does not discover or confirm the device model.
- `connect` requires an existing `app.dxproj`, so a new project must complete model confirmation and project creation first.
- Do not synchronize, start, stop, restart, or otherwise change a device until the correct device is confirmed.

## CLI-First Workflow

1. Run `dejaos --version`.
2. If the CLI is unavailable, explain that Node.js 18+ and `dejaos-cli` are required. After obtaining permission, run `npm install -g dejaos-cli`, then verify with `dejaos --version`.
3. After all gates pass for a new project, run:

   ```text
   dejaos new <deviceModel> <projectName> <projectDirectory> <2.0|4.0>
   ```

4. Do not create `app.dxproj` or `dxmodules/` manually.
5. Inspect the generated `app.dxproj`, SDK, components, and `dxmodules/`.
6. For a UI app, install a font at `resource/font/font.ttf`:
   - Chinese conversation, Chinese UI, or required CJK glyphs: `https://raw.githubusercontent.com/DejaOS/DejaOS/main/tools/font_cn.ttf`
   - English conversation and English-only UI: `https://raw.githubusercontent.com/DejaOS/DejaOS/main/tools/font_en.ttf`
   - Verify that the file exists and is non-empty. Use `/app/code/resource/font/font.ttf` at runtime.
7. For an existing project, read its configuration and source first, run `dejaos install --project <project>`, and then treat the newly generated `dxmodules/` as authoritative.

Read `references/dejaos-cli-workflow.md` for the complete command and device-validation loop.

## SDK Architecture Routing

### SDK 2.0

- Read `references/sdk2-runtime.md` before designing, creating, or modifying a 2.0 app.
- Workers may be created through `dxEventBus.newWorker(...)`.
- The main Worker owns initialization and Worker creation. UI, UART loops, facial processing, and long-running business responsibilities normally belong in dedicated Workers.
- Workers communicate through `dxEventBus` messages. Do not assume shared objects or direct cross-Worker calls.
- Each Worker remains single-threaded. `dxStd.setTimeout` and `setInterval` do not provide native parallelism.

### SDK 4.0

- Read `references/sdk4-runtime.md` before designing, creating, migrating, or modifying a 4.0 app.
- Use exactly one JavaScript runtime. Never create QuickJS Workers or call `dxEventBus.newWorker(...)`; `dxStd` no longer provides Worker support.
- Preserve responsibility boundaries with regular modules, services, controllers, and explicit lifecycles.
- Use `async`/`await`, Promises, and the component's public `on`/`off`/`once` events.
- Install `dxSystemBus` because component wrappers depend on it internally. Ordinary application business code must not directly import or call `dxSystemBus`.
- Initialize in dependency order and destroy in reverse order. Clean up listeners, timers, clients, databases, and components.
- Read `references/sdk4-api-patterns.md` for Promise, event, and lifecycle patterns. Actual functions must always be verified against the wrappers generated for the project.

## Project and Component API Audit

After every component installation and every material code change:

1. Confirm that every imported wrapper exists in the project's `dxmodules/`.
2. Open the corresponding JavaScript file and inspect default and named exports.
3. Verify function or member names, parameter order and count, constants, synchronous or Promise returns, result shapes, event names, initialization order, and cleanup methods.
4. Search all application imports and component member calls, and flag any module or function that does not exist.
5. Do not assume that a method exists in the target project merely because it exists in an older SDK, another model, or a reference example.
6. If a component is missing, use `dejaos edit` or intentionally update `app.dxproj`, then run `dejaos install`. Never copy wrappers into `dxmodules/`.

Read `references/dxmodules-api-audit.md` for the detailed audit procedure and searches.

## General Coding Rules

- Use `dxLogger`; do not use `console.log` in application code.
- Use `try/catch` at hardware, network, file, database, UART, timer, Worker, and asynchronous lifecycle boundaries.
- Put application code in `src/` and assets in `resource/`.
- Use runtime absolute asset paths in the form `/app/code/resource/...`.
- Import `dxmodules` with relative paths that match the source file depth. Node.js-style `node_modules` resolution is unavailable.
- Bound object sizes, loop counts, caches, and queue lengths; device memory and CPU are limited.
- Set timeouts for network and device operations. Avoid unbounded retries and logs.

## UI Rules

- In SDK 2.0, put UI in a dedicated UI Worker. In SDK 4.0, run UI in the unified main runtime and do not create a UI Worker.
- Initialize `dxUi` before creating controls. When required by the installed wrapper, call `dxui.handler()` from a short-period, non-blocking timer.
- For single-screen, multi-page projects, copy `assets/UIManager.js` to `src/UIManager.js`. Preserve an existing page-manager convention when one is already present.
- Chinese or non-English UI requires a TTF that covers the needed glyphs.
- `uiButton` has no direct text property; create a `Label` inside the button.
- `uiImage` is not directly clickable. Wrap it in a transparent `View` and register clicks on the outer view.
- Use `dxui.Utils.LAYER.TOP` only for true top-level overlays.
- For precise layout, call `padAll(0)` on a View and usually call `scroll(false)` as well.
- Images are not scaled automatically by default. Match control size to asset size.

## Facial Application Rules

Read `references/face-app-rules.md` before implementing facial features, and follow these rules:

- The live camera preview is full-screen by default and occupies the bottom display layer. Make the upper UI background fully or partially transparent when the preview must remain visible.
- If the facial app uses `UIManager.js`, add `this._rootScreen.bgOpa(0);` to the copied project file immediately after creating `_rootScreen`. This keeps the global root screen transparent so it does not hide the bottom-layer camera preview. Do not enable this by default for non-facial apps.
- Facial-recognition apps show the live preview by default. Whether to show a tracking box depends on product experience.
- During facial enrollment, call `dxFacial.setStatus(true)`; never use `false` during enrollment.
- In SDK 2.0, `dxFacial` normally encapsulates the facial pipeline and is initialized in a facial Worker.
- In SDK 4.0, the image pipeline is split across components. For complete live capture, preview, and recognition, verify the dependencies and initialization order `dxCapturer -> dxIvcore -> dxDisplay -> dxFacial` against the target wrappers.
- `dxCapcal` is not required for facial recognition. Use it only when camera calibration is needed and the installed wrapper explicitly supports it.
- Verify every facial and image-pipeline API against the corresponding generated `dxmodules/*.js` in the target project.

## Post-Change Device Loop

After every material source, configuration, or asset change:

1. Repeat the SKU, component, and API static checks.
2. Run available syntax or static checks.
3. When the correct USB device is confirmed, run `dejaos connect --project <project>` to verify connectivity.
4. Run `dejaos run --project <project>` to connect, incrementally synchronize, and start the app.
5. On first deployment or when incremental state is invalid, run `dejaos sync --all --project <project>`, followed by `dejaos start --project <project>` when necessary.
6. Collect `dejaos logs --project <project>` for a bounded period and inspect syntax, module loading, asset, uncaught exception, and hardware-initialization errors.
7. Fix obvious errors and repeat the run and log checks.
8. If no device is available, connection fails, or logs were not inspected, explicitly label the result as "static validation only" and never claim on-device validation passed.

## Reference Map

- `references/dejaos-cli-workflow.md`: CLI installation, project creation, fonts, USB execution, and log loop.
- `references/tools-http-api.md`: HTTP contract for model-to-main-model, SDK, and component queries.
- `references/device-models.md`: Current snapshot of 29 device-model mappings and default data directories.
- `references/device-sku-capabilities.md`: Standard and optional capabilities for VF105, VF114, VF203, and VF202.
- `references/sdk2-runtime.md`: SDK 2.0 Workers, event bus, UI, and common large-application patterns.
- `references/sdk2-components.md`: SDK 2.0 SQLite, UART, network, MQTT, HTTP, watchdog, and asset guidance.
- `references/sdk2-large-app-patterns.md`: Layering, state bridge, and command routing for large SDK 2.0 multi-Worker apps.
- `references/sdk4-runtime.md`: SDK 4.0 unified async runtime architecture and migration rules.
- `references/sdk4-api-patterns.md`: SDK 4.0 Promise, event, and lifecycle patterns; signatures still require project-wrapper verification.
- `references/dxmodules-api-audit.md`: Per-function API validation process.
- `references/face-app-rules.md`: Facial preview, layer, enrollment, and cleanup rules.
- `assets/UIManager.js`: General single-screen, multi-page manager.
- `assets/sdk2/`: SDK 2.0 `app.dxproj` examples.
- `scripts/resolve-device-sdk.mjs`: Live resolution of model, main model, SDK, and components.
- `scripts/install-skill.bat`: Copies the unified Skill to the current user's Codex, Cursor, and WorkBuddy Skill directories.
