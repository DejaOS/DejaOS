<p align="right">
    <b>English</b>| <a href="./README_CN.md">中文</a>
</p>

<h1 align="center">dejaos_component</h1>

## Component Description
The components are used to assist business development, control hardware capabilities, and enhance development convenience.

## Viewing Source Code
The same component may be published in multiple versions. To inspect the implementation in a business project, select or identify the component your project depends on, then open the corresponding JavaScript source files under the `dxmodules` directory in that project.

## Component List
| Component | Name | Description |
| --- | --- | ---- |
| **<a href="./dxAlsa/dxAlsa.js" target="_blank">dxAlsaplay</a>** | Audio Component | Used to control the device speaker to play audio |
| **<a href="./dxBase64/dxBase64.js" target="_blank">dxBase64</a>** | Base64 Component | Used for Base64 encoding and decoding |
| **<a href="./dxCameraCalibration/dxCameraCalibration.js" target="_blank">dxCameraCalibration</a>** | Camera Calibration Component | Used to correct the focus of dual cameras |
| **<a href="./dxCapturer/dxCapturer.js" target="_blank">dxCapturer</a>** | Image Capturing Component | Used to control the camera for image capturing, suitable for QR code scanning scenarios. This component cannot be used alone and needs to be used with dxDecoder |
| **<a href="./dxCode/dxCode.js" target="_blank">dxCode</a>** | QR Code Recognition Component | Integrates dxCapturer and dxDecoder components for QR code recognition |
| **<a href="./dxCommon/dxCommon.js" target="_blank">dxCommon</a>** | Common Component | Integrates common and frequently used functions, such as obtaining hardware resource information, controlling hardware, encoding and decoding functions |
| **<a href="./dxConfig/dxConfig.js" target="_blank">dxConfig</a>** | Configuration Component | Used to manage configuration items |
| **<a href="./dxDecoder/dxDecoder.js" target="_blank">dxDecoder</a>** | Image Decoding Component | Used to decode images into text, suitable for QR code scanning scenarios. This component cannot be used alone and needs to be used with dxCapturer |
| **<a href="./dxEventCenter/dxEventCenter.js" target="_blank">dxEventCenter</a>** | Event Bus Component | Manages message publishing and subscription |
| **<a href="./dxFace/dxFace.js" target="_blank">dxFace</a>** | Face Recognition Component | Used for face recognition |
| **<a href="./dxGpio/dxGpio.js" target="_blank">dxGpio</a>** | GPIO Component | External circuit control component, used to manage external circuits (relay, lights, switches, etc.) |
| **<a href="./dxGpioKey/dxGpioKey.js" target="_blank">dxGpioKey</a>** | Keyboard Input Component | Senses GPIO external circuit input, used to listen to external circuit input actions (switches, keyboard keys, etc.) |
| **<a href="./dxHttp/dxHttp.js" target="_blank">dxHttp</a>** | HTTP Component | HTTP Client network protocol component |
| **<a href="./dxLogger/dxLogger.js" target="_blank">dxLogger</a>** | Logging Component | Unified log management |
| **<a href="./dxMap/dxMap.js" target="_blank">dxMap</a>** | Global Cache Component | Can be used for data synchronization in multi-threaded scenarios. It can also be used for caching data in a single thread |
| **<a href="./dxMqtt/dxMqtt.js" target="_blank">dxMqtt</a>** | MQTT Component | MQTT network protocol component |
| **<a href="./dxNet/dxNet.js" target="_blank">dxNet</a>** | Network Component | Manages device network status and parameters |
| **<a href="./dxNfc/dxNfc.js" target="_blank">dxNfc</a>** | Card Reader Component | Near Field Communication component, typically used to manage smart IC cards, chip cards, etc., both contactless and contact-based |
| **<a href="./dxNtp/dxNtp.js" target="_blank">dxNtp</a>** | Time Synchronization Component | Network time synchronization component, can specify frequency to obtain network time synchronization |
| **<a href="./dxOta/dxOta.js" target="_blank">dxOta</a>** | OTA Upgrade Component | OTA upgrade component |
| **<a href="./dxPwm/dxPwm.js" target="_blank">dxPwm</a>** | PWM Component | Pulse Width Modulation component, used to manage buzzers, fill lights, etc. |
| **<a href="./dxQueue/dxQueue.js" target="_blank">dxQueue</a>** | Queue Component | Thread notification component, can be used for multi-thread action notification in business scenarios |
| **<a href="./dxSqlite/dxSqlite.js" target="_blank">dxSqlite</a>** | Database Component | Used to manage CRUD operations for structured data |
| **<a href="./dxStd/dxStd.js" target="_blank">dxStd</a>** | System Functions Component | Includes functions for file reading and writing, system control, etc. |
| **<a href="./dxTcp/dxTcp.js" target="_blank">dxTcp</a>** | TCP Component | TCP Client network protocol component |
| **<a href="./dxTcpServer/dxTcpServer.js" target="_blank">dxTcpServer</a>** | TCP Server Component | TCP Server network protocol component |
| **<a href="./dxTouchKey/dxTouchKey.js" target="_blank">dxTouchKey</a>** | Button Listener Component | Used to listen to keyboard input |
| **<a href="./dxUart/dxUart.js" target="_blank">dxUart</a>** | Serial Port Component | Wired near field communication management component, covers reading and writing control of protocols such as TTL, RS232, RS485, Wiegand, USB, etc. |
| **<a href="./dxUi/dxUi.js" target="_blank">dxUi</a>** | UI Component | Used to draw screen UI |
| **<a href="./dxWatchdog/dxWatchdog.js" target="_blank">dxWatchdog</a>** | Watchdog Component | Timing abnormal reset component. In short, it will restart and reset the application within a specified time when the program encounters unknown issues (not business logic related issues) to ensure device availability |
| **<a href="./dxWebserver/dxWebserver.js" target="_blank">dxWebServer</a>** | Web Server Component | Web Server component |





