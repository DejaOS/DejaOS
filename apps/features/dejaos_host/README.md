# DejaOS Host Prototype

This repository demonstrates an end-to-end micro-app workflow for a DejaOS Host device. The Host provides a simple home screen, network and backend configuration, an app catalog, and runtime installation or removal of micro apps without restarting the Host.

## Project Structure

- `app/`: DejaOS SDK 2.0 device application for a 480×854 display.
- `web/`: Framework-free HTML, CSS, and JavaScript management UI.
- `webapi/`: Node.js 20+ prototype backend, app catalog, package download API, and weather proxy.
- `tools/`: Development and validation utilities.

The earlier browser-only mockups are intentionally not part of the feature package. The device application and management system are now the maintained prototype.

## Run the Management Service

```powershell
cd webapi
npm start
```

Open `http://localhost:8080/` to access the management UI. No npm dependency installation is required.

Configure the device's App Service address to point to this backend, for example `http://192.168.50.30:8080`. After the device is online, it can synchronize time, browse published apps, download a package, and load the installed micro app dynamically.

## Prototype Scope

The current implementation focuses on validating the complete workflow. Device ownership, authentication, production package signing, application isolation, debugging, and a formal mini-app SDK are outside the current prototype scope.

Micro apps run in the UI worker under DejaOS SDK 2.0. The backend weather endpoint proxies Open-Meteo data so the device only needs to communicate with the configured App Service.
