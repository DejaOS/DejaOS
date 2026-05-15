# **DW200_V20 TCP Module Unit Tests**

> **This document describes the QuickJS scripts under `src/`: after the device is online, two independent Workers run assertion-style unit tests against `dxTcpClient` and `dxTcpServer`, plus periodic `loop` calls for ongoing send/receive verification. The runtime is DejaOS (QuickJS), not Node.js.**

## **Overview**

When Ethernet DHCP succeeds and the network status code is `4` (connected), the main thread starts two Workers through the event bus:

- **Client side**: `tcpClient.js` — test suite for `dxmodules/dxTcpClient.js`.
- **Server side**: `tcpServer.js` — test suite for `dxmodules/dxTcpServer.js`.

The entry point `main.js` handles network initialization, status callbacks, and Worker scheduling; it **does not contain assertion cases**. All test cases live in the two files above.

## **Directory Structure**

```
├── src/
│   ├── main.js           # Entry: net init, DHCP, start client/server Workers after link-up
│   ├── tcpClient.js      # Suite 1: dxTcpClient unit tests + periodic send + loop
│   └── tcpServer.js      # Suite 2: dxTcpServer unit tests + periodic send to clients + loop
├── dxmodules/            # DX framework and dxTcp modules (e.g. libvbar-m-dxTcp.so)
└── dxNetwork-README.md   # Companion network demo documentation (style reference)
```

## **How to Run**

1. Deploy the application to **DW200_V20** (or any device that bundles `dxNetwork`, `dxTcp`, and related components).
2. Ensure Ethernet can obtain an address via DHCP until `onStatusChange` reports `net_status === 4`.
3. The main thread then runs:

   - `bus.newWorker('client', '/app/code/src/tcpClient.js')`
   - `bus.newWorker('server', '/app/code/src/tcpServer.js')`

4. Inside each Worker, `std.setInterval` periodically invokes `dxTcpClient.loop()` / `dxTcpServer.loop()` to drive native events. Results are logged with `dxLogger`; check device logs for `[PASS]` / `[FAIL]`.

**Note**: File headers mention running a single script directly under QuickJS for debugging. That mode can coexist with this project’s integrated flow (`main.js` starts Workers after the network is up). Adjust paths and ensure no other process binds the test port.

## **Minimal Test Framework (Shared Pattern)**

`tcpClient.js` and `tcpServer.js` both embed a **logger-based minimal assertion layer** (not a standalone npm test runner):

| Symbol / function | Role |
|-------------------|------|
| `_passed` / `_failed` | Counters for passed and failed checks |
| `pass(name)` | Record success and log `[PASS]` |
| `fail(name, reason)` | Record failure and log `[FAIL]` |
| `assert(name, condition, reason)` | `pass` if `condition` is true, else `fail` |

Cases run synchronously inside `runClientUnitTests` / `runServerUnitTests`. After they finish, timers remain for network I/O and `loop` scheduling.

## **Suite 1: `tcpClient.js` (dxTcpClient)**

**Imports**: `dxTcpClient.js`, `dxCommon.js`, `dxLogger.js`, `dxStd.js`.

**Intended coverage** (aligned with source comments):

- Return values of `init` and repeated `init`.
- Before connect: `isConnected`, `getRemoteAddress`, `send`, `sendBuffer` (including exceptions).
- `connect` behavior under error or integration scenarios (`TEST_HOST` may be changed before run to point at a real server).
- `setCallbacks` accepts a callback object without throwing.
- Numeric values of `EVENT_TYPE`.
- `getNative()` is non-null.

**Post-suite behavior**:

- Periodic string sends (e.g. `'hello client'`) and periodic `dxTcpClient.loop()`.

**Configuration**:

- `TEST_PORT`: default `8881` (must be free if it matches the server listen port).
- `TEST_HOST`: default `127.0.0.1`; change to the peer IP (same device or another host on the LAN) as needed.

`deinit`-related assertions are commented out to match a long-running `loop` scenario and avoid tearing down the singleton too early.

## **Suite 2: `tcpServer.js` (dxTcpServer)**

**Imports**: `dxTcpServer.js`, `dxCommon.js`, `dxLogger.js`, `dxStd.js`.

**Intended coverage**:

- `init` and repeated `init`.
- `listen(TEST_PORT)`, `getClientCount`, and `getClientList` with no clients yet.
- `setCallbacks` (including an echo example in `onData`).
- Numeric values of `EVENT_TYPE`.
- `getNative()` is non-null.

**Post-suite behavior**:

- Periodic `getClientList()`; when clients exist, send to the first `clientId`, then `disconnect` after a counter threshold.
- Periodic `dxTcpServer.loop()`.

**Configuration**: same as the client side; default `TEST_PORT = 8881`.

## **Relationship to dxNetwork**

- **`main.js`** uses `dxNetwork` for `init`, `connectEthWithDHCP`, `setCallbacks`, and `loop` (same stack as described in `dxNetwork-README.md`).
- **TCP tests** start only after the network is connected, avoiding useless connect/listen attempts while offline.

## **Notes**

1. **Port usage**: Ensure `TEST_PORT` (default `8881`) is not taken by another application.
2. **Threading**: `dxTcpClient` / `dxTcpServer` require callback registration and `loop` on the same thread. This demo runs client and server in separate Workers, each with its own `loop`, which matches the documented usage.
3. **Client target**: To connect the client to a server on the same device, set `TEST_HOST` to an address reachable on that device and match the server listen port.
4. **Logs as report**: No JUnit-style machine output; pass/fail is determined from `[PASS]` / `[FAIL]` lines in device logs.

## **Related API Modules**

- Client: `dxmodules/dxTcpClient.js` — `init`, `connect`, `send`, `sendBuffer`, `setCallbacks`, `loop`, `isConnected`, `getRemoteAddress`, `EVENT_TYPE`, etc.
- Server: `dxmodules/dxTcpServer.js` — `init`, `listen`, `send`, `broadcast`, `getClientList`, `getClientCount`, `setCallbacks`, `loop`, `EVENT_TYPE`, etc.

For full API details, see each module’s file header and the DejaOS project documentation.
