# VF105 MQTT协议（DejaOS版本）

> MQTT 设备通信协议文档

| 文档属性 | 内容 |
| --- | --- |
| 协议类型 | MQTT |
| 协议版本 | V2 |
| 标签 | 人脸、标品、DejaOS、二级文档 |
| 接口数量 | 34 |
| 附录资料表 | 6 |
| 最后更新 | 2026-09-08 |

## 1. 文档说明

VF105 人脸标品MQTT 协议，适用于VF105 JS标品

## 2. 接口索引

| 序号 | 接口名称 | 类型 | 请求 Topic | 返回 Topic |
| ---: | --- | --- | --- | --- |
| 1 | [配置查询（getConfig）](#interface-1-getconfig) | 指令 | `access_device/v2/cmd/{#uuid}/getConfig` | `access_device/v2/cmd/getConfig_reply` |
| 2 | [配置修改（setConfig）](#interface-2-setconfig) | 指令 | `access_device/v2/cmd/{#uuid}/setConfig` | `access_device/v2/cmd/setConfig_reply` |
| 3 | [设备升级（upgradeFirmware）](#interface-3-upgradefirmware) | 指令 | `access_device/v2/cmd/{#uuid}/upgradeFirmware` | `access_device/v2/cmd/upgradeFirmware_reply` |
| 4 | [远程控制（control）](#interface-4-control) | 指令 | `access_device/v2/cmd/{#uuid}/control` | `access_device/v2/cmd/control_reply` |
| 5 | [报警（alarm）](#interface-5-alarm) | 主动上报 | `access_device/v2/event/alarm` | `access_device/v2/event/{#uuid}/alarm_reply` |
| 6 | [心跳（heartbeat）](#interface-6-heartbeat) | 主动上报 | `access_device/v2/event/heartbeat` | — |
| 7 | [遗嘱（offline）](#interface-7-offline) | 主动上报 | `access_device/v2/event/offline` | — |
| 8 | [连接上报（connect）](#interface-8-connect) | 主动上报 | `access_device/v2/event/connect` | — |
| 9 | [在线验证（access_online）](#interface-9-access-online) | 主动上报 | `access_device/v2/event/access_online` | `access_device/v2/event/{#uuid}/access_online_reply` |
| 10 | [企业微信（仅内部企微接口可用）（wecom）](#interface-10-wecom) | 主动上报 | `access_device/v2/event/wecom` | `access_device/v2/event/{#uuid}/wecom_reply` |
| 11 | [添加人员（insertUser）](#interface-11-insertuser) | 指令 | `access_device/v2/cmd/{#uuid}/insertUser` | `access_device/v2/cmd/insertUser_reply` |
| 12 | [删除人员（delUser）](#interface-12-deluser) | 指令 | `access_device/v2/cmd/{#uuid}/delUser` | `access_device/v2/cmd/delUser_reply` |
| 13 | [清空人员（clearUser）](#interface-13-clearuser) | 指令 | `access_device/v2/cmd/{#uuid}/clearUser` | `access_device/v2/cmd/clearUser_reply` |
| 14 | [查询人员（getUser）](#interface-14-getuser) | 指令 | `access_device/v2/cmd/{#uuid}/getUser` | `access_device/v2/cmd/getUser_reply` |
| 15 | [修改人员（modifyUser）](#interface-15-modifyuser) | 指令 | `access_device/v2/cmd/{#uuid}/modifyUser` | `access_device/v2/cmd/modifyUser_reply` |
| 16 | [添加凭证（insertKey）](#interface-16-insertkey) | 指令 | `access_device/v2/cmd/{#uuid}/insertKey` | `access_device/v2/cmd/insertKey_reply` |
| 17 | [查询凭证（getKey）](#interface-17-getkey) | 指令 | `access_device/v2/cmd/{#uuid}/getKey` | `access_device/v2/cmd/getKey_reply` |
| 18 | [删除凭证（delKey）](#interface-18-delkey) | 指令 | `access_device/v2/cmd/{#uuid}/delKey` | `access_device/v2/cmd/delKey_reply` |
| 19 | [清空凭证（clearKey）](#interface-19-clearkey) | 指令 | `access_device/v2/cmd/{#uuid}/clearKey` | `access_device/v2/cmd/clearKey_reply` |
| 20 | [修改凭证（modifyKey）](#interface-20-modifykey) | 指令 | `access_device/v2/cmd/{#uuid}/modifyKey` | `access_device/v2/cmd/modifyKey_reply` |
| 21 | [添加权限（insertPermission）](#interface-21-insertpermission) | 指令 | `access_device/v2/cmd/{#uuid}/insertPermission` | `access_device/v2/cmd/insertPermission_reply` |
| 22 | [查询权限（getPermission）](#interface-22-getpermission) | 指令 | `access_device/v2/cmd/{#uuid}/getPermission` | `access_device/v2/cmd/getPermission_reply` |
| 23 | [删除权限（delPermission）](#interface-23-delpermission) | 指令 | `access_device/v2/cmd/{#uuid}/delPermission` | `access_device/v2/cmd/delPermission_reply` |
| 24 | [清空权限（clearPermission）](#interface-24-clearpermission) | 指令 | `access_device/v2/cmd/{#uuid}/clearPermission` | `access_device/v2/cmd/clearPermission_reply` |
| 25 | [修改权限（modifyPermission）](#interface-25-modifypermission) | 指令 | `access_device/v2/cmd/{#uuid}/modifyPermission` | `access_device/v2/cmd/modifyPermission_reply` |
| 26 | [添加密钥（insertSecurity）](#interface-26-insertsecurity) | 指令 | `access_device/v2/cmd/{#uuid}/insertSecurity` | `access_device/v2/cmd/insertSecurity_reply` |
| 27 | [查询密钥（getSecurity）](#interface-27-getsecurity) | 指令 | `access_device/v2/cmd/{#uuid}/getSecurity` | `access_device/v2/cmd/getSecurity_reply` |
| 28 | [删除密钥（delSecurity）](#interface-28-delsecurity) | 指令 | `access_device/v2/cmd/{#uuid}/delSecurity` | `access_device/v2/cmd/delSecurity_reply` |
| 29 | [清空密钥（clearSecurity）](#interface-29-clearsecurity) | 指令 | `access_device/v2/cmd/{#uuid}/clearSecurity` | `access_device/v2/cmd/clearSecurity_reply` |
| 30 | [识别记录查询（getRecords）](#interface-30-getrecords) | 指令 | `access_device/v2/cmd/{#uuid}/getRecords` | `access_device/v2/cmd/getRecords_reply` |
| 31 | [识别记录删除（delRecords）](#interface-31-delrecords) | 指令 | `access_device/v2/cmd/{#uuid}/delRecords` | `access_device/v2/cmd/delRecords_reply` |
| 32 | [通行记录上报（access）](#interface-32-access) | 主动上报 | `access_device/v2/event/access` | `access_device/v2/event/{#uuid}/access_reply` |
| 33 | [对讲联系人（getCallList）（能力选配）](#interface-33-getcalllist) | 主动上报 | `access_device/v2/event/getCallList` | `access_device/v2/event/{#uuid}/getCallList_reply` |
| 34 | [对讲呼叫（call）（能力选配）](#interface-34-call) | 主动上报 | `access_device/v2/event/call` | `access_device/v2/event/{#uuid}/call_reply` |

## 3. 通用消息规范

除特别说明外，消息采用 UTF-8 编码的 JSON 对象。业务字段统一放在 `data` 中；部分写类指令成功回包不含 `data` 字段（见各接口返回定义）。

### Topic 前缀（`mqtt.prefix`）

文档与索引中的 Topic 均以 `access_device/v2/...` 为相对路径。配置 `mqtt.prefix` 非空时，设备对**全部**指令、上报与 ACK Topic 统一拼接前缀：先去掉配置值首尾 `/`，再追加一层尾部 `/`，再与 `access_device/v2` 拼接。例：`prefix="prod"` → `prod/access_device/v2/cmd/{uuid}/getConfig`；`prefix="/prod/"` 与 `prod` 等价。平台订阅/发布须与设备使用同一套拼接规则。

### 通用字段

| 字段 | 类型 | 请求 | 返回 | 说明 |
| --- | --- | :---: | :---: | --- |
| `serialNo` | string | 必须 | 必须 | 消息序列号，1–32 字符；用于请求/回包与事件 ACK 关联。**不做**同号指令去重；平台重复下发会重复执行。 |
| `uuid` | string | 必须 | 必须 | 设备唯一标识；须与 Topic 中 `{uuid}` **及本机 SN 一致**，否则入站校验失败（`200000`）。 |
| `time` | integer | 必须 | 必须 | Unix 时间戳（秒）。平台必须填写；设备入站**不校验**缺省、类型与取值（与 `serialNo`/`uuid` 不同）。 |
| `sign` | string | 可选 | 可选 | 占位字段，设备**不校验**；鉴权依赖 Broker 连接账号与 Topic ACL，勿按消息签名认证对接。 |
| `data` | object / array | 按接口 | 按接口 | 业务数据。写类接口（人员/凭证/权限/密钥等增删改清）**成功时不返回** `data`；失败或部分失败时返回错误明细。查询类接口成功时返回业务对象。 |
| `code` | string | — | 必须 | 返回结果码。 |
| `message` | string | — | 可选 | 返回结果说明。 |

### 入站与超时边界

- **未知 action**：Topic 落在设备订阅范围内但 `action` 未注册时，设备**静默丢弃**，不回包。
- **指令执行超时**：设备侧命令超时回 `100004`；超时不等于取消已在执行中的业务任务。平台重试前应确认幂等语义（如写类 upsert）或先查后改。
- **`mqtt.timeout`**：作用于等待平台 ACK 的上报：`alarm`、`access_online`、`wecom`、`access`，以及能力选配对讲的 `getCallList`、`call`（秒，≥1）。**不仅**用于在线验证。超时回 `100004`。
- **可靠性差异**：`access` 本地队列 + 失败退避重试（约 5s 起倍增至上限 60s）；`alarm` 等事件在离线或 ACK 失败时**不落库、不补发**。

### 基础报文示例

**请求**

```json
{
  "serialNo": "0000000001",
  "uuid": "e4720000964b5c00",
  "time": 0,
  "sign": "",
  "data": {}
}
```

**返回**

```json
{
  "serialNo": "0000000001",
  "uuid": "e4720000964b5c00",
  "code": "000000",
  "time": 0,
  "sign": "",
  "data": {},
  "message": ""
}
```

## 4. 接口详情

<a id="interface-1-getconfig"></a>
### 4.1 配置查询（getConfig）

| 属性 | 内容 |
| --- | --- |
| 接口类型 | 指令 |
| 接口标识 | `getConfig` |
| 请求 Topic | `access_device/v2/cmd/{#uuid}/getConfig` |
| 返回 Topic | `access_device/v2/cmd/getConfig_reply` |

#### 请求定义

Topic：`access_device/v2/cmd/{#uuid}/getConfig`

**业务字段**

| 字段路径 | 类型 | 必填 | 说明 | 示例 |
| --- | --- | :---: | --- | --- |
| `data` | string / array | 否 | 查询范围。**不传**或传 `""` 时返回全部配置分组；传字符串表示单个分组名（如 `"mqtt"`、`"sys"`）；传数组表示多个分组或具体字段（如 `["mqtt","sys"]`、`["mqtt.addr"]`）。不支持 object | `["mqtt", "sys"]` |

**完整请求示例**

```json
{
  "serialNo": "0000000001",
  "uuid": "e4720000964b5c00",
  "time": 0,
  "sign": "",
  "data": ["mqtt", "sys"]
}
```

#### 返回定义

Topic：`access_device/v2/cmd/getConfig_reply`

**业务字段**

`data` 为配置分组对象，分组名与字段见 [5.5 设备配置项](#55-设备配置项)。运行时只读字段（如 `mqtt.clientId`、`sys.sn`）会随查询一并返回。

**完整返回示例**

```json
{
  "serialNo": "0000000001",
  "uuid": "e4720000964b5c00",
  "code": "000000",
  "time": 0,
  "sign": "",
  "data": {
    "mqtt": {
      "addr": "mqtt://office.feocey.com:61702",
      "clientId": "e4720000964b5c00",
      "username": "admin",
      "password": "password",
      "qos": 1,
      "prefix": "",
      "onlinecheck": 0,
      "timeout": 5,
      "willTopic": "access_device/v2/event/offline",
      "cleanSession": 0,
      "clientIdSuffix": 0
    },
    "sys": {
      "heart_en": 0,
      "heart_time": 30,
      "nfc": 1,
      "pwd": 1
    }
  },
  "message": "success"
}
```

<a id="interface-2-setconfig"></a>
### 4.2 配置修改（setConfig）

| 属性 | 内容 |
| --- | --- |
| 接口类型 | 指令 |
| 接口标识 | `setConfig` |
| 请求 Topic | `access_device/v2/cmd/{#uuid}/setConfig` |
| 返回 Topic | `access_device/v2/cmd/setConfig_reply` |

#### 请求定义

Topic：`access_device/v2/cmd/{#uuid}/setConfig`

**业务字段**

`data` 为配置分组对象：键为分组名（`face`、`mqtt`、`net`、`ntp`、`access`、`base`、`sys`、`intercom`），值为该分组待修改字段的对象。只需传入要修改的分组及字段；字段定义、默认值、读写属性见 [5.5 设备配置项](#55-设备配置项)。

| 说明 | 内容 |
| --- | --- |
| 不可修改 | 运行时字段（`mqtt.clientId`、`net.mac`、`sys.mac`、`sys.sn`、`sys.appVersion`、`sys.releaseTime`、`sys.totaldisk`、`sys.freedisk`）及只读字段（`base.firstLogin`、`sys.model`、`sys.weComStatus`、`sys.weComMqttAddr`） |
| 部分成功 | 按字段校验与落库：合法字段立即生效；非法字段不写入。存在失败项时 `code=100000`，`data` 仍为相关分组最新配置（与全成功同形），`message` 逐项说明失败原因；成功项无需回滚 |
| 副作用 | 修改 `mqtt.*` 连接参数会在回包后重连 MQTT；修改 `sys.heart_en`/`sys.heart_time` 会立即影响心跳；修改 `ntp.timeZone`，或 `access.verifyMode` **涉及多人识别模式切换**时，**MQTT 回包后设备自动重启**（含部分成功 `code=100000` 且已有需重启项落库的情况；屏幕不弹确认框）。Web/HTTP 不自动重启、不弹屏：`getPublicConfig.rebootRequiredKeys` 含 `ntp.timeZone`（必然）与 `access.verifyMode`（候选）；实际是否弹窗以 `setConfig` 回包 `restartRequired` 为准（设备已按「是否涉及多人模式」计算），确认后再下发 `control(command=0)` |

**完整请求示例**

```json
{
  "serialNo": "0000000001",
  "uuid": "e4720000964b5c00",
  "time": 0,
  "sign": "",
  "data": {
    "mqtt": {
      "addr": "mqtt://192.168.1.100:1883",
      "qos": 1
    },
    "sys": {
      "heart_en": 1,
      "heart_time": 30
    }
  }
}
```

#### 返回定义

Topic：`access_device/v2/cmd/setConfig_reply`

**业务字段**

| 结果 | code | data | message |
| --- | --- | --- | --- |
| 全部成功 | `000000` | 本次请求涉及分组的最新配置（非空 `{}`）；未出现在请求中的分组不会返回 | `success` |
| 部分失败 | `100000` | 与全成功同形：本次请求涉及分组的最新配置（含已成功落库的字段） | `部分配置处理失败: <原因>; ...`（原因文案已含字段名时不再重复拼 key） |

**完整返回示例**

```json
{
  "serialNo": "0000000001",
  "uuid": "e4720000964b5c00",
  "code": "000000",
  "time": 0,
  "sign": "",
  "data": {
    "mqtt": {
      "addr": "mqtt://192.168.1.100:1883",
      "clientId": "e4720000964b5c00",
      "username": "admin",
      "password": "password",
      "qos": 1,
      "prefix": "",
      "onlinecheck": 0,
      "timeout": 5,
      "willTopic": "access_device/v2/event/offline",
      "cleanSession": 0,
      "clientIdSuffix": 0
    },
    "sys": {
      "heart_en": 1,
      "heart_time": 30,
      "nfc": 1,
      "pwd": 1
    }
  },
  "message": "success"
}
```

**部分失败返回示例**

```json
{
  "serialNo": "0000000001",
  "uuid": "e4720000964b5c00",
  "code": "100000",
  "time": 0,
  "sign": "",
  "data": {
    "sys": {
      "heart_en": 1,
      "heart_time": 30,
      "nfc": 1,
      "pwd": 1
    }
  },
  "message": "部分配置处理失败: sys.heart_time不能小于30; 配置项不可修改: sys.sn"
}
```

<a id="interface-3-upgradefirmware"></a>
### 4.3 设备升级（upgradeFirmware）

| 属性 | 内容 |
| --- | --- |
| 接口类型 | 指令 |
| 接口标识 | `upgradeFirmware` |
| 请求 Topic | `access_device/v2/cmd/{#uuid}/upgradeFirmware` |
| 返回 Topic | `access_device/v2/cmd/upgradeFirmware_reply` |

#### 请求定义

Topic：`access_device/v2/cmd/{#uuid}/upgradeFirmware`

**业务字段**

| 字段路径 | 类型 | 必填 | 说明 | 示例 | 枚举值 |
| --- | --- | :---: | --- | --- | --- |
| `type` | number | 是 | 升级包类型：`0` 本机 OTA 升级；`10` 广告资源包升级 | `0` | — |
| `url` | string | 是 | 下载包地址；设备访问该 URL 开始下载，访问失败则返回错误 | `http://10.102.106.165/aio.tar.xz` | — |
| `md5` | string | 是 | 升级包 MD5（32 位十六进制） | `521c2bdc835d4f13b5f9d6db164f0881` | — |
| `timeoutSec` | number | 否 | 下载超时（秒），范围 1–3600，默认 `300` | `300` | — |
| `extra` | object | 否 | 扩展字段；`type=10` 时必填，且 `extra.kind` 必须为 `"advertisement"` | `{"kind":"advertisement"}` | — |

**`type=10` 广告资源包格式**

`url` 指向一个 **ZIP** 文件（不是 OTA `.dpk`），设备校验整包 MD5 后按清单抽取图片。

ZIP 根目录结构：

```text
advert.zip
├── manifest.json          # 必填
├── ad_xxx.jpg / .jpeg / .png
└── ...
```

`manifest.json` 字段：

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | :---: | --- |
| `intervalSec` | number | 是 | 轮播间隔，**3–300** 秒 |
| `enabled` | boolean | 否 | 默认：有图则开启；显式 `false` 关闭 |
| `showClock` | boolean | 否 | 仅 `true` 时叠加时钟日期 |
| `items` | array | 是 | 广告列表，**最多 10** 张；空数组表示关闭广告 |
| `items[].id` | string | 是 | `[A-Za-z0-9_-]{1,40}`，不重复 |
| `items[].file` | string | 是 | 须匹配 `ad_[A-Za-z0-9_-]{1,40}.(jpg\|jpeg\|png)`，且与 ZIP 内文件名一致 |
| `items[].name` | string | 否 | 展示名，最长 80 |
| `items[].md5` | string | 否 | 单图 MD5；填写则校验 |

体积限制：整包 ≤ **35MB**；单图 ≤ **5MB**；图片合计 ≤ **30MB**。超限、超 10 张、清单/文件名非法时整包失败，不覆盖当前已激活广告。

**完整请求示例（type=0 OTA）**

```json
{
  "serialNo": "0000000001",
  "uuid": "e4720000964b5c00",
  "time": 0,
  "sign": "",
  "data": {
    "type": 0,
    "url": "http://10.102.106.165/aio.tar.xz",
    "md5": "521c2bdc835d4f13b5f9d6db164f0881",
    "extra": {}
  }
}
```

**完整请求示例（type=10 广告）**

```json
{
  "serialNo": "0000000002",
  "uuid": "e4720000964b5c00",
  "time": 0,
  "sign": "",
  "data": {
    "type": 10,
    "url": "http://10.102.106.165/advert.zip",
    "md5": "3f6c69b09022927e30f52853be7e4c70",
    "timeoutSec": 300,
    "extra": { "kind": "advertisement" }
  }
}
```

#### 返回定义

Topic：`access_device/v2/cmd/upgradeFirmware_reply`

**业务字段**

| 字段路径 | 类型 | 说明 |
| --- | --- | --- |
| `type=0` | — | 成功时常不返回 `data`（驱动返回 `true` 时省略）；回包成功后设备约 2 秒后重启 |
| `type=10` | object | 成功时 `data` 为广告资源状态，含 `enabled`、`intervalSec`、`showClock`、`items[]` 等 |

**完整返回示例（type=0）**

```json
{
  "serialNo": "0000000001",
  "uuid": "e4720000964b5c00",
  "code": "000000",
  "time": 0,
  "sign": "",
  "message": "success"
}
```

<a id="interface-4-control"></a>
### 4.4 远程控制（control）

| 属性 | 内容 |
| --- | --- |
| 接口类型 | 指令 |
| 接口标识 | `control` |
| 请求 Topic | `access_device/v2/cmd/{#uuid}/control` |
| 返回 Topic | `access_device/v2/cmd/control_reply` |

#### 请求定义

Topic：`access_device/v2/cmd/{#uuid}/control`

**业务字段**

| 字段路径 | 类型 | 必填 | 说明 | 示例 | 枚举值 |
| --- | --- | :---: | --- | --- | --- |
| `command` | number | 是 | 控制命令，当前支持：`0` 重启、`1` 远程开门、`4` 设备重置、`8` 远程抓拍人脸、`12` 远程指纹录入/中断 | `0` | — |
| `extra` | object | 否 | 扩展参数；`command=8` / `12` 时见下表 | `{}` | — |

**`extra` 扩展（按 command）**

| command | 字段 | 类型 | 必填 | 说明 |
| ---: | --- | --- | :---: | --- |
| 8 | `keyId` | string | 否 | 凭证 ID，回包原样带回 |
| 8 | `type` | number | 否 | 抓拍内容：`1` 仅图片、`2` 仅特征，其它或未传则两者都返回 |
| 8 | `timeout` | number | 否 | 抓拍超时（**毫秒**）；非法或未传默认约 `6500`；仅作用于底层抓拍，页面前 3 秒倒计时固定 |
| 12 | `fingerprintAction` | number | 是 | `0` 开始远程录入；`1` 中断当前录入 |
| 12 | `userId` | string | 否 | 人员 ID；仅 `name`/`userName` 均未传时，界面按本地人员库查姓名展示 |
| 12 | `name` / `userName` | string | 否 | 界面「申请人」展示名；**优先于**按 `userId` 查本地姓名 |
| 12 | `time` | string | 否 | 界面「申请时间」；未传则用设备当前时间 |

> 若 `extra.weComStatus` 为 `0` 或 `1`，协议层会转为企微绑定状态指令（见 [4.10 wecom](#interface-10-wecom)），不再走常规 control 分支；成功回包 `data` 为 `{ status, navigated }`（见下方返回表）。
>
> **`command=12` 说明**：录入成功只通过 `control_reply` 返回 `fingerFeature`，**不会**自动写入该 `userId` 的凭证；平台需再下发 `insertKey`（`type=500`）挂到人员下。

**完整请求示例（重启）**

```json
{
  "serialNo": "0000000001",
  "uuid": "e4720000964b5c00",
  "time": 0,
  "sign": "",
  "data": {
    "command": 0,
    "extra": {}
  }
}
```

#### 返回定义

Topic：`access_device/v2/cmd/control_reply`

**业务字段**

| 字段路径 | 类型 | 说明 |
| --- | --- | --- |
| `command=0/1/4` | — | 成功时不返回 `data` |
| `command=12` 且 `fingerprintAction=1` | — | 中断成功时不返回 `data` |
| `command=12` 且 `fingerprintAction=0` | object | 录入成功时 `data.fingerFeature` 为指纹特征十六进制串 |
| `command=8` | object | 含 `keyId`、`type`；按 `type` 返回 `faceBase64` 和/或 `featureBase64` |
| 企微绑定（`extra.weComStatus`） | object | `data.status`：`0` 未绑定 / `1` 已绑定；`data.navigated`：跳转目标页名（如 `home`、`wecom_network`），状态未变时为 `null` |

**完整返回示例（command=8）**

```json
{
  "serialNo": "0000000001",
  "uuid": "e4720000964b5c00",
  "code": "000000",
  "time": 0,
  "sign": "",
  "data": {
    "keyId": "K001",
    "type": 0,
    "faceBase64": "...",
    "featureBase64": "..."
  },
  "message": "success"
}
```

<a id="interface-5-alarm"></a>
### 4.5 报警（alarm）

| 属性 | 内容 |
| --- | --- |
| 接口类型 | 主动上报 |
| 接口标识 | `alarm` |
| 请求 Topic | `access_device/v2/event/alarm` |
| 返回 Topic | `access_device/v2/event/{#uuid}/alarm_reply` |

> 设备等待平台 `alarm_reply`，超时受 `mqtt.timeout` 约束。离线或 ACK 失败时**不缓存、不补发**；与通行记录 `access` 的本地队列重试不同。

#### 请求定义

Topic：`access_device/v2/event/alarm`

**业务字段**

| 字段路径 | 类型 | 必填 | 说明 | 示例 |
| --- | --- | :---: | --- | --- |
| `type` | number | 是 | 告警类型，见 [5.2 设备告警类型表](#52-设备告警类型表) | `257` |
| `value` | number | 是 | 告警状态值；门磁 `0` 开 / `1` 关；火警 `1` 触发；防拆 `0` 解除 / `1` 触发 | `1` |

**完整请求示例**

```json
{
  "serialNo": "0000000001",
  "uuid": "e4720000964b5c00",
  "time": 0,
  "sign": "",
  "data": {
    "type": 257,
    "value": 1
  }
}
```

#### 返回定义

Topic：`access_device/v2/event/{#uuid}/alarm_reply`

**业务字段**

_无业务字段。_

**完整返回示例**

```json
{
  "serialNo": "0000000001",
  "uuid": "e4720000964b5c00",
  "code": "000000",
  "time": 0,
  "sign": "",
  "data": {},
  "message": ""
}
```

<a id="interface-6-heartbeat"></a>
### 4.6 心跳（heartbeat）

| 属性 | 内容 |
| --- | --- |
| 接口类型 | 主动上报 |
| 接口标识 | `heartbeat` |
| 请求 Topic | `access_device/v2/event/heartbeat` |
| 返回 Topic | — |

> 设备按配置周期主动上报，**不等待平台回包**。平台若需应答，可订阅并向 `access_device/v2/event/{#uuid}/heartbeat_reply` 发布 ACK（设备侧不处理该回包）。

#### 请求定义

Topic：`access_device/v2/event/heartbeat`

**业务字段**

_无业务字段。_

**完整请求示例**

```json
{
  "serialNo": "0000000001",
  "uuid": "e4720000964b5c00",
  "time": 0,
  "sign": ""
}
```

#### 返回定义

> 设备侧不订阅 heartbeat 回包，以下返回示例仅供平台侧参考。

Topic：`access_device/v2/event/{#uuid}/heartbeat_reply`

**业务字段**

_无业务字段。_

**完整返回示例**

```json
{
  "serialNo": "0000000001",
  "uuid": "e4720000964b5c00",
  "code": "000000",
  "time": 0,
  "sign": "",
  "data": {},
  "message": ""
}
```

<a id="interface-7-offline"></a>
### 4.7 遗嘱（offline）

| 属性 | 内容 |
| --- | --- |
| 接口类型 | 主动上报 |
| 接口标识 | `offline` |
| 请求 Topic | `access_device/v2/event/offline` |
| 返回 Topic | — |

#### 请求定义

Topic：`access_device/v2/event/offline`

**业务字段**

无。遗嘱由 Broker 在异常断连时代发，payload 仅含通用字段（无 `data`）。

**完整请求示例**

```json
{
  "serialNo": "0000000001",
  "uuid": "e4720000964b5c00",
  "time": 0,
  "sign": ""
}
```

<a id="interface-8-connect"></a>
### 4.8 连接上报（connect）

| 属性 | 内容 |
| --- | --- |
| 接口类型 | 主动上报 |
| 接口标识 | `connect` |
| 请求 Topic | `access_device/v2/event/connect` |
| 返回 Topic | — |

> 设备连接成功后主动上报，**不等待平台回包**。平台若需应答，可订阅并向 `access_device/v2/event/{#uuid}/connect_reply` 发布 ACK（设备侧不处理该回包）。

#### 请求定义

Topic：`access_device/v2/event/connect`

**业务字段**

| 字段路径 | 类型 | 必填 | 说明 | 示例 | 枚举值 |
| --- | --- | :---: | --- | --- | --- |
| `appVersion` | string | 是 | 应用版本号 | `vf105_v12_1.0.0` | — |
| `btMac` | string | 否 | 蓝牙 MAC；无蓝牙能力时为空字符串 | `""` | — |
| `mac` | string | 否 | 设备硬件标识 | `e4ff00009df1d100` | — |
| `clientId` | string | 是 | MQTT 客户端 ID，默认与设备 SN 一致 | `e4720000964b5c00` | — |
| `type` | number | 是 | 网络类型，与 `net.type` 同值：`1` 以太网，`2` WiFi，`4` 4G | `1` | — |
| `ssid` | string | 否 | WiFi 名称；非 WiFi 时为空 | `""` | — |
| `psk` | string | 否 | WiFi 密码，与 `net.psk` 同值；非 WiFi 时为空 | `""` | — |
| `dhcp` | number | 是 | 与 `net.dhcp` 同值：`1` 静态 IP，`2` DHCP | `2` | — |
| `ip` | string | 是 | IP 地址 | `10.102.106.24` | — |
| `gateway` | string | 是 | 网关 | `10.102.106.124` | — |
| `dns` | string | 是 | DNS 服务器 | `10.102.106.124` | — |
| `subnetMask` | string | 是 | 子网掩码 | `255.255.255.0` | — |
| `netMac` | string | 否 | 网卡 MAC，取自 `net.mac` | `aa:bb:cc:dd:ee:ff` | — |
| `intercomSerno` | string | 否 | 对讲终端号；**仅设备具备对讲能力时携带**，无能力时本字段不出现 | `"ICOM001"` | — |

**完整请求示例**（含对讲能力机型字段；无能力时不要带 `intercomSerno`）

```json
{
  "serialNo": "0000000001",
  "uuid": "e4720000964b5c00",
  "time": 0,
  "sign": "",
  "data": {
    "appVersion": "vf105_v12_1.0.0",
    "btMac": "",
    "mac": "e4ff00009df1d100",
    "clientId": "e4720000964b5c00",
    "type": 1,
    "ssid": "",
    "psk": "",
    "dhcp": 2,
    "ip": "10.102.106.24",
    "gateway": "10.102.106.124",
    "dns": "10.102.106.124",
    "subnetMask": "255.255.255.0",
    "netMac": "aa:bb:cc:dd:ee:ff",
    "intercomSerno": "ICOM001"
  }
}
```

> 设备侧不订阅 connect 回包，以下返回示例仅供平台侧参考。

#### 返回定义（平台可选）

Topic：`access_device/v2/event/{#uuid}/connect_reply`

**业务字段**

_无业务字段。_

**完整返回示例**

```json
{
  "serialNo": "0000000001",
  "uuid": "e4720000964b5c00",
  "code": "000000",
  "time": 0,
  "sign": "",
  "data": {},
  "message": ""
}
```

<a id="interface-9-access-online"></a>
### 4.9 在线验证（access_online）

| 属性 | 内容 |
| --- | --- |
| 接口类型 | 主动上报 |
| 接口标识 | `access_online` |
| 请求 Topic | `access_device/v2/event/access_online` |
| 返回 Topic | `access_device/v2/event/{#uuid}/access_online_reply` |

#### 请求定义

Topic：`access_device/v2/event/access_online`

离线核验失败且 `mqtt.onlinecheck=1`、MQTT 在线时，设备向平台发起在线二次验证。`data` 为对象，字段如下：

| 字段路径 | 类型 | 必填 | 说明 | 示例 |
| --- | --- | :---: | --- | --- |
| `type` | string | 是 | 凭证类型，见 [5.3 凭证类型说明](#53-凭证类型说明) | `"103"` |
| `code` | string | 是 | 凭证值（卡号/码值/密码等）；人脸离线失败场景通常不会触发此上报 | `"s345463434gg"` |
| `timeStamp` | number | 是 | 通行时间戳（秒） | `1640917147` |
| `message` | string | 否 | 离线核验失败原因 | `"PERMISSION_DENIED"` |

**完整请求示例**

```json
{
  "serialNo": "0000000001",
  "uuid": "e4720000964b5c00",
  "time": 1640917147,
  "sign": "",
  "data": {
    "type": "103",
    "code": "s345463434gg",
    "timeStamp": 1640917147,
    "message": "PERMISSION_DENIED"
  }
}
```

#### 返回定义

Topic：`access_device/v2/event/{#uuid}/access_online_reply`

平台回包 `code=000000` 时设备放行；非成功码或超时（`mqtt.timeout`，见 [第 3 章](#3-通用消息规范)）则保持拒绝。

**业务字段**

_无业务字段。_

**完整返回示例**

```json
{
  "serialNo": "0000000001",
  "uuid": "e4720000964b5c00",
  "code": "000000",
  "time": 0,
  "sign": "",
  "data": {},
  "message": ""
}
```

<a id="interface-10-wecom"></a>
### 4.10 企业微信（仅内部企微接口可用）（wecom）

| 属性 | 内容 |
| --- | --- |
| 接口类型 | 主动上报 |
| 接口标识 | `wecom` |
| 请求 Topic | `access_device/v2/event/wecom` |
| 返回 Topic | `access_device/v2/event/{#uuid}/wecom_reply` |

#### 请求定义

Topic：`access_device/v2/event/wecom`

设备在企微模式下拉取绑定二维码时上报。`type=0` 表示查询绑定状态。

| 字段路径 | 类型 | 必填 | 说明 | 示例 |
| --- | --- | :---: | --- | --- |
| `type` | number | 是 | 业务类型；`0` 查询企微绑定状态 | `0` |
| `extra` | object | 否 | 扩展字段，当前未使用 | `{}` |

**完整请求示例**

```json
{
  "serialNo": "0000000001",
  "uuid": "e4720000964b5c00",
  "time": 0,
  "sign": "",
  "data": {
    "type": 0
  }
}
```

#### 返回定义

Topic：`access_device/v2/event/{#uuid}/wecom_reply`

**业务字段**

| 字段路径 | 类型 | 必填 | 说明 | 示例 | 枚举值 |
| --- | --- | :---: | --- | --- | --- |
| `status` | number | 否 | 企微状态（当发送时type=0，系统必传）；0：未绑定 1：绑定 | `0` | — |
| `bindQr` | string | 否 | 企微绑定码；未绑定时必传，供设备界面显示 | `"https://open.work.weixin.qq.com/connect/hardware?hw_code=<BIND_CODE>"` | — |

**完整返回示例**

```json
{
  "serialNo": "0000000001",
  "uuid": "e4720000964b5c00",
  "code": "000000",
  "time": 0,
  "sign": "",
  "data": {
    "status": 0,
    "bindQr": "https://open.work.weixin.qq.com/connect/hardware?hw_code=<BIND_CODE>"
  },
  "message": ""
}
```

<a id="interface-11-insertuser"></a>
### 4.11 添加人员（insertUser）

| 属性 | 内容 |
| --- | --- |
| 接口类型 | 指令 |
| 接口标识 | `insertUser` |
| 请求 Topic | `access_device/v2/cmd/{#uuid}/insertUser` |
| 返回 Topic | `access_device/v2/cmd/insertUser_reply` |

#### 请求定义

Topic：`access_device/v2/cmd/{#uuid}/insertUser`

**业务字段**

`data` 必须是**数组**，单次最多 100 条。`userId` 已存在时**覆盖更新，不报重复错误**。`extra` 以本次请求为准、不继承旧值；`permissionIds` 未传视为 `[]`。

每条记录字段如下：

| 字段路径 | 类型 | 必填 | 说明 | 示例 |
| --- | --- | :---: | --- | --- |
| `userId` | string | 是 | 人员唯一 ID，1-128 字符，不可含 `/` `\` `..` | `"SW200"` |
| `name` | string | 是 | 姓名，1-128 字符 | `"张三"` |
| `permissionIds` | array | 否 | 关联权限 ID 列表，默认 `[]` | `["6584132"]` |
| `extra` | object | 否 | 扩展字段，会与 `dualVerify` 策略一并规范化 | `{}` |
| `extra.dualVerify` | object | 否 | 双人核验策略 | — |
| `extra.dualVerify.mode` | string | 否 | `any` 任意其他人员（默认）；`specified` 指定人员；`none` 不启用 | `"any"` |
| `extra.dualVerify.userIds` | array | 条件 | `mode=specified` 时必填，且不可包含本人 | `["U002"]` |
| `extra.type` | number | 否 | 人员类型：`0` 普通，`1` 管理员 | `0` |
| `extra.idCard` | string | 否 | 身份证号 | `""` |
| `extra.department` | string | 否 | 部门 | `""` |
| `extra.employeeNo` | string | 否 | 工号 | `""` |

**完整请求示例**

```json
{
  "serialNo": "0000000001",
  "uuid": "e4720000964b5c00",
  "time": 0,
  "sign": "",
  "data": [
    {
      "userId": "SW200",
      "name": "张三",
      "permissionIds": ["6584132"],
      "extra": {
        "type": 0,
        "dualVerify": {
          "mode": "any",
          "userIds": []
        }
      }
    }
  ]
}
```

#### 返回定义

Topic：`access_device/v2/cmd/insertUser_reply`

**业务字段**

| 结果 | code | data |
| --- | --- | --- |
| 全部成功 | `000000` | ——（不返回 `data`） |
| 部分失败 | `100000` | 数组，每项含失败 `userId` 与 `errmsg` |

**成功返回示例**

```json
{
  "serialNo": "0000000001",
  "uuid": "e4720000964b5c00",
  "code": "000000",
  "time": 0,
  "sign": "",
  "message": "success"
}
```

**部分失败返回示例**

```json
{
  "serialNo": "0000000001",
  "uuid": "e4720000964b5c00",
  "code": "100000",
  "time": 0,
  "sign": "",
  "data": [
    {
      "userId": "SW200",
      "errmsg": "name格式错误"
    }
  ],
  "message": "部分数据处理失败"
}
```

<a id="interface-12-deluser"></a>
### 4.12 删除人员（delUser）

| 属性 | 内容 |
| --- | --- |
| 接口类型 | 指令 |
| 接口标识 | `delUser` |
| 请求 Topic | `access_device/v2/cmd/{#uuid}/delUser` |
| 返回 Topic | `access_device/v2/cmd/delUser_reply` |

#### 请求定义

Topic：`access_device/v2/cmd/{#uuid}/delUser`

**业务字段**

`data` 必须是 **userId 字符串数组**，单次最多 100 条。删除时会同步删除该人员的凭证、人脸/指纹特征等关联数据；**不会**删除 `permission` 表中的权限定义（需另行调用 [delPermission](#interface-23-delpermission) / [clearPermission](#interface-24-clearpermission)）。

**完整请求示例**

```json
{
  "serialNo": "0000000001",
  "uuid": "e4720000964b5c00",
  "time": 0,
  "sign": "",
  "data": [
    "SW200"
  ]
}
```

#### 返回定义

Topic：`access_device/v2/cmd/delUser_reply`

**业务字段**

| 结果 | code | data |
| --- | --- | --- |
| 全部成功 | `000000` | ——（不返回 `data`） |
| 部分失败 | `100000` | 数组，每项含失败 `userId` 与 `errmsg` |

**成功返回示例**

```json
{
  "serialNo": "0000000001",
  "uuid": "e4720000964b5c00",
  "code": "000000",
  "time": 0,
  "sign": "",
  "message": "success"
}
```

**部分失败返回示例**

```json
{
  "serialNo": "0000000001",
  "uuid": "e4720000964b5c00",
  "code": "100000",
  "time": 0,
  "sign": "",
  "data": [
    {
      "userId": "SW200",
      "errmsg": "person not found"
    }
  ],
  "message": "部分数据处理失败"
}
```

<a id="interface-13-clearuser"></a>
### 4.13 清空人员（clearUser）

| 属性 | 内容 |
| --- | --- |
| 接口类型 | 指令 |
| 接口标识 | `clearUser` |
| 请求 Topic | `access_device/v2/cmd/{#uuid}/clearUser` |
| 返回 Topic | `access_device/v2/cmd/clearUser_reply` |

#### 请求定义

Topic：`access_device/v2/cmd/{#uuid}/clearUser`

**业务字段**

_无业务字段。_ 清空全部人员，并同步清空关联凭证与生物特征数据；**不会**清空 `permission` 表（权限定义仍保留，但已无人员关联）。

**完整请求示例**

```json
{
  "serialNo": "0000000001",
  "uuid": "e4720000964b5c00",
  "time": 0,
  "sign": "",
  "data": {}
}
```

#### 返回定义

Topic：`access_device/v2/cmd/clearUser_reply`

**业务字段**

成功时不返回 `data` 字段。

**完整返回示例**

```json
{
  "serialNo": "0000000001",
  "uuid": "e4720000964b5c00",
  "code": "000000",
  "time": 0,
  "sign": "",
  "message": "success"
}
```

<a id="interface-14-getuser"></a>
### 4.14 查询人员（getUser）

| 属性 | 内容 |
| --- | --- |
| 接口类型 | 指令 |
| 接口标识 | `getUser` |
| 请求 Topic | `access_device/v2/cmd/{#uuid}/getUser` |
| 返回 Topic | `access_device/v2/cmd/getUser_reply` |

#### 请求定义

Topic：`access_device/v2/cmd/{#uuid}/getUser`

**业务字段**

| 字段路径 | 类型 | 必填 | 说明 | 示例 |
| --- | --- | :---: | --- | --- |
| `userId` | string | 否 | 按人员 ID 精确筛选；**不传**则不限（勿传空字符串） | `"SW200"` |
| `name` | string | 否 | 按姓名模糊筛选；**不传**或空字符串表示不限 | `"张"` |
| `keyword` | string | 否 | 按 ID 或姓名模糊搜索（OR 匹配）；**不传**或空字符串表示不限 | `"SW"` |
| `page` | number | 是 | 页码，从 0 开始 | `0` |
| `size` | number | 是 | 每页条数，范围 1-100 | `10` |

**完整请求示例**

```json
{
  "serialNo": "0000000001",
  "uuid": "e4720000964b5c00",
  "time": 0,
  "sign": "",
  "data": {
    "page": 0,
    "size": 10
  }
}
```

#### 返回定义

Topic：`access_device/v2/cmd/getUser_reply`

**业务字段**

| 字段路径 | 类型 | 说明 |
| --- | --- | --- |
| `page` | number | 当前页码 |
| `size` | number | 每页大小 |
| `total` | number | 总记录数 |
| `totalPage` | number | 总页数 |
| `count` | number | 本页实际条数 |
| `content` | array | 人员列表 |
| `content[].userId` | string | 人员 ID |
| `content[].name` | string | 姓名 |
| `content[].permissionIds` | array | 关联权限 ID 列表 |
| `content[].extra` | object | 扩展字段（如 `type`、`idCard`、`department`、`employeeNo`、`dualVerify` 等） |

**完整返回示例**

```json
{
  "serialNo": "0000000001",
  "uuid": "e4720000964b5c00",
  "code": "000000",
  "time": 0,
  "sign": "",
  "data": {
    "page": 0,
    "size": 10,
    "total": 1,
    "totalPage": 1,
    "count": 1,
    "content": [
      {
        "userId": "SW200",
        "name": "张三",
        "permissionIds": ["6584132"],
        "extra": {
          "type": 0,
          "dualVerify": {
            "mode": "any",
            "userIds": []
          }
        }
      }
    ]
  },
  "message": "success"
}
```

<a id="interface-15-modifyuser"></a>
### 4.15 修改人员（modifyUser）

| 属性 | 内容 |
| --- | --- |
| 接口类型 | 指令 |
| 接口标识 | `modifyUser` |
| 请求 Topic | `access_device/v2/cmd/{#uuid}/modifyUser` |
| 返回 Topic | `access_device/v2/cmd/modifyUser_reply` |

#### 请求定义

Topic：`access_device/v2/cmd/{#uuid}/modifyUser`

**业务字段**

`data` 必须是**数组**，单次最多 100 条。字段与 [insertUser](#interface-11-insertuser) 相同，且 **`userId` 必须已存在**。`extra` 与现有值**浅合并**；`permissionIds` 传则全量替换，未传视为 `[]`（会清空已有关联权限）。

**完整请求示例**

```json
{
  "serialNo": "0000000001",
  "uuid": "e4720000964b5c00",
  "time": 0,
  "sign": "",
  "data": [
    {
      "userId": "SW200",
      "name": "张三",
      "permissionIds": ["6584132"],
      "extra": {
        "department": "研发部"
      }
    }
  ]
}
```

#### 返回定义

Topic：`access_device/v2/cmd/modifyUser_reply`

**业务字段**

| 结果 | code | data |
| --- | --- | --- |
| 全部成功 | `000000` | ——（不返回 `data`） |
| 部分失败 | `100000` | 数组，每项含失败 `userId` 与 `errmsg` |

**成功返回示例**

```json
{
  "serialNo": "0000000001",
  "uuid": "e4720000964b5c00",
  "code": "000000",
  "time": 0,
  "sign": "",
  "message": "success"
}
```

**部分失败返回示例**

```json
{
  "serialNo": "0000000001",
  "uuid": "e4720000964b5c00",
  "code": "100000",
  "time": 0,
  "sign": "",
  "data": [
    {
      "userId": "SW200",
      "errmsg": "person not found"
    }
  ],
  "message": "部分数据处理失败"
}
```

<a id="interface-16-insertkey"></a>
### 4.16 添加凭证（insertKey）

| 属性 | 内容 |
| --- | --- |
| 接口类型 | 指令 |
| 接口标识 | `insertKey` |
| 请求 Topic | `access_device/v2/cmd/{#uuid}/insertKey` |
| 返回 Topic | `access_device/v2/cmd/insertKey_reply` |

#### 请求定义

Topic：`access_device/v2/cmd/{#uuid}/insertKey`

**业务字段**

`data` 必须是**数组**，单次最多 100 条。`keyId` 已存在时**覆盖更新，不报重复错误**。同 `type`+`code` 全局唯一；同一人最多 1 条人脸（`300`）与 1 条指纹（`500`）。人脸 Base64（`faceType=0`）：须 JPG、解码后 ≤512KB，且本批 `data` 最多 1 条。

每条记录字段如下：

| 字段路径 | 类型 | 必填 | 说明 | 示例 |
| --- | --- | :---: | --- | --- |
| `keyId` | string | 是 | 凭证唯一 ID，1-128 字符 | `"K001"` |
| `userId` | string | 是 | 人员唯一 ID；**人员必须已存在** | `"U001"` |
| `type` | string / number | 是 | 凭证类型，见 [5.3 凭证类型说明](#53-凭证类型说明)；数字会自动转字符串 | `"300"` |
| `code` | string | 是 | 凭证内容；`type=300` 且 `faceType=0` 时传 JPG Base64；`type=500` 传指纹特征十六进制串；`type=400` 位数受 `sys.passwordLength` 约束；卡号类自动转大写 | `"ZnNmZHNmYXNkZmFzZGY=..."` |
| `extra` | object | 条件 | 扩展字段；人脸（`type=300`）必填 | `{}` |
| `extra.faceType` | string | 条件 | 人脸注册类型：`0` Base64 图片，`1` 特征值；**当前仅支持 0、1** | `"0"` |

> **单人多凭证**（`access.verifyMode=2`）：同一 `userId` 须分别拥有 `access.factorSequence` 中两个因子对应的凭证，通行时按因子顺序依次核验。因子与 `type` 对应：face→`300`，card→`200`/`205`，code→`100`/`101`/`103`，password→`400`，finger→`500`；各因子凭证分多次 `insertKey` 下发至同一人员即可。

**完整请求示例**

```json
{
  "serialNo": "0000000001",
  "uuid": "e4720000964b5c00",
  "time": 0,
  "sign": "",
  "data": [
    {
      "keyId": "K001",
      "userId": "U001",
      "type": "300",
      "code": "ZnNmZHNmYXNkZmFzZGY=........",
      "extra": {
        "faceType": "0"
      }
    }
  ]
}
```

#### 返回定义

Topic：`access_device/v2/cmd/insertKey_reply`

**业务字段**

| 结果 | code | data |
| --- | --- | --- |
| 全部成功 | `000000` | ——（不返回 `data`） |
| 部分失败 | `100000` | 数组，每项含失败 `keyId` 与 `errmsg` |

**成功返回示例**

```json
{
  "serialNo": "0000000001",
  "uuid": "e4720000964b5c00",
  "code": "000000",
  "time": 0,
  "sign": "",
  "message": "success"
}
```

**部分失败返回示例**

```json
{
  "serialNo": "0000000001",
  "uuid": "e4720000964b5c00",
  "code": "100000",
  "time": 0,
  "sign": "",
  "data": [
    {
      "keyId": "K001",
      "errmsg": "person not found"
    }
  ],
  "message": "部分数据处理失败"
}
```

<a id="interface-17-getkey"></a>
### 4.17 查询凭证（getKey）

| 属性 | 内容 |
| --- | --- |
| 接口类型 | 指令 |
| 接口标识 | `getKey` |
| 请求 Topic | `access_device/v2/cmd/{#uuid}/getKey` |
| 返回 Topic | `access_device/v2/cmd/getKey_reply` |

#### 请求定义

Topic：`access_device/v2/cmd/{#uuid}/getKey`

**业务字段**

| 字段路径 | 类型 | 必填 | 说明 | 示例 |
| --- | --- | :---: | --- | --- |
| `keyId` | string | 否 | 按凭证 ID 过滤；**不传**则不限（勿传空字符串） | `"K001"` |
| `userId` | string | 否 | 按人员 ID 过滤；**不传**则不限（勿传空字符串） | `"U001"` |
| `type` | string / number | 否 | 按凭证类型过滤，见 [5.3 凭证类型说明](#53-凭证类型说明)；数字会自动转字符串 | `"300"` |
| `code` | string | 否 | 按凭证内容精确匹配；**传 `code` 时必须同时传 `type`**，否则返回 `200000` | — |
| `size` | number | 是 | 每页条数，范围 (0,100] | `10` |
| `page` | number | 是 | 页码，从 0 开始；超出范围时返回空 `content[]` | `0` |

**完整请求示例**

```json
{
  "serialNo": "0000000001",
  "uuid": "e4720000964b5c00",
  "time": 0,
  "sign": "",
  "data": {
    "userId": "U001",
    "type": "300",
    "size": 10,
    "page": 0
  }
}
```

#### 返回定义

Topic：`access_device/v2/cmd/getKey_reply`

**业务字段（分页）**

| 字段路径 | 类型 | 必填 | 说明 |
| --- | --- | :---: | --- |
| `page` | number | 是 | 当前页 |
| `size` | number | 是 | 每页大小 |
| `total` | number | 是 | 总记录数 |
| `totalPage` | number | 是 | 总页数 |
| `count` | number | 是 | 本页实际返回条数，≤ size |
| `content` | array | 是 | 凭证列表 |

**`content[]` 元素字段**

| 字段路径 | 类型 | 必填 | 说明 |
| --- | --- | :---: | --- |
| `keyId` | string | 是 | 凭证唯一 ID |
| `userId` | string | 是 | 人员唯一 ID |
| `type` | string | 是 | 凭证类型 |
| `code` | string | 是 | 凭证内容；人脸按库内 `faceType` 返回（`0`→JPG Base64，`1`→特征值），与当前留存开关无关；指纹为硬件索引字符串 |
| `extra` | object | 否 | 扩展字段，如 `faceType`、`fingerprint`（指纹原始特征备份） |

**完整返回示例**

```json
{
  "serialNo": "0000000001",
  "uuid": "e4720000964b5c00",
  "code": "000000",
  "time": 0,
  "sign": "",
  "data": {
    "page": 0,
    "size": 10,
    "total": 1,
    "totalPage": 1,
    "count": 1,
    "content": [
      {
        "keyId": "K001",
        "userId": "U001",
        "type": "300",
        "code": "ZnNmZHNmYXNkZmFzZGY=........",
        "extra": {
          "faceType": "0"
        }
      }
    ]
  },
  "message": "success"
}
```

<a id="interface-18-delkey"></a>
### 4.18 删除凭证（delKey）

| 属性 | 内容 |
| --- | --- |
| 接口类型 | 指令 |
| 接口标识 | `delKey` |
| 请求 Topic | `access_device/v2/cmd/{#uuid}/delKey` |
| 返回 Topic | `access_device/v2/cmd/delKey_reply` |

#### 请求定义

Topic：`access_device/v2/cmd/{#uuid}/delKey`

**业务字段**

| 字段路径 | 类型 | 必填 | 说明 | 示例 |
| --- | --- | :---: | --- | --- |
| `keyIds` | array | 条件 | 待删除凭证 ID 列表 | `["K001"]` |
| `userIds` | array | 条件 | 待删除人员 ID 列表；删除该人员全部凭证 | `["U001"]` |

`keyIds` 与 `userIds` 合计不超过 100 条；**皆空时设备直接成功返回**（不删除任何凭证）。

当 **同时** 传入非空的 `keyIds` 与 `userIds` 时：设备先校验全部条目，**任一失败则整单不删除**，返回 `100000` 与失败明细；仅全部合法时才执行删除。只传其中一类时仍允许部分成功。

**完整请求示例**

```json
{
  "serialNo": "0000000001",
  "uuid": "e4720000964b5c00",
  "time": 0,
  "sign": "",
  "data": {
    "keyIds": ["K001"],
    "userIds": []
  }
}
```

#### 返回定义

Topic：`access_device/v2/cmd/delKey_reply`

**业务字段**

| 结果 | code | data |
| --- | --- | --- |
| 全部成功 | `000000` | ——（不返回 `data`） |
| 部分失败 | `100000` | 数组，每项含 `keyId` 或 `userId` 及 `errmsg` |

**成功返回示例**

```json
{
  "serialNo": "0000000001",
  "uuid": "e4720000964b5c00",
  "code": "000000",
  "time": 0,
  "sign": "",
  "message": "success"
}
```

**部分失败返回示例**

```json
{
  "serialNo": "0000000001",
  "uuid": "e4720000964b5c00",
  "code": "100000",
  "time": 0,
  "sign": "",
  "data": [
    {
      "userId": "U001",
      "errmsg": "user has no vouchers"
    }
  ],
  "message": "部分数据处理失败"
}
```

<a id="interface-19-clearkey"></a>
### 4.19 清空凭证（clearKey）

| 属性 | 内容 |
| --- | --- |
| 接口类型 | 指令 |
| 接口标识 | `clearKey` |
| 请求 Topic | `access_device/v2/cmd/{#uuid}/clearKey` |
| 返回 Topic | `access_device/v2/cmd/clearKey_reply` |

#### 请求定义

Topic：`access_device/v2/cmd/{#uuid}/clearKey`

**业务字段**

_无业务字段。_ 清空设备内**全部凭证**及关联生物特征数据，**不清除人员**（与 `clearUser` 不同）。

**完整请求示例**

```json
{
  "serialNo": "0000000001",
  "uuid": "e4720000964b5c00",
  "time": 0,
  "sign": "",
  "data": {}
}
```

#### 返回定义

Topic：`access_device/v2/cmd/clearKey_reply`

**业务字段**

成功时不返回 `data` 字段。

**完整返回示例**

```json
{
  "serialNo": "0000000001",
  "uuid": "e4720000964b5c00",
  "code": "000000",
  "time": 0,
  "sign": "",
  "message": "success"
}
```

<a id="interface-20-modifykey"></a>
### 4.20 修改凭证（modifyKey）

| 属性 | 内容 |
| --- | --- |
| 接口类型 | 指令 |
| 接口标识 | `modifyKey` |
| 请求 Topic | `access_device/v2/cmd/{#uuid}/modifyKey` |
| 返回 Topic | `access_device/v2/cmd/modifyKey_reply` |

#### 请求定义

Topic：`access_device/v2/cmd/{#uuid}/modifyKey`

**业务字段**

`data` 必须是**数组**，单次最多 100 条。`keyId` **必须已存在**。未传字段沿用原值；显式传 `extra` 时整对象替换（不与旧 `extra` 合并）。换人脸图须 Base64，预检与 insertKey 相同（JPG、解码后 ≤512KB、本批最多 1 条）。唯一约束与 insertKey 相同（同 type+code；每人最多 1 脸/1 指纹）。

每条记录字段如下：

| 字段路径 | 类型 | 必填 | 说明 | 示例 |
| --- | --- | :---: | --- | --- |
| `keyId` | string | 是 | 凭证唯一 ID；**必须已存在** | `"K001"` |
| `userId` | string | 否 | 人员 ID；未传则沿用原值 | `"U001"` |
| `type` | string / number | 否 | 凭证类型；未传则沿用原值；数字会自动转字符串 | `"300"` |
| `code` | string | 条件 | 凭证内容；人脸换图传 Base64；传空字符串 `""` 表示删除该凭证 | `"ZnNmZHNmYXNkZmFzZGY=..."` |
| `extra` | object | 否 | 扩展字段；未传则沿用原值 | `{}` |
| `extra.faceType` | string | 条件 | 人脸类型：`0` Base64，`1` 特征值；**当前仅支持 0、1** | `"0"` |

**完整请求示例**

```json
{
  "serialNo": "0000000001",
  "uuid": "e4720000964b5c00",
  "time": 0,
  "sign": "",
  "data": [
    {
      "keyId": "K001",
      "userId": "U001",
      "type": "300",
      "code": "ZnNmZHNmYXNkZmFzZGY=........",
      "extra": {
        "faceType": "0"
      }
    }
  ]
}
```

#### 返回定义

Topic：`access_device/v2/cmd/modifyKey_reply`

**业务字段**

| 结果 | code | data |
| --- | --- | --- |
| 全部成功 | `000000` | ——（不返回 `data`） |
| 部分失败 | `100000` | 数组，每项含失败 `keyId` 与 `errmsg` |

**成功返回示例**

```json
{
  "serialNo": "0000000001",
  "uuid": "e4720000964b5c00",
  "code": "000000",
  "time": 0,
  "sign": "",
  "message": "success"
}
```

**部分失败返回示例**

```json
{
  "serialNo": "0000000001",
  "uuid": "e4720000964b5c00",
  "code": "100000",
  "time": 0,
  "sign": "",
  "data": [
    {
      "keyId": "K001",
      "errmsg": "voucher not found"
    }
  ],
  "message": "部分数据处理失败"
}
```

<a id="interface-21-insertpermission"></a>
### 4.21 添加权限（insertPermission）

| 属性 | 内容 |
| --- | --- |
| 接口类型 | 指令 |
| 接口标识 | `insertPermission` |
| 请求 Topic | `access_device/v2/cmd/{#uuid}/insertPermission` |
| 返回 Topic | `access_device/v2/cmd/insertPermission_reply` |

#### 请求定义

Topic：`access_device/v2/cmd/{#uuid}/insertPermission`

**业务字段**

`data` 必须是**数组**，单次最多 100 条。`permissionId` 已存在时**覆盖更新，不报重复错误**。

每条记录字段如下：

| 字段路径 | 类型 | 必填 | 说明 | 示例 |
| --- | --- | :---: | --- | --- |
| `permissionId` | string | 是 | 权限唯一标识，1-128 字符，仅字母数字 | `"6584132"` |
| `index` | number | 否 | 门序号，默认 `0` | `0` |
| `time` | object | 是 | 时间区间，见 [5.4 时间区间说明](#54-时间区间说明) | — |
| `time.type` | number | 是 | 0 永久有效；1 起止时间内有效；2 每日时段；3 周重复时段 | `3` |
| `time.range` | object | 条件 | `type` 为 1/2/3 时必填 | — |
| `time.range.beginTime` | number | 条件 | 生效起始 Unix 秒 | `1640917147` |
| `time.range.endTime` | number | 条件 | 生效结束 Unix 秒 | `1790917147` |
| `time.dayPeriodTime` | string | 条件 | `type=2` 时必填，如 `"9:00-18:00"`，多段用 `\|` 分隔 | `"9:00-18:00"` |
| `time.weekPeriodTime` | object | 条件 | `type=3` 时必填，键为 1-7（周一到周日） | — |
| `extra` | object | 否 | 扩展字段 | `{}` |

**完整请求示例**

```json
{
  "serialNo": "0000000001",
  "uuid": "e4720000964b5c00",
  "time": 0,
  "sign": "",
  "data": [
    {
      "permissionId": "6584132",
      "index": 0,
      "time": {
        "type": 3,
        "weekPeriodTime": {
          "1": "9:00-14:05",
          "2": "12:00-13:30|15:00-16:30"
        },
        "range": {
          "beginTime": 1640917147,
          "endTime": 1790917147
        }
      },
      "extra": {}
    }
  ]
}
```

#### 返回定义

Topic：`access_device/v2/cmd/insertPermission_reply`

**业务字段**

| 结果 | code | data |
| --- | --- | --- |
| 全部成功 | `000000` | ——（不返回 `data`） |
| 部分失败 | `100000` | 数组，每项含失败 `permissionId` 与 `errmsg` |

**成功返回示例**

```json
{
  "serialNo": "0000000001",
  "uuid": "e4720000964b5c00",
  "code": "000000",
  "time": 0,
  "sign": "",
  "message": "success"
}
```

**部分失败返回示例**

```json
{
  "serialNo": "0000000001",
  "uuid": "e4720000964b5c00",
  "code": "100000",
  "time": 0,
  "sign": "",
  "data": [
    {
      "permissionId": "6584132",
      "errmsg": "权限及time必须是对象"
    }
  ],
  "message": "部分数据处理失败"
}
```

<a id="interface-22-getpermission"></a>
### 4.22 查询权限（getPermission）

| 属性 | 内容 |
| --- | --- |
| 接口类型 | 指令 |
| 接口标识 | `getPermission` |
| 请求 Topic | `access_device/v2/cmd/{#uuid}/getPermission` |
| 返回 Topic | `access_device/v2/cmd/getPermission_reply` |

#### 请求定义

Topic：`access_device/v2/cmd/{#uuid}/getPermission`

**业务字段**

| 字段路径 | 类型 | 必填 | 说明 | 示例 |
| --- | --- | :---: | --- | --- |
| `permissionId` | string | 否 | 按权限 ID 筛选；**不传**则查全部（勿传空字符串） | `"6584132"` |
| `page` | number | 是 | 页码，从 0 开始 | `0` |
| `size` | number | 是 | 每页条数，范围 1-100 | `100` |

**完整请求示例**

```json
{
  "serialNo": "0000000001",
  "uuid": "e4720000964b5c00",
  "time": 0,
  "sign": "",
  "data": {
    "page": 0,
    "size": 100
  }
}
```

#### 返回定义

Topic：`access_device/v2/cmd/getPermission_reply`

**业务字段**

| 字段路径 | 类型 | 说明 |
| --- | --- | --- |
| `page` | number | 当前页码 |
| `size` | number | 每页大小 |
| `total` | number | 总记录数 |
| `totalPage` | number | 总页数 |
| `count` | number | 本页实际条数 |
| `content` | array | 权限列表 |
| `content[].permissionId` | string | 权限 ID |
| `content[].index` | number | 门序号 |
| `content[].time` | object | 时间区间（字段随 `time.type` 变化，见 [5.4](#54-时间区间说明)） |
| `content[].extra` | object | 扩展字段 |

**完整返回示例**

```json
{
  "serialNo": "0000000001",
  "uuid": "e4720000964b5c00",
  "code": "000000",
  "time": 0,
  "sign": "",
  "data": {
    "page": 0,
    "size": 100,
    "total": 1,
    "totalPage": 1,
    "count": 1,
    "content": [
      {
        "permissionId": "6584132",
        "index": 0,
        "time": {
          "type": 3,
          "range": {
            "beginTime": 1640917147,
            "endTime": 1790917147
          },
          "weekPeriodTime": {
            "1": "9:00-14:05",
            "2": "12:00-13:30|15:00-16:30"
          }
        },
        "extra": {}
      }
    ]
  },
  "message": "success"
}
```

<a id="interface-23-delpermission"></a>
### 4.23 删除权限（delPermission）

| 属性 | 内容 |
| --- | --- |
| 接口类型 | 指令 |
| 接口标识 | `delPermission` |
| 请求 Topic | `access_device/v2/cmd/{#uuid}/delPermission` |
| 返回 Topic | `access_device/v2/cmd/delPermission_reply` |

#### 请求定义

Topic：`access_device/v2/cmd/{#uuid}/delPermission`

**业务字段**

`data` 支持两种形式，单次最多 100 条：

1. **字符串数组**：`["permissionId1", "permissionId2"]`
2. **对象**：`{ "permissionIds": ["permissionId1"] }`

删除时会同步解除所有人员对该权限的关联。

**完整请求示例**

```json
{
  "serialNo": "0000000001",
  "uuid": "e4720000964b5c00",
  "time": 0,
  "sign": "",
  "data": {
    "permissionIds": ["6584132"]
  }
}
```

#### 返回定义

Topic：`access_device/v2/cmd/delPermission_reply`

**业务字段**

| 结果 | code | data |
| --- | --- | --- |
| 全部成功 | `000000` | ——（不返回 `data`） |
| 部分失败 | `100000` | 数组，每项含失败 `permissionId` 与 `errmsg` |

**成功返回示例**

```json
{
  "serialNo": "0000000001",
  "uuid": "e4720000964b5c00",
  "code": "000000",
  "time": 0,
  "sign": "",
  "message": "success"
}
```

**部分失败返回示例**

```json
{
  "serialNo": "0000000001",
  "uuid": "e4720000964b5c00",
  "code": "100000",
  "time": 0,
  "sign": "",
  "data": [
    {
      "permissionId": "6584132",
      "errmsg": "permission not found"
    }
  ],
  "message": "部分数据处理失败"
}
```

<a id="interface-24-clearpermission"></a>
### 4.24 清空权限（clearPermission）

| 属性 | 内容 |
| --- | --- |
| 接口类型 | 指令 |
| 接口标识 | `clearPermission` |
| 请求 Topic | `access_device/v2/cmd/{#uuid}/clearPermission` |
| 返回 Topic | `access_device/v2/cmd/clearPermission_reply` |

#### 请求定义

Topic：`access_device/v2/cmd/{#uuid}/clearPermission`

**业务字段**

_无业务字段。_ 清空全部权限，并解除所有人员的 `permissionIds` 关联。

**完整请求示例**

```json
{
  "serialNo": "0000000001",
  "uuid": "e4720000964b5c00",
  "time": 0,
  "sign": "",
  "data": {}
}
```

#### 返回定义

Topic：`access_device/v2/cmd/clearPermission_reply`

**业务字段**

成功时不返回 `data` 字段。

**完整返回示例**

```json
{
  "serialNo": "0000000001",
  "uuid": "e4720000964b5c00",
  "code": "000000",
  "time": 0,
  "sign": "",
  "message": "success"
}
```

<a id="interface-25-modifypermission"></a>
### 4.25 修改权限（modifyPermission）

| 属性 | 内容 |
| --- | --- |
| 接口类型 | 指令 |
| 接口标识 | `modifyPermission` |
| 请求 Topic | `access_device/v2/cmd/{#uuid}/modifyPermission` |
| 返回 Topic | `access_device/v2/cmd/modifyPermission_reply` |

#### 请求定义

Topic：`access_device/v2/cmd/{#uuid}/modifyPermission`

**业务字段**

`data` 必须是**数组**，单次最多 100 条。字段与 [insertPermission](#interface-21-insertpermission) 相同；`permissionId` 必须已存在。`extra` 传则全量替换；未传则为 `{}`。

**完整请求示例**

```json
{
  "serialNo": "0000000001",
  "uuid": "e4720000964b5c00",
  "time": 0,
  "sign": "",
  "data": [
    {
      "permissionId": "6584132",
      "index": 0,
      "time": {
        "type": 0
      },
      "extra": {}
    }
  ]
}
```

#### 返回定义

Topic：`access_device/v2/cmd/modifyPermission_reply`

**业务字段**

| 结果 | code | data |
| --- | --- | --- |
| 全部成功 | `000000` | ——（不返回 `data`） |
| 部分失败 | `100000` | 数组，每项含失败 `permissionId` 与 `errmsg` |

**成功返回示例**

```json
{
  "serialNo": "0000000001",
  "uuid": "e4720000964b5c00",
  "code": "000000",
  "time": 0,
  "sign": "",
  "message": "success"
}
```

**部分失败返回示例**

```json
{
  "serialNo": "0000000001",
  "uuid": "e4720000964b5c00",
  "code": "100000",
  "time": 0,
  "sign": "",
  "data": [
    {
      "permissionId": "6584132",
      "errmsg": "permission not found"
    }
  ],
  "message": "部分数据处理失败"
}
```

<a id="interface-26-insertsecurity"></a>
### 4.26 添加密钥（insertSecurity）

| 属性 | 内容 |
| --- | --- |
| 接口类型 | 指令 |
| 接口标识 | `insertSecurity` |
| 请求 Topic | `access_device/v2/cmd/{#uuid}/insertSecurity` |
| 返回 Topic | `access_device/v2/cmd/insertSecurity_reply` |

#### 请求定义

Topic：`access_device/v2/cmd/{#uuid}/insertSecurity`

`data` 必须是**数组**，单次最多 100 条。`securityId` 已存在时**覆盖更新，不报重复错误**。每条记录字段如下：

| 字段路径 | 类型 | 必填 | 说明 | 示例 |
| --- | --- | :---: | --- | --- |
| `securityId` | string | 是 | 密钥唯一 ID | `"001"` |
| `type` | string | 是 | 密钥类型，如 `RSA`、`AES` | `"RSA"` |
| `key` | string | 是 | 密钥编码，如 `vguang` | `"vguang"` |
| `value` | string | 是 | 密钥值 | `"MFww..."` |
| `startTime` | number | 是 | 生效起始时间戳（秒）| `1788498960` |
| `endTime` | number | 是 | 过期时间戳（秒）| `2735270160` |

**完整请求示例**

```json
{
  "serialNo": "0000000001",
  "uuid": "e4720000964b5c00",
  "time": 0,
  "sign": "",
  "data": [
    {
      "securityId": "213v",
      "type": "RSA",
      "key": "vguang",
      "value": "MFwwDQYJKoZIhvcNAQEBBQADSwAwSAJBAIhGA5XLhPR22MRf7ms4R3NeUyV4UvnUiu2YIrxB4RMojK8QY90760Otx6fWZsEi0gY5ysLWPZSZdu92vA4s1BsCAwEAAQ==",
      "startTime": 1788498960,
      "endTime": 2735270160
    }
  ]
}
```

#### 返回定义

Topic：`access_device/v2/cmd/insertSecurity_reply`

**业务字段**

| 结果 | code | data |
| --- | --- | --- |
| 全部成功 | `000000` | ——（不返回 `data`） |
| 部分失败 | `100000` | 数组，每项含失败 `securityId` 与 `errmsg` |

**成功返回示例**

```json
{
  "serialNo": "0000000001",
  "uuid": "e4720000964b5c00",
  "code": "000000",
  "time": 0,
  "sign": "",
  "message": "success"
}
```

<a id="interface-27-getsecurity"></a>
### 4.27 查询密钥（getSecurity）

| 属性 | 内容 |
| --- | --- |
| 接口类型 | 指令 |
| 接口标识 | `getSecurity` |
| 请求 Topic | `access_device/v2/cmd/{#uuid}/getSecurity` |
| 返回 Topic | `access_device/v2/cmd/getSecurity_reply` |

#### 请求定义

Topic：`access_device/v2/cmd/{#uuid}/getSecurity`

**业务字段**

| 字段路径 | 类型 | 必填 | 说明 | 示例 |
| --- | --- | :---: | --- | --- |
| `securityId` | string | 否 | 按密钥 ID 过滤；**不传**则不限（勿传空字符串） | `"001"` |
| `type` | string | 否 | 按密钥类型过滤，如 `RSA`、`AES`；**不传**则不限（勿传空字符串） | `"RSA"` |
| `key` | string | 否 | 按密钥编码过滤，如 `vguang`；**不传**则不限（勿传空字符串） | `"vguang"` |
| `page` | number | 是 | 页码，从 0 开始；超出范围时返回空 `content[]` | `0` |
| `size` | number | 是 | 每页条数，范围 (0,100] | `10` |

**完整请求示例**

```json
{
  "serialNo": "0000000001",
  "uuid": "e4720000964b5c00",
  "time": 0,
  "sign": "",
  "data": {
    "type": "RSA",
    "key": "vguang",
    "page": 0,
    "size": 10
  }
}
```

#### 返回定义

Topic：`access_device/v2/cmd/getSecurity_reply`

**业务字段（分页）**

| 字段路径 | 类型 | 必填 | 说明 |
| --- | --- | :---: | --- |
| `page` | number | 是 | 当前页 |
| `size` | number | 是 | 每页大小 |
| `total` | number | 是 | 总记录数 |
| `totalPage` | number | 是 | 总页数 |
| `count` | number | 是 | 本页实际返回条数，≤ size |
| `content` | array | 是 | 密钥列表 |

**`content[]` 元素字段**

| 字段路径 | 类型 | 必填 | 说明 |
| --- | --- | :---: | --- |
| `securityId` | string | 是 | 密钥唯一 ID |
| `type` | string | 是 | 密钥类型，如 `RSA`、`AES` |
| `key` | string | 是 | 密钥编码 |
| `value` | string | 是 | 密钥值 |
| `startTime` | number | 是 | 生效起始时间戳（秒） |
| `endTime` | number | 是 | 过期时间戳（秒） |

**完整返回示例**

```json
{
  "serialNo": "0000000001",
  "uuid": "e4720000964b5c00",
  "code": "000000",
  "time": 0,
  "sign": "",
  "data": {
    "page": 0,
    "size": 10,
    "total": 1,
    "totalPage": 1,
    "count": 1,
    "content": [
      {
        "securityId": "001",
        "type": "RSA",
        "key": "vguang",
        "value": "MFwwDQYJKoZIhvcNAQEBBQADSwAwSAJBAIhGA5XLhPR22MRf7ms4R3NeUyV4UvnUiu2YIrxB4RMojK8QY90760Otx6fWZsEi0gY5ysLWPZSZdu92vA4s1BsCAwEAAQ==",
        "startTime": 1788498960,
        "endTime": 2735270160
      }
    ]
  },
  "message": "success"
}
```

<a id="interface-28-delsecurity"></a>
### 4.28 删除密钥（delSecurity）

| 属性 | 内容 |
| --- | --- |
| 接口类型 | 指令 |
| 接口标识 | `delSecurity` |
| 请求 Topic | `access_device/v2/cmd/{#uuid}/delSecurity` |
| 返回 Topic | `access_device/v2/cmd/delSecurity_reply` |

#### 请求定义

Topic：`access_device/v2/cmd/{#uuid}/delSecurity`

**业务字段**

`data` 必须是 **securityId 字符串数组**，单次最多 100 条。

**完整请求示例**

```json
{
  "serialNo": "0000000001",
  "uuid": "e4720000964b5c00",
  "time": 0,
  "sign": "",
  "data": [
    "001"
  ]
}
```

#### 返回定义

Topic：`access_device/v2/cmd/delSecurity_reply`

**业务字段**

| 结果 | code | data |
| --- | --- | --- |
| 全部成功 | `000000` | ——（不返回 `data`） |
| 部分失败 | `100000` | 数组，每项含失败 `securityId` 与 `errmsg` |

**成功返回示例**

```json
{
  "serialNo": "0000000001",
  "uuid": "e4720000964b5c00",
  "code": "000000",
  "time": 0,
  "sign": "",
  "message": "success"
}
```

<a id="interface-29-clearsecurity"></a>
### 4.29 清空密钥（clearSecurity）

| 属性 | 内容 |
| --- | --- |
| 接口类型 | 指令 |
| 接口标识 | `clearSecurity` |
| 请求 Topic | `access_device/v2/cmd/{#uuid}/clearSecurity` |
| 返回 Topic | `access_device/v2/cmd/clearSecurity_reply` |

#### 请求定义

Topic：`access_device/v2/cmd/{#uuid}/clearSecurity`

**业务字段**

_无业务字段。_

**完整请求示例**

```json
{
  "serialNo": "0000000001",
  "uuid": "e4720000964b5c00",
  "time": 0,
  "sign": "",
  "data": {}
}
```

#### 返回定义

Topic：`access_device/v2/cmd/clearSecurity_reply`

**业务字段**

成功时不返回 `data` 字段。

**完整返回示例**

```json
{
  "serialNo": "0000000001",
  "uuid": "e4720000964b5c00",
  "code": "000000",
  "time": 0,
  "sign": "",
  "message": "success"
}
```

<a id="interface-30-getrecords"></a>
### 4.30 识别记录查询（getRecords）

| 属性 | 内容 |
| --- | --- |
| 接口类型 | 指令 |
| 接口标识 | `getRecords` |
| 请求 Topic | `access_device/v2/cmd/{#uuid}/getRecords` |
| 返回 Topic | `access_device/v2/cmd/getRecords_reply` |

#### 请求定义

Topic：`access_device/v2/cmd/{#uuid}/getRecords`

**业务字段**

| 字段路径 | 类型 | 必填 | 说明 | 示例 |
| --- | --- | :---: | --- | --- |
| `recordId` | array | 否 | 按记录 ID 列表过滤 | `["6w8keif5g6"]` |
| `userId` | array | 否 | 按人员 ID 列表过滤；不传、`[]` 或 `[-1]` 表示不限人员 | `["U001"]` |
| `name` | string | 否 | 按姓名模糊匹配 | `"张三"` |
| `keyword` | string | 否 | 按姓名或人员 ID 模糊匹配（设备已实现） | `"张"` |
| `type` | string / number | 否 | 按**第一凭证**类型精确匹配，见 [5.3 凭证类型说明](#53-凭证类型说明)；数字会自动转字符串 | `"200"` |
| `code` | string | 否 | 按**第一凭证**内容精确匹配（卡号/码值/密码等）；人脸记录库内 `code` 通常为空字符串，不宜靠 `code` 查人脸 | `"9345EF18"` |
| `stranger` | boolean | 否 | 为 `true` 时只查陌生人（`userId`、`name` 皆空） | `true` |
| `uploadState` | number | 否 | 按上传状态过滤：`0` 未上传，`1` 已上传 | `0` |
| `startTime` | number | 否 | 起始时间戳（秒）；**不传**表示不限起始时间 | `1640917147` |
| `endTime` | number | 否 | 结束时间戳（秒）；**不传**表示不限结束时间 | `1672453147` |
| `page` | number | 是 | 页码，从 0 开始 | `0` |
| `size` | number | 是 | 每页条数，范围 (0,1000] | `10` |

> **凭证查询范围（第一凭证）**：`type` / `code` 只匹配记录**顶层**字段（与 [4.32 access](#interface-32-access) 主字段约定一致，即本条记录的第一凭证）。单人多凭证（`verifyMode=2`）、双人核验（`verifyMode=3`）写在 `extra.verify.additional` 中的后续凭证**不参与**过滤；多人识别（`verifyMode=1`）每人一条记录，各自顶层凭证可查。平台若要按第二张卡/第二人脸等查询，本接口不支持，需自行在回包 `extra` 中二次筛选。

**完整请求示例**

```json
{
  "serialNo": "0000000001",
  "uuid": "e4720000964b5c00",
  "time": 0,
  "sign": "",
  "data": {
    "page": 0,
    "size": 10
  }
}
```

**按第一凭证查询示例（刷卡）**

```json
{
  "serialNo": "0000000001",
  "uuid": "e4720000964b5c00",
  "time": 0,
  "sign": "",
  "data": {
    "type": "200",
    "code": "9345EF18",
    "page": 0,
    "size": 10
  }
}
```

#### 返回定义

Topic：`access_device/v2/cmd/getRecords_reply`

**业务字段（分页）**

| 字段路径 | 类型 | 必填 | 说明 |
| --- | --- | :---: | --- |
| `page` | number | 是 | 当前页 |
| `size` | number | 是 | 每页大小 |
| `total` | number | 是 | 总记录数 |
| `totalPage` | number | 是 | 总页数 |
| `count` | number | 是 | 本页实际返回条数，≤ size |
| `content` | array | 是 | 通行记录列表 |

**`content[]` 元素字段**

| 字段路径 | 类型 | 必填 | 说明 |
| --- | --- | :---: | --- |
| `id` | string | 是 | 通行记录唯一 ID |
| `keyId` | string | 否 | 关联凭证 ID |
| `permissionId` | string | 否 | 关联权限 ID |
| `userId` | string | 否 | 人员 ID |
| `name` | string | 否 | 人员姓名 |
| `type` | string | 是 | 凭证类型，见 [5.3 凭证类型说明](#53-凭证类型说明) |
| `code` | string | 否 | 凭证值；有抓拍时为设备本地路径（如 `/data/face_app/records/xxx.jpg`），与 access 上报的 JPG Base64 **不同形** |
| `imagePath` | string | 否 | 抓拍图本地路径；有图时通常与 `code` 相同，亦非 Base64 |
| `door` | string | 否 | 门序号 |
| `timeStamp` | number | 是 | 通行时间戳（秒） |
| `result` | number | 是 | 通行结果：`0` 成功，非 0 失败 |
| `extra` | object | 否 | 扩展数据；组合核验时结构与 [4.32 access](#interface-32-access) 中 `extra.verify` 相同 |
| `message` | string | 否 | 通行原因码（对应库内 `message`；查询接口字段名为 `message`，MQTT 上报字段名为 `error`） |
| `uploadState` | number | 否 | 上传状态：`0` 未上传，`1` 已上传 |

**完整返回示例**

```json
{
  "serialNo": "0000000001",
  "uuid": "e4720000964b5c00",
  "code": "000000",
  "time": 0,
  "sign": "",
  "data": {
    "page": 0,
    "size": 10,
    "total": 1,
    "totalPage": 1,
    "count": 1,
    "content": [
      {
        "id": "6w8keif5g6",
        "keyId": "K001",
        "permissionId": "6584132",
        "userId": "U001",
        "name": "张三",
        "type": "300",
        "code": "/data/face_app/records/6w8keif5g6.jpg",
        "imagePath": "/data/face_app/records/6w8keif5g6.jpg",
        "door": "0",
        "timeStamp": 1639475284,
        "result": 0,
        "extra": {},
        "message": "",
        "uploadState": 0
      }
    ]
  },
  "message": "success"
}
```

<a id="interface-31-delrecords"></a>
### 4.31 识别记录删除（delRecords）

| 属性 | 内容 |
| --- | --- |
| 接口类型 | 指令 |
| 接口标识 | `delRecords` |
| 请求 Topic | `access_device/v2/cmd/{#uuid}/delRecords` |
| 返回 Topic | `access_device/v2/cmd/delRecords_reply` |

#### 请求定义

Topic：`access_device/v2/cmd/{#uuid}/delRecords`

**业务字段**

| 字段路径 | 类型 | 必填 | 说明 | 示例 |
| --- | --- | :---: | --- | --- |
| `recordId` | array | 否 | 按记录 ID 列表删除 | `["6w8keif5g6"]` |
| `userId` | array | 否 | 按人员 ID 列表删除其全部记录 | `["U001"]` |
| `name` | string | 否 | 按姓名模糊匹配删除（设备已实现） | `"张三"` |
| `keyword` | string | 否 | 按姓名或人员 ID 模糊匹配删除（设备已实现） | `"张"` |
| `type` | string / number | 否 | 按**第一凭证**类型精确匹配删除，规则同 [getRecords](#interface-30-getrecords) | `"200"` |
| `code` | string | 否 | 按**第一凭证**内容精确匹配删除；不扫描 `extra` 中后续凭证 | `"9345EF18"` |
| `stranger` | boolean | 否 | 为 `true` 时只删陌生人记录 | `true` |
| `uploadState` | number | 否 | 按上传状态删除：`0` 未上传，`1` 已上传 | `0` |
| `startTime` | number | 否 | 删除 `startTime` 及之后的记录；**不传**表示不限起始时间 | `1640917147` |
| `endTime` | number | 否 | 删除 `endTime` 及之前的记录；**不传**表示不限结束时间 | `1672453147` |
| `all` | boolean | 否 | 为 `true` 时清空全部记录（与其他条件互斥时以 `all` 为准） | `false` |

至少提供一种删除条件；无条件且 `all` 不为 `true` 时返回参数错误。

**完整请求示例**

```json
{
  "serialNo": "0000000001",
  "uuid": "e4720000964b5c00",
  "time": 0,
  "sign": "",
  "data": {
    "all": true
  }
}
```

#### 返回定义

Topic：`access_device/v2/cmd/delRecords_reply`

**业务字段**

成功时不返回 `data` 字段。

**完整返回示例**

```json
{
  "serialNo": "0000000001",
  "uuid": "e4720000964b5c00",
  "code": "000000",
  "time": 0,
  "sign": "",
  "message": "success"
}
```

<a id="interface-32-access"></a>
### 4.32 通行记录上报（access）

| 属性 | 内容 |
| --- | --- |
| 接口类型 | 主动上报 |
| 接口标识 | `access` |
| 请求 Topic | `access_device/v2/event/access` |
| 返回 Topic | `access_device/v2/event/{#uuid}/access_reply` |

> 平台 ACK 必须发到 **规范 Topic**（`event` 与 `{uuid}` 之间有 `/`）。设备串行补报；ACK 成功后立即上报下一条。ACK 超时或失败按约 **5s → 倍增 → 上限 60s** 退避重试；与 `alarm` 不落库补发不同。

#### 请求定义

Topic：`access_device/v2/event/access`

`data` 为**单条记录的数组**（长度 1）。外层 `serialNo` 实际使用 **记录 ID**（`recordId`），便于平台 ACK 关联。

**`data[]` 元素字段**

| 字段路径 | 类型 | 必填 | 说明 | 示例 |
| --- | --- | :---: | --- | --- |
| `userId` | string | 否 | 人员 ID；陌生人为空字符串 | `"U001"` |
| `type` | string | 是 | 凭证类型，见 [5.3 凭证类型说明](#53-凭证类型说明) | `"300"` |
| `timeStamp` | number | 是 | 通行时间戳（秒） | `1639475284` |
| `result` | number | 是 | 通行结果：`0` 成功，非 0 失败 | `0` |
| `name` | string | 否 | 人员姓名 | `"张三"` |
| `code` | string | 否 | 凭证值；人脸默认 **空字符串**，仅当 `access.uploadToCloud=1` 且本地有抓拍图时为 JPG Base64；其他类型为卡号/码值等 | `""` |
| `extra` | object | 否 | 扩展数据；组合核验时含 `extra.verify` | `{}` |
| `extra.compareScore` | number | 否 | 人脸比对分数；仅 `type=300` 且 `access.uploadFaceScores=1` 时上报 | `0.86` |
| `extra.livingScore` | number | 否 | 人脸活检分数；仅 `type=300` 且 `access.uploadFaceScores=1` 时上报 | `7.2` |
| `extra.verify` | object | 否 | 组合核验证据；普通单人成功时常为 `{"mode":"single"}` 或省略 | — |
| `extra.verify.mode` | string | 否 | `single` / `online` / `multi_face` / `multi_factor` / `dual_person` | `"multi_factor"` |
| `extra.verify.sessionId` | string | 否 | 组合核验会话 ID（多凭证/双人） | `"1788325447472_U001"` |
| `extra.verify.primary` | object | 否 | 第一次核验证据（与顶层 `userId`/`name`/`type` 对应） | — |
| `extra.verify.additional` | array | 否 | 后续核验证据列表 | `[]` |
| `extra.verify.primary.userId` / `additional[].userId` | string | 否 | 该步人员 ID | `"U001"` |
| `extra.verify.primary.name` / `additional[].name` | string | 否 | 该步人员姓名 | `"张三"` |
| `extra.verify.primary.type` / `additional[].type` | string | 否 | 该步凭证类型，见 [5.3](#53-凭证类型说明) | `"300"` |
| `extra.verify.primary.factor` / `additional[].factor` | string | 否 | 因子：`face` / `card` / `code` / `password` / `finger` | `"face"` |
| `extra.verify.primary.keyId` / `additional[].keyId` | string | 否 | 该步匹配到的凭证 ID | `"K001"` |
| `extra.verify.primary.code` / `additional[].code` | string | 否 | 该步凭证值；人脸/指纹为空字符串；卡/码/密码为实际值 | `"9345EF18"` |
| `extra.verify.primary.compareScore` / `additional[].compareScore` | number | 否 | 该步为人脸且开启 `uploadFaceScores` 时的比对分 | `0.86` |
| `extra.verify.primary.livingScore` / `additional[].livingScore` | number | 否 | 该步为人脸且开启 `uploadFaceScores` 时的活检分 | `7.2` |
| `extra.verify.additional[].image` | string | 否 | 仅后续人脸步：`uploadToCloud=1` 且有抓拍时为 JPG Base64；主照片在顶层 `code`，`primary` 不上报 `image` | — |
| `extra.batchId` | string | 否 | 多人识别批次 ID；同批多条记录共享 | `"sFea0o5WwGvR"` |
| `extra.batchSize` | number | 否 | 该批次识别人数（含失败人员） | `2` |
| `error` | string | 否 | 通行原因码（库内 `message`），**不是**信封 `code`；见下方原因码表 | `"ALLOW"` |

> **主字段约定**：顶层 `userId`、`name`、`type`、`code` 表示**本条记录对应人员**的凭证。人脸主照片仅放顶层 `code`（`type=300` 且 `uploadToCloud=1` 时为 JPG Base64，否则为空字符串）。单人多凭证、双人核验的后续步骤在 `extra.verify.additional`；后续人脸照片用 `additional[].image`。**多人识别**每人单独一条，用 `batchId`/`batchSize` 关联。
>
> **`extra` 其他字段**：人员档案快照（如 `department`、`employeeNo`、`dualVerify`）随人员 `extra` 写入时出现；是否组合核验以 `extra.verify.mode` 为准（勿把人员策略字段 `dualVerify` 当成本次通行模式）。人脸分数字段仅在 `access.uploadFaceScores=1` 且记录/证据为人脸时出现。

**通行原因码（`error` / 查询接口 `message`）**

与信封 `code`（如 `000000`）无关。平台应按字符串透传；未识别的取值按未知原因处理，勿映射为协议失败。

| 原因码 | 含义 |
| --- | --- |
| `ALLOW` | 本地鉴权通过 |
| `ONLINE_ALLOW` | 在线核验通过（`extra.verify.mode=online`） |
| `MULTI_FACTOR_ALLOW` | 单人多凭证通过 |
| `DUAL_PERSON_ALLOW` | 双人核验通过 |
| `MULTI_FACE_ALLOW` | 多人识别批次中有人通过（该条人员自身成功时常见仍为 `ALLOW`） |
| `VOUCHER_NOT_FOUND` | 本地没有匹配到该凭证（类型和编码都对不上） |
| `PERMISSION_DENIED` | 凭证和人员都在，但当前时间没有有效权限（无权限、已过期或不在通行时段） |
| `SCHEDULE_CLOSED` | 当前处于计划常闭，普通通行被拒绝；即使本地鉴权已通过也会改成该原因 |
| 其它非空字符串 | 上述以外的拒绝/失败原因，按未知原因透传，勿省略 |

**完整请求示例（普通单人）**

```json
{
  "serialNo": "6w8keif5g6",
  "uuid": "e4720000964b5c00",
  "time": 1639475284,
  "sign": "",
  "data": [
    {
      "userId": "U001",
      "type": "300",
      "timeStamp": 1639475284,
      "result": 0,
      "name": "张三",
      "code": "",
      "extra": {},
      "error": "ALLOW"
    }
  ]
}
```

**完整请求示例（多人识别：同批 2 人，`access.verifyMode=1`）**

同一识别窗口内多人时，**每人各上报一条** `access` 事件；`batchId` 相同、`batchSize` 为批次总人数，`error` 为**该人员**的鉴权结果（成功常为 `"ALLOW"`，不用 `MULTI_FACE_ALLOW`）。

第一人：

```json
{
  "serialNo": "SpUsO7vgCo",
  "uuid": "123DXL",
  "time": 1788327781,
  "sign": "",
  "data": [
    {
      "userId": "U001",
      "type": "300",
      "timeStamp": 1788327781,
      "result": 0,
      "name": "张三",
      "code": "",
      "extra": {
        "batchId": "sFea0o5WwGvR",
        "batchSize": 2,
        "verify": { "mode": "multi_face" }
      },
      "error": "ALLOW"
    }
  ]
}
```

第二人（另一次 publish，`serialNo` 不同，`batchId` 相同）：

```json
{
  "serialNo": "Gh5IlQgxc8",
  "uuid": "123DXL",
  "time": 1788327782,
  "sign": "",
  "data": [
    {
      "userId": "U002",
      "type": "300",
      "timeStamp": 1788327782,
      "result": 0,
      "name": "李四",
      "code": "",
      "extra": {
        "batchId": "sFea0o5WwGvR",
        "batchSize": 2,
        "verify": { "mode": "multi_face" }
      },
      "error": "ALLOW"
    }
  ]
}
```

> 若两人不在同一识别窗口内到达，可能产生 **不同 `batchId` 且 `batchSize=1`** 的两条记录（仍各发一条 MQTT）。

**完整请求示例（单人多凭证：人脸 + 卡，`access.verifyMode=2`）**

```json
{
  "serialNo": "7hGgPlyURD",
  "uuid": "123DXL",
  "time": 1788325448,
  "sign": "",
  "data": [
    {
      "userId": "U001",
      "type": "300",
      "timeStamp": 1788325447,
      "result": 0,
      "name": "张三",
      "code": "",
      "extra": {
        "verify": {
          "mode": "multi_factor",
          "sessionId": "1788325447472_U001",
          "primary": {
            "userId": "U001",
            "name": "张三",
            "keyId": "K_FACE",
            "type": "300",
            "code": "",
            "factor": "face"
          },
          "additional": [
            {
              "userId": "U001",
              "name": "张三",
              "keyId": "K_CARD",
              "type": "200",
              "code": "9345EF18",
              "factor": "card"
            }
          ]
        }
      },
      "error": "MULTI_FACTOR_ALLOW"
    }
  ]
}
```

**完整请求示例（双人核验：人脸 + 人脸，`access.verifyMode=3`）**

```json
{
  "serialNo": "tx0gs6DTR3",
  "uuid": "123DXL",
  "time": 1788326742,
  "sign": "",
  "data": [
    {
      "userId": "U001",
      "type": "300",
      "timeStamp": 1788326740,
      "result": 0,
      "name": "张三",
      "code": "",
      "extra": {
        "verify": {
          "mode": "dual_person",
          "sessionId": "1788326740353_U001",
          "primary": {
            "userId": "U001",
            "name": "张三",
            "keyId": "K_FACE_1",
            "type": "300",
            "code": "",
            "factor": "face"
          },
          "additional": [
            {
              "userId": "U002",
              "name": "李四",
              "keyId": "K_FACE_2",
              "type": "300",
              "code": "",
              "factor": "face"
            }
          ]
        }
      },
      "error": "DUAL_PERSON_ALLOW"
    }
  ]
}
```

> **双人核验说明**（`access.verifyMode=3`）：`primary` 为第一人，`additional[0]` 为第二人（`userId` 通常不同）；顶层 `userId`/`name`/`type` 与 `primary` 一致。人员档案中的 `extra.dualVerify` 为策略配置，不等于本次是否发生双人通行。

#### 返回定义

Topic：`access_device/v2/event/{#uuid}/access_reply`

**业务字段**

_无业务字段。_

**完整返回示例**

```json
{
  "serialNo": "0000000001",
  "uuid": "e4720000964b5c00",
  "code": "000000",
  "time": 0,
  "sign": "",
  "data": {},
  "message": ""
}
```

<a id="interface-33-getcalllist"></a>
### 4.33 对讲联系人（getCallList）（能力选配）

| 属性 | 内容 |
| --- | --- |
| 接口类型 | 主动上报 |
| 接口标识 | `getCallList` |
| 请求 Topic | `access_device/v2/event/getCallList` |
| 返回 Topic | `access_device/v2/event/{#uuid}/getCallList_reply` |

> **能力选配，非公开标品必选接口。** 仅设备开启对讲能力时使用；未售卖对讲能力的规格不得承诺本接口，也不得仅凭 UI/`intercom.*` 配置项对外宣称可对接。等待平台 ACK 的超时为 `mqtt.timeout`。

#### 请求定义

Topic：`access_device/v2/event/getCallList`

设备拉取对讲联系人列表。信封含通用字段；**无** `data` 字段（或不传业务体）。

**完整请求示例**

```json
{
  "serialNo": "0000000001",
  "uuid": "e4720000964b5c00",
  "time": 0,
  "sign": ""
}
```

#### 返回定义

Topic：`access_device/v2/event/{#uuid}/getCallList_reply`

**业务字段**

成功时 `data` 支持以下两种形态之一（设备均接受）：

1. **数组**：联系人对象列表  
2. **对象**：`{ "list": [ ... ] }`

列表元素字段：

| 字段路径 | 类型 | 必填 | 说明 | 示例 |
| --- | --- | :---: | --- | --- |
| `id` | string | 是 | 联系人 ID；空串条目会被设备丢弃 | `"C001"` |
| `name` | string | 否 | 显示名称 | `"前台"` |
| `extra` | object | 否 | 扩展字段；设备会与 `id`/`name` 合并后供本机拨号页使用 | `{}` |

**完整返回示例（数组）**

```json
{
  "serialNo": "0000000001",
  "uuid": "e4720000964b5c00",
  "code": "000000",
  "time": 0,
  "sign": "",
  "data": [
    {
      "id": "C001",
      "name": "前台",
      "extra": {}
    }
  ],
  "message": "success"
}
```

**完整返回示例（`{list:[]}`）**

```json
{
  "serialNo": "0000000001",
  "uuid": "e4720000964b5c00",
  "code": "000000",
  "time": 0,
  "sign": "",
  "data": {
    "list": [
      {
        "id": "C001",
        "name": "前台",
        "extra": {}
      }
    ]
  },
  "message": "success"
}
```

<a id="interface-34-call"></a>
### 4.34 对讲呼叫（call）（能力选配）

| 属性 | 内容 |
| --- | --- |
| 接口类型 | 主动上报 |
| 接口标识 | `call` |
| 请求 Topic | `access_device/v2/event/call` |
| 返回 Topic | `access_device/v2/event/{#uuid}/call_reply` |

> **能力选配，非公开标品必选接口。** 条件同 [4.33](#interface-33-getcalllist)。发起与挂断均走本 Topic；平台 ACK 必须发到带设备 `{uuid}` 的 `call_reply`。事件 ACK 超时为 `mqtt.timeout`。
>
> **`callId` 与媒体 `sessionId`**：设备生成的 `callId` **即** WebRTC/对讲组件的 `sessionId`。App 回呼设备时须使用**同一** `sessionId`，设备据此自动接听。

#### 请求定义

Topic：`access_device/v2/event/call`

| 字段路径 | 类型 | 必填 | 说明 | 示例 |
| --- | --- | :---: | --- | --- |
| `callId` | string | 是 | 本次呼叫 ID，等于媒体 `sessionId` | `"a1b2c3..."` |
| `type` | string | 是 | `S` 发起呼叫；`H` 挂断/撤销 | `"S"` |
| `id` | string | 条件 | `type=S` 时为联系人 ID；`type=H` 时为空字符串 `""` | `"C001"` |
| `name` | string | 否 | `type=S` 时联系人名称；挂断报文可不带 | `"前台"` |

**发起（`type=S`）**

```json
{
  "serialNo": "0000000001",
  "uuid": "e4720000964b5c00",
  "time": 0,
  "sign": "",
  "data": {
    "callId": "<sessionId>",
    "type": "S",
    "id": "C001",
    "name": "前台"
  }
}
```

**挂断（`type=H`）**

```json
{
  "serialNo": "0000000002",
  "uuid": "e4720000964b5c00",
  "time": 0,
  "sign": "",
  "data": {
    "callId": "<sessionId>",
    "type": "H",
    "id": ""
  }
}
```

#### 流程与超时（设备侧）

1. 设备 `type=S` 上报并等待 `call_reply`（`mqtt.timeout`）。  
2. 平台/App 在媒体侧以 **同一** `sessionId`（=`callId`）呼入设备；设备自动接听。  
3. 等待 App 回呼默认约 **20s**，超时则设备发 `type=H` 并结束业务呼叫。  
4. 接听后媒体建链默认约 **15s**，超时则挂断。  
5. 任意结束路径设备再发 `type=H`（同一 `callId`）；挂断上报同样等待 `call_reply`。

#### 返回定义

Topic：`access_device/v2/event/{#uuid}/call_reply`

**业务字段**

_无业务字段。_ 成功时 `code=000000` 即可；失败码与信封约定同其它事件 ACK。

**完整返回示例**

```json
{
  "serialNo": "0000000001",
  "uuid": "e4720000964b5c00",
  "code": "000000",
  "time": 0,
  "sign": "",
  "data": {},
  "message": "success"
}
```

## 5. 附录资料表

### 5.1 Code 码总览

| 类型 | code | 信息 | 说明 |
| --- | --- | --- | --- |
| 成功 | 000000 | 成功执行指令 | 无 |
| 通用/部分失败 | 100000 | 未知错误 / 部分数据处理失败 | 兜底错误码；批量写类接口部分失败时 `message` 为「部分数据处理失败」，`data` 为失败项数组，已成功条目不回滚 |
| 通用报错 | 100004 | 超时错误 | 无 |
| 通用报错 | 100005 | 设备离线 | 无 |
| 参数异常 | 200000-299999 | 参数异常 | 不同的指令对应不同的参数规范，参考每个接口后的参数异常描述 |
| 其它异常 | 300000-399999 | 其它已知原因导致的异常 | 不同的指令对应不同的异常，参考每个接口后的参数异常描述 |

<a id="52-设备告警类型表"></a>
### 5.2 设备告警类型表

| 类型 | type | value |
| --- | --- | --- |
| 门磁状态 | 256 | `0` 门磁开、`1` 门磁关 |
| 火警状态 | 257 | `1` 预警 |
| 防拆状态 | 258 | `0` 解除、`1` 触发，VF105不支持 |

<a id="53-凭证类型说明"></a>
### 5.3 凭证类型说明

| 分类 | type（num） | 说明 |
| --- | --- | --- |
| 人脸 | `300` | 人脸凭证；`code` 为 JPG Base64（`faceType=0`）或特征值（`faceType=1`） |
| 二维码 | `100`、`101`、`103` | `100` 透传码，`101` 静态码，`103` 动态码 |
| 卡号 | `200` | 普通卡号；下发正序大写，小写会自动转大写存储 |
| 身份证 | `205` | 身份证卡号 |
| 密码 | `400` | 数字密码；长度由 `sys.passwordLength` 配置，支持 4/6/8 位 |
| 指纹 | `500` | 指纹凭证；`code` 为指纹特征十六进制串，设备写入模组后仅存索引 |

> 说明：下发与查询时 `type` 可为数字或字符串（如 `300` / `"300"`），设备会统一转为字符串存储与比对。

<a id="54-时间区间说明"></a>
### 5.4 时间区间说明

权限有效时间类型

| 类型值 | 模式 | 说明 |
| --- | --- | --- |
| 0 | 缺省模式 | 不限时间，一直有效 |
| 1 | 通常模式 | 开始时间到结束时间内有效 |
| 2 | 每日模式 | 每日指定时间段有效 |
| 3 | 周重复模式 | 按星期设置重复有效时间段；需 `time.weekPeriodTime`（键 1–7）及 `time.range` 起止日期 |

`type` 为 1/2/3 时均需填写 `time.range.beginTime` / `time.range.endTime`（Unix 秒）。`type=2` 另需 `time.dayPeriodTime`（如 `"9:00-18:00"`，多段用 `|` 分隔）。字段细节见 [insertPermission](#interface-21-insertpermission)。

<a id="55-设备配置项"></a>
### 5.5 设备配置项

VF105 DejaOS 配置定义

| 配置分组 | MQTT配置项 | 扫码配置项 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- | --- | --- |
| 人脸配置 | face.similarity | similarity | Float | 0.5 | 人脸识别相似度 （范围0-1）小数点后一位 |
| 人脸配置 | face.livenessOff | livenessOff | Int | 1 | 活体检测，0 关 1 开 |
| 人脸配置 | face.livenessVal | livenessVal | Int | 5 | 活体检测阈值 （范围0-10）整数 |
| 人脸配置 | face.stranger | stranger | Int | 1 | 未注册人脸提示：0 无语音，1 请先注册，2 陌生人你好 |
| 人脸配置 | face.voiceMode | voiceMode | Int | 1 | 识别成功语音：0 无，1 名字，2 问候语 |
| 人脸配置 | face.voiceModeDate | voiceModeDate | String | "欢迎光临" | 问候语内容 |
| 人脸配置 | face.recheck | recheck | Int | 8 | 重检间隔（秒），范围 1-100 |
| 人脸配置 | face.recognitionTimeout | recognitionTimeout | Int | 5 | 识别超时（秒），范围 1-30 |
| MQTT配置 | mqtt.addr | addr | String | "mqtt://office.feocey.com:61702" | MQTT 地址，格式 `mqtt://host[:port]` 或 `mqtts://host[:port]`；域名可省略端口，IPv4 必须带端口 |
| MQTT配置 | mqtt.clientId | — | String | 设备 SN | 运行时只读，不可 setConfig |
| MQTT配置 | mqtt.clientIdSuffix | clientIdSuffix | Int | 0 | clientId 后是否加三位随机数：0 否，1 是 |
| MQTT配置 | mqtt.qos | qos | Int | 1 | QoS：0/1/2 |
| MQTT配置 | mqtt.username | username | String | "admin" | MQTT 账号 |
| MQTT配置 | mqtt.password | mqttpassword | String | "password" | MQTT 密码 |
| MQTT配置 | mqtt.prefix | prefix | String | "" | Topic 前缀：去首尾 `/` 后再追加 `/`，再拼到全部 cmd/event/ACK 路径前；空则不加 |
| MQTT配置 | mqtt.onlinecheck | onlinecheck | Int | 0 | 在线验证：0 仅离线，1 离线失败后再在线验证；`verifyMode>0` 时不可为 1 |
| MQTT配置 | mqtt.timeout | timeout | Int | 5 | 等待事件 ACK 超时（秒），≥1；作用于 `alarm`/`access_online`/`wecom`/`access`/`getCallList`/`call`，含在线验证 |
| MQTT配置 | mqtt.willTopic | willTopic | String | "access_device/v2/event/offline" | 遗嘱 Topic（相对 prefix） |
| MQTT配置 | mqtt.cleanSession | cleanSession | Int | 0 | 清除会话：0 关，1 开 |
| 对讲配置 | intercom.server | intercomServer | String | "webrtc.dxiot.com" | 可视对讲服务器；**仅对讲能力机型有效**；无能力时勿对外承诺 [4.33](#interface-33-getcalllist)/[4.34](#interface-34-call) |
| 对讲配置 | intercom.port | intercomPort | Int | 6699 | 可视对讲端口，范围 1-65535；条件同 `intercom.server` |
| 网络配置 | net.type | type | Int | 1 | 网络类型：1 以太网，2 WiFi，4 4G |
| 网络配置 | net.dhcp | dhcp | Int | 2 | 1 静态 IP，2 DHCP |
| 网络配置 | net.ip | ip | String | "" | IP 地址（静态时必填） |
| 网络配置 | net.gateway | gateway | String | "" | 网关（静态时必填） |
| 网络配置 | net.mask | mask | String | "" | 子网掩码（静态时必填） |
| 网络配置 | net.dns | dns | String | "" | DNS，多个用逗号分隔 |
| 网络配置 | net.mac | mac | String | "" | 运行时只读，联网后自动读取 |
| 网络配置 | net.ssid | ssid | String | "" | WiFi 名称，`type=2` 时必填 |
| 网络配置 | net.psk | psk | String | "" | WiFi 密码 |
| 时钟配置 | ntp.server | server | String | "182.92.12.11" | NTP 服务器 |
| 时钟配置 | ntp.gmt | gmt | Int | 8 | 时区编号，范围 0-24 |
| 时钟配置 | ntp.timeZone | timeZone | String | "Asia/Shanghai" | 时区键名，见 [5.6 时区配置](#56-时区配置)；修改需重启 |
| 通行配置 | access.offlineAccessNum | offlineAccessNum | Int | 2000 | 本地通行记录上限，范围 1-2000 |
| 通行配置 | access.deleteRecordAfterUpload | deleteRecordAfterUpload | Int | 1 | 上传成功后删本地记录：0 否，1 是 |
| 通行配置 | access.relayTime | relayTime | Int | 3 | 继电器时长（秒），范围 1-60 |
| 通行配置 | access.fire | fire | Int | 0 | 火警开关：0 关，1 开；置 0 时清除火警态并关门停音 |
| 通行配置 | access.fireStatus | fireStatus | Int | 0 | 火警状态：0 正常，1 预警（可写；单独置 1 可不依赖开关）。与 `fire=0` 同包时以关开关为准，不会留下开关关着的预警态 |
| 通行配置 | access.tamper | tamper | Int | 0 | 防拆报警：0 关，1 开 |
| 通行配置 | access.uploadToCloud | uploadToCloud | Int | 0 | 通行记录上传照片：0 关，1 开 |
| 通行配置 | access.uploadFaceScores | uploadFaceScores | Int | 0 | 人脸通行记录上报比对分/活检分：0 关，1 开；写入 `extra.compareScore` / `extra.livingScore` |
| 通行配置 | access.verifyMode | verifyMode | Int | 0 | 核验模式：0 普通，1 多人，2 单人多凭证，3 双人；涉及多人模式切换需重启 |
| 通行配置 | access.factorSequence | factorSequence | Array | ["face","card"] | 因子序列；必须为 2 个不重复因子（face/card/code/password/finger） |
| 通行配置 | access.verifyTimeout | verifyTimeout | Int | 15 | 核验超时（秒），范围 3-300 |
| 基础配置 | base.language | language | String | "CN" | 语言：CN/EN/ES/FR/DE/RU/AR/PT/KO；国内版仅 CN |
| 基础配置 | base.password | password | String | "password" | 后台密码 |
| 基础配置 | base.firstLogin | — | Int | 0 | 只读，不可 setConfig |
| 基础配置 | base.screenOff | screenOff | Int | 3 | 熄屏时间（分钟），0 从不 |
| 基础配置 | base.screensaver | screensaver | Int | 1 | 屏保时间（分钟），0 从不 |
| 基础配置 | base.backlight | backlight | Int | 70 | 屏幕背光，0-100 |
| 基础配置 | base.whiteLightMode | whiteLightMode | Int | 0 | 白光模式：0 自动，1 常开，2 常闭 |
| 基础配置 | base.brightness | brightness | Int | 70 | 白光补光亮度，0-100 |
| 基础配置 | base.nirBrightness | nirBrightness | Int | 80 | 红外补光亮度，0-100 |
| 基础配置 | base.volume | volume | Int | 10 | 音量，0-10 |
| 基础配置 | base.showIp | showIp | Int | 1 | 显示 IP：0 隐藏，1 显示 |
| 基础配置 | base.showSn | showSn | Int | 1 | 显示 SN：0 隐藏，1 显示 |
| 基础配置 | base.accessDisplayFields | accessDisplayFields | Array | ["name","department"] | 通行成功展示字段：name/department/employeeNo，最多 3 项 |
| 系统配置 | sys.model | — | String | "VF105_V12" | 只读 |
| 系统配置 | sys.appVersion | — | String | "" | 运行时只读 |
| 系统配置 | sys.mac | — | String | "" | 运行时只读 |
| 系统配置 | sys.sn | — | String | 设备 SN | 运行时只读；与报文信封 `uuid` 同值 |
| 系统配置 | sys.releaseTime | — | String | "" | 运行时只读 |
| 系统配置 | sys.totaldisk | — | String | "" | 运行时只读，设备总空间（如 `"1024 MB"`） |
| 系统配置 | sys.freedisk | — | String | "" | 运行时只读，剩余空间（如 `"512 MB"`） |
| 系统配置 | sys.heart_en | heart_en | Int | 0 | MQTT 心跳：0 关，1 开 |
| 系统配置 | sys.heart_time | heart_time | Int | 30 | 心跳间隔（秒），≥30 |
| 系统配置 | sys.nfc | nfc | Int | 1 | 刷卡：0 关，1 开 |
| 系统配置 | sys.pwd | pwd | Int | 1 | 密码开门：0 关，1 开 |
| 系统配置 | sys.passwordLength | passwordLength | Int | 6 | 人员密码位数：4/6/8 |
| 系统配置 | sys.faceImageRetention | faceImageRetention | Int | 1 | 人脸照片留存：0 不留，1 留；只作用于新增/改写，不回扫历史；`getKey` 按库内 `faceType` 返回 |
| 系统配置 | sys.strangerImage | strangerImage | Int | 1 | 陌生人存图：0 关，1 开 |
| 系统配置 | sys.nfcIdentityCardEnable | nfcIdentityCardEnable | Int | 1 | 1 物理卡号，3 云证 |
| 系统配置 | sys.scanInterval | scanInterval | Int | 1 | 扫码间隔（秒），≥1 |
| 系统配置 | sys.weComStatus | — | Int | 0 | 只读，企微绑定：0 未绑定，1 已绑定（内部企微） |
| 系统配置 | sys.weComMqttAddr | — | String | "mqtt://<wecom-broker-host>:<port>" | 只读，企微模式 MQTT 地址（内部企微）；示例为占位，不可 setConfig |

<a id="56-时区配置"></a>
### 5.6 时区配置

时区键名与 UTC 偏移

| 时区键名 | UTC偏移 | 时区名称 | 主要城市 | 夏令时规则/偏移 |
| --- | --- | --- | --- | --- |
| Asia/Dubai | +04:00 | Gulf Standard Time | 迪拜（阿联酋） | 无 |
| Asia/Karachi | +05:00 | Pakistan Standard Time | 卡拉奇（巴基斯坦） | 无 |
| Asia/Kolkata | +05:30 | India Standard Time | 加尔各答（印度） | 无 |
| Asia/Dhaka | +06:00 | Bangladesh Standard Time | 达卡（孟加拉国） | 无 |
| Asia/Bangkok | +07:00 | Indochina Time | 曼谷（泰国） | 无 |
| Asia/Jakarta | +07:00 | Western Indonesia Time | 雅加达（印度尼西亚） | 无 |
| Asia/Shanghai | +08:00 | China Standard Time | 北京（中国） | 无 |
| Asia/Hong_Kong | +08:00 | Hong Kong Time | 香港（中国） | 无 |
| Asia/Taipei | +08:00 | Taiwan Standard Time | 台北（中国） | 无 |
| Asia/Singapore | +08:00 | Singapore Standard Time | 新加坡 | 无 |
| Asia/Seoul | +09:00 | Korea Standard Time | 首尔（韩国） | 无 |
| Asia/Tokyo | +09:00 | Japan Standard Time | 东京（日本） | 无 |
| Australia/Perth | +08:00 | Australian Western Standard Time | 珀斯（澳大利亚） | 无 |
| Australia/Sydney | +10:00 | Australian Eastern Standard Time | 悉尼（澳大利亚） | 10月第一个周日 - 4月第一个周日 (偏移: +11:00) |
| America/Adak | -10:00 | Hawaii-Aleutian Standard Time | 阿达克（美国） | 3月第二个周日 - 11月第一个周日 (偏移: -09:00) |
| America/Anchorage | -09:00 | Alaska Standard Time | 安克雷奇（美国） | 3月第二个周日 - 11月第一个周日 (偏移: -08:00) |
| America/Los_Angeles | -08:00 | Pacific Standard Time | 洛杉矶（美国） | 3月第二个周日 - 11月第一个周日 (偏移: -07:00) |
| America/Denver | -07:00 | Mountain Standard Time | 丹佛（美国） | 3月第二个周日 - 11月第一个周日 (偏移: -06:00) |
| America/Chicago | -06:00 | Central Standard Time | 芝加哥（美国） | 3月第二个周日 - 11月第一个周日 (偏移: -05:00) |
| America/Mexico_City | -06:00 | Central Time | 墨西哥城（墨西哥） | 无 |
| America/New_York | -05:00 | Eastern Standard Time | 纽约（美国） | 3月第二个周日 - 11月第一个周日 (偏移: -04:00) |
| America/Toronto | -05:00 | Eastern Standard Time | 多伦多（加拿大） | 3月第二个周日 - 11月第一个周日 (偏移: -04:00) |
| America/Bogota | -05:00 | Colombia Time | 波哥大（哥伦比亚） | 无 |
| America/Lima | -05:00 | Peru Time | 利马（秘鲁） | 无 |
| America/Santiago | -04:00 | Chile Time | 圣地亚哥（智利） | 9月第一个周六 - 4月第一个周六 (南半球规则) (偏移: -03:00) |
| America/Sao_Paulo | -03:00 | Brazil Time | 圣保罗（巴西） | 无 |
| America/Argentina/Buenos_Aires | -03:00 | Argentina Time | 布宜诺斯艾利斯（阿根廷） | 无 |
| Europe/Lisbon | +00:00 | Portugal Time | 里斯本（葡萄牙） | 3月最后一个周日 - 10月最后一个周日 (偏移: +01:00) |
| Europe/London | +00:00 | Greenwich Mean Time | 伦敦（英国） | 3月最后一个周日 - 10月最后一个周日 (偏移: +01:00) |
| Europe/Amsterdam | +01:00 | Central European Time | 阿姆斯特丹（荷兰） | 3月最后一个周日 - 10月最后一个周日 (偏移: +02:00) |
| Europe/Berlin | +01:00 | Central European Time | 柏林（德国） | 3月最后一个周日 - 10月最后一个周日 (偏移: +02:00) |
| Europe/Paris | +01:00 | Central European Time | 巴黎（法国） | 3月最后一个周日 - 10月最后一个周日 (偏移: +02:00) |
| Europe/Madrid | +01:00 | Central European Time | 马德里（西班牙） | 3月最后一个周日 - 10月最后一个周日 (偏移: +02:00) |
| Europe/Rome | +01:00 | Central European Time | 罗马（意大利） | 3月最后一个周日 - 10月最后一个周日 (偏移: +02:00) |
| Europe/Stockholm | +01:00 | Central European Time | 斯德哥尔摩（瑞典） | 3月最后一个周日 - 10月最后一个周日 (偏移: +02:00) |
| Europe/Athens | +02:00 | Eastern European Time | 雅典（希腊） | 3月最后一个周日 - 10月最后一个周日 (偏移: +03:00) |
| Europe/Istanbul | +03:00 | Turkey Time | 伊斯坦布尔（土耳其） | 无 |
| Atlantic/Azores | -01:00 | Azores Time | 亚速尔群岛 | 3月最后一个周日 - 10月最后一个周日 (偏移: +00:00) |
| Pacific/Guam | +10:00 | Guam Time | 关岛（美国） | 无 |
| Pacific/Noumea | +11:00 | New Caledonia Time | 努美阿（新喀里多尼亚） | 无 |
| Pacific/Auckland | +12:00 | New Zealand Standard Time | 奥克兰（新西兰） | 9月最后一个周日 - 4月第一个周日 (偏移: +13:00) |
| Pacific/Fiji | +12:00 | Fiji Time | 斐济 | 11月第二个周日 - 1月第二个周日 (规则常变动) (偏移: +13:00) |
| Pacific/Tongatapu | +13:00 | Tonga Time | 汤加塔普（汤加） | 无 |
| Pacific/Midway | -11:00 | Samoa Standard Time | 中途岛（美国） | 无 |
| Pacific/Honolulu | -10:00 | Hawaii Standard Time | 檀香山（美国） | 无 |
