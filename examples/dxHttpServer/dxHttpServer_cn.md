<p align="right">
    <a href="./dxHttpServer.md">English</a>| <b>中文</b>
</p>
# dxHttpServer 组件
## 1. 概述
本组件是 [dejaOS](https://github.com/DejaOS/DejaOS) 官方系统组件库中的一个组件，用于启动 HTTP Web服务，监听端口，让客户端通过http协议可以访问设备。通常用于在局域网内通过电脑浏览器来控制设备，前提是需要知道设备的 IP 地址。
包括 Http Web服务的常见功能：
 - 静态Web服务
 - 监听并启动服务
 - 注册路由

## 2. 文件
- dxHttpServer.js
- libvbar-m-dxhttpcserver.so (内嵌 mongoose)

> 确保在项目根目录下的子目录 dxmoudles 下包含这2个文件
## 3. 依赖
- 无

## 3. 适配设备
适配所有安装 dejaOS v2.0+ 的设备

## 4. 使用方式
### 初始化

- `httpserver.init()`
- `httpserver.deinit()`

### 注册路由

- `httpserver.route(path, callback)`

### 响应对象

- `res.send(body, headers)`
- `res.sendFile(path)`

### 请求对象

- `req.method`, `req.url`, `req.query`, `req.headers`, `req.body`
- `req.saveFile(path)`

### 启动服务

- `httpserver.listen(port)`
- `setInterval(() => httpserver.loop(), 20)`

### 静态服务

- `httpserver.serveStatic(pathPrefix, directory)`

- 更详细的用法参考 Demo: test_server.js

## 5. 关联
和另外一个 dxWebserver 组件关联，功能相似，dxHttpServer 是 dxWebserver 的替代，dxWebserver 逐步废弃