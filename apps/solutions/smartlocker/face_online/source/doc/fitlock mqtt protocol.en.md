# Fit Lock Pro MQTT Protocol (Public Edition)

## 1. Overview

This document defines the public MQTT interface used between a Fit Lock Pro device and a management platform. It covers device configuration, user and cabinet synchronization, remote control, firmware upgrades, connection status, access events, face synchronization results, and alarms.

- Document version: **V1.0**
- Transport: MQTT
- Payload format: JSON
- Device identifier: device SN (`uuid`)
- User identifier: `userId`
- Cabinet identifier: the combination of `groupId` and `cabinetId`
- Cabinet queries use `cabinet/list`; there is no separate `getCabinetRuntime` command.

## 2. Common Rules

### 2.1 Topic conventions

| Direction | Topic pattern |
| --- | --- |
| Platform to device | `fitlock/v1/cmd/{device_sn}/xxxx` |
| Device command reply | `fitlock/v1/cmd/xxxx_reply` |
| Device event | `fitlock/v1/event/yyyy` |
| Platform event acknowledgement | `fitlock/v1/event/{device_sn}/yyyy_reply` |

`{device_sn}` and the message-body field `uuid` both contain the device SN. `fitlock/v1` is the protocol-version prefix.

### 2.2 Message envelope

Request:

```json
{
  "serialNo": "6w8keif5g6",
  "uuid": "e4720000964b5c00",
  "time": 1647580466,
  "sign": "",
  "data": {}
}
```

Response:

```json
{
  "serialNo": "6w8keif5g6",
  "uuid": "e4720000964b5c00",
  "time": 1647580466,
  "sign": "",
  "code": "000000",
  "message": "success",
  "data": {}
}
```

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `serialNo` | String | Yes | Message sequence number. A reply must reuse the request value. Recommended length: 32 characters or fewer. |
| `uuid` | String | Yes | Device SN. A device accepts a downlink command only when this value matches its local SN. |
| `time` | Long | Yes | 10-digit Unix timestamp in seconds. |
| `sign` | String | No | Signature. Send an empty string when signing is disabled. |
| `data` | Object, Array, String, or empty | Depends on API | Interface payload. |
| `code` | String | Response only | Result code; see Appendix B. |
| `message` | String | Response only | `success` or an error description. |

## 3. Device Management

### 3.1 Query configuration: `getConfig`

- Command: `fitlock/v1/cmd/{device_sn}/getConfig`
- Reply: `fitlock/v1/cmd/getConfig_reply`

Use an empty value or `all` to query every configuration group. Use a configuration-group name to query one group.

```json
{
  "serialNo": "cfg-001",
  "uuid": "e4720000964b5c00",
  "time": 1647580466,
  "sign": "",
  "data": "all"
}
```

The successful reply returns an object whose keys are the requested configuration groups. See Appendix A.

### 3.2 Modify configuration: `setConfig`

- Command: `fitlock/v1/cmd/{device_sn}/setConfig`
- Reply: `fitlock/v1/cmd/setConfig_reply`

`data` is an object containing one or more writable configuration groups. A successful reply uses code `000000`. Read-only fields are ignored or rejected according to the implementation.

```json
{
  "serialNo": "cfg-002",
  "uuid": "e4720000964b5c00",
  "time": 1647580466,
  "sign": "",
  "data": {
    "audio": { "volume": 8 },
    "doorOpenTimeout": { "value": 60 }
  }
}
```

### 3.3 Firmware upgrade: `upgradeFirmware`

- Command: `fitlock/v1/cmd/{device_sn}/upgradeFirmware`
- Reply: `fitlock/v1/cmd/upgradeFirmware_reply`

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `type` | Integer | Yes | Upgrade type. Current value: `0`. |
| `url` | String | Yes | Firmware download URL. |
| `md5` | String | Yes | Expected MD5 checksum of the downloaded file. |

```json
{
  "serialNo": "ota-001",
  "uuid": "e4720000964b5c00",
  "time": 1647580466,
  "sign": "",
  "data": {
    "type": 0,
    "url": "https://example.com/firmware.zip",
    "md5": "0123456789abcdef0123456789abcdef"
  }
}
```

The command reply confirms that the request was accepted. Upgrade progress and final success must be observed separately through the deployment's device status and logs.

### 3.4 Remote control: `control`

- Command: `fitlock/v1/cmd/{device_sn}/control`
- Reply: `fitlock/v1/cmd/control_reply`

| `command` | Operation | Additional fields |
| --- | --- | --- |
| `0` | Reboot device | None |
| `1` | Open one cabinet | `groupId`, `cabinetId` |
| `2` | Release one cabinet and open it | `groupId`, `cabinetId` |
| `3` | Clear business data while retaining configuration | None |
| `4` | Reset the device and clear all data | None |
| `5` | Release every locked cabinet and open cabinets sequentially | None |

```json
{
  "serialNo": "ctl-001",
  "uuid": "e4720000964b5c00",
  "time": 1647580466,
  "sign": "",
  "data": {
    "command": 1,
    "groupId": "1",
    "cabinetId": "12"
  }
}
```

### 3.5 Offline will event: `event/offline`

- Event: `fitlock/v1/event/offline`

The device configures this topic as its MQTT last-will message. The platform should treat it as an abnormal disconnect notification. The envelope identifies the device through `uuid`.

### 3.6 Connection event: `event/connect`

- Event: `fitlock/v1/event/connect`

The device publishes this event after connecting to MQTT.

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `model` | String | Yes | Device model. |
| `appVersion` | String | Yes | Device application version. |
| `ip` | String | Yes | Current device IP address. |

## 4. Shared Data Types

### 4.1 `User`

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `userId` | String | Yes | Unique user identifier. |
| `name` | String | Yes | Display name. |
| `faceImageUrl` | String | Conditional | Face-image download URL. Must be supplied together with `faceImageMd5`. |
| `faceImageMd5` | String | Conditional | MD5 of the face image. Must be supplied together with `faceImageUrl`. |
| `phone` | String | Conditional | Phone/login identifier. Must be supplied together with `pin`. |
| `pin` | String | Conditional | User PIN. Must be supplied together with `phone`. |
| `role` | Integer | Yes | `0`: normal user; `1`: administrator. |
| `faceEnrolled` | Integer | Query result | `0`: no local face feature; `1`: face feature enrolled. |

### 4.2 `Cabinet`

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `groupId` | String | Yes | Cabinet-group identifier. |
| `groupName` | String | Yes | Cabinet-group name. |
| `cabinetId` | String | Yes | Cabinet identifier within the group. |
| `cabinetName` | String | Yes | Cabinet display name/number. |
| `row` | Integer | No | Physical/UI row. |
| `col` | Integer | No | Physical/UI column. |
| `status` | Integer | Yes | Cabinet status; see 4.3. |
| `type` | Integer | Yes | Cabinet business type; see 4.3. |
| `userId` | String | No | Assigned user. Empty when unassigned. |
| `startTimestamp` | Long | No | Assignment/start time in seconds. |
| `endTimestamp` | Long | No | Expiration/end time in seconds. |
| `doorOpen` | Integer | Query result | Door state returned by `cabinet/list`: `0` closed, `1` open. |

### 4.3 Enumerations

Cabinet status:

| Value | Meaning |
| --- | --- |
| `1` | Free |
| `2` | Occupied |
| `3` | Locked |
| `4` | Fault |
| `5` | Disabled/blank position |

Cabinet type:

| Value | Meaning |
| --- | --- |
| `1` | Long-term/fixed cabinet |
| `2` | Temporary cabinet |

User role:

| Value | Meaning |
| --- | --- |
| `0` | Normal user |
| `1` | Administrator |

## 5. User APIs

### 5.1 Add or update users: `user/upsert`

- Command: `fitlock/v1/cmd/{device_sn}/user/upsert`
- Reply: `fitlock/v1/cmd/user/upsert_reply`

`data` is a `User` object or an array of `User` objects. Existing records with the same `userId` are updated. When face-image fields are provided, the device downloads the image and performs local enrollment; the final enrollment result is reported through `event/faceSync`.

```json
{
  "serialNo": "user-001",
  "uuid": "e4720000964b5c00",
  "time": 1647580466,
  "sign": "",
  "data": [{
    "userId": "U1001",
    "name": "Alice",
    "faceImageUrl": "https://example.com/faces/U1001.jpg",
    "faceImageMd5": "0123456789abcdef0123456789abcdef",
    "phone": "13800000000",
    "pin": "123456",
    "role": 0
  }]
}
```

### 5.2 Delete users: `user/delete`

- Command: `fitlock/v1/cmd/{device_sn}/user/delete`
- Reply: `fitlock/v1/cmd/user/delete_reply`

`data` contains one user identifier or an array of identifiers. The device removes the user record and its local face feature.

```json
{ "data": [{ "userId": "U1001" }] }
```

### 5.3 Clear users: `user/clear`

- Command: `fitlock/v1/cmd/{device_sn}/user/clear`
- Reply: `fitlock/v1/cmd/user/clear_reply`

Clears synchronized users and their local face data. `data` may be empty.

### 5.4 Query users: `user/list`

- Command: `fitlock/v1/cmd/{device_sn}/user/list`
- Reply: `fitlock/v1/cmd/user/list_reply`

Optional filters: `userId`, `phone`, and `role`. An empty object queries all users. The reply returns an array of `User` objects and includes `faceEnrolled`.

## 6. Cabinet APIs

### 6.1 Query cabinets: `cabinet/list`

- Command: `fitlock/v1/cmd/{device_sn}/cabinet/list`
- Reply: `fitlock/v1/cmd/cabinet/list_reply`

Optional filters: `groupId`, `cabinetId`, `status`, `type`, and `userId`. An empty object queries every cabinet. The reply returns `Cabinet` objects including the current `doorOpen` state.

### 6.2 Add or update cabinets: `cabinet/upsert`

- Command: `fitlock/v1/cmd/{device_sn}/cabinet/upsert`
- Reply: `fitlock/v1/cmd/cabinet/upsert_reply`

`data` is a `Cabinet` object or an array of `Cabinet` objects. The key is `groupId` plus `cabinetId`; an existing record is updated.

### 6.3 Delete cabinets: `cabinet/delete`

- Command: `fitlock/v1/cmd/{device_sn}/cabinet/delete`
- Reply: `fitlock/v1/cmd/cabinet/delete_reply`

Each item in `data` identifies a cabinet using `groupId` and `cabinetId`.

### 6.4 Clear cabinets: `cabinet/clear`

- Command: `fitlock/v1/cmd/{device_sn}/cabinet/clear`
- Reply: `fitlock/v1/cmd/cabinet/clear_reply`

Clears cabinet definitions and related business assignments. `data` may be empty.

## 7. Device Events

Events are persisted locally before publication. The platform must send the matching business acknowledgement. The device removes a pending event only after receiving an acknowledgement whose event identity matches the pending record. MQTT delivery acknowledgement alone is not a business acknowledgement.

### 7.1 Access event: `event/access`

- Event: `fitlock/v1/event/access`
- Acknowledgement: `fitlock/v1/event/{device_sn}/access_reply`

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `eventId` | String | Yes | Unique event identifier; use it for idempotency. |
| `userId` | String | Yes | User involved in the operation. |
| `groupId` | String | Yes | Cabinet group. |
| `cabinetId` | String | Yes | Cabinet. |
| `timestamp` | Long | Yes | Event time in seconds. |
| `type` | Integer | Yes | Access-event type. |
| `captureImage` | String | No | Captured-image URL or related image reference. |
| `extra` | Object | No | Type-specific data. |

| Type | Meaning | `extra` |
| --- | --- | --- |
| `1` | Open request / cabinet opened for access | Optional |
| `2` | Temporary cabinet occupied | `startTimestamp`, `endTimestamp` |
| `3` | Temporary cabinet released | Optional |
| `6` | Cabinet locked because of a rule or timeout | Optional |

Example:

```json
{
  "serialNo": "evt-access-001",
  "uuid": "e4720000964b5c00",
  "time": 1647580466,
  "sign": "",
  "data": {
    "eventId": "A-000001",
    "userId": "U1001",
    "groupId": "1",
    "cabinetId": "12",
    "timestamp": 1647580466,
    "type": 2,
    "captureImage": "",
    "extra": {
      "startTimestamp": 1647580466,
      "endTimestamp": 1647623666
    }
  }
}
```

The acknowledgement reuses the envelope identity and returns `code`, `message`, and the acknowledged event information.

### 7.2 Face synchronization event: `event/faceSync`

- Event: `fitlock/v1/event/faceSync`
- Acknowledgement: `fitlock/v1/event/{device_sn}/faceSync_reply`

This event reports the result of downloading, validating, and enrolling a user's face image.

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `eventId` | String | Yes | Unique event identifier. |
| `userId` | String | Yes | User whose face was processed. |
| `timestamp` | Long | Yes | Result time in seconds. |
| `faceImageMd5` | String | No | MD5 associated with the enrollment request. |
| `faceImageUrl` | String | No | Image URL associated with the request. |
| `code` | String | Yes | Face processing result. |
| `message` | String | Yes | Human-readable result description. |

Face synchronization codes:

| Code | Meaning |
| --- | --- |
| `000000` | Success |
| `FACE_DOWNLOAD_FAILED` | Image download failed |
| `FACE_DETECT_FAILED` | No usable face was detected |
| `FACE_FEATURE_INVALID` | Extracted face feature is invalid |
| `FACE_ADD_FEA_FAILED` | Adding the local face feature failed |

### 7.3 Alarm event: `event/alarm`

- Event: `fitlock/v1/event/alarm`
- Acknowledgement: `fitlock/v1/event/{device_sn}/alarm_reply`

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `eventId` | String | Yes | Unique event identifier. |
| `userId` | String | No | Administrator/user associated with the alarm. |
| `timestamp` | Long | Yes | Event time in seconds. |
| `type` | Integer | Yes | Alarm type. |
| `groupId` | String | Depends on type | Cabinet group. |
| `cabinetId` | String | Depends on type | Cabinet. |
| `extra` | Object | No | Type-specific details. |

| Type | Meaning | Additional data |
| --- | --- | --- |
| `1` | Administrator opened a specific cabinet | `groupId`, `cabinetId` |
| `2` | Administrator requested opening all cabinets | `extra.cabinetCount` |
| `3` | Administrator released locked cabinets | `extra.cabinetCount` |
| `4` | Cabinet door opened | `groupId`, `cabinetId` |
| `5` | Cabinet door closed | `groupId`, `cabinetId` |
| `6` | Cabinet remained open beyond the configured timeout | `groupId`, `cabinetId` |

## Appendix A. Configuration Groups

### A.1 `sysinfo` (read-only)

| Field | Type | Description |
| --- | --- | --- |
| `sn` | String | Device SN. |
| `model` | String | Product model. |
| `appVersion` | String | Application version. |

### A.2 `adminPin` (write-only)

| Field | Type | Description |
| --- | --- | --- |
| `oldPwd` | String | Current six-digit administrator PIN. |
| `newPwd` | String | New six-digit administrator PIN. |

### A.3 `network` (read/write)

| Field | Type | Description |
| --- | --- | --- |
| `netType` | Integer/String | Selected network interface/type. |
| `dhcp` | Integer/Boolean | Whether DHCP is enabled. |
| `ssid` | String | Wi-Fi SSID. |
| `psk` | String | Wi-Fi password. |
| `ip` | String | Static/current IP address. |
| `mask` | String | Subnet mask. |
| `gw` | String | Default gateway. |
| `dns` | String | DNS server. |

### A.4 `mqtt` (partially writable)

| Field | Writable | Description |
| --- | --- | --- |
| `host` | Yes | MQTT host. |
| `port` | Yes | MQTT port. |
| `user` | Yes | MQTT username. |
| `pass` | Yes | MQTT password. |
| `clientId` | No | Client ID generated from the device SN. |
| `qos` | No | Fixed at QoS `1`. |
| `cleanSession` | Yes | MQTT clean-session option. |

### A.5 `time` (read/write)

| Field | Type | Description |
| --- | --- | --- |
| `value` | String | Local time formatted as `YYYY-MM-DD HH:mm:ss`. |

### A.6 `audio` (read/write)

| Field | Type | Description |
| --- | --- | --- |
| `volume` | Integer | Volume from `0` to `10`. |

### A.7 `lockRule` (read/write)

Controls the temporary-cabinet lease and delayed locking behavior.

| Field | Type | Description |
| --- | --- | --- |
| `tempDelay` | Integer | Temporary-cabinet lease duration in hours. Default: `12`. |
| `timeDelay.enable` | Integer/Boolean | Enables the delayed-locking rule. |
| `timeDelay.type` | String | `timeout` or `static`. |
| `timeDelay.value.hour` | Integer | Hours. For `timeout`, total delay is limited to 720 hours. For `static`, range is 0–24. |
| `timeDelay.value.minute` | Integer | Minutes. For `static`, when hour is `24`, minute must be `0`. |

`timeout` means a relative delay after the operation. `static` means the next occurrence of the configured clock time.

### A.8 `openModel` (read/write)

Selects the cabinet-opening authentication mode. Supported values are `face` (default) and `pin`.

### A.9 `cabinetStrategy` (read/write)

| `mode` | Meaning |
| --- | --- |
| `0` | Mixed strategy (default). Long-term and temporary cabinets can coexist; releasing a long-term cabinet converts it to a temporary cabinet. |
| `1` | All cabinets are temporary. |
| `2` | All cabinets are long-term/fixed. |

### A.10 `doorOpenTimeout` (read/write)

| Field | Type | Description |
| --- | --- | --- |
| `value` | Integer | Door-open alarm threshold in seconds. Default/minimum: `30`. |

### A.11 `tempPickupMode` (read/write)

| `value` | Meaning |
| --- | --- |
| `1` | Retain temporary-cabinet occupancy after pickup (default; supports temporary access). |
| `0` | Release the temporary cabinet after pickup. |

## Appendix B. Result Codes

| Code/range | Meaning |
| --- | --- |
| `000000` | Success |
| `100000` | Unknown error |
| `100001` | Function disabled or unavailable |
| `100002` | Device busy |
| `100003` | Signature verification failed |
| `100004` | Request timeout |
| `100005` | Device offline |
| `200000`–`299999` | Parameter or request-data error |
| `300000`–`399999` | Other defined business/device error |

The platform should treat `eventId` and `serialNo` as idempotency keys where appropriate, retain unknown fields for forward compatibility, and log both `code` and `message` when a request fails.
