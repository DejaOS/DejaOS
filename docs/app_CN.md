<p align="right">
    <a href="./app.md">English</a>| <b>中文</b>
</p>

# 应用打包、安装和升级
## 概述

dejaOS 的应用在开发完成后需要打包并安装到其他设备上。以 DW200 为例（其他设备类似或相同），通常过程如下：

1. 购买少量的 DW200 开发设备，可能只有一台，开发自己的 JavaScript 代码，进行开发和调试，直到完成预期的需求，然后打包应用。
2. 购买多个 DW200 生产设备，将打包好的应用安装到这些设备上。


`DejaOS1.0` 和 `DejaOS2.0`的打包、安装和升级都有差异，我们分开来看（DejaOS1.0是很久远的版本，目前近期售卖的设备都是DejaOS2.0）。

> 如何查询DejaOS版本?
> - 使用`dejaos_tools`工具连接设备，查询设备版本，如果连接成功能查询到信息，则是DejaOS2.0。如果无法连接或者查询不到信息，则是DejaOS1.0。

## DejaOS2.0
### 应用打包
DejaOS2.0打包可以使用VScode中DejaOS插件完成，参考如下截图：

![alt text](image/app_dpk.png)


### 应用安装
应用安装是DejaOS系统支持的功能，不需要额外的应用实现，DejaOS开发设备和生产设备都支持。

- RS485 + dejaos_tools  ([点击下载](tools/tools.zip))



### 应用升级
应用升级，是开发应用中自己具备的升级能力，自升级能力可以很好的贴合自己的应用，比如我们门禁标品的应用中具备mqtt和扫码功能，我们支持mqtt控制升级、扫码升级，所以应用升级能力建议必须具备的，客户自主开发的应用可以使用[dxOta](/src/dxOta/dxOta.js)组件，参照[GitHub](https://github.com/duoxianwulian/DejaOS/tree/main/demos/dw200/dw200_update_new)。完成应用升级。

- DejaOS2.0应用升级使用`dxOta.updateHttp`或`dxOta.updateFile`方法，通过http方式或指定文件路径方式，将文件放到指定的升级路径，DejaOS2.0负责解压完成升级

> 注：升级包和安装包是同一个文件，`安装` 和 `升级` 用于区分有无应用的烧录应用方式。



### 开发转生产
完成开发设备的应用开发后，需要采购生产设备时，如没有额外要求，生产设备发货默认带有官方标品应用的设备，标品应用升级能力遵循一下原则：
- 门禁标品设备具备mqtt升级能力
- 扫码设备具备扫码升级能力
- 读头标品设备具备RS485或USB有线升级能力

以上升级能力根据版本不同会有叠加效果，比如扫码门禁标品，会同时具备扫码升级和MQTT升级，如果此步骤存在疑问，可联系官方人员。

标品应用（mqtt/扫码/RS485）升级流程暂时没有文档描述，可以联系官方人员获取。




<br>
<br>


## DejaOS1.0
### 应用打包
DejaOS1.0打包需要手动完成，即将项目的 `dxmodules` 目录、`src` 以及其他自定义目录压缩成一个 zip 文件，参考如下截图：

![alt text](image/app_zip1.png)


### 应用安装
- 无

### 应用升级
- DejaOS1.0应用升级使用`dxOta.update`方法，将`zip`升级包，下载到`/ota/download.zip`，`dxOta.update`负责解压，最终完成升级

- DejaOS1.0也可以将`zip`升级包，下载到`/app/data/upgrades/APP_1_0.zip`，重启后DejaOS1.0自动解压，最终完成升级


> 注：DejaOS1.0用户可继续保持原有升级方式，每个OS版本都支持向上个版本升级，建议当前DejaOS1.0的用户联系官方升级至DejaOS2.0（不推荐长期使用DejaOS1.0，官方逐步减少DejaOS1.0的支持和维护）。

