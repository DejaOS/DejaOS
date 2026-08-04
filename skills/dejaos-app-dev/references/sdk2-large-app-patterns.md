# SDK 2.0 Large-Application Patterns

## Layering

Recommended responsibilities:

```text
main.js
  -> creates Workers

UI Worker
  -> pages, input, presentation

Business/MQTT Worker
  -> workflows, command routing, service synchronization

Device Worker
  -> UART, lock control, GPIO, card reader, barcode scanner

Facial Worker
  -> camera, recognition, enrollment

SQLite Service
  -> data access and migrations
```

Do not split Workers merely to create more files. Split only for independent runtime responsibilities, native-component ownership, or failure isolation.

## EventBus

- Use stable topics such as `ui/action/open-lock` and `device/lock/state`.
- Include a business ID, timestamp, and required context in request payloads.
- Include a correlation ID and timeout when a response is required.
- Receivers handle duplicate messages idempotently.
- Never pass functions, native handles, or large images in messages.

## UI State Bridge

- Business state inside one Worker cannot be a shared UI object.
- The business Worker publishes serializable snapshots or incremental events.
- The UI Worker maintains presentation state locally.
- When a page becomes visible again, it may request a full snapshot to recover missed events.
- UI actions first show a processing state and show success only after an explicit result.

## SQLite Service

- Own the database connection centrally.
- Expose business methods; do not let pages or MQTT routes write SQL.
- Run schema migrations sequentially during startup.
- Use the transaction method actually supported by the wrapper for multi-step writes.
- Model local-record status as a recoverable state machine.

## Configuration Service

- Merge defaults, persisted values, and server-delivered values with an explicit precedence order.
- Validate types, ranges, and enumerations when writing configuration.
- Notify consumers of important configuration changes through EventBus.
- Never log keys, tokens, or device identities.

## MQTT Commands

1. Parse topic and payload.
2. Validate device ID, command type, timestamp, and required fields.
3. Generate or read a business command ID.
4. Detect duplicates.
5. Route to the business or device Worker.
6. Collect an explicit result.
7. Publish acknowledgement or error.

Never convert arbitrary remote payload directly into UART bytes or SQL.

## Facial and Identity Flow

- UI requests recognition or enrollment.
- The facial Worker manages the camera and `dxFacial`.
- The business Worker checks authorization from recognition results.
- The device Worker performs actions such as unlocking.
- UI presents the status of each stage.
- Events and database records share one business ID for correlation.

## Lock-Control Protocol

- Isolate the UART byte protocol in a driver/parser.
- Validate frame header, length, command, checksum, and address.
- Let the business layer use domain methods such as `openCompartment(id)`, but only when the driver actually implements them.
- Treat send, device acknowledgement, and physical-state change as three distinct stages.

## Error Handling

- Each Worker catches unhandled top-level errors and records them with `dxLogger`.
- Invalid external input must not crash a Worker.
- Bound reconnects and retries by count or time.
- Enter an explicit degraded state when recovery is impossible; do not hide failure with an unbounded loop.
- Preserve diagnostic state when possible before a watchdog reset.
