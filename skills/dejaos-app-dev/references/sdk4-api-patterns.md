# SDK 4.0 API Patterns

## Contents

- Usage boundary
- Example boundary
- dxSystemBus
- Async file and system operations
- HTTP
- SQLite
- MQTT
- Event-driven components
- UI and facial processing

## Usage Boundary

API evidence priority:

1. `dxmodules/*.js` generated after installation in the target project
2. The target project's `app.dxproj`
3. Pattern summaries and architecture notes in this document

This document helps explain and locate common patterns. It does not provide prebuilt component wrappers or replace real wrapper signatures.

## Example Boundary

The functions and events below illustrate common SDK 4.0 Promise, event, and lifecycle shapes. They are not guaranteed to exist for every model, component version, or future release. After creating a project or running `dejaos install`, open the project's own wrapper and verify every item.

## dxSystemBus

Ordinary applications:

- Install `dxSystemBus`.
- Do not import or call it directly.
- Use public component Promises and events.

Only component-wrapper development may use it directly:

```js
import { dxSystemBus, validateSourceId } from '../dxmodules/dxSystemBus.js'
```

Members commonly seen during component-wrapper development include:

```text
dxSystemBus.on(sourceId, callback)
dxSystemBus.off(sourceId, callback)
dxSystemBus.once(sourceId, callback)
```

Event shape:

```text
{ sourceId, taskId, eventType, payload }
```

`on` often returns an unsubscribe function. `DX_` and `SYS_` may be reserved prefixes. Verify custom ID character and length limits in the target wrapper.

## Async File and System Operations

Examples of common `dxStd` Promise APIs include:

```text
sleepAsync(delayMs)
loadFileAsync(path)
saveFileAsync(path, content)
readdirAsync(path)
statAsync(path)
```

The wrapper may retain synchronous file APIs. Avoid synchronous sleep, long file operations, and high-frequency synchronous I/O in event-driven business paths.

`dxOs` snapshots expose native-thread-backed Promise shell operations. Even if a method name contains `Blocked`, read the target wrapper to determine whether JavaScript receives a Promise and verify the actual result shape.

## HTTP

Common pattern:

```js
const client = dxHttpClient.createClient('http_main')
const response = await client.get(url, options)
await client.download(url, savePath, options)
client.destroy()
```

Rules:

- Give each active client a unique ID.
- Set request and download timeouts and handle rejections.
- Inspect `status`, `headers`, `body`, or `savedPath`.
- Handle in-flight requests when destroying a client.

## SQLite

Common pattern:

```text
await dxSqliteDB.open(path)
await dxSqliteDB.execute(sql) -> { changes, lastInsertRowid }
await dxSqliteDB.query(sql)   -> object[]
await dxSqliteDB.close()
```

The path's default root depends on the main model. Use parameterized or safely constructed SQL, bound result sets, and ensure the database closes after errors.

## MQTT

Common patterns include:

```text
createClient(sourceId, options)
on/off/once(event, callback)
await connect(options, timeoutMs)
await disconnect(timeoutMs)
await subscribe(topics, qos, timeoutMs)
await publish(topic, payload, qos, timeoutMs)
isConnected()
reset()
destroy()
```

Requirements:

- Give each active client a unique `sourceId`.
- Save the cancellation mechanism after registering an event.
- Disconnect and remove listeners before destruction.
- Apply timeouts and error logging to connect, subscribe, publish, and reconnect operations.

## Event-Driven Components

These SDK 4.0 components may receive native notifications through events:

- `dxFacial`
- `dxNfcCard`
- `dxNetwork`
- `dxGpioKey`
- `dxChannel`
- `dxUdpServer`
- `dxEid`

`dxBarcode` may register callbacks through `setCallbacks`. Check event names and arguments in the target file; do not rely on this list alone.

Prefer component events when available. Do not add high-frequency polling around them.

## UI and Facial Processing

`dxUi` still uses callbacks and a handler pattern:

- Call `dxui.init(options, context)` before creating controls.
- Share one context across all UI files.
- Call `dxui.handler()` periodically when required by the wrapper.

For a complete facial pipeline that needs live capture, preview, and recognition, a common SDK 4.0 dependency chain is `dxCapturer -> dxIvcore -> dxDisplay -> dxFacial`. `dxCapcal` is not required. Verify the exact order, initialization arguments, and cleanup methods against the target wrappers. Examples of common `dxFacial` APIs include:

```text
dxFacial.init(config)
dxFacial.on/off/once('detection' | 'recognition', callback)
dxFacial.setStatus(boolean)
await dxFacial.getFeaByCap(timeout)
await dxFacial.getFeaByFile(absoluteJpegPath)
dxFacial.compareFea(featureBase64)
dxFacial.addFea/updateFea/deleteFea/cleanFea
dxFacial.deinit()
```

Example feature-extraction results:

```text
getFeaByCap  -> { qualityScore, picPath, rect, feature }
getFeaByFile -> { qualityScore, rect, feature }
```

Enrollment must establish `dxFacial.setStatus(true)`. Verify every method and result against the target project version.
