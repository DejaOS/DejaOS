# **DW200_V10 Device Upgrade System (MQTT-based)**

> This demo is based on real upgrade scenarios and shows how DW200_V10 performs device program upgrades in production. Network configuration is only a preparation step (QR/manual). The core capability is device program upgrade.

## Overview

- Device Model: DW200_V10 (touchscreen all-in-one)
- Main Purpose: Acts as a burner/upgrader to install and upgrade customer applications
- Protocol: MQTT (remote management and upgrade command delivery)

### Key Features
- Program burning and upgrades (progress, version check, rollback)
- Batch upgrade for multiple devices
- Remote management and monitoring (MQTT heartbeat/offline/replies)
- Network configuration (pre-upgrade; QR code and manual)

### Upgrade Flow (after network is configured)
1. QR config → connect MQTT → receive upgrade cmd → auto download and install
2. Manual config → connect MQTT → receive upgrade cmd → auto download and install

## Core Capabilities

### Device Program Upgrade
- Firmware download: auto download after receiving upgrade command
- Installation: local verification and install with progress display
- Version management: version comparison and rollback on failure
- Batch upgrade: group-wise upgrade

### Network Configuration (Preparation)
- QR code: write network/MQTT params; incremental update (only provided fields overwritten)
- Manual: touchscreen input IP/gateway/DNS/MQTT and save to apply

## Directory Structure

```
├── src/
│   ├── view/            # UI views
│   │   ├── page/        # main screens
│   │   ├── pinyin/      # input method components
│   │   └── util/        # UI utils
│   ├── service/         # service layer
│   │   ├── codeService.js       # QR parsing and config writing
│   │   ├── mqttService.js       # MQTT communication service
│   │   └── netService.js        # network service
│   ├── main.js          # entry point
│   ├── driver.js        # drivers and network initialization
│   ├── screen.js        # display management
│   └── config.json      # runtime configuration
├── resource/            # resource files (fonts, images)
├── dxmodules/           # DX framework modules
├── app.dxproj           # project configuration file
├── README.md            # English documentation
└── README_CN.md         # Chinese documentation
```

## Architecture

- Multi-threading:
  - Main thread: UI rendering
  - Service thread: QR parsing, MQTT, and heavy tasks

## MQTT Protocol

Topics between device and platform:

- Heartbeat (device → platform)
  - Topic: `base_upgrade/v1/event/heart`
  - Payload:
    ```json
    { "uuid": "", "timestamp": "" }
    ```

- Offline (device → platform)
  - Topic: `base_upgrade/v1/event/offline`
  - Payload:
    ```json
    { "uuid": "", "timestamp": "" }
    ```

- Upgrade Command (platform → device)
  - Topic: `base_upgrade/v1/cmd/{uuid}/upgrade`
  - Payload:
    ```json
    { "serialNo": "00001", "url": "http://server/firmware.bin", "md5": "abc123def456", "timestamp": "2024-01-01T12:00:00Z" }
    ```

- Upgrade Reply (device → platform)
  - Topic: `base_upgrade/v1/cmd/upgrade_reply`
  - Payload:
    ```json
    { "type": "upgrade|config|status", "status": "success|failed", "message": "desc", "timestamp": "2024-01-01T12:00:00Z" }
    ```

## QR Configuration

- Code format (JSON, example fields only):
  ```json
  {
    "net_type": 1,
    "ssid": "WiFi",
    "psk": "pwd",
    "dhcp": 1,
    "mqttAddr": "mqtt.example.com:1883",
    "username": "user",
    "password": "pass",
    "ip": "192.168.1.100",
    "mask": "255.255.255.0",
    "gateway": "192.168.1.1",
    "dns": "8.8.8.8"
  }
  ```

- Examples
  - WiFi:
    ```json
    { "net_type": 2, "ssid": "MyWiFi", "psk": "password123", "mqttAddr": "mqtt.example.com:1883" }
    ```
  - Ethernet (static IP):
    ```json
    { "net_type": 1, "dhcp": 2, "ip": "192.168.1.100", "mask": "255.255.255.0", "gateway": "192.168.1.1", "dns": "8.8.8.8", "mqttAddr": "mqtt.example.com:1883" }
    ```

## Configuration

- MQTT (`src/config.json`):
  ```json
  { "mqttAddr": "mqtt.example.com:1883", "username": "device_user", "password": "device_pass" }
  ```
- Network (`src/config.json`):
  ```json
  { "type": 1, "dhcp": 2, "ip": "192.168.1.100", "mask": "255.255.255.0", "gateway": "192.168.1.1", "dns": "8.8.8.8" }
  ```

## Scenarios

- Program burning: unified installation after development
- Batch upgrades: group-based command delivery
- Remote O&M: online monitoring and remote maintenance
- Network prep: factory/field quick config; reconfigure on network change

## Troubleshooting

- Network: check DHCP/static IP, gateway, DNS
- MQTT: check broker address, credentials, firewall
- QR: validate JSON, code clarity, permissions and storage

## Security

- Transport: TLS/SSL, account credentials
- Data: firmware MD5 verification, encrypted config storage

---

Note: complete network and MQTT configuration before remote upgrade.
