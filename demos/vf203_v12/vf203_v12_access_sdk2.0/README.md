# VF203 Series Smart Access Control Application

## Project Overview

This project is an embedded application for the VF203 series of smart access control terminals. It provides a complete access control solution, integrating modern authentication technologies such as facial recognition and NFC card identification.

This application is the source code for a new generation of standardized products developed based on the `dxFacial` facial recognition component.

The system is designed to provide secure, efficient, and reliable access management services, suitable for various scenarios such as office buildings, communities, and campuses.

## Core Features

- **Multiple Authentication Methods**:

  - **Facial Recognition**: Supports high-precision face comparison and liveness detection to prevent photo or video spoofing attacks.
  - **NFC Card Reading**: Supports reading NFC card information for authentication.
  - **Password Unlock**: Supports unlocking via a password keypad.

- **Device Management and Control**:

  - Comprehensive control over the access control machine's hardware, including relays, screen backlight, infrared/white fill lights, and audio playback.
  - Supports security features like GPIO key input and tamper alarms.

- **Networking and Communication**:

  - Supports multiple network connections, including Ethernet, Wi-Fi, and 4G.
  - Uses the standard MQTT protocol for real-time communication with a cloud management platform, reporting access records and device status.
  - Includes a built-in HTTP service for convenient local device configuration and management.

- **Offline Mode**:

  - A built-in SQLite database allows for local storage of user information and access records.
  - The device can perform authentication and unlock doors normally during network interruptions, with data automatically synchronized once the connection is restored.

- **System Stability**:
  - An integrated Watchdog mechanism ensures long-term system stability.
  - Supports NTP (Network Time Protocol) for automatic device time calibration.

## Tech Stack

- **Core Language**: JavaScript (ECMAScript)
- **Runtime Environment**: A customized embedded JavaScript engine
- **Core Modules**:
  - `main.js`: The main application entry point, responsible for initializing and starting all modules.
  - `driver.js`: A driver interface that encapsulates low-level hardware operations.
  - `controller.js`: The core business logic controller that handles hardware events and business flows.
  - `screen.js`: UI and interface logic.
  - `services.js`: The application service layer, handling MQTT communication, data synchronization, etc.
  - `config.json`: The main system configuration file.

## Supported Device Models

- VF203
- VF202
- VF114
- VF105
