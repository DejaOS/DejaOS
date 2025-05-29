<p align="right">
    <a href="./README.md">English</a>| <b>中文</b>
</p>

# dxKeyValueDB 组件
## 1. 概述
本组件是 [dejaOS](https://github.com/DejaOS/DejaOS) 官方系统组件库中的一个组件，用于提供高性能的键值数据库服务。基于 LMDB (Lightning Memory-Mapped Database) 实现，提供简单易用的键值存储功能。适用于需要快速读写、轻量级数据存储的场景，可以在某些情况下替代 SQLite。

包括键值数据库的常见功能：
 - 键值对的增删改查操作
 - 支持多种数据类型（字符串、数字、布尔值、数组、对象）
 - 分页查询所有键
 - 前缀过滤查询
 - 异步写操作，同步读操作
 - 线程安全的设计

## 2. 文件
- dxKeyValueDB.js (主接口文件)
- kvdbWorker.js (工作线程文件)
- libvbar-m-dxkeyvaluedb.so (C语言扩展，内嵌 LMDB)

> 确保在项目根目录下的子目录 dxmodules 下包含这3个文件

## 3. 依赖
- dxMap.js (用于线程间数据共享)
- dxEventBus.js (用于事件通信)
- dxStd.js (用于路径操作)
- dxLogger.js (用于日志记录)

## 4. 适配设备
适配所有安装 dejaOS v2.0+ 的设备

## 5. 使用方式
### 初始化

```javascript
import db from '../dxmodules/dxKeyValueDB.js'

// 初始化数据库，应在主线程中调用且只调用一次
db.init('/app/data', 10) // 路径: /app/data, 大小: 10MB
```

### 数据操作

```javascript
// 设置键值对（异步操作，立即返回）
db.set('user:id1', { name: 'user1', age: 10 })
db.set('user:id2', "user2")
db.set('user:id3', 34)
db.set('user:id4', 34.5)
db.set('config:settings', [1, 2, 3])

// 获取值（同步操作）
let user1 = db.get('user:id1') // 返回: {name: 'user1', age: 10}
let user2 = db.get('user:id2') // 返回: "user2"
let user3 = db.get('user:id3') // 返回: 34

// 删除键值对（异步操作，立即返回）
db.del('user:id2')
```

### 查询操作

```javascript
// 获取所有键（分页）
let allKeys = db.keys(1, 10) // 第1页，每页10条

// 根据前缀过滤键
let userKeys = db.keys(1, 10, 'user:') // 获取以'user:'开头的键

// 获取更多键
let moreKeys = db.keys(2, 10, 'user:') // 第2页
```

### 清理资源

```javascript
// 反初始化（通常不需要调用）
db.deinit()
```

## 6. API 参考

### 初始化方法
- `db.init(path, size)` - 初始化数据库
  - `path`: 数据库存储路径，默认 '/app/data'
  - `size`: 数据库大小（MB），默认 1

### 数据操作方法
- `db.set(key, value)` - 设置键值对（异步）
- `db.get(key)` - 获取值（同步）
- `db.del(key)` - 删除键值对（异步）

### 查询方法
- `db.keys(page, size, prefix)` - 获取键列表
  - `page`: 页码，默认 1
  - `size`: 每页大小，默认 10，最大 1000
  - `prefix`: 可选的前缀过滤

### 工具方法
- `db.deinit()` - 反初始化
- `db.getNative()` - 获取原生数据库实例

## 7. 支持的数据类型
- **字符串**: 直接存储
- **数字**: 整数和浮点数
- **布尔值**: true/false
- **数组**: JSON序列化存储
- **对象**: JSON序列化存储

## 8. 注意事项
- 初始化必须在主线程中调用且只能调用一次
- set 和 del 操作是异步的，会在5+毫秒后完成
- get 和 keys 操作是同步的，可以跨线程调用
- 数据库文件会自动创建在指定路径下
- 支持的最大数据库大小取决于系统存储

## 9. 性能特点
- 基于 LMDB，提供极高的读写性能
- 内存映射技术，减少数据拷贝
- 支持并发读取
- 写操作通过工作线程处理，不阻塞主线程

更详细的用法参考 Demo: demo/kvdb_demo.js

## 10. 关联
和另外一个 dxConfig 组件关联，功能相似，可以作为dxConfig的替代。也可以部分替代 dxSqlite 组件