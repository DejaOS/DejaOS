# DejaOS CLI 工作流

## 目录

- CLI 准备
- 开发上下文
- 新建项目
- 现有项目
- UI 字体
- USB 设备
- 运行与日志

## CLI 准备

要求：

- Node.js 18 或更高版本
- npm 包：`dejaos-cli`
- 命令：`dejaos`

检查：

```text
dejaos --version
```

如果命令不存在，先告知开发者需要进行全局 npm 安装。得到同意后执行：

```text
npm install -g dejaos-cli
dejaos --version
```

第二次版本检查未通过时，不得声称安装成功。

## 开发上下文

创建或大规模修改前汇总：

```text
设备型号：
主型号：
SDK：2.0 / 4.0
SDK/组件查询：
实际 SKU：
默认数据目录：
项目：新建 / 现有
项目目录：
UI：无 / 中文 / 英文 / 其他
USB：已连接 / 未连接 / 未确认
```

设备型号必须确认。SDK 不确定时，在说明 2.0 与 4.0 架构差异后明确按 2.0 继续。

## 新建项目

使用完整参数：

```text
dejaos new <deviceModel> <projectName> <projectDirectory> <2.0|4.0>
```

示例：

```text
dejaos new VF105_V12 access_terminal C:\Projects\access_terminal 4.0
```

`new` 会查询当前设备和 SDK 元数据，创建 `app.dxproj`，安装基础组件并生成 `dxmodules/`。目标位置已有 `app.dxproj` 时命令会失败。

### 新项目默认组件

HTTP API 返回的是所选主型号和 SDK 当前发布的全部可用组件。`dejaos new` 不会把全部组件都加入项目，而是选择以下默认基础组件。

SDK 2.0：

```text
dxLogger
dxStd
dxOs
dxDriver
dxMap
dxEventBus
dxCommonUtils
```

SDK 4.0：

```text
dxLogger
dxStd
dxOs
dxDriver
dxMap
dxCommonUtils
dxSystemBus
```

创建时：

1. CLI 要求所有默认基础组件都存在于 API 返回的最新组件列表中，缺少任何一个都会停止创建。
2. 如果最新组件列表中存在 `dxUi`，CLI 会自动把 `dxUi` 追加到新项目。
3. 扫码、人脸、MQTT、SQLite、UART 等其他组件不会因为服务端可用就自动全部加入；按需求和 SKU 通过 `dejaos edit` 或 `app.dxproj` 选择，再执行 `dejaos install`。
4. 这里记录的是当前 `dejaos new` 合同。实际生成的 `app.dxproj` 和 `dxmodules/` 仍是项目最终结果。

创建后至少检查：

- `app.dxproj.model` 是 API 返回的规范设备型号。
- 主型号、SDK ID 和组件与创建选择一致。
- `src/`、`resource/` 和 `dxmodules/` 已生成。
- 需求所需组件存在于 `app.dxproj` 和 `dxmodules/`。
- 请求功能符合真实 SKU。

不要绕过 `dejaos new` 手工拼装新项目。

## 现有项目

1. 读取 `app.dxproj`，把其中型号和组件作为候选信息。
2. 请开发者确认真实设备型号和 SDK。
3. 用 HTTP API 重新验证主型号、SDK 和组件。
4. 检查源码使用的硬件是否符合实际 SKU。
5. 执行：

   ```text
   dejaos install --project <project>
   ```

6. 把重新生成的 `dxmodules/*.js` 作为最终 API 合同。

可用以下命令交互修改型号、SDK 或组件：

```text
dejaos edit --project <project>
```

有意识地手工修改 `app.dxproj` 后，也必须重新执行 `dejaos install`。不要修改生成的 `dxmodules`。

## UI 字体

在项目中保存为：

```text
resource/font/font.ttf
```

中文对话、中文 UI 或需要中日韩字形时下载：

```text
https://raw.githubusercontent.com/DejaOS/DejaOS/main/tools/font_cn.ttf
```

英文对话且 UI 仅英文时下载：

```text
https://raw.githubusercontent.com/DejaOS/DejaOS/main/tools/font_en.ttf
```

要求：

- 使用原始文件 URL，不使用 GitHub HTML 页面。
- 以二进制方式下载。
- 验证文件存在且大小大于零。
- App 中使用 `/app/code/resource/font/font.ttf`。

## USB 设备

`dejaos connect` 的用途仅是验证设备是否通过 USB 连接到电脑：

```text
dejaos connect --project <project>
```

它会读取项目的 `app.dxproj.model` 选择连接协议，但不用于发现、识别或确认设备型号。

规则：

- 新项目必须先确认型号并创建项目，然后才能执行 `connect`。
- 执行设备变更前，先让开发者确认连接的是正确设备。
- 连接失败时报告 CLI 的原始错误，不绕过检查。

## 运行与日志

正常增量开发：

```text
dejaos run --project <project>
```

`run` 会连接、停止当前 App、同步变化文件并重新启动。

首次部署、增量状态失效或删除/资源同步异常时：

```text
dejaos sync --all --project <project>
dejaos start --project <project>
```

不要在每次小改动后默认使用 `--all`。

采集日志：

```text
dejaos logs --project <project>
```

日志会持续输出。使用执行环境的超时、后台进程或可终止会话，只采集有边界的启动窗口，然后停止日志命令。检查：

- 语法和模块加载错误
- 缺失资源或字体
- 错误的相对 import
- 未捕获异常和 Promise 拒绝
- Worker 错误（仅 2.0）
- 设备、UART、网络、SQLite、MQTT、HTTP 和人脸初始化失败
- 看门狗复位或反复重启

每次实质修改后重复：

1. 对照 `dxmodules` 做 API 检查。
2. 执行语法或静态检查。
3. USB 已确认时执行 `connect` 和 `run`。
4. 采集有边界日志。
5. 修复明显错误并重复。

成功运行且启动日志无明显错误属于真机冒烟验证，不等于所有业务功能已经验收。
