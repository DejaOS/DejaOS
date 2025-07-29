/**
 * dxKeyValueDB Module
 * Features:
 * - Supports set get delete key/value
 * - Supports find all keys with prefix
 * 
 * Usage:
 * - Simple Key Value Database
 * 
 * Doc/Demo : https://github.com/DejaOS/DejaOS
 */
import { keyvaluedbClass } from './libvbar-m-dxkeyvaluedb.so'
import dxMap from './dxMap.js'
import bus from './dxEventBus.js'
import std from './dxStd.js'

let db = null;
const keyvaluedb = {}
const SET_EVENT = '__kvdb.set'
const DEL_EVENT = '__kvdb.del'
const map = dxMap.get('default')

/**
 * Initialize the key-value database
 * Should be called in the main thread
 * @param {string} path - Database storage path, default is '/app/data'
 * @param {number} size - Database size in MB, default is 1
 */
keyvaluedb.init = function (path = '/app/data', size = 1) {
    if (!db) {
        db = new keyvaluedbClass();
    }
    std.ensurePathExists(path)
    let workerFile = '/app/code/dxmodules/kvdbWorker.js'
    let init = map.get("__kvdb__run_init")
    if (!init) {//ensure only initialize once
        map.put("__kvdb__run_init", { path, size })
        bus.newWorker('__kvdb', workerFile)
    }
}

/**
 * Set a key-value pair in the database
 * set is async, it will return immediately and the value will be set in the 5+ ms
 * @param {string} key - The key to set
 * @param {*} value - The value to set (string, number, boolean, array, or object)
 * @throws {Error} If key is invalid or value is undefined/null
 */
keyvaluedb.set = function (key, value) {
    if (typeof key !== 'string' || key.length <= 0) {
        throw new Error('Invalid key');
    }
    if (value === undefined || value === null) {
        throw new Error('Invalid value');
    }
    value = _stringifyValue(value)
    bus.fire(SET_EVENT, { key, value })
}

/**
 * Get a value from the database by key
 * @param {string} key - The key to get
 * @returns {*} The value associated with the key
 * @throws {Error} If key is invalid or database is not initialized
 */
keyvaluedb.get = function (key) {
    try {
        if (typeof key !== 'string' || key.length <= 0) {
            throw new Error('Invalid key');
        }
        if (!db) {
            keyvaluedb.init();
        }
        return _parseString(db.get(key));
    } catch (e) {
        throw e instanceof Error ? e : new Error(String(e))
    }
}

/**
 * Delete a key-value pair from the database
 * del is async, it will return immediately and the value will be deleted in the 5+ ms
 * @param {string} key - The key to delete
 * @throws {Error} If key is invalid
 */
keyvaluedb.del = function (key) {
    if (typeof key !== 'string' || key.length <= 0) {
        throw new Error('Invalid key');
    }
    bus.fire(DEL_EVENT, { key })
}

/**
 * Get all keys with optional pagination and prefix filter
 * @param {number} page - Page number, default is 1
 * @param {number} size - Page size, default is 10,max is 1000
 * @param {string} [prefix] - Optional prefix to filter keys
 * @returns {string[]} Array of keys
 * @throws {Error} If page or size is invalid
 */
keyvaluedb.keys = function (page = 1, size = 10, prefix) {
    try {
        if (page < 1) throw new Error('Invalid page number');
        if (size < 0) throw new Error('Invalid size');
        if (prefix !== undefined && (typeof prefix !== 'string' || prefix.length <= 0)) {
            throw new Error('Invalid prefix');
        }
        if (!db) {
            keyvaluedb.init();
        }
        if (prefix) {
            return db.keys(page, size, prefix);
        } else {
            return db.keys(page, size);
        }
    } catch (e) {
        throw e instanceof Error ? e : new Error(String(e))
    }
}

/**
 * Deinitialize the database, it will not close the database, it will only stop with the process
 */
keyvaluedb.deinit = function () {
    //donothing
}

/**
 * Get the native database instance
 * @returns {keyvaluedbClass} The native database instance
 */
keyvaluedb.getNative = function () {
    return db;
}

/**
 * Convert a value to a string representation
 * @param {*} value - The value to convert
 * @returns {string} The string representation of the value
 * @throws {Error} If value is a function
 */
function _stringifyValue(value) {
    const type = typeof value
    if (type === 'string') {
        return value
    }
    if (type === 'number') {
        return '#n#' + value
    }
    if (type === 'boolean') {
        return '#b#' + value
    }
    if (type === 'object') {
        // If it's an object, check if it's an array
        if (Array.isArray(value)) {
            return '#a#' + JSON.stringify(value);
        }
        return '#o#' + JSON.stringify(value)
    }
    if (type === 'function') {
        throw new Error("The 'value' parameter should not be function")
    }
}

/**
 * Parse a string back to its original value type
 * @param {string} str - The string to parse
 * @returns {*} The parsed value
 */
function _parseString(str) {
    if (str === null || str === undefined) {
        return undefined;
    }
    if (str.startsWith('#n#')) {
        // Parse number
        const numberStr = str.substring(3);
        if (numberStr === '') return 0;
        const num = numberStr.includes('.') ? parseFloat(numberStr) : parseInt(numberStr, 10);
        return isNaN(num) ? 0 : num;
    } else if (str.startsWith('#b#')) {
        // Parse boolean
        return str.substring(3) === 'true';
    } else if (str.startsWith('#a#')) {
        // Parse array
        return JSON.parse(str.substring(3));
    } else if (str.startsWith('#o#')) {
        // Parse object
        return JSON.parse(str.substring(3));
    } else {
        // Return as string by default
        return str;
    }
}

export default keyvaluedb;