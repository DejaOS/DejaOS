# **DW200_V10 设备升级系统（基于 MQTT）**

> 本演示基于真实升级场景，展示 DW200_V20 在实际项目中的设备程序升级方案。网络配置仅为升级前的必要准备方式（支持扫码/手动），核心能力是“设备程序升级”。

## 演示概述

- 设备型号：DW200_V20（触摸屏一体机）
- 主要用途：作为“烧录机/升级器”安装和升级客户自研程序
- 通信协议：MQTT（远程管理与下发升级指令）

### 主要功能
- 设备程序烧录与升级（支持进度、版本校验与回滚）
- 批量升级（面向多设备统一下发）
- 远程管理与监控（MQTT 心跳、离线、结果上报）
- 网络配置（升级前准备，支持二维码与手动）

### 升级方式（前置网络已配置）
1. 扫码配置网络 → 接入 MQTT → 接收升级指令 → 自动下载并安装固件
2. 手动配置网络 → 接入 MQTT → 接收升级指令 → 自动下载并安装固件

## 核心功能

### 设备程序升级
- 固件下载：接收平台下发升级指令后自动下载
- 升级安装：本地校验与安装，显示进度
- 版本管理：版本比对与失败回滚
- 批量升级：面向设备组统一升级

### 网络配置（升级前准备）
- 二维码配置：扫码写入网络/MQTT 参数，增量更新，仅覆盖提供的字段
- 手动配置：触摸屏输入 IP/网关/DNS/MQTT 等参数，保存后生效

## 目录结构

```
├── src/
│   ├── view/            # UI 视图组件
│   │   ├── page/        # 主界面
│   │   ├── pinyin/      # 输入法组件
│   │   └── util/        # UI 工具
│   ├── service/         # 服务层
│   │   ├── codeService.js       # 二维码解析与配置写入
│   │   ├── mqttService.js       # MQTT 通信服务
│   │   └── netService.js        # 网络服务
│   ├── main.js          # 程序入口
│   ├── driver.js        # 驱动与网络初始化
│   ├── screen.js        # 屏幕管理
│   └── config.json      # 运行配置
├── resource/            # 资源文件（字体、图片）
├── dxmodules/           # DX 框架模块
├── app.dxproj           # 项目配置文件
├── CONFIG_CODE_README.md # 配置代码说明
├── README.md            # 英文说明文档
└── README_CN.md         # 中文说明文档
```

## 代码架构

- 多线程：
  - 主线程：UI 刷新
  - 服务线程：二维码解析、MQTT 通信与耗时任务

## MQTT 通信协议

设备与平台的 MQTT 主题定义：

- 设备心跳上报（设备→平台）
  - 主题：`base_upgrade/v1/event/heart`
  - 消息：
    ```json
    { "uuid": "", "timestamp": "" }
    ```

- 设备离线上报（设备→平台）
  - 主题：`base_upgrade/v1/event/offline`
  - 消息：
    ```json
    { "uuid": "", "timestamp": "" }
    ```

- 升级命令（平台→设备）
  - 主题：`base_upgrade/v1/cmd/{uuid}/upgrade`
  - 消息：
    ```json
    { "serialNo": "00001", "url": "http://server/firmware.bin", "md5": "abc123def456", "timestamp": "2024-01-01T12:00:00Z" }
    ```

- 升级应答（设备→平台）
  - 主题：`base_upgrade/v1/cmd/upgrade_reply`
  - 消息：
    ```json
    { "type": "upgrade|config|status", "status": "success|failed", "message": "描述", "timestamp": "2024-01-01T12:00:00Z" }
    ```

## 扫码配置

- 配置码格式（JSON，仅示例字段，按需可选）：
  ```json
  {
    "net_type": 1,                // 1=以太网, 2=WiFi（如设备支持）
    "ssid": "WiFi名称",
    "psk": "WiFi密码",
    "dhcp": 1,                    // 1=自动, 2=手动
    "mqttAddr": "mqtt.example.com:1883",
    "username": "用户名",
    "password": "密码",
    "ip": "192.168.1.100",
    "mask": "255.255.255.0",
    "gateway": "192.168.1.1",
    "dns": "8.8.8.8"
  }
  ```

- 示例
  - WiFi：
    ```json
    { "net_type": 2, "ssid": "MyWiFi", "psk": "password123", "mqttAddr": "mqtt.example.com:1883" }
    ```
  - 以太网（静态 IP）：
    ```json
    { "net_type": 1, "dhcp": 2, "ip": "192.168.1.100", "mask": "255.255.255.0", "gateway": "192.168.1.1", "dns": "8.8.8.8", "mqttAddr": "mqtt.example.com:1883" }
    ```

## 配置

- MQTT：`src/config.json`
  ```json
  { "mqttAddr": "mqtt.example.com:1883", "username": "device_user", "password": "device_pass" }
  ```
- 网络：`src/config.json`
  ```json
  { "type": 1, "dhcp": 2, "ip": "192.168.1.100", "mask": "255.255.255.0", "gateway": "192.168.1.1", "dns": "8.8.8.8" }
  ```

## 使用场景

- 设备程序烧录：开发完成后统一安装部署
- 批量设备升级：按设备组下发升级
- 远程设备管理：在线监控、远程维护
- 网络配置（升级前准备）：出厂/现场快速配置、网络变更重配

## 故障排除

- 网络连接失败：检查 DHCP/静态 IP、网关与 DNS
- MQTT 连接失败：检查地址、账号密码、防火墙
- 扫码配置失败：检查 JSON 格式/二维码清晰度/权限与存储空间

## 安全考虑

- 传输安全：TLS/SSL、账号口令
- 数据安全：固件 MD5 校验、配置加密存储

---

注意：使用前请先完成网络与 MQTT 配置，再进行远程升级。
