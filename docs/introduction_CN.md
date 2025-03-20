<p align="right">
    <a href="./introduction.md">English</a>| <b>中文</b>
</p>

# dejaOS 介绍
dejaOS 是一个针对嵌入式设备的 JavaScript 运行时环境，基于 QuickJS 作为 JavaScript 引擎，能够在资源配置低的设备上运行. 同时，它使用 LVGL 作为图形引擎，适用于带屏幕的设备. 通过 `import` 各种JavaScript 库，dejaOS App 使得设备的各个模块能够高效协同工作. 此外，dejaOS 提供了 Visual Studio Code 插件，方便开发者编写、调试和测试 JavaScript 程序.

dejaOS 的设计初衷是简化嵌入式开发过程，不仅希望让嵌入式开发人员能够更加轻松地进行开发，更希望吸引更多应用开发者参与这一领域. 当前，嵌入式设备的固件开发对于应用开发者来说往往不够友好，主要体现在以下几个方面：首先，主流的开发语言和环境通常是 C/C++，而许多应用开发者对这些语言并不熟悉；其次，嵌入式设备开发通常需要较多的硬件知识和技能.

然而，应用开发者的数量远远超过嵌入式开发人员. 如果能够让这些开发者像开发业务应用一样，轻松地开发嵌入式设备，那么物联网的快速发展将指日可待. dejaOS 旨在填补这一空白，推动嵌入式开发的普及与创新.

# OS 和 App
dejaOS 可以被视为一种操作系统，基于嵌入式 Linux，并增加了 JavaScript 应用程序的运行能力。其机制与 Android 和 iOS 类似，开发流程也相似：

1. 在 IDE 中开发代码，通过 USB 线同步到设备进行运行和调试。
2. 构建成应用程序安装包，Android 的安装包文件是 .apk，而 dejaOS 的安装包文件是 .dpk。
3. Android 应用可以发布到应用市场，用户可以从市场下载安装，也可以通过一些 PC 工具从电脑上安装到手机上。目前，dejaOS 提供了安装工具，允许从电脑安装到其他设备，未来也会提供应用市场。

dejaOS 与手机操作系统及应用的差异：
1. dejaOS 可以运行在配置非常低的设备上，最低存储需求约为 5MB，最低内存约为 2MB；如果不带屏幕，配置要求可以更低。
2. 由于配置限制，dejaOS 仅允许安装一个应用程序，并且仅允许同时运行一个。如果配置稍高，实际上也可以运行多个应用。
3. 由于配置限制，dejaOS 没有自己的操作界面，不像 Android 操作系统可以方便地在操作系统的界面上进行多项操作。
4. 由于配置限制，dejaOS 针对不同设备有不同版本，无法像手机操作系统那样将所有适配的驱动程序包含在内。

# 基本架构
## 运行时
![alt text](image/intro1.png)

设备应用的运行时结构可分为以下四层，如上图所示: 

- **操作系统层** 
该层为嵌入式定制的 Linux 系统，为设备运行提供基础支持。

- **模块层**
这一层包含多个模块，每个模块负责实现特定功能，并提供相应的 JavaScript API。模块包括 .js 文件和对应的驱动库 .so 文件，有些模块仅包含 .js 文件。不同的应用可以按需求选择不同的模块。

- **引擎层**
引擎层包括 JavaScript 引擎（基于 QuickJS）和 GUI 引擎（基于 LVGL）。JavaScript 引擎负责解析和执行应用的 JavaScript 代码，而 GUI 引擎提供图形界面支持。

- **应用层**
这一层是用 JavaScript 开发的业务应用。在运行时，JavaScript 引擎解析并执行应用的 .js 代码，调用模块层的 .so 文件函数来实现各种功能。


## 开发时
![alt text](image/intro2.png)
开发设备应用时，VSCode 和开发设备通过 USB 连接，并通过数据通信协同工作。VSCode 中安装有一个插件，设备中则运行调试应用，二者配合使用。通过该插件，开发者可以实时将源码同步到设备上，控制应用的启动和停止，同时设备运行产生的日志也会实时回传到 VSCode 中，便于开发和调试。

# 源码示例
我们来看一个简单示例，比如我们的设备支持二维码扫描，我们把二维码放在设备前，让设备识别出二维码里的内容，根据内容来做相应的处理

``` js
import log from '../dxmodules/dxLogger.js'
import std from '../dxmodules/dxStd.js'
import bus from '../dxmodules/dxEventBus.js'
import code from '../dxmodules/dxCode.js'
import common from '../dxmodules/dxCommon.js'

//1. init qrcode module:dxCode
code.worker.beforeLoop({ id: 'capturer1', path: '/dev/video11' }, { id: 'decoder1', name: "decoder v4", width: 800, height: 600 })
//2. subscribe qrcode event:device scaned the qrcode and fire an event
bus.on(code.RECEIVE_MSG, function (data) {
    //3. handle the event
    let str = common.utf8HexToStr(common.arrayBufferToHexString(data))
    log.info(str)
})

std.setInterval(() => {
    try {
        //4. try to retrieve the scan results every 50 milliseconds.
        code.worker.loop()
    } catch (error) {
        log.error(error)
    }
}, 50)
```
示例总体上非常简单：
1. `import` 标准库，这里用到了4个库:
    - dxLogger.js :用于打印日志
    - dxStd.js :基础系统库，在这个示例里用于轮询
    - dxEventBus.js: 事件库，在这个示例里用于订阅扫描二维码成功后的事件
    - dxCode.js: 摄像头识别并解析二维码的库，这个库同时也支持条形码
2. 初始化设备的摄像头用于识别二维码，不同的设备初始化的参数值可能有差异
3. 订阅识别二维码成功的事件，并注册一个回调函数
4. 在回调函数里处理二维码的内容，这个示例只是打印了二维码内容
5. 轮询去尝试获取摄像头识别出二维码的结果

如果期望在设备上运行这段代码，只需要在自己的电脑上通过 USB 线连上设备，然后在 VSCode 上通过插件把代码同步到设备，并运行