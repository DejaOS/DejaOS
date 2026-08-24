# Fit Lock Pro MQTT 协议文档（对外版）

## 一. 概述

本文档定义 Fit Lock Pro 设备对外 MQTT 接口，用于平台与设备进行配置管理、**人员**与**柜格**数据同步、远程控制、事件上报等交互。

> **请求/应答配对**：凡需要应答的消息，应答方必须使用该接口规定的 `_reply` topic，并原样回传被应答消息的 `serialNo`。不得重新生成 `serialNo`，也不得使用其他消息的 `serialNo`，否则可能造成消息错误确认或重复上报。

- 文档版本：**V1.0**
- 柜格唯一标识：`**groupId` + `cabinetId`**
- 人员唯一标识：`**userId**`
- 数据模型：**§4** 定义 `User`、`Cabinet` 对象；**§5** 人员同步与查询；**§6** 柜格 CRUD；**§7** 事件上报
- 柜格查询统一使用 `**cabinet/list`**（不提供 `getCabinetRuntime`）
- 传输协议：MQTT
- 数据格式：JSON

---

## 二. 通用规则

### 2.1 Topic 规则

- 下行（平台/应用 -> 设备）：`fitlock/v1/cmd/{#device_sn}/xxxx`
- 下行应答（设备 -> 平台/应用）：`fitlock/v1/cmd/xxxx_reply`
- 上行事件（设备 -> 平台/应用）：`fitlock/v1/event/yyyy`
- 上行事件应答（平台/应用 -> 设备）：`fitlock/v1/event/{#device_sn}/yyyy_reply`

说明：

- `{#device_sn}` 与消息体 `uuid` 含义一致，均为设备 SN。
- `fitlock/v1` 为协议版本前缀。
- 下行命令消息体 `uuid` 必须与设备本机 SN 一致；不一致时设备不执行业务命令，并在对应 `_reply` 返回 `code=100000`。

### 2.2 消息外壳

请求示例：

```json
{
  "serialNo": "6w8keif5g6",
  "uuid": "e4720000964b5c00",
  "time": 1647580466,
  "sign": "",
  "data": {}
}
```

响应示例：

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

字段定义：


| 参数名      | 说明    | 类型                          | 必须    | 备注                     |
| -------- | ----- | --------------------------- | ----- | ---------------------- |
| serialNo | 消息序列号 | String                      | 是     | 请求与对应响应保持一致，长度建议 <= 32 |
| uuid     | 设备标识  | String                      | 是     | 设备 SN                  |
| time     | 时间戳   | Long                        | 是     | 10 位秒级时间戳              |
| sign     | 签名    | String                      | 否     | 未启用签名时可传空字符串           |
| data     | 消息正文  | Object / Array / String / 空 | 视接口而定 | 每个接口分别定义               |
| code     | 结果码   | String                      | 响应必填  | 见附表 1                  |
| message  | 结果描述  | String                      | 响应必填  | `success` 或错误信息        |


---

## 三. 设备管理与事件接口

### 3.1 配置查询 `getConfig`

- 下行 topic：`fitlock/v1/cmd/{#uuid}/getConfig`
- 上行应答 topic：`fitlock/v1/cmd/getConfig_reply`

请求参数：


| 参数名  | 类型         | 必传  | 说明                    |
| ---- | ---------- | --- | --------------------- |
| data | String / 空 | 否   | 为空返回全部可读配置；传分组名返回对应分组 |


支持分组：`sysinfo`、`network`、`mqtt`、`time`、`audio`、`lockRule`、`openModel`、`cabinetStrategy`、`doorOpenTimeout`、`tempPickupMode`

`**data` 结构约定**：`network` / `mqtt` / `audio` / `lockRule` 等多字段分组为**对象**（如 `audio.volume`）；仅含单一配置项的分组 `time`、`openModel` 亦为对象，字段名为 `**value`**（如 `time.value`、`openModel.value`），避免分组键下直接混用字符串。

请求示例（查询全部）：

```json
{
  "serialNo": "6w8keif5g6",
  "uuid": "e4720000964b5c00",
  "time": 1647580466,
  "sign": "",
  "data": ""
}
```

响应示例：

```json
{
  "serialNo": "6w8keif5g6",
  "uuid": "e4720000964b5c00",
  "code": "000000",
  "time": 1701061767,
  "sign": "",
  "message": "success",
  "data": {
    "sysinfo": { "sn": "e4720000964b5c00", "model": "vf105_fitLock_pro", "appVersion": "1.0.0" },
    "network": { "netType": "ETH", "dhcp": true, "ssid": "", "psk": "", "ip": "192.168.1.100", "mask": "255.255.255.0", "gw": "192.168.1.1", "dns": "8.8.8.8" },
    "mqtt": { "host": "192.168.1.10", "port": "1883", "user": "", "pass": "", "clientId": "e4720000964b5c00", "qos": 1, "cleanSession": true },
    "time": { "value": "2023-10-01 12:00:00" },
    "audio": { "volume": 8 },
    "lockRule": {
      "timeDelay": { "enable": true, "type": "timeout", "value": { "hour": 24, "minute": 0 } },
      "tempDelay": 12
    },
    "openModel": { "value": "face" },
    "cabinetStrategy": { "mode": 0 },
    "doorOpenTimeout": { "value": 30 },
    "tempPickupMode": { "value": 1 }
  }
}
```

说明：

- `adminPin` 为仅写项，不会在 `getConfig` 返回中出现。
- `mqtt.clientId` 为只读固定项，始终等于设备 SN。
- `mqtt.qos` 为只读固定项，始终为 `1`；设备 MQTT 发布、订阅和遗嘱消息均使用 QoS 1。

### 3.2 配置修改 `setConfig`

- 下行 topic：`fitlock/v1/cmd/{#uuid}/setConfig`
- 上行应答 topic：`fitlock/v1/cmd/setConfig_reply`

请求参数：


| 参数名  | 类型     | 必传  | 说明          |
| ---- | ------ | --- | ----------- |
| data | Object | 是   | 仅包含需修改的可写分组 |


请求示例（修改 mqtt 和 time）：

```json
{
  "serialNo": "6w8keif5g6",
  "uuid": "e4720000964b5c00",
  "time": 1736755758,
  "sign": "",
  "data": {
    "mqtt": { "host": "192.168.62.110", "port": "1883", "user": "device", "pass": "secret", "cleanSession": true },
    "time": { "value": "2023-10-01 12:00:00" }
  }
}
```

`setConfig` 的 `mqtt` 分组不允许包含 `clientId`、`qos` 。若包含任一字段，设备返回 `code=100000`，且本次配置不生效。

管理员密码修改示例：

```json
{
  "serialNo": "6w8keif5g6",
  "uuid": "e4720000964b5c00",
  "time": 1736755758,
  "sign": "",
  "data": {
    "adminPin": { "oldPwd": "000000", "newPwd": "123456" }
  }
}
```

响应示例：

```json
{
  "serialNo": "6w8keif5g6",
  "uuid": "e4720000964b5c00",
  "time": 1736755758,
  "sign": "",
  "code": "000000",
  "message": "success"
}
```

### 3.3 设备升级 `upgradeFirmware`

- 下行 topic：`fitlock/v1/cmd/{#uuid}/upgradeFirmware`
- 上行应答 topic：`fitlock/v1/cmd/upgradeFirmware_reply`

请求参数：


| 参数名  | 类型     | 必传  | 说明                       |
| ---- | ------ | --- | ------------------------ |
| type | Int    | 是   | 升级类型：`0`=本机固件升级（当前仅支持该值） |
| url  | String | 是   | 升级包下载地址                  |
| md5  | String | 是   | 升级包 MD5                  |

设备收到有效升级指令后，会在屏幕顶层显示升级状态：

- 下载及校验期间显示“正在下载并校验升级包，请勿断电”；
- 下载和 MD5 校验成功后显示“升级包校验成功，设备即将重启”，随后约 2 秒重启；
- 参数、下载、MD5 校验或存储空间检查失败时显示对应失败提示，同时 `_reply` 返回 `code=100000`。


请求示例：

```json
{
  "serialNo": "6w8keif5g6",
  "uuid": "e4720000964b5c00",
  "time": 1736755758,
  "sign": "",
  "data": {
    "type": 0,
    "url": "http://10.102.106.165/aio.tar.xz",
    "md5": "521c2bdc835d4f13b5f9d6db164f0881"
  }
}
```

### 3.4 远程控制 `control`

- 下行 topic：`fitlock/v1/cmd/{#uuid}/control`
- 上行应答 topic：`fitlock/v1/cmd/control_reply`

请求参数：


| 参数名     | 类型     | 必传  | 说明                                                     |
| ------- | ------ | --- | ------------------------------------------------------ |
| command | Int    | 是   | `0`=重启，`1`=远程开柜，`2`=释放柜格（解除锁定并开柜），`3`=清空数据（保留配置），`4`=设备重置，`5`=释放所有已锁定柜格并依次开柜 |
| extra   | Object | 否   | `command=1` / `command=2` 时必传，见下表                      |


`command=2`：尝试打开目标柜门，并将目标柜格 `status` 置为 `1`（空闲），清空 `userId`、`startTimestamp`、`endTimestamp`；`type` 是否变更由配置 `**cabinetStrategy.mode**` 决定（见附录 A.9）。

`command=5`：仅处理当前 `status=3`（已锁定）的柜格。设备将这些柜格逐一释放，并依次尝试打开对应柜门；其他状态的柜格不受影响。该命令不需要传递 `extra`。应答 `data.releasedCount` 表示本次实际释放的柜格数量。

`command=5` 请求示例：

```json
{
  "serialNo": "control-release-locked-001",
  "uuid": "e4720000964b5c00",
  "time": 1736755758,
  "sign": "",
  "data": {
    "command": 5
  }
}
```

`command=3` 与 `command=4` 区别：

- `**3` 清空数据**：清除设备上的业务数据（如人员、柜格占用与绑定、待上报事件、人脸相关数据等），**保留**设备配置（网络、 MQTT、管理员口令、系统音量等）。执行成功后设备将自动重启。
- `**4` 设备重置**：清除设备上的**全部**数据与配置，恢复为出厂状态。执行成功后设备将自动重启。

`extra` 字段：


| 参数名       | 类型  | 必传  | 说明    |
| --------- | --- | --- | ----- |
| groupId   | Int | 是   | 柜组 ID |
| cabinetId | Int | 是   | 柜格 ID |


请求示例：

```json
{
  "serialNo": "0000000001",
  "uuid": "e4720000964b5c00",
  "time": 1736755758,
  "sign": "",
  "data": {
    "command": 1,
    "extra": { "groupId": 1, "cabinetId": 1 }
  }
}
```

### 3.5 遗嘱事件 `event/offline`

- 上行 topic：`fitlock/v1/event/offline`

消息示例：

```json
{
  "serialNo": "0000000001",
  "uuid": "e4720000964b5c00",
  "time": 1736755758,
  "sign": ""
}
```

### 3.6 连接上报 `event/connect`

- 上行 topic：`fitlock/v1/event/connect`
- 无需平台回复

`data` 参数：


| 参数名        | 类型     | 必传  | 说明                 |
| ---------- | ------ | --- | ------------------ |
| model      | String | 是   | 设备应用类型             |
| appVersion | String | 是   | 设备应用版本号            |
| ip         | String | 是   | 设备当前网络 IP 地址（IPv4） |


消息示例：

```json
{
  "serialNo": "0000000001",
  "uuid": "e4720000964b5c00",
  "time": 1737364204,
  "sign": "",
  "data": {
    "model": "vf105_fitLock_pro",
    "appVersion": "1.0.0",
    "ip": "192.168.1.100"
  }
}
```

---

## 四. 公共定义

### 4.1 User 对象

人员数据以 `**userId**` 唯一标识。


| 参数名          | 类型     | 说明                                             |
| ------------ | ------ | ---------------------------------------------- |
| userId       | String | 人员唯一 ID（必传）                                    |
| name         | String | 姓名；传空串表示清空姓名                                   |
| faceImageUrl | String | 人脸图片 HTTP 地址；与 `faceImageMd5` 须**成对**传入（均有值或均为空） |
| faceImageMd5 | String | 人脸图片 MD5（32 位 hex）；与 `faceImageUrl` 均为空时清除该用户人脸数据 |
| phone        | String | 11 位手机号；与 `pin` 须**成对**传入（均有值或均为空）             |
| pin          | String | 6 位数字密码（密码开柜场景）                                |
| role         | Int    | 角色，见 §4.3                                         |
| faceEnrolled | Int    | 设备侧人脸注册状态：`0` 未注册/注册失败，`1` 已注册；仅在 `user/list` 应答中返回 |


### 4.2 Cabinet 对象

柜格数据以 `**groupId` + `cabinetId`** 唯一标识。


| 参数名            | 类型     | 说明                                                                                                                                            |
| -------------- | ------ | --------------------------------------------------------------------------------------------------------------------------------------------- |
| groupId        | Int    | 柜组 ID，从 1 开始                                                                                                                                  |
| groupName      | String | 柜组名称（可选，预留）                                                                                                                                   |
| cabinetId      | Int    | 柜格 ID，从 1 开始                                                                                                                                  |
| cabinetName    | String | 柜格名称（可选，预留）                                                                                                                                   |
| row            | Int    | 布局行号（可选，预留）                                                                                                                                   |
| col            | Int    | 布局列号（可选，预留）                                                                                                                                   |
| status         | Int    | 柜格状态，见 §4.3                                                                                                                                   |
| type           | Int    | 柜格类型，见 §4.3                                                                                                                                   |
| userId         | String | 占用人 ID；无占用人时为空字符串                                                                                                                             |
| startTimestamp | Long   | 开始时间（10 位秒）；无则为 `0`                                                                                                                           |
| endTimestamp   | Long   | 租期/使用截止时刻（10 位秒）；`0` 表示无。临时柜新占用时由设备按 `lockRule.tempDelay` 计算；长期柜由平台 `cabinet/upsert` 下发。到期后是否立即变为锁定态，见 `lockRule.timeDelay` 与 §4.3 `status=3` |
| doorOpen       | Int    | 门态：`0` 关，`1` 开                                                                                                                                |


### 4.3 枚举

`**role`（人员角色）**


| 值   | 含义       |
| --- | -------- |
| 0   | 普通用户（缺省） |
| 1   | 管理员      |


`**status`（柜格状态）**


| 值   | 含义  |
| --- | --- |
| 1   | 空闲  |
| 2   | 占用  |
| 3   | 锁定  |
| 4   | 故障  |
| 5   | 空格  |


`**type`（柜格类型）**


| 值   | 含义  |
| --- | --- |
| 1   | 长期  |
| 2   | 临时  |


---

## 五. 用户接口

人员数据仍以**服务端为主**；设备接收平台下行同步，并提供只读的 `user/list`，用于查询设备当前实际保存的人员快照和人脸注册状态。

### 5.1 新增/更新 `user/upsert`

- 下行：`fitlock/v1/cmd/{#uuid}/user/upsert`
- 应答：`fitlock/v1/cmd/user/upsert_reply`

`data`：`User[]`，单次建议不超过 **100** 条，每项**必含** `userId`。接口采用局部更新规则：

- 已存在人员：未传字段保持原值不变；显式传入的字段按请求值更新。
- 新增人员：未传字段使用空值，`role` 默认取 `0`（普通用户）。
- `name` 传空字符串表示清空姓名。
- `faceImageUrl` 与 `faceImageMd5` 必须成对传入：同时省略表示不修改人脸数据，同时为空表示清除人脸数据，同时有值表示更新人脸数据。
- `phone` 与 `pin` 必须成对传入：同时省略表示不修改，同时为空表示清除，同时有值表示更新。

若 `faceImageUrl` 与 `faceImageMd5` 均有值，设备异步拉取并注册人脸，结果经 **`event/faceSync`** 上报（§7.2，成功与失败均上报）。

例如，只修改已有人员的姓名时可仅发送：

```json
{
  "userId": "u1001",
  "name": "李四"
}
```

该请求不会修改该人员的角色、手机号、密码或人脸数据。

请求示例：

```json
{
  "serialNo": "user-upsert-001",
  "uuid": "e4720000964b5c00",
  "time": 1737364400,
  "sign": "",
  "data": [
    {
      "userId": "u1001",
      "name": "张三",
      "faceImageUrl": "https://example.com/face/u1001.jpg",
      "faceImageMd5": "a1b2c3d4e5f6789012345678901234ab",
      "phone": "13800138000",
      "pin": "123456",
      "role": 0
    },
    {
      "userId": "admin01",
      "name": "管理员",
      "faceImageUrl": "https://example.com/face/admin01.jpg",
      "faceImageMd5": "fedcba0987654321fedcba0987654321",
      "role": 1
    }
  ]
}
```

应答示例：

```json
{
  "serialNo": "user-upsert-001",
  "uuid": "e4720000964b5c00",
  "time": 1737364401,
  "sign": "",
  "code": "000000",
  "message": "success",
  "data": {}
}
```

---

### 5.2 删除 `user/delete`

- 下行：`fitlock/v1/cmd/{#uuid}/user/delete`
- 应答：`fitlock/v1/cmd/user/delete_reply`

`data`：数组，每项含 `userId`（必传）。删除人员记录的同时，**同步删除设备中该 `userId` 对应的人脸特征**。该操作**不会解除柜格占用关系**；若需解除柜格绑定，平台须另行下发 `cabinet/upsert` 等接口。

请求示例：

```json
{
  "serialNo": "user-delete-001",
  "uuid": "e4720000964b5c00",
  "time": 1737364500,
  "sign": "",
  "data": [
    { "userId": "u1001" },
    { "userId": "u1002" }
  ]
}
```

应答示例：

```json
{
  "serialNo": "user-delete-001",
  "uuid": "e4720000964b5c00",
  "time": 1737364501,
  "sign": "",
  "code": "000000",
  "message": "success",
  "data": {}
}
```

---

### 5.3 清空 `user/clear`

- 下行：`fitlock/v1/cmd/{#uuid}/user/clear`
- 应答：`fitlock/v1/cmd/user/clear_reply`

`data`：可为 `{}` 或 `[]`。清空设备上全部人员记录（不含柜格），并**清空人脸库中全部已注册人脸特征**。

请求示例：

```json
{
  "serialNo": "user-clear-001",
  "uuid": "e4720000964b5c00",
  "time": 1737364600,
  "sign": "",
  "data": {}
}
```

应答示例：

```json
{
  "serialNo": "user-clear-001",
  "uuid": "e4720000964b5c00",
  "time": 1737364601,
  "sign": "",
  "code": "000000",
  "message": "success",
  "data": {}
}
```

---

### 5.4 查询 `user/list`

- 下行：`fitlock/v1/cmd/{#uuid}/user/list`
- 应答：`fitlock/v1/cmd/user/list_reply`

请求 `data` 可省略或传 `{}` 查询全部人员，也可以传入下列字段进行精确过滤：

| 参数名 | 类型 | 必传 | 说明 |
|------|------|------|------|
| userId | String | 否 | 按人员唯一 ID 精确查询 |
| phone | String | 否 | 按手机号精确查询 |
| role | Int | 否 | 按角色过滤：`0` 普通用户，`1` 管理员 |

多个过滤字段同时传入时按“并且”关系查询。应答 `data` 为设备当前保存的 `User[]`，按 `userId` 升序排列；其中 `faceEnrolled` 是设备侧只读状态，不作为 `user/upsert` 的下行字段。

请求示例（查询全部）：

```json
{
  "serialNo": "user-list-001",
  "uuid": "e4720000964b5c00",
  "time": 1737364650,
  "sign": "",
  "data": {}
}
```

请求示例（查询指定人员）：

```json
{
  "serialNo": "user-list-002",
  "uuid": "e4720000964b5c00",
  "time": 1737364651,
  "sign": "",
  "data": {
    "userId": "u1001"
  }
}
```

应答示例：

```json
{
  "serialNo": "user-list-001",
  "uuid": "e4720000964b5c00",
  "time": 1737364652,
  "sign": "",
  "code": "000000",
  "message": "success",
  "data": [
    {
      "userId": "u1001",
      "name": "张三",
      "faceImageUrl": "https://example.com/face/u1001.jpg",
      "faceImageMd5": "a1b2c3d4e5f6789012345678901234ab",
      "phone": "13800138000",
      "pin": "123456",
      "role": 0,
      "faceEnrolled": 1
    }
  ]
}
```

---

## 六. 柜格接口

### 6.1 查询 `cabinet/list`

- 下行：`fitlock/v1/cmd/{#uuid}/cabinet/list`
- 应答：`fitlock/v1/cmd/cabinet/list_reply`

请求 `data`（可选过滤；省略或 `{}` 表示查询全部）：


| 参数名       | 类型     | 必传  | 说明                    |
| --------- | ------ | --- | --------------------- |
| groupId   | Int    | 否   | 柜组                    |
| cabinetId | Int    | 否   | 与 `groupId` 同时传入时表示单柜 |
| status    | Int    | 否   | 按状态过滤                 |
| type      | Int    | 否   | 按类型过滤                 |
| userId    | String | 否   | 按占用人过滤                |


应答 `data`：`Cabinet[]`（§4.2）。

请求示例（查询单柜）：

```json
{
  "serialNo": "cabinet-list-001",
  "uuid": "e4720000964b5c00",
  "time": 1737364700,
  "sign": "",
  "data": {
    "groupId": 1,
    "cabinetId": 1
  }
}
```

请求示例（查询全部）：

```json
{
  "serialNo": "cabinet-list-002",
  "uuid": "e4720000964b5c00",
  "time": 1737364701,
  "sign": "",
  "data": {}
}
```

应答示例：

```json
{
  "serialNo": "cabinet-list-001",
  "uuid": "e4720000964b5c00",
  "time": 1737364702,
  "sign": "",
  "code": "000000",
  "message": "success",
  "data": [
    {
      "groupId": 1,
      "groupName": "A区",
      "cabinetId": 1,
      "cabinetName": "A1",
      "row": 1,
      "col": 1,
      "status": 2,
      "type": 1,
      "userId": "u1001",
      "startTimestamp": 1737302400,
      "endTimestamp": 1739980800,
      "doorOpen": 0
    },
    {
      "groupId": 1,
      "cabinetId": 2,
      "status": 1,
      "type": 2,
      "userId": "",
      "startTimestamp": 0,
      "endTimestamp": 0,
      "doorOpen": 0
    }
  ]
}
```

---

### 6.2 新增/更新 `cabinet/upsert`

- 下行：`fitlock/v1/cmd/{#uuid}/cabinet/upsert`
- 应答：`fitlock/v1/cmd/cabinet/upsert_reply`

`data`：`Cabinet[]`，单次建议不超过 100 条。每项**必含** `groupId`、`cabinetId`；其余字段按需传入。

请求示例：

```json
{
  "serialNo": "cabinet-upsert-001",
  "uuid": "e4720000964b5c00",
  "time": 1737364800,
  "sign": "",
  "data": [
    {
      "groupId": 1,
      "cabinetId": 1,
      "groupName": "A区",
      "cabinetName": "A1",
      "row": 1,
      "col": 1,
      "status": 1,
      "type": 1
    },
    {
      "groupId": 1,
      "cabinetId": 4,
      "status": 4,
      "type": 2,
      "userId": "",
      "startTimestamp": 0,
      "endTimestamp": 0,
      "doorOpen": 0
    }
  ]
}
```

应答示例：

```json
{
  "serialNo": "cabinet-upsert-001",
  "uuid": "e4720000964b5c00",
  "time": 1737364801,
  "sign": "",
  "code": "000000",
  "message": "success",
  "data": {}
}
```

---

### 6.3 删除 `cabinet/delete`

- 下行：`fitlock/v1/cmd/{#uuid}/cabinet/delete`
- 应答：`fitlock/v1/cmd/cabinet/delete_reply`

`data`：数组，每项含 `groupId`、`cabinetId`（均必传）。

请求示例：

```json
{
  "serialNo": "cabinet-delete-001",
  "uuid": "e4720000964b5c00",
  "time": 1737364900,
  "sign": "",
  "data": [
    { "groupId": 1, "cabinetId": 3 },
    { "groupId": 2, "cabinetId": 1 }
  ]
}
```

应答示例：

```json
{
  "serialNo": "cabinet-delete-001",
  "uuid": "e4720000964b5c00",
  "time": 1737364901,
  "sign": "",
  "code": "000000",
  "message": "success",
  "data": {}
}
```

---

### 6.4 清空 `cabinet/clear`

- 下行：`fitlock/v1/cmd/{#uuid}/cabinet/clear`
- 应答：`fitlock/v1/cmd/cabinet/clear_reply`

`data`：可为 `{}` 或 `[]`。清空设备上全部柜格记录（不含人员）。

请求示例：

```json
{
  "serialNo": "cabinet-clear-001",
  "uuid": "e4720000964b5c00",
  "time": 1737365000,
  "sign": "",
  "data": {}
}
```

应答示例：

```json
{
  "serialNo": "cabinet-clear-001",
  "uuid": "e4720000964b5c00",
  "time": 1737365001,
  "sign": "",
  "code": "000000",
  "message": "success",
  "data": {}
}
```

---

## 七. 事件上报

| 事件 | topic | 平台应答 | 说明 |
| ---- | ----- | -------- | ---- |
| 访问 | `event/access` | `access_reply` | 开柜请求、临时占用/释放、柜子锁定等 |
| 人脸同步 | `event/faceSync` | `faceSync_reply` | `user/upsert` 触发的人脸图下载/注册结果（成功与失败均上报） |
| 告警 | `event/alarm` | `alarm_reply` | 管理员危险操作，以及柜门打开、关闭、开柜超时未关 |
| 连接 | `event/connect` | 无 | 上线 |
| 离线 | `event/offline` | 无 | 遗嘱 |

### 7.1 `event/access`（访问事件）

- 上行 topic：`fitlock/v1/event/access`
- 平台应答 topic：`fitlock/v1/event/{#uuid}/access_reply`

#### 联调约定

- `**serialNo` 对齐**：设备在 `**event/access`** 上行报文中的 `**serialNo**`，平台在 `**access_reply**` 中必须回传**同一条** `**serialNo`**，用于标识应答的是哪一次上报。
- **必须应答**：平台对该条 `**event/access`** 处理结束后，须向上述应答 topic **下发一条 JSON**；若平台未在约定时间内给出应答，或应答无法按 `**serialNo`** 与上行关联，设备端可能重复上报。
- 应答 JSON 建议包含：`serialNo`、`uuid`、`time`、`sign`、`code`、`message`

`data` 为数组，数组元素字段：


| 参数名       | 类型     | 必传     | 说明                                                            |
| --------- | ------ | ------ | ------------------------------------------------------------- |
| eventId   | String | 是      | 事件唯一标识                                                        |
| userId    | String | 视 type | 人员唯一 ID；`type=1`、`2`、`3` 时必传；`type=6` 为锁定时的占用人，无占用人时传空字符串 `""` |
| groupId   | Int    | 是      | 柜格组号                                                           |
| cabinetId | Int    | 是      | 柜格编号                                                           |
| timestamp | Int    | 是      | 10 位秒级时间戳                                                     |
| type      | Int    | 是      | `1`=开柜请求，`2`=临时占用，`3`=临时释放，`6`=柜子已锁定（`type=0`、`4`、`5` 已废弃） |
| captureImage | String | 视场景 | 开柜抓图的 JPEG Base64 数据；`type=1` 且普通用户通过人脸识别开柜时必传，其他场景不传；不包含 `data:image/jpeg;base64,` 前缀 |
| extra     | Object | 视 type | `type=2` 时必传，字段见下表；其余 type 可选                           |


`type = 2` 时，`extra` 对象字段：


| 参数名            | 类型   | 必传  | 说明                                                                  |
| -------------- | ---- | --- | ------------------------------------------------------------------- |
| startTimestamp | Long | 是   | 临时占用开始时间（10 位秒），与柜格 `Cabinet.startTimestamp` 一致                     |
| endTimestamp   | Long | 是   | 临时占用结束时间（10 位秒），须 `>= startTimestamp`，与柜格 `Cabinet.endTimestamp` 一致 |


`type = 1` 时：表示设备已发起指定柜格的开柜请求，不表示柜门已经实际打开。`userId` 为本次开柜请求对应的操作人：普通用户开柜时为其人员 ID；MQTT 远程开柜时固定为 `remote`。普通用户通过人脸识别开柜时，设备必须通过 `captureImage` 上传本次识别抓图；通过密码或 MQTT 远程开柜时不提供该字段。管理员在设备管理界面执行开指定柜、开所有柜或释放已锁定柜格时，仅上报对应的 `event/alarm`，不产生 `event/access`。

`type = 6` 时：柜格按 `**lockRule.timeDelay**` 进入锁定态（`status=3`，见 §4.3）时上报；`userId`、`groupId`、`cabinetId` 为被锁定柜格对应字段。`extra` 可选。

开柜请求上报示例（`type = 1`）：

```json
{
  "serialNo": "0000000001",
  "uuid": "e4720000964b5c00",
  "time": 1736755758,
  "sign": "",
  "data": [
    {
      "eventId": "evt_1710000000_01",
      "userId": "u1001",
      "groupId": 1,
      "cabinetId": 1,
      "timestamp": 1710000000,
      "type": 1,
      "captureImage": "/9j/4AAQSkZJRgABAQ..."
    }
  ]
}
```

柜子已锁定上报示例（`type = 6`）：

```json
{
  "serialNo": "0000000004",
  "uuid": "e4720000964b5c00",
  "time": 1736755800,
  "sign": "",
  "data": [
    {
      "eventId": "evt_cabinet_locked_01",
      "userId": "u1001",
      "groupId": 1,
      "cabinetId": 2,
      "timestamp": 1710000100,
      "type": 6
    }
  ]
}
```

临时占用上报示例（`type = 2`）：

```json
{
  "serialNo": "0000000002",
  "uuid": "e4720000964b5c00",
  "time": 1736755760,
  "sign": "",
  "data": [
    {
      "eventId": "evt_1710000001_02",
      "userId": "u1001",
      "groupId": 1,
      "cabinetId": 2,
      "timestamp": 1710000001,
      "type": 2,
      "extra": {
        "startTimestamp": 1710000001,
        "endTimestamp": 1710086401
      }
    }
  ]
}
```

应答示例（平台下发至 `fitlock/v1/event/{#uuid}/access_reply`）：

```json
{
  "serialNo": "0000000001",
  "uuid": "e4720000964b5c00",
  "time": 1736755759,
  "sign": "",
  "code": "000000",
  "message": "success"
}
```

### 7.2 `event/faceSync`（人脸同步结果）

- 上行 topic：`fitlock/v1/event/faceSync`
- 平台应答 topic：`fitlock/v1/event/{#uuid}/faceSync_reply`

#### 联调约定

- 与 `event/access` 相同：`serialNo` 须与上行一致；平台须应答；未应答时设备可能重复上报。
- 应答 JSON 建议包含：`serialNo`、`uuid`、`time`、`sign`、`code`、`message`（`code=000000` 表示平台已受理该条上报）。

#### 触发时机

平台 `user/upsert` 中某条人员含 `faceImageUrl` 与 `faceImageMd5` 时，设备保存人员数据并应答 `upsert_reply` 后，**异步**完成人脸下载与注册（或判定无需处理），**每条待同步人员至多上报一次**本事件（成功与失败均上报）。

下列情况视为**成功**，须上报且 `code` 为 **`000000`**：

- 图片下载并完成人脸注册；
- 库中该用户 `faceImageMd5` 与本次一致且 `faceEnrolled` 已为已注册，**跳过下载与注册**（MD5 未变；`message` 可区分说明，如 `md5 unchanged`）。

下列情况视为**失败**，须上报且 `code` 取失败码（非 `000000`）。

`data` 为数组，数组元素字段：


| 参数名         | 类型     | 必传  | 说明                                      |
| ----------- | ------ | --- | --------------------------------------- |
| eventId     | String | 是   | 事件唯一标识                                  |
| userId      | String | 是   | 人员唯一 ID，与 `User.userId` 一致               |
| timestamp   | Int    | 是   | 10 位秒级时间戳（同步结果产生时刻）                     |
| faceImageMd5 | String | 是   | 本次同步对应的人脸图片 MD5，与 `User.faceImageMd5` 一致 |
| faceImageUrl | String | 否   | 人脸图片地址，与 `User.faceImageUrl` 一致           |
| code        | String | 是   | 同步结果码，见下表                               |
| message     | String | 否   | 结果描述（失败时建议填写）                           |


`code` 取值：


| code                   | 说明                            |
| ---------------------- | ----------------------------- |
| `000000`               | 同步成功（含：已下载并注册；或 MD5 未变且已注册、跳过处理） |
| `FACE_DOWNLOAD_FAILED` | 人脸图片下载失败                      |
| `FACE_DETECT_FAILED`   | 人脸检测失败                        |
| `FACE_FEATURE_INVALID` | 人脸特征无效                        |
| `FACE_ADD_FEA_FAILED`  | 人脸注册失败                        |


同步成功（已注册）示例：

```json
{
  "serialNo": "0000000101",
  "uuid": "e4720000964b5c00",
  "time": 1736755800,
  "sign": "",
  "data": [
    {
      "eventId": "evt_face_sync_1736755800_01",
      "userId": "u1001",
      "timestamp": 1736755800,
      "faceImageMd5": "a1b2c3d4e5f6789012345678901234ab",
      "faceImageUrl": "https://example.com/face/u1001.jpg",
      "code": "000000",
      "message": "success"
    }
  ]
}
```

同步成功（MD5 未变，跳过处理）示例：

```json
{
  "serialNo": "0000000102",
  "uuid": "e4720000964b5c00",
  "time": 1736755801,
  "sign": "",
  "data": [
    {
      "eventId": "evt_face_sync_1736755801_01",
      "userId": "u1001",
      "timestamp": 1736755801,
      "faceImageMd5": "a1b2c3d4e5f6789012345678901234ab",
      "faceImageUrl": "https://example.com/face/u1001.jpg",
      "code": "000000",
      "message": "md5 unchanged, already enrolled"
    }
  ]
}
```

同步失败示例：

```json
{
  "serialNo": "0000000103",
  "uuid": "e4720000964b5c00",
  "time": 1736755802,
  "sign": "",
  "data": [
    {
      "eventId": "evt_face_sync_1736755802_01",
      "userId": "UMOXY8ZWI",
      "timestamp": 1736755802,
      "faceImageMd5": "d41d8cd98f00b204e9800998ecf8427e",
      "faceImageUrl": "http://192.168.50.30:3001/uploads/faces/UMOXY8ZWI.jpg",
      "code": "FACE_DETECT_FAILED",
      "message": "人脸检测失败"
    }
  ]
}
```

应答示例（平台下发至 `fitlock/v1/event/{#uuid}/faceSync_reply`）：

```json
{
  "serialNo": "0000000101",
  "uuid": "e4720000964b5c00",
  "time": 1736755803,
  "sign": "",
  "code": "000000",
  "message": "success"
}
```

### 7.3 `event/alarm`（告警事件）

- 上行 topic：`fitlock/v1/event/alarm`
- 平台应答 topic：`fitlock/v1/event/{#uuid}/alarm_reply`

#### 联调约定

- `serialNo` 必须成对应答：平台在 `alarm_reply` 中回传本次 `event/alarm` 上行报文的同一 `serialNo`。
- 平台处理结束后必须应答；未应答或应答无法按 `serialNo` 关联时，设备可能重复上报。
- 应答 JSON 建议包含：`serialNo`、`uuid`、`time`、`sign`、`code`、`message`，其中 `code=000000` 表示平台已受理。

#### 事件类型

设备在以下情况上报告警事件：

- 管理员登录设备管理后台后发起开指定柜、开所有柜或释放已锁定柜格；
- 柜门实际打开；
- 柜门实际关闭；
- 柜门打开后超过 `doorOpenTimeout` 仍未关闭。

柜门打开、关闭及开柜超时未关告警依赖设备具备柜门状态检测能力并正确连接相关线路。设备不具备该能力或未连接相关线路时，不保证产生上述柜门状态告警。

`data` 为数组，数组元素字段：

| 参数名 | 类型 | 必传 | 说明 |
| ------ | ---- | ---- | ---- |
| eventId | String | 是 | 事件唯一标识 |
| userId | String | 视 type | `type=1`、`2`、`3` 时必传：人脸登录时为管理员人员 ID，密码登录时固定为 `admin`；`type=4`、`5`、`6` 不传此字段 |
| timestamp | Int | 是 | 事件发生时的 10 位秒级时间戳 |
| type | Int | 是 | `1`=开指定柜，`2`=开所有柜，`3`=释放已锁定柜格，`4`=柜门打开，`5`=柜门关闭，`6`=开柜超时未关 |
| groupId | Int | 视 type | `type=1`、`4`、`5`、`6` 时必传，目标柜格组号 |
| cabinetId | Int | 视 type | `type=1`、`4`、`5`、`6` 时必传，目标柜格编号 |
| extra | Object | 视 type | `type=2`、`3` 时必传，字段见下表；`type=6` 可选；其余 type 可选 |

`type=2`、`3` 时，`extra` 对象字段：

| 参数名 | 类型 | 必传 | 说明 |
| ------ | ---- | ---- | ---- |
| cabinetCount | Int | 是 | `type=2` 为本次计划打开的柜格数量；`type=3` 为本次实际释放并准备打开的锁定柜格数量 |

`type=6` 的 `extra` 可包含 `openTimestamp`，表示本次柜门打开时间（10 位秒级时间戳）。

开指定柜告警示例：

```json
{
  "serialNo": "0000000201",
  "uuid": "e4720000964b5c00",
  "time": 1736755900,
  "sign": "",
  "data": [
    {
      "eventId": "evt_alarm_1736755900_01",
      "userId": "admin-user-001",
      "timestamp": 1736755900,
      "type": 1,
      "groupId": 1,
      "cabinetId": 3
    }
  ]
}
```

密码登录后开所有柜告警示例：

```json
{
  "serialNo": "0000000202",
  "uuid": "e4720000964b5c00",
  "time": 1736755910,
  "sign": "",
  "data": [
    {
      "eventId": "evt_alarm_1736755910_01",
      "userId": "admin",
      "timestamp": 1736755910,
      "type": 2,
      "extra": {
        "cabinetCount": 20
      }
    }
  ]
}
```

柜门打开告警示例（`type = 4`）：

```json
{
  "serialNo": "0000000203",
  "uuid": "e4720000964b5c00",
  "time": 1736755920,
  "sign": "",
  "data": [
    {
      "eventId": "evt_alarm_door_open_01",
      "timestamp": 1736755920,
      "type": 4,
      "groupId": 1,
      "cabinetId": 3
    }
  ]
}
```

柜门关闭告警示例（`type = 5`）：

```json
{
  "serialNo": "0000000204",
  "uuid": "e4720000964b5c00",
  "time": 1736755930,
  "sign": "",
  "data": [
    {
      "eventId": "evt_alarm_door_close_01",
      "timestamp": 1736755930,
      "type": 5,
      "groupId": 1,
      "cabinetId": 3
    }
  ]
}
```

开柜超时未关告警示例（`type = 6`）：

```json
{
  "serialNo": "0000000205",
  "uuid": "e4720000964b5c00",
  "time": 1736755950,
  "sign": "",
  "data": [
    {
      "eventId": "evt_alarm_door_timeout_01",
      "timestamp": 1736755950,
      "type": 6,
      "groupId": 1,
      "cabinetId": 3,
      "extra": {
        "openTimestamp": 1736755920
      }
    }
  ]
}
```

平台应答示例（下发至 `fitlock/v1/event/{#uuid}/alarm_reply`）：

```json
{
  "serialNo": "0000000202",
  "uuid": "e4720000964b5c00",
  "time": 1736755911,
  "sign": "",
  "code": "000000",
  "message": "success"
}
```

---

## 附录 A `getConfig` / `setConfig` 配置项

### A.1 只读：`sysinfo`


| 字段         | 类型     | 说明    |
| ---------- | ------ | ----- |
| sn         | String | 设备 SN |
| model      | String | 应用名称  |
| appVersion | String | 应用版本号 |


### A.2 只写：`adminPin`


| 字段     | 类型     | 说明            |
| ------ | ------ | ------------- |
| oldPwd | String | 原管理员密码（6 位数字） |
| newPwd | String | 新管理员密码（6 位数字） |


### A.3 可读可写：`network`


| 字段      | 类型      | 说明             |
| ------- | ------- | -------------- |
| netType | String  | `ETH` / `WIFI` |
| dhcp    | Boolean | 是否 DHCP        |
| ssid    | String  | Wi-Fi SSID     |
| psk     | String  | Wi-Fi 密码       |
| ip      | String  | IPv4           |
| mask    | String  | 子网掩码           |
| gw      | String  | 网关             |
| dns     | String  | DNS            |


### A.4 部分可写：`mqtt`


| 字段           | 类型      | 可写 | 说明 |
| ------------ | ------- | --- | --- |
| host         | String  | 是 | Broker 地址 |
| port         | String  | 是 | Broker 端口 |
| user         | String  | 是 | 用户名 |
| pass         | String  | 是 | 密码 |
| clientId     | String  | 否 | 只读固定项，始终等于设备 SN |
| qos          | Number  | 否 | 只读固定项，始终为 `1` |
| cleanSession | Boolean | 是 | 是否清除会话 |


### A.5 可读可写：`time`


| 字段    | 类型     | 必传  | 说明                              |
| ----- | ------ | --- | ------------------------------- |
| value | String | 是   | 设备本地时间，格式：`YYYY-MM-DD HH:mm:ss` |


读写示例：`"time": { "value": "2023-10-01 12:00:00" }`

### A.6 可读可写：`audio`


| 字段     | 类型     | 说明           |
| ------ | ------ | ------------ |
| volume | Number | 音量档位 0~10，整数 |


### A.7 可读可写：`lockRule`（租期与延时锁定）

用于约定**临时柜占用截止时刻**（写入 `Cabinet.endTimestamp`）以及**占用期满后何时进入锁定态**（`status=3`）。长期柜的 `endTimestamp` 由平台 `cabinet/upsert` 下发，**延时锁定规则对临时柜、长期柜同样适用**。


| 字段               | 类型      | 必传  | 说明                                                                                    |
| ---------------- | ------- | --- | ------------------------------------------------------------------------------------- |
| tempDelay        | Number  | 否   | 临时柜**新占用**时的使用时长，单位：**小时**；`endTimestamp = startTimestamp + tempDelay × 3600`。默认 `12` |
| timeDelay        | Object  | 否   | 占用期满后的延时锁定规则，见下表                                                                      |
| timeDelay.enable | Boolean | 否   | `false`（默认）：`endTimestamp` 到达即进入锁定；`true`：期满后可再延续一段时间才锁定                              |
| timeDelay.type   | String  | 否   | `timeout`（默认）或 `static`，与 `timeDelay.value` 配合，语义见下                                   |
| timeDelay.value  | Object  | 否   | 与 `timeDelay.type` 配合；默认 `{ "hour": 24, "minute": 0 }`                              |
| timeDelay.value.hour | Number | 是 | 小时，整数；取值范围随 `type` 不同，见下表                                                       |
| timeDelay.value.minute | Number | 是 | 分钟，`0-59` 的整数                                                                          |


`**timeDelay.type` 含义**（以 `endTimestamp` 为起点计算锁定时刻）：


| type      | 含义                                                                            |
| --------- | ----------------------------------------------------------------------------- |
| `timeout` | 自 `endTimestamp` 起再经过 `value.hour` 小时和 `value.minute` 分钟后锁定；总时长须大于0且不超过720小时 |
| `static`  | 自 `endTimestamp` 起对齐到下一个 `value.hour:value.minute`；`hour` 为 `0-24`，`hour=24` 时 `minute` 只能为 `0`，表示次日 `0:00` |


配置示例：

```json
{
  "lockRule": {
    "timeDelay": { "enable": true, "type": "timeout", "value": { "hour": 24, "minute": 30 } },
    "tempDelay": 12
  }
}
```

```json
{
  "lockRule": {
    "timeDelay": { "enable": false, "type": "timeout", "value": { "hour": 24, "minute": 0 } },
    "tempDelay": 12
  }
}
```

说明：

- `tempDelay` 仅影响临时柜**新占用**时写入的 `endTimestamp`，**不包含** `timeDelay` 宽限期。
- `timeDelay.enable = true` 时，在 `endTimestamp` 与最终锁定时刻之间，柜格仍为占用态（`status=2`）。
- 平台通过 `cabinet/list` 等接口查询到的 `status=3` 表示已进入锁定态；到达锁定时刻后，`status` 由 `2` 变为 `3` 可能存在短暂滞后（以设备实际状态为准）。

### A.8 可读可写：`openModel`（开柜方式）


| 字段    | 类型     | 必传  | 说明                                                       |
| ----- | ------ | --- | -------------------------------------------------------- |
| value | String | 否   | `face`（默认）：刷脸鉴权开柜；`pin`：手机号 + 6 位密码鉴权开柜 |


**写入行为**：若 `openModel.value` 与设备当前值**相同**，仅应答成功；若**有变化**，写入成功后设备将重启以使鉴权方式生效。

配置示例：

```json
{
  "openModel": { "value": "pin" }
}
```

### A.9 可读可写：`cabinetStrategy`（全柜策略）


| 字段   | 类型  | 必传  | 说明                                  |
| ---- | --- | --- | ----------------------------------- |
| mode | Int | 否   | `0` 临时/长期混合（**默认**）；`1` 全临时；`2` 全长期 |


**对释放操作的影响**（`control` `command=2`、`command=5` 或设备本地管理员释放，`status` 由 `3` 改为 `1` 并清空占用人与时间）：


| mode | 释放时 `type` 是否变更                              |
| ---- | -------------------------------------------- |
| `0`  | 若当前为**长期柜**（`type=1`），释放后改为 `**type=2`（临时）** |
| `1`  | 不变（规划/绑定应保证均为临时）                             |
| `2`  | 不变（规划/绑定应保证均为长期）                             |


配置示例：

```json
{
  "cabinetStrategy": { "mode": 0 }
}
```

### A.10 可读可写：`doorOpenTimeout`（柜格开启超时）

柜门**已打开**后，若在设定秒数内仍未关闭，设备上报 `event/alarm`，`type=6`。


| 字段    | 类型     | 必传  | 说明                                    |
| ----- | ------ | --- | ------------------------------------- |
| value | Number | 否   | 超时秒数，整数；**默认 `30`**，**最小 `30`**（小于 30 按 30 处理） |


读写示例：

```json
{
  "doorOpenTimeout": { "value": 30 }
}
```

### A.11 可读可写：`tempPickupMode`（临时柜取物模式:是否支持临时取用）


| 字段    | 类型  | 必传  | 说明                                                                 |
| ----- | --- | --- | ------------------------------------------------------------------ |
| value | Int | 否   | `1`（**默认**）：支持临时取用。                     |
|       |     |     | `0`：不支持临时取用，只支持释放取用 |


配置示例：

```json
{
  "tempPickupMode": { "value": 0 }
}
```



---

## 附表 1 Code 码总览


| 类型   | code          | 信息         | 说明       |
| ---- | ------------- | ---------- | -------- |
| 成功   | 000000        | 成功执行指令     | -        |
| 通用报错 | 100000        | 未知错误       | -        |
| 通用报错 | 100001        | 设备已被禁用     | -        |
| 通用报错 | 100002        | 设备正忙，请稍后再试 | -        |
| 通用报错 | 100003        | 签名检验失败     | 签名启用时生效  |
| 通用报错 | 100004        | 超时错误       | -        |
| 通用报错 | 100005        | 设备离线       | -        |
| 参数异常 | 200000-299999 | 参数异常       | 具体见各接口约束 |
| 其它异常 | 300000-399999 | 其它已知异常     | 具体见各接口约束 |


