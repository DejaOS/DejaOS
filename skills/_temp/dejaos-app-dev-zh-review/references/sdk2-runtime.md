# SDK 2.0 运行时与应用结构

## 目录

- 运行时模型
- Worker 设计
- 启动结构
- UI
- 组件与边界
- 大型应用模式
- 审查清单

## 运行时模型

SDK 2.0 基于 QuickJS。单个 Worker 是单线程、同步运行时；需要并发职责时使用多个隔离 Worker。

Worker 之间：

- 不共享内存和 JS 对象。
- 不能直接调用另一个 Worker 的函数。
- 通过 `dxEventBus` 消息通信。
- 跨 Worker 请求和响应都是异步消息链。

使用：

```js
dxEventBus.newWorker('./uiWorker.js')
```

不要直接使用未经组件封装的 QuickJS Worker API。创建前仍要对照项目 `dxmodules/dxEventBus.js` 确认签名。

`dxStd.setTimeout` 和 `dxStd.setInterval` 只是在当前 Worker 事件处理中调度回调，不会把同步重任务变为并行任务。

## Worker 设计

推荐按长生命周期职责拆分：

- 主 Worker：配置、日志、Worker 创建、顶层故障处理。
- UI Worker：`dxUi`、页面、短周期 UI handler。
- 设备 Worker：UART、GPIO、扫码、刷卡等硬件循环。
- 人脸 Worker：摄像头、人脸识别和注册状态。
- 网络 Worker：MQTT、HTTP 或后台同步。

边界规则：

- 每个原生组件只在明确的 Worker 中初始化和拥有。
- EventBus topic 名称稳定、具有业务含义。
- 消息载荷尽量小，避免传递大图片或大对象。
- 请求需要返回值时设计请求 ID、响应 topic、超时和失败路径。
- 消费者必须能处理重复、延迟或乱序消息。
- UI Worker 不执行长循环、阻塞 I/O 或大批量数据库操作。

## 启动结构

`src/main.js` 保持精简：

1. 初始化 `dxLogger` 和必要基础配置。
2. 安装顶层 `try/catch`。
3. 按职责创建 Worker。
4. 不把 UI、串口循环或完整业务实现堆入主 Worker。

Worker 内部：

1. 导入真实需要的组件。
2. 按依赖顺序初始化。
3. 订阅 EventBus topic。
4. 启动短小、有边界的定时任务。
5. 为异常和重启留下明确日志。

## UI

- UI 放入专用 Worker。
- `dxui.init(options, context)` 后再创建控件。
- 所有 UI 文件共享同一个 context。
- 按项目包装器要求，短周期调用 `dxui.handler()`。
- 单屏多页面可使用 `assets/UIManager.js`。
- 页面建议提供 `init()` 并返回根 View，可选 `onShow(data)` 和 `onHide()`。
- 复用字体对象，避免页面反复创建字体。
- 中文 UI 使用 `/app/code/resource/font/font.ttf`。

常见控件约束：

- `uiButton` 内放 `Label`，不要直接设置按钮文本。
- `uiImage` 外包透明 `View` 处理点击。
- 顶层覆盖使用 `dxui.Utils.LAYER.TOP`。
- 精确布局时 View 使用 `padAll(0)`，通常禁用滚动。
- 图片控件大小匹配资源大小。

## 组件与边界

- 基础模块常见为 `dxLogger`、`dxStd`、`dxOs`、`dxDriver`、`dxMap`、`dxEventBus`、`dxCommonUtils`。
- UI 常见为 `dxUi`。
- 存储常见为 `dxSqliteDB`、`dxKeyValueDB`。
- 网络常见为 `dxNetwork`、`dxHttpClient`、`dxHttpServer`、`dxMqttClient`。
- 硬件常见为 `dxUart`、`dxGpio`、`dxGpioKey`、`dxPwm`、`dxNfc`、`dxBarcode`。
- 系统常见为 `dxWatchdog`、`dxNtp`、`dxOta`、`dxConfiguration`、`dxAudio`。

这些名称只是定位提示，不证明目标型号或项目已经安装。所有实际导出和函数仍以项目 `dxmodules` 为准。

在以下边界使用 `try/catch`：

- Worker 创建和 EventBus 处理
- UART、GPIO、刷卡、扫码和人脸
- 文件、SQLite 和配置
- MQTT、HTTP 和网络切换
- UI 回调和定时器

## 大型应用模式

### UI、业务和设备分层

推荐：

```text
UI Worker
  <-> 业务 topic
业务/网络 Worker
  <-> 设备命令和状态 topic
设备 Worker
```

UI 只展示状态并发出用户意图。设备 Worker 拥有原生句柄。业务 Worker 管理流程、重试和持久化。

### MQTT 离线队列

- SQLite 保存待发送事件。
- 每条事件有唯一业务 ID。
- 发布成功并得到业务确认后再删除。
- 队列有最大长度、重试次数和退避。
- 重连后按稳定顺序补发，避免阻塞 UI。

### 锁控和门状态

- 命令与物理状态分开记录。
- 开锁命令设置超时，不把“命令发送成功”当作“门已经打开”。
- 输入变化去抖。
- 超时、拒绝、设备离线和重复命令都有明确结果。

### 人脸注册

- 注册状态由人脸 Worker 拥有。
- 进入注册时建立 `dxFacial.setStatus(true)`。
- UI 通过消息请求注册并展示进度。
- 保存特征、照片和业务记录时处理部分成功回滚。
- 退出注册时按项目 API 恢复正常识别状态，但不能用 `setStatus(false)` 代替注册期间的必需状态。

## 审查清单

- 是否错误地假设 Worker 共享变量？
- 是否用 `dxEventBus.newWorker` 而不是未经封装的 Worker？
- topic 是否有超时、失败和重复处理？
- UI Worker 是否运行长循环或阻塞 I/O？
- 原生组件是否被多个 Worker 重复初始化？
- 是否直接使用 `console.log`？
- 每个调用是否存在于项目 `dxmodules`？
- 中文 UI 是否安装字体？
- 人脸预览是否被不透明 UI 遮住？
- 真机运行和日志是否实际完成？
