# QR Code-Based OTA Update System Demo

## Project Overview

This is a comprehensive solution demonstrating how to upgrade applications by scanning QR codes. The system implements Over-The-Air (OTA) update functionality, allowing devices to automatically obtain update packages and complete application upgrades through QR code scanning.

## System Architecture

### Core Modules

- **main.js**: Main application entry point, responsible for OTA update flow control
- **codeservice.js**: QR code scanning service, including video capture and network configuration functionality

### Workflow

1. **Video Capture**: Capture video stream through camera (`/dev/video11`) for QR code recognition
2. **Network Configuration**: Automatically configure Ethernet connection (DHCP dynamic IP assignment)
3. **QR Code Parsing**: Parse JSON data containing update package URL and MD5 checksum
4. **Download & Verification**: Download update package and verify file integrity using MD5 hash
5. **Automatic Update**: After reboot, system automatically decompresses and overwrites existing code

## Usage Steps

### 1. Build Update Package

Click the 'package' button in VSCode, and a dpk file will be generated in the `.temp` folder.

### 2. Deploy Update Package

Upload the compressed package to a web server and obtain the download URL.

### 3. Generate QR Code

Convert the download URL and MD5 value into a QR code with JSON format:

```json
{
  "url": "http://101.200.139.97:12346/download/update.dpk",
  "md5": "d825ba4c589496e60123d5ae48087c36"
}
```

### 4. Scan for Update

When the device scans the QR code, it automatically calls the `dxOta.updateHttp()` function to execute the update process.

## Technical Features

- **Automated Updates**: Trigger the entire update process by scanning QR code
- **Security Verification**: Use MD5 checksum to ensure download file integrity
- **Seamless Upgrade**: Automatic code replacement after reboot
- **Network Adaptive**: Support DHCP dynamic network configuration
- **Real-time Logging**: Complete update process logging

## Project Files

### Update Package

- **update.dpk**: Update package file
  - MD5 value: `d825ba4c589496e60123d5ae48087c36`
  - Download URL: http://101.200.139.97:12346/download/update.dpk
  - Note: If the URL is not accessible, please upload the file to a new website

### QR Code File

- **updateqrcode.png**: QR code containing update information

![Update QR Code](updateqrcode.png)

### Effect Comparison

- **beforeupdate.png**: Running result before update
- **afterupdate.png**: Running result after update

| Before Update                      | After Update                     |
| ---------------------------------- | -------------------------------- |
| ![Before Update](beforeupdate.png) | ![After Update](afterupdate.png) |

## Development Environment

- **Development Platform**: VSCode + dxmodules framework
- **Runtime Environment**: Embedded devices supporting dxmodules
- **Network Requirements**: Ethernet connection with DHCP support
- **Hardware Requirements**: Camera device (/dev/video11)

## Important Notes

1. Ensure device network connection is stable
2. Camera device path is correctly configured
3. Update package server address is accessible
4. Do not power off or force shutdown during update process
5. Recommend backing up important data before updating

## Code Structure

### main.js Implementation

- Initializes logger and event bus system
- Creates worker thread for QR code scanning service
- Listens for QR code scan events containing update URL and MD5
- Triggers OTA update and system reboot when QR code is detected

### codeservice.js Implementation

- Configures video capture from camera device
- Sets up dynamic network configuration with DHCP
- Provides continuous scanning loop for QR code detection
- Handles error logging and recovery
