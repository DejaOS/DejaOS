# SDK 4.0 JavaScript 参考项目

## 用途

按需读取 `references/sdk4-reference-project/src/` 中的内置源码，学习一个较完整的 SDK 4.0 应用如何组织单运行时架构、显式生命周期、组件 Driver、SQLite 业务 Domain、HTTP/MQTT 适配、UI 路由和人脸流程。

这是只读源码快照，不是可运行项目，也不是标准实现。

## 使用边界

- 不得把整个参考源码树复制到开发者的 App。
- 不得假设参考代码调用的组件函数在目标项目中存在。每个函数、事件、返回结构和清理方法仍要对照目标项目安装后生成的 `dxmodules/*.js`。
- 目标 App 的设备型号、SDK 支持、SKU 选配、数据目录和已安装组件必须重新确认。
- 路径、端口、能力标志、超时、UI 尺寸、协议和业务规则都只作为产品实现示例。
- 快照可能包含设计取舍或已经发现的 Review 问题；与 Skill 当前规则冲突时，以 Skill 规则为准。
- 开发用户 App 时不得修改这份内置快照。

快照有意排除了 `resource/`、`dxmodules/`、配置 JSON、`app.dxproj`、Git 元数据、临时文件和设备运行数据，因此不能单独构建或部署。

## 主题导航

| 主题 | 优先查看 |
| --- | --- |
| 启动、失败回滚、逆序清理 | `src/main.js`、`src/core/lifecycle.js` |
| 广播事件和请求响应命令 | `src/core/event_bus.js`、`src/core/events.js`、`src/core/commands.js` |
| 组件包装边界 | `src/drivers/` |
| SDK 4.0 人脸初始化链 | `src/drivers/capturer_driver.js`、`ivcore_driver.js`、`display_driver.js`、`face_driver.js` |
| 人脸场景、采集和特征库操作 | `src/domain/face_domain.js`、`src/services/face_service.js` |
| SQLite、默认值、校验和 Repository | `src/storage/` |
| HTTP 边界和 Command 路由 | `src/protocols/http/http_protocol.js` |
| MQTT 客户端、路由、回执和重试 | `src/protocols/mqtt/` |
| UI 生命周期和页面清理 | `src/view/index.js`、`src/view/router/core.js`、`src/view/pages/base_view.js` |
| UI 到业务边界 | `src/view/ui_driver.js`、页面 `*_store.js` |
| 按能力启用选配硬件 | `src/drivers/os_driver.js`、`src/core/lifecycle.js` |

## 高效搜索

不要一次加载全部源码，优先进行窄范围搜索：

```text
rg -n "dxFacial\.|getFeaByCap|setStatus" references/sdk4-reference-project/src
rg -n "\.init\(|\.destroy\(|quiesce" references/sdk4-reference-project/src/core references/sdk4-reference-project/src/drivers
rg -n "registerCommand|execute\(|eventBus\.on|eventBus\.fire" references/sdk4-reference-project/src
rg -n "dxStd\.(setTimeout|setInterval|clearTimeout|clearInterval)" references/sdk4-reference-project/src
```

学习模式后，只在目标项目中实现满足需求的最小版本，并继续执行项目本地 API 检查和真机验证闭环。
