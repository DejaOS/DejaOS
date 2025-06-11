<p align="right">
    <b>English</b>| <a href="./app_CN.md">中文</a>
</p>


# Application Packaging, Installation, and Upgrade

## Overview

After development is complete, dejaOS applications need to be packaged and installed on other devices. Taking DW200 as an example (other devices are similar or the same), the typical process is as follows:

1. Purchase a small number of DW200 development devices, possibly only one. Develop your own JavaScript code, debug and test until the expected requirements are met, then package the application.
2. Purchase multiple DW200 production devices and install the packaged application on these devices.

There are differences in packaging, installation, and upgrade between `DejaOS1.0` and `DejaOS2.0`. We will address them separately. (DejaOS1.0 is a much older version; currently sold devices are all DejaOS2.0.)

> How to check the DejaOS version?
> - Use the `dejaos_tools` tool to connect to the device and check its version. If the connection is successful and information is retrieved, it is DejaOS2.0. If it cannot connect or retrieve information, it is DejaOS1.0.

## DejaOS2.0

### Application Packaging

For DejaOS2.0, packaging can be done using the DejaOS plugin in VScode. Refer to the screenshot below:

![alt text](image/app_dpk.png)

### Application Installation

Application installation is a built-in feature supported by the DejaOS system. No additional application logic is required. Both development and production devices support it.

- RS485 + dejaos_tools ([Click to download](../tools/tools.zip))

### Application Upgrade

Application upgrade refers to the application’s own built-in upgrade capabilities. A self-upgrade feature allows seamless integration into the application. For example, our access control standard application supports MQTT and QR code scanning; therefore, we support upgrades via MQTT control and QR scanning. This is why we strongly recommend implementing upgrade capabilities in your own applications. You can use the [dxOta](/src/dxOta/dxOta.js) component and refer to the [GitHub repository](https://github.com/duoxianwulian/DejaOS/tree/main/demos/dw200/dw200_update_new) to implement application upgrades.

- DejaOS2.0 application upgrades use the `dxOta.updateHttp` or `dxOta.updateFile` methods to place the file in a specific upgrade path via HTTP or a file path. DejaOS2.0 handles unzipping and completes the upgrade process.

> Note: The upgrade package and installation package are the same file. "Installation" and "Upgrade" are used to distinguish whether the application is initially flashed or updated.

### Development to Production

After completing application development on the development device, production devices need to be procured. Unless otherwise specified, production devices are shipped with the official standard applications by default. The upgrade capabilities of these standard applications follow the principles below:

- Access control standard devices support MQTT upgrade
- QR code scanning devices support QR scan upgrade
- Reader standard devices support RS485 or USB wired upgrade

The upgrade methods may be combined depending on the version. For example, a QR-code access control standard device supports both QR scan and MQTT upgrades. If you have any questions at this stage, please contact official support.

There is currently no formal documentation for the upgrade process of standard applications (MQTT / QR Scan / RS485). Please contact official support for assistance.

<br>
<br>

## DejaOS1.0

### Application Packaging

Packaging in DejaOS1.0 must be done manually. Compress the project's `dxmodules` directory, `src`, and any other custom directories into a zip file. Refer to the screenshot below:

![alt text](image/app_zip1.png)

### Application Installation

- None

### Application Upgrade

- DejaOS1.0 applications can be upgraded using the `dxOta.update` method. Place the `zip` upgrade package at `/ota/download.zip`. `dxOta.update` will handle unzipping and complete the upgrade.

- Alternatively, place the `zip` upgrade package at `/app/data/upgrades/APP_1_0.zip`. After reboot, DejaOS1.0 will automatically unzip and complete the upgrade.

> Note: DejaOS1.0 users can continue using their existing upgrade methods. Each OS version supports upgrades from the previous version. It is recommended that DejaOS1.0 users contact official support to upgrade to DejaOS2.0. (Long-term use of DejaOS1.0 is not recommended, as official support and maintenance for it are being gradually phased out.)
