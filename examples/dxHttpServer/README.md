<p align="right">
    <b>English</b>| <a href="./README_CN.md">中文</a>
</p>

# dxHttpServer Module
## 1. Overview
This module is part of the official system module library of [dejaOS](https://github.com/DejaOS/DejaOS), used to start an HTTP Web service, listen on ports, and allow clients to access the device through the HTTP protocol. It is typically used to control devices through a computer browser within a local area network, provided that the device's IP address is known.
Includes common HTTP Web service features:
 - Static Web Service
 - Service Listening and Startup
 - Route Registration

## 2. Files
- dxHttpServer.js
- libvbar-m-dxhttpcserver.so (embedded mongoose)

> Ensure these 2 files are included in the dxmoudles subdirectory under the project root directory

## 3. Dependencies
- None

## 3. Compatible Devices
Compatible with all devices running dejaOS v2.0+

## 4. Usage
### Initialization

- `httpserver.init()`
- `httpserver.deinit()`

### Route Registration

- `httpserver.route(path, callback)`

### Response Object

- `res.send(body, headers)`
- `res.sendFile(path)`

### Request Object

- `req.method`, `req.url`, `req.query`, `req.headers`, `req.body`
- `req.saveFile(path)`

### Start Service

- `httpserver.listen(port)`
- `setInterval(() => httpserver.loop(), 20)`

### Static Service

- `httpserver.serveStatic(pathPrefix, directory)`

- For more detailed usage, refer to Demo: test_server.js

## 5. Related Modules
Related to another module dxWebserver, with similar functionality. dxHttpServer is a replacement for dxWebserver, and dxWebserver is being gradually deprecated