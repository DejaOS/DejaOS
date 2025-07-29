<p align="right">
    <b>English</b>| <a href="./README_CN.md">中文</a>
</p>

<h1 align="center">Deja OS</h1>

📒 Overview
-------------

**Introduction**

dejaOS is a JavaScript runtime environment designed for embedded devices, enabling low-cost, low-spec smart devices to run JavaScript code. It uses JavaScript as the development language, reducing costs and simplifying development. It make embedded application development easier. It has already shown excellent performance in various IoT scenarios.

**Technical Background**

dejaOS is built on the foundations of Mip/ARMLinux, QuickJS, and LVGL, enhancing development efficiency while maintaining high runtime performance.

- `Mip/ARMLinux`：Embedded Linux with system processes, threads, and resource scheduling capabilities.
- `Quickjs`：A compact and fast JavaScript engine that supports the ES2020 standard.
- `LVGL`：The most popular free open-source embedded graphics library, allowing easy creation of beautiful UIs using C, while dejaOS enables development with JavaScript.

**Rich Features** 

dejaOS provides a comprehensive set of [JavaScript Module](./src/README.md), including:

- `Hardware Interface Module`: GPIO, PWM, UART, RS-485, RS-232, USB, Wiegand, Watchdog, Capturer, ALSA, NFC, QRCode, BLE, Face Recognition, etc.
- `Networking and Communication Protocol Module`: Net, TCP, TCP Server, MQTT, UDP, HTTP, Web Server, OSDP, etc.
- `Graphics Module`: Supports drawing GUI screens using JavaScript, compatible with all LVGL native capabilities.
- `Utility Module`: Threads, encryption/decryption, logging, EventBus, NTP, SQLite, etc.
- `Third-Party Module`: Supports using pure JavaScript third-party module with import (ESM).
- `Native C Library Support`: Allows development through embedded native C libraries wrapped in JavaScript.

🚀 Development Process
-------

The development process for dejaOS app is as follows:

**Prepare Development Environment**

- Software Environment: Install Node.js (20+), VSCode, and [DejaOSIDE (VSCode plugin)](https://marketplace.visualstudio.com/items?itemName=dxide.dxide) on your computer.
- Hardware Environment: Currently, dejaOS is compatible with various smart devices primarily based on Ingenic and EeasyTech chips, with more being added continuously.

**Prepare the Device**

1. Purchase a development device.
2. Connect the development device to VSCode using a USB cableConnect the development device to VSCode using a USB cable.

**Quick Start**

- Write your [first application](https://dejaos.com/docs/basics/quick-start) in JavaScript code on VSCode, sync to the device in real time to see the effect, and view the run log on VSCode.

**Build and Publish**

1. Purchase production devices.
2. Build a `DPK` installation package in VSCode.
3. Use the [DPK installation tool]() to install it on the production devices via serial connection.

🤖 Project structure
-------

The main body of the project consists of five parts, as follows:

| File | Required | Function |
|-------|-------|------|
| .temp | NO | Store temporary files |
| dxmodules | NO | Store dependent files |
| src | YES | Project logic |
| main.js | YES | Project entry file | 
| app.dxproj | YES | Project configuration file |

For a complete description of the project structure, please refer to [Introduction to dejaOS Project Structure](https://dejaos.com/docs/basics/project)


🤝 Services
If you have any questions,contact us  service@dxiot.com and let us know how we can help.
