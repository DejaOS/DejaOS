---
name: dejaos-app-dev
description: 使用 dejaos CLI 创建、修改、迁移、运行、调试或审查 DejaOS SDK 2.0 和 SDK 4.0 嵌入式 JavaScript 应用。适用于新建或现有 DejaOS App、设备型号与 SKU 能力确认、SDK/组件 HTTP 查询、app.dxproj、项目本地 dxmodules API 校验、SDK 2.0 Worker/dxEventBus 架构、SDK 4.0 单运行时异步架构、dxUi/LVGL UI、UART、SQLite、MQTT、HTTP、人脸识别、USB 同步运行、设备日志和嵌入式资源约束。
---

# DejaOS App 开发

使用同一个入口开发 SDK 2.0 或 SDK 4.0 应用。先确定设备和 SDK，再加载对应规则；不得混用两个版本的运行时架构。

## 参考边界

- 仅把本 Skill 目录内的指南、脚本、设备映射资料、模板和资源作为 Skill 自带参考。
- 不得要求开发者访问维护者电脑上的外部工程或作者专属绝对路径。
- 把开发者当前的 DejaOS App 视为任务输入。正常检查其 `app.dxproj`、`dxmodules/`、`src/` 和 `resource/`。
- 始终把目标项目安装后生成的 `dxmodules/*.js` 视为该项目组件 API 的最高优先级依据。
- 把 `dxmodules/` 视为生成、带版本且只读的厂商代码；不得直接修改它来迁就错误的业务调用。

## 开发前强制门禁

### 1. 确认设备型号

- 开发者必须提供或确认精确设备型号。没有型号时停止创建项目、修改代码和设计硬件功能。
- 对现有项目，可从 `app.dxproj.model` 读取候选值并请开发者确认；配置值不能替代必要确认。
- 使用 `scripts/resolve-device-sdk.mjs` 或 `references/tools-http-api.md` 将输入规范化为服务端返回的 `deviceModel`，并取得 `mainDeviceModel`。
- `deviceModel` 是项目和真实设备型号；`mainDeviceModel` 是 SDK 与组件查询键。不得用主型号映射证明子型号具有相同物理 SKU。

### 2. 确认 SDK 版本

- 只允许 SDK `2.0` 或 `4.0`。SDK `3.0` 不受支持，开发者选择 3.0 时停止。
- 开发者不确定时，先说明两版结构差异很大：
  - 2.0 使用多 Worker 和 `dxEventBus`。
  - 4.0 使用单 JS 运行时、Promise、组件事件和内部异步调度，禁止 Worker。
- 说明差异后默认按 SDK 2.0 继续，并明确告诉开发者最终选择；不得静默默认。

### 3. 查询 SDK 和组件

1. 用精确型号取得主型号。
2. 用主型号和 SDK 版本查询 SDK。
3. 用 `sdkId` 查询最新组件列表。
4. 只有组件列表非空才继续。
5. HTTP 报错、目标 SDK 缺失或组件列表为空时，按当前查询判定该型号不支持所选 SDK，报告原始错误或空结果并停止。不要自行猜测组件；维护者可随后手动调整资料或规则。

需要查询或排错时读取 `references/tools-http-api.md`。当前设备映射快照见 `references/device-models.md`，但运行时支持结论必须来自实时查询。

### 4. 确认 SKU

- 读取 `references/device-sku-capabilities.md`。
- 标准配置可以使用；选配硬件和服务在开发者确认实际设备已安装或已开通前一律按不可用处理。
- 请求功能不在标准配置或已确认选配中时，不开发该功能。
- 子型号没有独立 SKU 资料时必须询问，不得自动继承主型号 SKU。
- 完成物理能力判断后，仍需检查所选 SDK 的组件列表和项目 `dxmodules/`。

### 5. 确认数据目录

- 根据 API 映射后的 `mainDeviceModel` 判断默认数据目录。
- 主型号以 `VF` 开头：使用 `/data`。
- 其他主型号：使用 `/app/data`。
- 目标项目或设备正式文档明确规定其他位置时，以更具体的依据为准。

### 6. 确认 USB 状态

- 询问开发者是否已经通过 USB 连接正确设备。
- `dejaos connect` 只验证设备是否通过 USB 连接到电脑，不用于发现或确认设备型号。
- `connect` 需要项目中已有 `app.dxproj`，所以新项目必须先完成型号确认和项目创建。
- 未确认正确设备时，不执行同步、启动、停止、重启等设备变更。

## CLI 优先工作流

1. 执行 `dejaos --version`。
2. CLI 不可用时，说明需要 Node.js 18+ 和 `dejaos-cli`。征得同意后执行 `npm install -g dejaos-cli`，再用 `dejaos --version` 验证。
3. 新项目完成所有门禁后执行：

   ```text
   dejaos new <deviceModel> <projectName> <projectDirectory> <2.0|4.0>
   ```

4. 不手工创建 `app.dxproj` 或 `dxmodules/`。
5. 检查生成的 `app.dxproj`、SDK、组件和 `dxmodules/`。
6. 有 UI 时，在 `resource/font/font.ttf` 安装字体：
   - 中文对话、中文 UI 或需要中日韩字形：`https://raw.githubusercontent.com/DejaOS/DejaOS/main/tools/font_cn.ttf`
   - 英文对话且 UI 仅英文：`https://raw.githubusercontent.com/DejaOS/DejaOS/main/tools/font_en.ttf`
   - 验证文件存在且非空；运行时使用 `/app/code/resource/font/font.ttf`。
7. 现有项目先读配置和源码，再执行 `dejaos install --project <project>`，然后以新生成的 `dxmodules/` 为准。

完整命令和真机循环见 `references/dejaos-cli-workflow.md`。

## SDK 架构分流

### SDK 2.0

- 在设计、创建或修改 2.0 App 前读取 `references/sdk2-runtime.md`。
- 允许通过 `dxEventBus.newWorker(...)` 创建 Worker。
- 主 Worker 负责初始化和 Worker 创建；UI、串口循环、人脸循环及长时间业务通常放在各自 Worker。
- Worker 之间通过 `dxEventBus` 消息通信，不假设共享对象或直接函数调用。
- 每个 Worker 仍是单线程；`dxStd.setTimeout` 和 `setInterval` 不是原生并行。

### SDK 4.0

- 在设计、创建、迁移或修改 4.0 App 前读取 `references/sdk4-runtime.md`。
- 只能使用一个 JS 运行时。不得创建 QuickJS Worker，不得调用 `dxEventBus.newWorker(...)`；`dxStd` 已移除 Worker 能力。
- 使用普通模块、服务、控制器和显式生命周期保持职责边界。
- 使用 `async`/`await`、Promise 和组件公开的 `on`/`off`/`once` 事件。
- 必须安装 `dxSystemBus`，因为组件包装器内部依赖它；普通 App 业务代码不得直接 import 或调用 `dxSystemBus`。
- 初始化按依赖顺序执行，销毁按相反顺序执行。清理监听器、定时器、客户端、数据库和组件。
- 需要理解 4.0 的 Promise、事件和生命周期模式时读取 `references/sdk4-api-patterns.md`；具体函数始终以项目安装后生成的包装器为准。

## 项目和组件 API 检查

每次安装组件和每次实质代码修改后：

1. 确认每个 import 的包装器存在于项目 `dxmodules/`。
2. 打开对应 JS 文件，检查默认/命名导出。
3. 逐项核对函数或成员名、参数顺序和数量、常量、同步或 Promise 返回、结果结构、事件名、初始化顺序及清理方法。
4. 搜索所有 App import 和组件成员调用，标出不存在的模块或函数。
5. 不得因为旧 SDK、其他型号或参考示例中存在某方法，就假定目标项目也有该方法。
6. 缺组件时通过 `dejaos edit` 或有意识地修改 `app.dxproj`，然后运行 `dejaos install`；不要复制包装器到 `dxmodules/`。

详细审查步骤和搜索方式见 `references/dxmodules-api-audit.md`。

## 通用编码规则

- 使用 `dxLogger`，不要在 App 代码中使用 `console.log`。
- 在硬件、网络、文件、数据库、UART、定时器、Worker 边界和异步生命周期边界使用 `try/catch`。
- App 代码放在 `src/`，资源放在 `resource/`。
- 使用 `/app/code/resource/...` 形式的运行时绝对资源路径。
- 使用与文件深度匹配的相对路径导入 `dxmodules`；没有 Node.js 式 `node_modules` 解析。
- 控制对象大小、循环次数、缓存和队列长度；设备内存和 CPU 有限。
- 对网络和设备操作设置超时，避免无界重试和无界日志。

## UI 规则

- SDK 2.0 把 UI 放入专用 UI Worker；SDK 4.0 在统一主运行时中运行 UI，不创建 UI Worker。
- 创建控件前初始化 `dxUi`，在已安装包装器要求的情况下用短周期非阻塞定时器调用 `dxui.handler()`。
- 单屏多页面项目可将 `assets/UIManager.js` 复制为 `src/UIManager.js`；已有页面管理器时保持现有约定。
- 中文或非英文 UI 必须安装覆盖相应字形的 TTF。
- `uiButton` 没有直接文本属性，在按钮中创建 `Label`。
- `uiImage` 本身不可直接点击，用透明 `View` 包裹并给外层注册点击。
- 真正的最顶层覆盖才使用 `dxui.Utils.LAYER.TOP`。
- 精确布局的 View 调用 `padAll(0)`，通常同时调用 `scroll(false)`。
- 图片默认不自动缩放，控件尺寸应与资源尺寸匹配。

## 人脸应用规则

开发人脸功能前读取 `references/face-app-rules.md`，并遵守：

- 实时摄像头画面默认全屏并位于最底层；需要显示时让上层 UI 背景全部或局部透明。
- 人脸识别应用默认显示实时画面；追踪框是否显示按产品体验决定。
- 人脸注册期间必须调用 `dxFacial.setStatus(true)`，不能使用 `false`。
- SDK 2.0 通常由 `dxFacial` 自身封装人脸链路，在人脸 Worker 中初始化 `dxFacial`。
- SDK 4.0 将图像链路拆成多个组件；完整实时采集、预览和识别按目标包装器核对 `dxCapturer -> dxIvcore -> dxDisplay -> dxFacial` 的依赖和初始化顺序。
- `dxCapcal` 不是人脸识别必需组件；只在需要摄像头标定且已安装包装器明确支持时使用。
- 所有人脸及图像链路 API 都要对照目标项目安装后生成的对应 `dxmodules/*.js`。

## 修改后的真机闭环

每次实质源码、配置或资源修改后：

1. 重做 SKU、组件和 API 静态检查。
2. 执行可用的语法或静态检查。
3. 正确 USB 设备已确认时，执行 `dejaos connect --project <project>` 验证连接。
4. 执行 `dejaos run --project <project>`，完成连接、增量同步和启动。
5. 首次部署或增量状态失效时，执行 `dejaos sync --all --project <project>`，必要时再执行 `dejaos start --project <project>`。
6. 有时间边界地采集 `dejaos logs --project <project>`，检查语法、模块加载、资源、未捕获异常和硬件初始化错误。
7. 修复明显错误后重复运行和日志检查。
8. 无设备、连接失败或日志未检查时，明确标记“仅完成静态验证”，不得声称真机验证通过。

## 参考资料导航

- `references/dejaos-cli-workflow.md`：CLI 安装、项目创建、字体、USB 运行和日志闭环。
- `references/tools-http-api.md`：型号到主型号、SDK 和组件的 HTTP 查询合同。
- `references/device-models.md`：当前 29 个设备型号映射快照和默认数据目录。
- `references/device-sku-capabilities.md`：VF105、VF114、VF203、VF202 的标准和选配能力。
- `references/sdk2-runtime.md`：SDK 2.0 Worker、事件总线、UI 和常见大型应用模式。
- `references/sdk2-components.md`：SDK 2.0 SQLite、UART、网络、MQTT、HTTP、看门狗和资源提示。
- `references/sdk2-large-app-patterns.md`：SDK 2.0 多 Worker 大型应用的分层、状态桥和命令路由。
- `references/sdk4-runtime.md`：SDK 4.0 单运行时异步架构和迁移规则。
- `references/sdk4-api-patterns.md`：SDK 4.0 Promise、事件和生命周期模式；函数签名仍需检查项目包装器。
- `references/dxmodules-api-audit.md`：逐函数 API 校验流程。
- `references/face-app-rules.md`：人脸预览、图层、注册和清理规则。
- `assets/UIManager.js`：通用单屏多页面管理器。
- `assets/sdk2/`：SDK 2.0 `app.dxproj` 示例。
- `scripts/resolve-device-sdk.mjs`：实时解析型号、主型号、SDK 和组件。
- `scripts/install-skill.bat`：把统一 Skill 复制到当前用户的 Codex、Cursor 和 WorkBuddy Skill 目录。
