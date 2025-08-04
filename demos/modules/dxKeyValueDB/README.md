<p align="right">
    <b>English</b>| <a href="./README_CN.md">中文</a>
</p>

# dxKeyValueDB Module
## 1. Overview
This module is part of the official system module library of [dejaOS](https://github.com/DejaOS/DejaOS), designed to provide high-performance key-value database services. Built on LMDB (Lightning Memory-Mapped Database), it offers simple and easy-to-use key-value storage functionality. Suitable for scenarios requiring fast read/write operations and lightweight data storage, it can replace SQLite in certain use cases.

Includes common key-value database features:
 - CRUD operations for key-value pairs
 - Support for multiple data types (string, number, boolean, array, object)
 - Paginated query for all keys
 - Prefix-based filtering
 - Asynchronous write operations, synchronous read operations
 - Thread-safe design

## 2. Files
- dxKeyValueDB.js (main interface file)
- kvdbWorker.js (worker thread file)
- libvbar-m-dxkeyvaluedb.so (C extension with embedded LMDB)

> Ensure these 3 files are included in the dxmodules subdirectory under the project root directory

## 3. Dependencies
- dxMap.js (for inter-thread data sharing)
- dxEventBus.js (for event communication)
- dxStd.js (for path operations)
- dxLogger.js (for logging)

## 4. Compatible Devices
Compatible with all devices running dejaOS v2.0+

## 5. Usage
### Initialization

```javascript
import db from '../dxmodules/dxKeyValueDB.js'

// Initialize database, should be called in main thread only once
db.init('/app/data', 10) // path: /app/data, size: 10MB
```

### Data Operations

```javascript
// Set key-value pairs (async operation, returns immediately)
db.set('user:id1', { name: 'user1', age: 10 })
db.set('user:id2', "user2")
db.set('user:id3', 34)
db.set('user:id4', 34.5)
db.set('config:settings', [1, 2, 3])

// Get values (sync operation)
let user1 = db.get('user:id1') // returns: {name: 'user1', age: 10}
let user2 = db.get('user:id2') // returns: "user2"
let user3 = db.get('user:id3') // returns: 34

// Delete key-value pairs (async operation, returns immediately)
db.del('user:id2')
```

### Query Operations

```javascript
// Get all keys (paginated)
let allKeys = db.keys(1, 10) // page 1, 10 items per page

// Filter keys by prefix
let userKeys = db.keys(1, 10, 'user:') // get keys starting with 'user:'

// Get more keys
let moreKeys = db.keys(2, 10, 'user:') // page 2
```

### Cleanup

```javascript
// Deinitialize (usually not needed)
db.deinit()
```

## 6. API Reference

### Initialization Methods
- `db.init(path, size)` - Initialize database
  - `path`: Database storage path, default '/app/data'
  - `size`: Database size in MB, default 1

### Data Operation Methods
- `db.set(key, value)` - Set key-value pair (async)
- `db.get(key)` - Get value (sync)
- `db.del(key)` - Delete key-value pair (async)

### Query Methods
- `db.keys(page, size, prefix)` - Get key list
  - `page`: Page number, default 1
  - `size`: Page size, default 10, max 1000
  - `prefix`: Optional prefix filter

### Utility Methods
- `db.deinit()` - Deinitialize
- `db.getNative()` - Get native database instance

## 7. Supported Data Types
- **String**: Stored directly
- **Number**: Integers and floating-point numbers
- **Boolean**: true/false
- **Array**: JSON serialized storage
- **Object**: JSON serialized storage

## 8. Important Notes
- Initialization must be called in the main thread and only once
- set and del operations are asynchronous, completed in 5+ milliseconds
- get and keys operations are synchronous and can be called across threads
- Database files are automatically created in the specified path
- Maximum database size depends on system memory

## 9. Performance Features
- Based on LMDB, providing extremely high read/write performance
- Memory-mapped technology reduces data copying
- Supports concurrent reads
- Write operations handled by worker threads, non-blocking to main thread

For more detailed usage, refer to Demo: demo/kvdb_demo.js

## 10. Related Modules
Related to another dxConfig module with similar functionality, can be used as an alternative to dxConfig. Can also partially replace the dxSqlite module