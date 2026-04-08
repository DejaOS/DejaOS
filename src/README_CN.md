<p align="right">
    <a href="./README.md">English</a>| <b>中文</b>
</p>

 <h1 align="center">dejaos_component</h1>

## 组件描述
组件用于辅助业务开发、用于控制硬件能力，增强业务开发便利性.

## 查看源码
同一组件往往存在多个发布版本。若要在业务工程中阅读实现细节，只需在工程里选中（或确认所依赖的）目标组件，再到该工程下的 `dxmodules` 目录中打开对应组件的 JavaScript 源码文件即可。

## 组件列表
| 组件 | 名称  | 描述 |
| --- | --- | ---- |
| **<a href="./dxAlsa/dxAlsa.js" target="_blank">dxAlsaplay</a>** | 音频组件 | 用于控制设备喇叭播放音频组件 |
| **<a href="./dxBase64/dxBase64.js" target="_blank">dxBase64</a>** | base64组件 | 用于base64加解码 |
| **<a href="./dxCameraCalibration/dxCameraCalibration.js" target="_blank">dxCameraCalibration</a>** | 摄像头标定组件 | 用于矫正双摄焦点 |
| **<a href="./dxCapturer/dxCapturer.js" target="_blank">dxCapturer</a>** | 取图组件 | 用于控制摄像头进行图像捕捉，适用于扫码场景，该组件目前不支持单独使用，需结合dxDecoder一起使用 |
| **<a href="./dxCode/dxCode.js" target="_blank">dxCode</a>** | 扫码识别组件 | 整合dxCapturer和dxDecoder组件，用于扫码识别文本 |
| **<a href="./dxCommon/dxCommon.js" target="_blank">dxCommon</a>** | common组件 | 用于集成较为通用且常用的函数组件，比如获取硬件设备的资源信息，以及包含硬件的控制函数，还有加解码等函数 |
| **<a href="./dxConfig/dxConfig.js" target="_blank">dxConfig</a>** | 配置组件 | 用于管理配置项 |
| **<a href="./dxDecoder/dxDecoder.js" target="_blank">dxDecoder</a>** | 图像转码组件 | 用于图像识别转为文本，适用于扫码场景，该组件目前不支持单独使用，需结合dxCapturer一起使用 |
| **<a href="./dxEventCenter/dxEventCenter.js" target="_blank">dxEventcent</a>** | Event bus组件 | 管理消息的发布和订阅 |
| **<a href="./dxFace/dxFace.js" target="_blank">dxFace</a>** | 人脸识别组件 | 用于人脸识别 |
| **<a href="./dxGpio/dxGpio.js" target="_blank">dxGpio</a>** | gpio组件 | 外部电路控制组件，用于管控外部电路（继电器，灯，开关，等） |
| **<a href="./dxGpioKey/dxGpioKey.js" target="_blank">dxGpio_key</a>** | 键盘输入组件 | 感知GPIO外部电路输入组件，用于监听外部电路的输入动作（开关、按键键盘等） |
| **<a href="./dxHttp/dxHttp.js" target="_blank">dxHttp</a>** | http组件 | HTTP Client网络协议组件 |
| **<a href="./dxLogger/dxLogger.js" target="_blank">dxLogger</a>** | 日志组件 | 统一日志管理 |
| **<a href="./dxMap/dxMap.js" target="_blank">dxMap</a>** | 全局缓存组件 | 业务场景涉及多线程数据同步时可以使用dxMap，当然同一线程的缓存数据也可以使用dxMap |
| **<a href="./dxMqtt/dxMqtt.js" target="_blank">dxMqtt</a>** | mqtt组件 | MQTT网络协议组件 |
| **<a href="./dxNet/dxNet.js" target="_blank">dxNet</a>** | 网络组件 | 网络组件，用于管控设备网络状态及其参数 |
| **<a href="./dxNfc/dxNfc.js" target="_blank">dxNfc</a>** | 刷卡组件 | 近场通讯组件，通常用于管理智能IC卡、芯片卡等非接触式和接触式智能卡 |
| **<a href="./dxNtp/dxNtp.js" target="_blank">dxNtp</a>** | 时间同步组件 | 网络同步时间组件，基于该组件可以指定频率向网络获取时间同步 |
| **<a href="./dxOta/dxOta.js" target="_blank">dxOta</a>** | OTA升级组件 | OTA升级组件 |
| **<a href="./dxPwm/dxPwm.js" target="_blank">dxPwm</a>** | pwm组件 | 脉冲宽度调度组件，用于管理蜂鸣器、补光灯等 |
| **<a href="./dxQueue/dxQueue.js" target="_blank">dxQueue</a>** | 队列组件 | 线程通知组件，业务场景涉及多线程动作通知时可以使用dxQueue |
| **<a href="./dxSqlite/dxSqlite.js" target="_blank">dxSqlite</a>** | 数据库组件 | 用于管理结构化数据增删改查组件 |
| **<a href="./dxStd/dxStd.js" target="_blank">dxStd</a>** | 系统函数组件 | 组件包含了一些文件读写，系统控制等函数 |
| **<a href="./dxTcp/dxTcp.js" target="_blank">dxTcp</a>** | tcp组件 | TCP Client网络协议组件 |
| **<a href="./dxTcpServer/dxTcpServer.js" target="_blank">dxTcpServer</a>** | tcpServer组件 | TCP Server网络协议组件 |
| **<a href="./dxTouchKey/dxTouchKey.js" target="_blank">dxTouchKey</a>** | 按键监听组件 | 用于监听键盘输入 |
| **<a href="./dxUart/dxUart.js" target="_blank">dxUart</a>** | 串口组件 | 有线近场通讯管理组件，涵盖TTL、RS232、RS485、韦根、USB等协议的读写控制 |
| **<a href="./dxUi/dxUi.js" target="_blank">dxUi</a>** | UI组件 | 绘制屏幕UI |
| **<a href="./dxWatchdog/dxWatchdog.js" target="_blank">dxWatchdog</a>** | 看门狗组件 | 定时异常复位组件，简单说就是当程序出现未知问题时（并非业务逻辑未知问题），会在指定时间重启复位应用，保证设备可用性 |
| **<a href="./dxWebserver/dxWebserver.js" target="_blank">dxWebServer</a>** | webServer组件 |  |
