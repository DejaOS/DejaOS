# SDK 4.0 API 模式

## 目录

- 使用边界
- 示例边界
- dxSystemBus
- 异步文件和系统操作
- HTTP
- SQLite
- MQTT
- 事件型组件
- UI 和人脸

## 使用边界

API 证据优先级：

1. 目标项目安装后生成的 `dxmodules/*.js`
2. 目标项目 `app.dxproj`
3. 本文中的模式摘要和架构说明

本文只帮助理解和定位常见模式，不提供预制组件包装器，也不代替真实包装器签名。

## 示例边界

以下函数和事件用于说明 SDK 4.0 常见的 Promise、事件和生命周期形态，不保证每个型号、组件版本或未来版本都存在。创建项目或执行 `dejaos install` 后，必须打开项目自己的对应包装器逐项核对。

## dxSystemBus

普通 App：

- 安装 `dxSystemBus`。
- 不直接 import 或调用它。
- 使用组件公开的 Promise 和事件。

开发组件包装器时才可能直接使用：

```js
import { dxSystemBus, validateSourceId } from '../dxmodules/dxSystemBus.js'
```

组件包装器开发中常见的成员包括：

```text
dxSystemBus.on(sourceId, callback)
dxSystemBus.off(sourceId, callback)
dxSystemBus.once(sourceId, callback)
```

事件形态：

```text
{ sourceId, taskId, eventType, payload }
```

`on` 通常返回取消订阅函数。`DX_` 和 `SYS_` 可能是保留前缀；自定义 ID 的字符和长度限制必须检查目标项目包装器。

## 异步文件和系统操作

常见的 `dxStd` Promise API 示例包括：

```text
sleepAsync(delayMs)
loadFileAsync(path)
saveFileAsync(path, content)
readdirAsync(path)
statAsync(path)
```

包装器也可能保留同步文件 API。不要在事件驱动业务路径中使用同步休眠、长文件操作或高频同步 I/O。

`dxOs` 快照提供原生线程支持的 Promise Shell 操作。即使方法名包含 `Blocked`，也要阅读目标包装器确认 JS 侧是否返回 Promise，并验证具体结果形态。

## HTTP

常见模式：

```js
const client = dxHttpClient.createClient('http_main')
const response = await client.get(url, options)
await client.download(url, savePath, options)
client.destroy()
```

规则：

- 每个活动客户端使用唯一 ID。
- 对请求和下载设置超时并处理拒绝。
- 检查 `status`、`headers`、`body` 或 `savedPath`。
- 销毁客户端时处理仍在进行的请求。

## SQLite

常见模式：

```text
await dxSqliteDB.open(path)
await dxSqliteDB.execute(sql) -> { changes, lastInsertRowid }
await dxSqliteDB.query(sql)   -> object[]
await dxSqliteDB.close()
```

路径默认根目录由主型号决定。应用应使用参数化或安全构造的 SQL，限制结果集，保证异常时关闭数据库。

## MQTT

常见模式包括：

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

要求：

- 每个活动客户端使用唯一 `sourceId`。
- 注册事件后保存取消方式。
- 销毁前断开并取消监听器。
- 连接、订阅、发布和重连都有超时及错误日志。

## 事件型组件

以下组件在 SDK 4.0 中可能通过事件接收原生通知：

- `dxFacial`
- `dxNfcCard`
- `dxNetwork`
- `dxGpioKey`
- `dxChannel`
- `dxUdpServer`
- `dxEid`

`dxBarcode` 可能通过 `setCallbacks` 注册回调。事件名称和参数必须查目标文件，不能只凭此列表。

组件提供事件时优先用事件，不要额外建立高频轮询。

## UI 和人脸

`dxUi` 仍采用回调和 handler 模式：

- 创建控件前调用 `dxui.init(options, context)`。
- 在所有 UI 文件中共享同一个 context。
- 按包装器要求定期调用 `dxui.handler()`。

对需要实时采集、预览和识别的完整人脸链路，SDK 4.0 常见依赖是 `dxCapturer -> dxIvcore -> dxDisplay -> dxFacial`。`dxCapcal` 不是必需组件。具体顺序、初始化参数和清理方法以目标项目包装器为准。常见 `dxFacial` API 示例包括：

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

常见的特征提取结果示例：

```text
getFeaByCap  -> { qualityScore, picPath, rect, feature }
getFeaByFile -> { qualityScore, rect, feature }
```

注册必须建立 `dxFacial.setStatus(true)`。所有方法和结果仍要对照目标项目版本。
