<p align="right">
    <b>English</b>| <a href="./README_CN.md">中文</a>
</p>

# dxHttpClient Module
## 1. Overview
This module is part of the official system module library of [dejaOS](https://github.com/DejaOS/DejaOS), used for accessing HTTP servers via the HTTP protocol.
It includes common HTTP client features:
 - GET/POST requests
 - File upload/download
 - HTTPS support
 - Progress callback
 - Support for various HTTP request settings, including url, verifyPeer, verifyHost, caFile, method, body, header, onProgress, timeout

## 2. Files
- dxHttpClient.js
- libvbar-m-dxhttpclient.so

> Ensure these 2 files are included in the dxmodules subdirectory under your project root directory

## 3. Dependencies
- libcurl: curl library

## 4. Compatible Devices
Compatible with all devices running dejaOS v2.0+

## 5. Usage
- For simple GET/POST requests, use the corresponding functions directly
``` javascript
client.get(urlroot + "/get?name=quickjs&age=1")
client.post(urlroot + "/post", { foo: "bar", num: 42 })
```
- For complex requests, use setOpt and request functions
``` javascript
client.reset();
client.setOpt("url", urlroot + "/post");
client.setOpt("method", "POST");
client.setOpt("header", "Content-Type: application/json");
client.setOpt("body", JSON.stringify({ foo: "bar", num: 42 }));
log.info(client.request());
```
> Remember to use reset before making a request to clear previous settings

- For more detailed usage, refer to the Demo: test_client.js, test_server.js

## 6. Related Modules
Related to another module called dxHttp, with similar functionality. dxHttpClient is the replacement for dxHttp, and dxHttp is being gradually deprecated. 