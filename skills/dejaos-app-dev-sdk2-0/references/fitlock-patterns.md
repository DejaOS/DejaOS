# FitLock Project Patterns

This reference distills reusable architecture patterns from a production-style DejaOS cabinet application. Do not copy the full project into a skill reference. Use this file as a compact pattern catalog for larger DejaOS SDK 2.0 apps.

## 1. Why Use a Distilled Reference

Full projects are usually too large for skill references. They include business-specific screens, resources, protocol details, temporary files, and unrelated implementation choices. A distilled reference is better because it preserves reusable decisions:

- Worker boundaries.
- Event bus topic design.
- SQLite schema and service layering.
- MQTT command routing and queued event publishing.
- UI page flow patterns.
- Hardware protocol isolation.
- Face enrollment and recognition flow.
- Operational safeguards for embedded devices.

When adding future reference projects, prefer extracting patterns into separate reference files instead of copying source trees.

## 2. High-Level Architecture

The app uses a thin `main.js` plus dedicated workers:

- `main.js`: initialize SQLite, hardware, audio, watchdog, and create workers.
- `uiWorker.js`: initialize `dxUi`, register pages, open the home page, and call `dxui.handler()` periodically.
- `faceWorker.js`: own `dxFacial`, face library synchronization, and recognition callbacks.
- `worker/networkWorker.js`: own network status and connectivity events.
- `worker/mqttWorker.js`: own MQTT lifecycle, subscriptions, publishing, reconnects, and queued event flushing.
- `lock/lockWorker.js`: own UART lock-board protocol, open/query commands, door state reports, and door-open timeout monitoring.

Pattern:

```text
main.js
  -> init database and hardware
  -> start uiWorker
  -> start faceWorker
  -> start networkWorker
  -> start mqttWorker
  -> start lockWorker
```

Keep `main.js` small. Put durable loops in workers.

## 3. Event Bus as the Internal Backbone

Use constants for event topics. This avoids string drift across workers.

Useful topic categories:

- UI and identity: `FACE_START`, `FACE_STOP`, `FACE_RECOGNIZED`.
- Data synchronization: `USER_CHANGED`, `USER_FACE_CLEAR`, `CABINET_CHANGED`.
- Lock control: `LOCK_CMD`.
- Network and MQTT state: `NET_STATUS`, `MQTT_CONNECTED`, `MQTT_REINIT`.
- Publishing: `MQTT_PUBLISH`, `MQTT_ACCESS_EVENT_APPEND`.

Pattern:

- UI never calls UART directly. It fires `LOCK_CMD`.
- Hardware workers do not update UI directly. They fire state events.
- MQTT command handlers write local state and fire events for side effects.
- Events that cross worker boundaries should be small plain objects.

Important DejaOS detail:

`dxEventBus` supports one handler per topic in a worker. If several pages need the same event, create a local bridge object that owns the real bus subscription and fans out to page listeners.

## 4. UI State Bridge Pattern

The project uses a `PageState` object to bridge shared events to multiple pages:

- Keep a `Set` of page listeners.
- Subscribe to the real event bus topic only once.
- Fan out events to listeners inside `try/catch`.
- Unsubscribe from the event bus when the listener set becomes empty.
- Cache last-known state, such as network status, so pages can render immediately on show.

Use this pattern for:

- Face recognition events.
- Network status.
- MQTT status.
- Device status that several UI pages need.

## 5. SQLite Service Layer

Use one DB module to own:

- DB path.
- lazy DB initialization.
- schema creation.
- SQL escaping helpers.
- row-to-API conversion.
- domain operations.

Typical schema groups:

- `config`: key-value configuration.
- `user`: synchronized user identity data.
- domain tables such as `cabinet`.
- `pending_mqtt_event`: durable outbound event queue.

Patterns:

- Use `CREATE TABLE IF NOT EXISTS`.
- Use indexes for common lookup paths.
- Keep row conversion centralized, for example snake_case DB rows to camelCase API objects.
- Normalize incoming values before writing.
- Apply derived state on read when needed, such as expiration checks.
- Store retryable outbound events before publishing.

## 6. Configuration Service Pattern

Use a service module above the DB module for configuration:

- Normalize incoming values.
- Provide typed getters such as open mode, lock rule, door timeout, audio volume.
- Cache frequently used config in `dxMap` if multiple workers read it.
- Fire reinit events when configuration changes require a worker restart or reconnect.

Avoid spreading raw `FitLockDB.getConfig(...)` calls throughout business logic.

## 7. MQTT Worker Pattern

Recommended responsibilities:

- Build broker URL from configuration.
- Initialize and connect `dxMqttClient`.
- Subscribe to command topics after connection.
- Subscribe to business acknowledgement topics.
- Call `mqtt.loop()` on a short interval.
- Reconnect or reinitialize when network/config changes.
- Publish connection/status events.
- Flush queued events after connection.

Outbound durable event pattern:

1. Another worker fires `MQTT_ACCESS_EVENT_APPEND`.
2. MQTT worker validates the payload.
3. MQTT worker inserts the payload into `pending_mqtt_event`.
4. MQTT worker publishes pending rows.
5. MQTT worker deletes rows only after the backend sends an acknowledgement that matches the local row ID.

This pattern prevents data loss when the device is offline or the broker reconnects.

## 8. MQTT Command Routing Pattern

Split MQTT command handling into two layers:

- Router: parse topic and envelope, validate device identity, and return `{ kind, cmdTail, env }`.
- Handlers: implement each command and publish replies.

Handler guidelines:

- Validate envelope data shape early.
- Return explicit error replies for invalid payloads.
- Keep each command handler focused on one domain.
- Write local DB state first, then fire side-effect events.
- For destructive commands, clear related local hardware/algorithm state through events.

## 9. Face Worker Pattern

Use a dedicated worker for `dxFacial`.

Responsibilities:

- Initialize `face.init()` once.
- Run `face.loop()` periodically.
- Use `FACE_START` and `FACE_STOP` to gate recognition callbacks.
- Synchronize face features when users are inserted or updated.
- Download face images with `dxHttpClient`.
- Extract features from local files.
- Replace existing features before adding updated ones.
- Mark local DB enrollment status after success.
- Report enrollment failures as durable MQTT events.
- Clear algorithm features and cached images on user delete or data wipe.

Recognition flow:

```text
faceWorker
  -> onRecognition(event)
  -> fire FACE_RECOGNIZED
  -> UI validates local user
  -> UI continues business flow
```

The UI should re-check the local `user` table after face recognition. Algorithm libraries can contain stale features if a previous cleanup failed.

## 10. Lock Worker and Protocol Isolation

Use a dedicated lock worker for UART.

Patterns:

- Put frame building/parsing and checksums in a separate protocol module.
- Keep the worker focused on receiving commands, sending frames, polling UART, and translating hardware reports.
- Convert business cabinet IDs to hardware addresses through a service function.
- Convert hardware reports back to business cabinet IDs before updating DB or sending events.
- Deduplicate repeated door open/close reports per cabinet.
- Track door-open timeout in memory and emit timeout events when needed.

Command pattern:

```text
UI or command handler
  -> fire LOCK_CMD { action: "openOneByCabinet", groupId, cabinetId }
  -> lockWorker resolves hardware mapping
  -> protocol builds UART frame
  -> worker sends frame
```

Avoid putting business UI logic inside the lock worker.

## 11. UI Flow Pattern for Identity-Based Actions

The home page follows this flow:

1. Check that cabinet data exists.
2. Choose identity mode from configuration: face or PIN.
3. Face mode starts recognition and waits for `FACE_RECOGNIZED`.
4. PIN mode validates phone and PIN through local DB.
5. After identity success, collect the user's related resources.
6. If multiple resources exist, show a chooser overlay.
7. If one resource exists, open or operate it directly.
8. If none exists, follow strategy-based fallback logic.

Pattern for strategy modes:

- Keep strategy parsing in a helper.
- Apply strategy before presenting choices.
- Add a second guard before any fallback allocation path.

This avoids accidental bypass through future direct calls.

## 12. Modal and Overlay Pattern

Reusable overlays include:

- Face mask view.
- PIN entry view.
- Confirmation/error tip view.
- Choose-one-resource view.
- Pick-or-release view.

Guidelines:

- Build overlays on a top layer or a shared UI root.
- Provide `show/start` and `hide` methods.
- Store callbacks in object fields and clear them on hide.
- Keep timers local and clear them on hide.
- Use one-line page APIs from business pages.

## 13. Admin UI Pattern

Admin pages are normal UIManager pages:

- `AdminLoginPage`: password or admin face login.
- `AdminHomePage`: menu.
- action pages: open one cabinet, open all cabinets, network config, system info.

Patterns:

- Keep admin login separate from user open flow.
- Reject admin users in normal PIN user flow if business rules require it.
- Use face login only when `user.role` marks the user as admin.
- For long operations such as opening all cabinets, maintain a queue and allow cancellation.

## 14. Domain Rules in Services

Put domain rules in DB/service modules rather than scattering them through UI:

- cabinet type and status constants.
- expiration checks.
- lock-deadline calculation.
- open-mode normalization.
- strategy-mode normalization.
- door timeout normalization.
- hardware mapping.

UI should call service functions and focus on interaction flow.

## 15. Error Handling Patterns

Use defensive error handling:

- `try/catch` around every worker event handler.
- `try/catch` inside intervals.
- Validate inbound MQTT payloads before use.
- Validate IDs before DB writes or lock commands.
- Log skipped events with enough context.
- Prefer returning early on invalid input.

Do not let unhandled exceptions terminate a worker.

## 16. When Adding Future Reference Projects

For each reference project, create a new distilled file under `references/`, for example:

```text
references/payment-kiosk-patterns.md
references/access-control-patterns.md
references/scale-terminal-patterns.md
```

For each project, extract:

- Project purpose.
- Worker layout.
- State storage layout.
- Event bus topics.
- UI flow patterns.
- Hardware/protocol isolation.
- Offline/retry strategy.
- Error handling conventions.
- Reusable components.
- Review checklist.

Avoid copying:

- Full source trees.
- Large assets.
- Business credentials.
- Generated files.
- Vendor modules.
- Logs and temporary files.
