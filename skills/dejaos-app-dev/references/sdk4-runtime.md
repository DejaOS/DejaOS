# SDK 4.0 Unified Async Runtime Architecture

## Contents

- Availability boundary
- Architecture change
- Scheduling model
- Application structure
- dxSystemBus boundary
- Lifecycle
- Migration from earlier versions
- Review checklist

## Availability Boundary

SDK 4.0 model coverage will continue to expand. Do not hard-code a list of supported models.

Before creating or migrating:

1. Resolve the exact `deviceModel` to its `mainDeviceModel`.
2. Query SDK 4.0 for the main model.
3. Query the latest components for that `sdkId`.
4. If the HTTP request fails, 4.0 is absent, or the component list is empty, tell the developer that the model is unsupported by SDK 4.0 according to the current query, then stop.

This Skill does not bundle component wrappers for any model. Query SDK 4.0 support live and inspect the `dxmodules/` generated after installation in the target project for actual APIs.

## Architecture Change

SDK 3.x and earlier simulated concurrency with multiple isolated QuickJS Workers and `dxEventBus`:

```text
Worker A <-> dxEventBus <-> Worker B
```

That design introduced multiple runtime memory footprints, cross-Worker messaging boilerplate, additional latency, state synchronization, and debugging complexity.

SDK 4.0 uses:

```text
One JavaScript runtime
  + one centrally scheduled event loop
  + native threads for blocking or heavy work
```

SDK 4.0 applications must not create Workers. `dxStd` no longer provides Worker capabilities. Even if an installation result or compatibility component list still contains `dxEventBus.js`, its Worker path must not be used as the architecture of a 4.0 app.

## Scheduling Model

Typical flow:

```text
JavaScript calls a component wrapper
  -> a native thread performs the task
  -> the JavaScript event loop keeps running
  -> the result enters a native queue
  -> a pipe wakes JavaScript
  -> the component receives it internally through dxSystemBus
  -> a Promise resolves/rejects or a component event fires
```

Applications use the component's public Promise and event APIs. They do not reproduce the native queue or task routing.

## Application Structure

- `src/main.js` is the composition entry point for configuration, dependency assembly, startup, and top-level failure handling.
- Divide responsibilities among regular modules, services, controllers, domain objects, and driver adapters.
- Use direct asynchronous function calls for operations that return results.
- Use an application-owned event emitter only for genuine notifications or broadcasts.
- Do not use `dxSystemBus` as a business event bus.
- Keep event callbacks short. Catch rejections from asynchronous work started by a callback.
- Do not perform synchronous sleep, long loops, heavy computation, or avoidable synchronous I/O on the JavaScript event loop.

"One runtime" does not mean putting the entire application in one file.

## dxSystemBus Boundary

- SDK 4.0 projects must install `dxSystemBus`.
- HTTP, MQTT, SQLite, facial, network, NFC, and other component wrappers may import it internally.
- Ordinary application business code does not import, subscribe to, or call `dxSystemBus` directly.
- Only component-wrapper development uses it to convert native completion events into public Promises or component events.

## Lifecycle

Recommended module surface:

```text
init -> start -> stop -> destroy/deinit
```

Rules:

- Initialize in dependency order.
- Record which steps initialized successfully.
- Roll back completed steps when startup partially fails.
- Stop and destroy in reverse order.
- Remove event listeners and timers.
- Close MQTT/HTTP clients, databases, and native components.
- Use a unique `sourceId` for each client instance.
- Verify source-ID character and length constraints against the installed wrapper.

## Migration from Earlier Versions

1. Inventory Workers, EventBus topics, RPC, polling loops, and component ownership.
2. Replace Worker RPC that returns values with direct asynchronous service calls.
3. Preserve an application event only when broadcast semantics are still valid.
4. Replace component polling with Promises or `on/off/once` exposed by the 4.0 wrapper.
5. Use wrapper async APIs; do not emulate asynchrony with high-frequency timers.
6. Consolidate initialization and implement partial-failure rollback.
7. Remove duplicated configuration, state, and logging that existed across Workers.
8. Recheck every function, return type, and event against the 4.0 project's `dxmodules`.
9. Do not remove a working compatibility path until the replacement has passed on-device validation.

## Review Checklist

- Are there any Workers, `newWorker` calls, or Worker APIs unavailable in 4.0?
- Is any `await` or Promise-rejection handling missing?
- Does synchronous blocking work run on the event loop?
- Does application code use `dxSystemBus` directly?
- Are client `sourceId` values duplicated?
- Are initialization and reverse-order destruction complete?
- Are listeners, timers, or clients leaked?
- Does code use an event or function absent from the project wrapper?
- Was a hardware feature developed from the wrong model or SKU?
- Does the result claim on-device success without USB execution and log inspection?
