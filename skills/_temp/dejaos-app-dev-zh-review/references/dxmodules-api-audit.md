# dxmodules API 审查

## 权威顺序

1. 目标项目安装后生成的 `dxmodules/*.js`
2. 目标项目 `app.dxproj` 中的组件名和版本
3. 本 Skill 内置的同 SDK 快照或示例
4. 通用架构说明

低优先级资料不得覆盖项目本地包装器。

## 安装后检查

执行：

```text
dejaos install --project <project>
```

然后：

1. 确认 `app.dxproj` 的每个组件都有对应包装器。
2. 确认 App 每个 `dxmodules` import 都指向存在的文件。
3. 不修改生成文件。

## 逐调用检查

对每个包装器：

1. 找出默认导出和命名导出。
2. 搜索 App 中对该模块的所有调用。
3. 确认函数、类和成员名完全一致。
4. 确认参数顺序、数量、类型、默认值和超时单位。
5. 确认返回值是同步值、Promise 还是无返回。
6. Promise 必须 `await`、返回给上层或显式处理拒绝。
7. 确认返回对象字段和错误形态。
8. 确认事件名称、回调参数和取消订阅方法。
9. 确认初始化依赖、重复初始化限制和销毁方法。
10. 确认常量来自正确导出，不能手写猜测值。

可用搜索：

```text
rg -n "export default|export const|export function|export class" <project>/dxmodules/<module>.js
rg -n "<module>\\.|new <Class>" <project>/src
rg -n "async |await |\\.then\\(|\\.catch\\(" <project>/src
rg -n "from ['\"].*dxmodules/" <project>/src
```

## SDK 差异检查

SDK 2.0：

- Worker 创建必须由已安装 `dxEventBus` 支持。
- 检查 topic、载荷、请求响应和超时。
- 不把 4.0 Promise 示例直接用于 2.0 包装器。

SDK 4.0：

- 搜索并拒绝任何 Worker 创建。
- 搜索直接 `dxSystemBus` import；普通 App 中不允许。
- 搜索未等待 Promise。
- 搜索订阅后没有 `off` 或取消函数的监听器。
- 搜索客户端、数据库或组件缺少销毁。

## 常见错误

- 示例中有 `openDoor()`，项目包装器实际没有该函数。
- 把另一个版本的同步返回当成当前版本 Promise，或反之。
- 默认导出和命名导出混用。
- 事件名拼写正确但当前版本没有该事件。
- 把组件支持误认为设备安装了对应选配硬件。
- 把本 Skill 快照文件复制进项目 `dxmodules`。
- 修改包装器让错误业务代码“能运行”。

## 完成标准

只有以下内容都有证据时，才能说 API 静态检查通过：

- 所有包装器文件存在。
- 所有使用的导出存在。
- 所有成员调用存在。
- 参数和返回形态已核对。
- 初始化和清理已核对。
- SDK 专属架构检查通过。

静态通过不等于真机通过，仍需执行 `dejaos run` 和有边界日志检查。
