<p align="right">
    <a href="./README.md">English</a>| <b>中文</b>
</p>

 <h1 align="center">Deja OS</h1>


📒 概况与总览
-------------

**概述**

dejaOS 是一个针对嵌入式设备的 JavaScript 运行时环境，使低配置、低成本的智能设备能够运行 JavaScript 代码。它使用 JavaScript 作为开发语言，减少开发成本，降低开发难度，愿景是让嵌入式应用开发变得更加简单。dejaOS 已经在许多IoT场景中表现出色。

**技术背景** 

dejaOS 以Mip/ARMLinux、Quickjs、LVGL为基础框架支撑，提高开发效率的同时，保有超高的运行效率。

- `Mip/ARMLinux`：嵌入式Linux，系统进程、线程、资源调度能力
- `Quickjs`：支持 ES2020规范，且小巧快速的JS引擎
- `LVGL`：LVGL 是最流行的免费开源嵌入式图形库，可以使用 C 轻松绘制漂亮的UI，dejaOS可以使用 JavaScript 

**功能丰富** 

dejaOS 提供了丰富的 [JavaScript 库](./src/README_CN.md)支持，包含：

- `硬件接口库`：GPIO、PWM、UART、RS-485、RS-232、USB、Wiegand、Watchdog、Capturer、ALSA、NFC、QRCode、BLE、人脸识别等
- `网络与通信协议库`：Net、TCP、TCP Server、MQTT、UDP、HTTP、Web Server、OSDP等
- `图形库`：支持用 JavaScript 绘制屏幕 GUI，并兼容所有 LVGL 原生能力
- `工具库`：线程、加解密、日志、EventBus、NTP、SQLite 等
- `第三方库`：支持 `import` 使用纯 JavaScript 的第三方库（ESM 方式）
- `原生 C 库支持`：支持通过植入原生 C 库，用 JS 包装的方式进行开发

🚀 开发流程
-------

开发 dejaOS 应用的流程如下：

**开发环境准备**

- 软件环境：电脑上安装 Nodejs(20+),VSCode, [DXIDE(VSCode plugin)](https://marketplace.visualstudio.com/items?itemName=dxide.dxide)
- 硬件环境：目前 dejaOS 适配多款以Ingenic、EeasyTech为主芯片的智能设备，还在持续增加中

**设备准备**

1. 购买开发设备
2. USB 线连接 VSCode 和设备

**快速上手**

- 在 VSCode 上使用 JavaScript 代码编写您的[第一个应用程序](./docs/demo_CN.md)，实时同步到设备上查看效果，在 VSCode 上查看运行日志

**Build和发布**

1. 购买生产设备
2. 在 VSCode 上 build 成 DPK 安装包
3. 使用 [DPK 安装工具]()通过串口线安装到生产设备上

🤖 项目结构
-------

项目主体由五个部分组成，如下：

| 文件 | 必须 | 作用 |
|-------|-------|------|
| .temp | 否 | 存放临时文件 |
| dxmodules | 否 | 存放依赖文件
| src | 是 | 项目逻辑
| main.js | 是 | 项目入口文件
| app.dxproj | 是 | 项目配置文件

完整项目结构说明请参考 [dejaOS 项目结构介绍](./docs/project_CN.md)

▶️ 学习 dejaOS
---------------

此列表将指导您逐步开始了解 dejaOS.

**文档介绍** 
- [dejaOS 介绍](docs/introduction_CN.md)
- [如何安装 dejaOS](docs/install_CN.md)
- [dejaOS 配套设备介绍](docs/devices_CN.md)
- [dejaOS 的 JavaScript 引擎介绍](docs/quickjs_CN.md)
- [dejaOS 的 GUI 引擎介绍](docs/lvgl_CN.md)
- [dejaOS 的 module 介绍](docs/module_CN.md)
- [DXIDE 的介绍](docs/dxide_CN.md)
- [dejaOS 项目结构介绍](docs/project_CN.md)
- [dxLogger 及调试介绍](docs/logger_CN.md)
- [应用打包、安装和升级](docs/app_CN.md)
- [dejaOS 系统模式介绍](docs/mode_CN.md)

**多线程(worker)**
- worker的概念
- 异步操作
- eventbus介绍
- dxmap和dxqueue介绍
- 线程池介绍

**GUI 介绍**
- gui的基本概念
- gui和其它线程通信
- dxui组件的介绍
- ui的几个基本示例

**文件操作**
- 设备内的文件体系
- 文本文件的读写
- 二进制文件的读写

**硬件接口**
- gpio介绍
- pwm介绍
- uart介绍
- 二维码介绍
- NFC介绍
- 蓝牙介绍
- 音频介绍

**网络接口及协议**
- 网络类型介绍
- TCP模块介绍
- UDP模块介绍
- HTTP模块介绍
- MQTT模块介绍

**数据库及杂项**
- sqlite介绍及基本使用
- 看门狗介绍
- 时间同步介绍

**module开发介绍**

🤝 服务
-------

如有任何问题，联系我们 service@dxiot.com ，告诉我们如何提供帮助.

