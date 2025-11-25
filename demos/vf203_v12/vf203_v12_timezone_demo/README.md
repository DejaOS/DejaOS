# Timezone Management Demo

A simple demo application that demonstrates timezone management functionality using the `dxTimeZones` module. This application provides a web-based interface for selecting and applying timezone settings to the system.

## Overview

This demo application showcases how to:

- Connect to WiFi network automatically
- Provide a web-based interface for timezone management
- Display current system time
- Select from 45 predefined timezones worldwide
- Update system timezone and reboot to apply changes

## Features

- **Web-Based Interface**: Access the timezone settings through a modern web UI
- **45 Predefined Timezones**: Covers major cities and regions worldwide
- **Real-Time Clock Display**: Shows current system time that updates every second
- **Multi-Language Support**: Timezone names available in 9 languages (Chinese, English, Japanese, Korean, Spanish, French, German, Russian, Arabic)
- **Automatic WiFi Connection**: Connects to WiFi network automatically on startup
- **RESTful API**: Provides HTTP API endpoints for timezone operations

## Project Structure

```
src/
├── main.js              # Main entry point, initializes workers
├── networkworker.js     # WiFi connection worker
├── webworker.js         # HTTP server worker
└── web/
    └── index.html       # Web interface
```

## Components

### Main Entry (`main.js`)

Initializes the network worker and web worker using the event bus system.

### Network Worker (`networkworker.js`)

- Automatically connects to WiFi using hardcoded SSID and password
- Handles network status changes
- Retries connection on failure
- Runs network loop processing

### Web Worker (`webworker.js`)

- Starts HTTP server on port 8080
- Serves static web files
- Provides REST API endpoints:
  - `GET /api/timezones?lang=en` - Get all timezones (optionally filtered by language)
  - `GET /api/current-time` - Get current system time
  - `POST /api/update-timezone` - Update system timezone and reboot

### Web Interface (`web/index.html`)

A modern, responsive web interface that allows users to:

- View current system time
- Select timezone from a dropdown list
- Apply timezone changes (triggers system reboot)

## Configuration

### WiFi Settings

Edit `src/networkworker.js` to configure WiFi connection:

```javascript
const WIFI_SSID = "YourWiFiSSID"; // Your WiFi network name
const WIFI_PASSWORD = "YourWiFiPassword"; // Your WiFi password
```

## Usage

1. **Configure WiFi**: Update WiFi SSID and password in `src/networkworker.js`

2. **Deploy and Run**: Deploy the application to your device

3. **Access Web Interface**:

   - Wait for WiFi connection to establish
   - Check logs for the device IP address
   - Open browser and navigate to `http://<device-ip>:8080`

4. **Select Timezone**:
   - View current time displayed at the top
   - Select desired timezone from the dropdown
   - Click "Apply & Reboot" button
   - System will update timezone and reboot automatically

## API Endpoints

### Get Timezones

```
GET /api/timezones?lang=en
```

Returns list of all available timezones. Optional `lang` parameter filters timezone names by language.

**Response:**

```json
{
  "code": 0,
  "data": {
    "Asia/Shanghai": {
      "utc_offset": "+08:00",
      "name": "China Standard Time (Beijing)"
    },
    ...
  }
}
```

### Get Current Time

```
GET /api/current-time
```

Returns current system time.

**Response:**

```json
{
  "code": 0,
  "data": {
    "time": "12/25/2024, 14:30:45"
  }
}
```

### Update Timezone

```
POST /api/update-timezone
Content-Type: application/json

{
  "timezone": "Asia/Shanghai"
}
```

Updates system timezone and triggers reboot.

**Response:**

```json
{
  "code": 0,
  "message": "Timezone updated successfully, rebooting..."
}
```

## Supported Timezones

The application includes 45 predefined timezones covering:

- **Americas**: From Pacific/Midway (UTC-11) to America/Argentina/Buenos_Aires (UTC-3)
- **Europe & Africa**: From Atlantic/Azores (UTC-1) to Europe/Istanbul (UTC+3)
- **Asia & Pacific**: From Asia/Dubai (UTC+4) to Pacific/Tongatapu (UTC+13)

## Dependencies

This demo requires the following DejaOS components:

- `dxEventBus` (v2.0.3) - Event bus system
- `dxHttpServer` (v1.0.4) - HTTP server
- `dxLogger` (v2.0.3) - Logging
- `dxNetwork` (v1.0.7) - Network connectivity
- `dxOs` (v1.0.2) - OS operations
- `dxStd` (v2.0.3) - Standard utilities
- `dxTimeZones` (v1.0.0) - Timezone management

## Notes

- This is a demo application with hardcoded WiFi credentials for simplicity
- The system will automatically reboot after timezone update
- Timezone changes take effect after reboot
- The web server runs on port 8080 by default
- Network connection retries automatically on failure

## License

This is a demo application for educational purposes.
