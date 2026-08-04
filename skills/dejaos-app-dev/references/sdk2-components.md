# SDK 2.0 Component Development Guidance

## Contents

- app.dxproj
- Logging and imports
- SQLite
- UART
- Network and MQTT
- HTTP
- Watchdog
- Assets

## app.dxproj

- Create it with `dejaos new`; adjust it with `dejaos edit` or intentional text editing.
- Run `dejaos install` after changing components.
- Preserve `model` and `mainModel`: the former is the physical device model, while the latter is used for component downloads.
- Do not copy an SDK ID or component version from an example for another model.
- Examples under `assets/sdk2/` are only for understanding structure.

## Logging and Imports

- Use `dxLogger`, not `console.log`.
- Import `dxmodules` with a relative path that matches the current file depth.
- Each Worker imports the modules it needs independently.
- Do not assume that Node.js APIs, npm package resolution, or browser globals exist.

## SQLite

- The default database root is determined by main model: VF main models use `/data`; all others use `/app/data`.
- Wrap schema creation, migration, queries, and transactions in a dedicated service.
- UI code must not construct SQL directly or manage database handles.
- Bound query results and cache sizes.
- Handle first-time creation, corruption, insufficient disk space, and write failures.
- Verify open, execute, query, transaction, and close methods against the project's `dxSqliteDB.js`.

## UART

- Assign clear ownership of each UART instance to one Worker.
- Verify initialization arguments, port number, baud rate, data bits, parity, and stop bits against device configuration and the wrapper.
- Put frame coalescing/splitting, checksums, and timeouts in a protocol parser layer.
- Bound receive buffers and resynchronize after invalid frames.
- Convert raw byte offsets into domain events before business code uses them.
- Log send failures, no-response timeouts, CRC errors, and offline devices separately.

## Network and MQTT

- Use the SKU to eliminate unavailable Wi-Fi or 4G before implementation.
- Ethernet, Wi-Fi, and 4G may have different initialization and status APIs. Check each one in `dxNetwork.js`.
- Let a network Worker own MQTT connection, subscription, publishing, reconnection, and destruction.
- Convert topic routing into explicit business commands; do not manipulate UI directly inside MQTT callbacks.
- Use bounded backoff for reconnects.
- Give offline event queues persistence, unique IDs, a maximum capacity, and idempotent handling.
- A connected transport does not prove the business service is ready. Handle subscription and authentication failures separately.

## HTTP

- Set connection and request timeouts.
- Validate status codes, response types, and result shapes.
- Bound response-body and download-file sizes.
- Download to a temporary file and validate it before replacing the final asset.
- Handle DNS, connection, TLS, server-status, parsing, and local-write errors.
- Verify every function name and return value against the project's `dxHttpClient.js`.

## Watchdog

- A watchdog only proves that the feed path is running; it does not prove that all business functions are healthy.
- Check initialization, feed interval, stop, and destroy methods in `dxWatchdog.js`.
- Do not hide a blocked Worker with an empty timer that always feeds successfully.
- Record restart causes and important startup stages for diagnosis.

## Assets

- Put project files under `resource/`.
- Use `/app/code/resource/...` at runtime.
- Use `/app/code/resource/font/font.ttf` for the UI font.
- Match image dimensions, color formats, and memory use to the device display and decoder capabilities.
- Log missing assets explicitly during startup.
