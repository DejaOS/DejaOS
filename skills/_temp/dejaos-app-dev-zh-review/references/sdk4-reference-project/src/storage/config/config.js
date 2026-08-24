/**
 * @layer    storage
 * @module   config
 * @depends  dxStd,storage/sqlite,config/rules
 *
 * config.json只提供默认值；运行时查询和修改始终以SQLite为准。
 */

import dxStd from '../../../dxmodules/dxStd.js';
import sqlite from '../sqlite/sqlite.js';
import rules from './rules.js';

const DEFAULT_CONFIG_PATH = '/app/code/src/config.json';
const CONFIG_TABLE = 'app_config';

let initialized = false;
let configPath = DEFAULT_CONFIG_PATH;

function sqlText(value) {
    return "'" + String(value).replace(/'/g, "''") + "'";
}

function encodeValue(value) {
    if (value === undefined) throw new TypeError('config: undefined cannot be stored');
    return JSON.stringify(value);
}

function decodeValue(key, valueJson) {
    try {
        return JSON.parse(valueJson);
    } catch (e) {
        throw new Error('config: invalid value for key ' + key + ': ' + e.message);
    }
}

function assertInitialized() {
    if (!initialized) throw new Error('config: module is not initialized');
}

async function createTable() {
    await sqlite.execute(
        'CREATE TABLE IF NOT EXISTS ' + CONFIG_TABLE + ' (' +
        'config_key TEXT PRIMARY KEY, ' +
        'value_json TEXT NOT NULL, ' +
        'updated_at INTEGER NOT NULL)'
    );
}

async function writeValue(key, value, replace) {
    if (typeof key !== 'string' || !key) throw new TypeError('config: key must be a non-empty string');
    await sqlite.execute(
        'INSERT OR ' + (replace ? 'REPLACE' : 'IGNORE') + ' INTO ' + CONFIG_TABLE +
        ' (config_key, value_json, updated_at) VALUES (' +
        sqlText(key) + ', ' + sqlText(encodeValue(value)) + ', ' + Date.now() + ')'
    );
}

async function readDefaults() {
    const source = await dxStd.loadFileAsync(configPath);
    // QuickJS扩展JSON解析器原生支持config.json注释。
    const defaults = dxStd.parseExtJSON(source);
    rules.init(defaults);
    return defaults;
}

async function syncDefaults() {
    const defaults = await readDefaults();
    const keys = Object.keys(defaults);
    for (let i = 0; i < keys.length; i++) {
        // 首次启动完成导入；后续启动只补新增项，绝不覆盖设备已有值。
        await writeValue(keys[i], defaults[keys[i]], false);
    }
}

const config = {
    DEFAULT_CONFIG_PATH: DEFAULT_CONFIG_PATH,
    TABLE: CONFIG_TABLE,
};

config.init = async function (options) {
    if (initialized) return;
    if (!sqlite.isInitialized()) throw new Error('config.init: sqlite must be initialized first');
    configPath = options && options.path ? options.path : DEFAULT_CONFIG_PATH;
    await createTable();
    await syncDefaults();
    initialized = true;
};

config.get = async function (key, defaultValue) {
    assertInitialized();
    const rows = await sqlite.query(
        'SELECT value_json FROM ' + CONFIG_TABLE +
        ' WHERE config_key=' + sqlText(key) + ' LIMIT 1'
    );
    return rows && rows.length ? decodeValue(key, rows[0].value_json) : defaultValue;
};

config.getAll = async function () {
    assertInitialized();
    const rows = await sqlite.query(
        'SELECT config_key, value_json FROM ' + CONFIG_TABLE + ' ORDER BY config_key'
    );
    const result = {};
    for (let i = 0; i < rows.length; i++) {
        result[rows[i].config_key] = decodeValue(rows[i].config_key, rows[i].value_json);
    }
    return result;
};

config.getGroup = async function (group) {
    assertInitialized();
    if (typeof group !== 'string' || !group) throw new TypeError('config.getGroup: group is required');
    const prefix = group + '.';
    const rows = await sqlite.query(
        'SELECT config_key, value_json FROM ' + CONFIG_TABLE +
        ' WHERE config_key LIKE ' + sqlText(prefix + '%') + ' ORDER BY config_key'
    );
    const result = {};
    for (let i = 0; i < rows.length; i++) {
        result[rows[i].config_key.substring(prefix.length)] =
            decodeValue(rows[i].config_key, rows[i].value_json);
    }
    return result;
};

config.set = async function (key, value) {
    assertInitialized();
    await writeValue(key, value, true);
};

config.setMany = async function (values) {
    assertInitialized();
    if (!values || typeof values !== 'object' || Array.isArray(values)) {
        throw new TypeError('config.setMany: values must be an object');
    }
    const keys = Object.keys(values);
    for (let i = 0; i < keys.length; i++) await writeValue(keys[i], values[keys[i]], true);
};

config.setGroup = async function (group, values) {
    assertInitialized();
    if (typeof group !== 'string' || !group
        || !values || typeof values !== 'object' || Array.isArray(values)) {
        throw new TypeError('config.setGroup: group and values are required');
    }
    const flat = {};
    const keys = Object.keys(values);
    for (let i = 0; i < keys.length; i++) flat[group + '.' + keys[i]] = values[keys[i]];
    await config.setMany(flat);
};

config.resetToDefaults = async function () {
    assertInitialized();
    await sqlite.execute('DELETE FROM ' + CONFIG_TABLE);
    await syncDefaults();
};

config.isInitialized = function () {
    return initialized;
};

config.destroy = async function () {
    initialized = false;
};

export default config;
