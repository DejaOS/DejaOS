<p align="right">
    <b>English</b>| <a href="./introduction_CN.md">中文</a>
</p>

# Introduction to dejaOS

DejaOS is a JavaScript runtime environment designed for embedded devices, based on QuickJS as the JavaScript engine, capable of running on resource-constrained devices. It uses LVGL as the graphics engine, suitable for devices with screens. By importing various JavaScript modules, dejaOS Apps enable efficient collaboration among the device's various modules. Additionally, dejaOS provides a Visual Studio Code plugin, making it convenient for developers to write, debug, and test JavaScript programs.

The design intent of dejaOS is to simplify the embedded development process, not only aiming to make it easier for embedded developers but also hoping to attract more application developers to this field. Currently, firmware development for embedded devices is often not user-friendly for application developers, mainly reflected in the following aspects: first, development languages and environments are usually C/C++, which many application developers are not familiar with; second, embedded device development typically requires considerable hardware knowledge and skills.

However, the number of application developers far exceeds that of embedded developers. If these developers can easily develop embedded devices just like developing business applications, the rapid development of the Internet of Things (IoT) will be just around the corner. dejaOS aims to fill this gap and promote the popularization and innovation of embedded development.

# OS 和 App
dejaOS can be considered an operating system based on embedded Linux, enhanced with the capability to run JavaScript applications. Its mechanism is similar to that of Android and iOS, and the development process is also comparable:

1. Code is developed in an IDE and synchronized to the device via USB for execution and debugging.
2. It is built into an application installation package; Android installation packages are .apk, while dejaOS installation packages are .dpk.
3. Android apps can be published to app markets, allowing users to download them from the market or install them via certain PC tools. Currently, dejaOS provides installation tools for installing apps from a computer to other devices, with plans to offer an app market in the future.

Differences Between dejaOS and Mobile Operating Systems + Apps: 
1. dejaOS can run on devices with very low hardware specifications, requiring a minimum storage of about 5MB and a minimum memory of around 2MB; if there is no screen, the requirements can be even lower.
2. Due to hardware limitations, only one app can be installed and run at a time; however, with slightly higher specifications, it is feasible to run multiple apps.
3. Due to hardware limitations, dejaOS does not have its own user interface, unlike Android, which allows for many operations directly through its interface.
4. Due to hardware limitations, dejaOS has different release for different devices since it cannot bundle all necessary drivers like mobile operating systems.

# Architecture
## Runtime
![alt text](image/intro1.png)

The runtime structure of the device application can be divided into the following four layers, as shown in the diagram above: 

- **Operating System Layer** 
This layer is a custom embedded Linux system, providing foundational support for device operations.

- **Module Layer**
This layer contains multiple modules, each responsible for a specific function and offering a corresponding JavaScript API. Modules include .js files and their associated driver libraries (.so files), while some modules contain only .js files. Different applications can select modules as needed.

- **Engine Layer**
The engine layer consists of a JavaScript engine (based on QuickJS) and a GUI engine (based on LVGL). The JavaScript engine handles parsing and executing JavaScript code for applications, while the GUI engine provides graphical interface support.

- **Application Layer**
This layer consists of business applications developed in JavaScript. At runtime, the JavaScript engine parses and executes the application's .js code, calling functions in the .so files from the module layer to implement various functionalities.

## Development
![alt text](image/intro2.png)

When developing applications for the device, VSCode and the development device work together via USB connection and data communication. A plugin installed in VSCode coordinates with a debugging application running on the device. Through this plugin, developers can sync source code to the device in real time, control application start and stop, and receive real-time logs from the device back in VSCode, streamlining development and debugging.

# Code Sample
Let's look at a simple example. For instance, if our device supports QR code scanning, we place a QR code in front of the device, allowing it to recognize the content within the QR code and respond accordingly:

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

The example is quite simple overall:

1. `import` modules, here four moduels are used:
    - dxLogger.js: for logging
    - dxStd.js: base system module, used for polling in this example
    - dxEventBus.js: event module, used for subscribing to the event after successfully scanning the QR code in this example
    - dxCode.js: module for camera recognition and decoding of QR codes, which also supports barcodes

2. Initialize the device's camera for QR code recognition; different devices may have different initialization parameter values.
3. Subscribe to the event of successful QR code recognition and register a callback function.
4. Handle the content of the QR code in the callback function; this example simply prints the content of the QR code.
5. Polling to attempt to retrieve the results recognized by the camera.

To run this code on the device, simply connect the device to your computer via USB, then use the VSCode plugin to sync the code to the device and run it.