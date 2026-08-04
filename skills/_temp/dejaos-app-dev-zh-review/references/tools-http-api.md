# DejaOS Tools HTTP API

## 目录

- 基础约定
- 查询链路
- 设备型号
- SDK
- 最新组件
- 组件版本
- 判定规则
- 内置脚本

## 基础约定

基础地址：

```text
http://tools.dxiot.com
```

成功响应应满足：

```text
response.code === 1
response.data.content 是数组
```

请求参数必须进行 URL 编码。正式 Skill 不依赖任何维护者本地 CLI 源码；本文件和内置脚本已携带所需合同。

## 查询链路

```text
用户设备型号
  -> deviceModel
  -> mainDeviceModel（为空则使用 deviceModel）
  -> SDK 列表
  -> 与 2.0 或 4.0 匹配的 sdkId
  -> 最新组件列表
```

主型号仅用于 SDK 和组件查询。真实 SKU 仍由 `deviceModel` 决定。

## 设备型号

```http
GET /dxdop/webadmin/componentDeviceModel/findAllFlat?page=1&size=100
```

关键字段：

- `deviceModel`：规范设备型号
- `mainDeviceModel`：SDK/组件查询使用的主型号
- `soc`
- `subModel`：是否子型号

匹配顺序：

1. 与输入完全相等。
2. 完全匹配失败后，进行不区分大小写的相等匹配。
3. 写入项目和后续输出时使用服务端返回的规范拼写。

## SDK

```http
GET /dxdop/webadmin/sdk/findAll?page=1&size=100&deviceModel={mainDeviceModel}
```

SDK 版本匹配时：

1. 去掉首部 `sdk` 或 `v`，不区分大小写。
2. 与 `2.0` 或 `4.0` 比较。
3. SDK `3.0` 直接拒绝。

关键字段：

- `id`：后续查询使用的 `sdkId`
- `sdkVersion`、`version` 或服务端实际版本字段
- `deviceModel`

## 最新组件

```http
GET /dxdop/webadmin/sdkComponent/findPageLatest?page=1&size=1000&sdkId={sdkId}
```

返回的 `content` 必须为非空数组。记录组件名称、版本、下载信息及服务端返回的其他标识。

该接口返回所选 SDK 当前发布的全部可用组件，不等于 `dejaos new` 会默认安装全部组件。CLI 从中选择 SDK 对应的基础组件，并在存在 `dxUi` 时追加它。默认选择规则见 `references/dejaos-cli-workflow.md`。

## 组件版本

查询一个组件的全部版本：

```http
GET /dxdop/webadmin/sdkComponent/findVersions?page=1&size=1000&sdkId={sdkId}&componentName={componentName}
```

查询最新一项时可将 `size` 设为 `1`，但必须按服务端排序语义核对结果。

## 判定规则

以下任一情况都按当前查询判定为“不支持所选 SDK”，停止创建或修改依赖该 SDK 的代码：

- HTTP 请求报错
- 响应结构不符合合同
- 找不到设备型号
- 找不到目标 SDK
- 最新组件列表为空

报告具体阶段和原始错误，便于维护者后续手工调整。不得从另一型号或另一 SDK 猜测组件清单。

对于 SDK 4.0，明确告诉开发者：“当前查询结果表明该型号不支持 SDK 4.0。”

## 内置脚本

执行：

```text
node <skill>/scripts/resolve-device-sdk.mjs <deviceModel> <2.0|4.0>
```

成功时输出 JSON，包括：

- `supported`
- `deviceModel`
- `mainDeviceModel`
- `soc`
- `subModel`
- `sdkVersion`
- `sdkId`
- `componentCount`
- `components`
- `defaultDataRoot`

失败时输出 `supported: false`、阶段、原因和错误信息，并返回非零退出码。
