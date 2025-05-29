<p align="right">
    <a href="./README.md">English</a>| <b>中文</b>
</p>

# dxHttpClient 组件
## 1. 概述
本组件是 [dejaOS](https://github.com/DejaOS/DejaOS) 官方系统组件库中的一个组件，用于通过http协议访问http server。
包括 Http客户端的常见功能：
 - GET/POST 请求
 - 文件上传下载
 - HTTPS 支持
 - 进度回调
 - 支持 HTTP 请求的多种设置，包括 url,verifyPeer,verifyHost,caFile,method,body,header,onProgress,timeout

## 2. 文件
- dxHttpClient.js
- libvbar-m-dxhttpclient.so

> 确保在项目根目录下的子目录 dxmodules 下包含这2个文件
## 3. 依赖
- libcurl : curl 库

## 4. 适配设备
适配所有安装 dejaOS v2.0+ 的设备

## 5. 使用方式
- 简单的GET/POST 直接使用对应的函数
``` javascript
client.get(urlroot + "/get?name=quickjs&age=1")
client.post(urlroot + "/post", { foo: "bar", num: 42 })
```
- 复杂的请求，使用 setOpt, request 函数
``` javascript
client.reset();
client.setOpt("url", urlroot + "/post");
client.setOpt("method", "POST");
client.setOpt("header", "Content-Type: application/json");
client.setOpt("body", JSON.stringify({ foo: "bar", num: 42 }));
log.info(client.request());
```
>请求前记得先使用 reset 重置请求项

- 更详细的用法参考 Demo: test_client.js,test_server.js

## 6. 关联
和另外一个 dxHttp 组件关联，功能相似，dxHttpclient 是 dxHttp的替代，dxHttp 逐步废弃