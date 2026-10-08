/**
 * @layer    storage
 * @module   data
 * @depends  storage/sqlite
 *
 * 负责运行数据表、索引初始化及跨表事务入口。CRUD由同目录各Storage提供。
 */

import sqlite from '../sqlite/sqlite.js';

let initialized = false;

const SCHEMA = [
    'CREATE TABLE IF NOT EXISTS person (' +
        'user_id TEXT PRIMARY KEY,' +
        'name TEXT NOT NULL,' +
        'extra_json TEXT NOT NULL DEFAULT \'{}\',' +
        'permission_ids_json TEXT NOT NULL DEFAULT \'[]\',' +
        'created_at INTEGER NOT NULL,' +
        'updated_at INTEGER NOT NULL)',
    'CREATE INDEX IF NOT EXISTS idx_person_name ON person(name)',

    'CREATE TABLE IF NOT EXISTS voucher (' +
        'key_id TEXT PRIMARY KEY,' +
        'type TEXT NOT NULL,' +
        'code TEXT NOT NULL,' +
        'user_id TEXT NOT NULL,' +
        'extra_json TEXT NOT NULL DEFAULT \'{}\',' +
        'created_at INTEGER NOT NULL,' +
        'updated_at INTEGER NOT NULL)',
    'CREATE UNIQUE INDEX IF NOT EXISTS idx_voucher_type_code ON voucher(type,code)',
    // 人脸和指纹特征库都以userId为索引，同一人员每种生物凭证只能有一条。
    "CREATE UNIQUE INDEX IF NOT EXISTS idx_voucher_user_bio ON voucher(user_id,type) WHERE type IN ('300','500')",
    'CREATE INDEX IF NOT EXISTS idx_voucher_user ON voucher(user_id)',

    'CREATE TABLE IF NOT EXISTS permission (' +
        'permission_id TEXT PRIMARY KEY,' +
        'door INTEGER NOT NULL DEFAULT 0,' +
        'time_type INTEGER NOT NULL,' +
        'begin_time INTEGER NOT NULL DEFAULT 0,' +
        'end_time INTEGER NOT NULL DEFAULT 0,' +
        'period_json TEXT NOT NULL DEFAULT \'null\',' +
        'extra_json TEXT NOT NULL DEFAULT \'{}\',' +
        'created_at INTEGER NOT NULL,' +
        'updated_at INTEGER NOT NULL)',
    'CREATE INDEX IF NOT EXISTS idx_permission_time ON permission(time_type,begin_time,end_time)',

    'CREATE TABLE IF NOT EXISTS pass_record (' +
        'record_id TEXT PRIMARY KEY,' +
        'key_id TEXT,' +
        'permission_id TEXT,' +
        'user_id TEXT,' +
        'name TEXT NOT NULL DEFAULT \'\',' +
        'type TEXT NOT NULL,' +
        'code TEXT NOT NULL DEFAULT \'\',' +
        'image_path TEXT NOT NULL DEFAULT \'\',' +
        'door TEXT NOT NULL DEFAULT \'\',' +
        'time_stamp INTEGER NOT NULL,' +
        'result INTEGER NOT NULL,' +
        'extra_json TEXT NOT NULL DEFAULT \'{}\',' +
        'message TEXT NOT NULL DEFAULT \'\',' +
        'upload_state INTEGER NOT NULL DEFAULT 0,' +
        'created_at INTEGER NOT NULL)',
    'CREATE INDEX IF NOT EXISTS idx_record_time ON pass_record(time_stamp DESC)',
    'CREATE INDEX IF NOT EXISTS idx_record_user_time ON pass_record(user_id,time_stamp DESC)',
    'CREATE INDEX IF NOT EXISTS idx_record_upload ON pass_record(upload_state,time_stamp)',

    'CREATE TABLE IF NOT EXISTS security (' +
        'security_id TEXT PRIMARY KEY,' +
        'type TEXT NOT NULL,' +
        'key_name TEXT NOT NULL,' +
        'key_value TEXT NOT NULL,' +
        'start_time INTEGER NOT NULL,' +
        'end_time INTEGER NOT NULL,' +
        'created_at INTEGER NOT NULL,' +
        'updated_at INTEGER NOT NULL)',
    'CREATE INDEX IF NOT EXISTS idx_security_lookup ON security(type,key_name,end_time)',

    'CREATE TABLE IF NOT EXISTS door_schedule (' +
        'schedule_id TEXT PRIMARY KEY,' +
        'name TEXT NOT NULL,' +
        'mode TEXT NOT NULL,' +
        'week_mask INTEGER NOT NULL,' +
        'start_minute INTEGER NOT NULL,' +
        'end_minute INTEGER NOT NULL,' +
        'enabled INTEGER NOT NULL DEFAULT 1,' +
        'created_at INTEGER NOT NULL,' +
        'updated_at INTEGER NOT NULL)',
    'CREATE INDEX IF NOT EXISTS idx_door_schedule_enabled ON door_schedule(enabled,mode)',
];

const data = {};

data.init = async function () {
    if (initialized) {
        return;
    }
    if (!sqlite.isInitialized()) {
        throw new Error('data.init: sqlite must be initialized first');
    }
    // 初始化DDL逐条执行，业务跨表写入通过transaction显式控制。
    for (let i = 0; i < SCHEMA.length; i++) {
        await sqlite.execute(SCHEMA[i]);
    }
    initialized = true;
};

data.transaction = function (work) {
    if (!initialized) {
        throw new Error('data.transaction: data storage is not initialized');
    }
    return sqlite.transaction(work);
};

data.isInitialized = function () {
    return initialized;
};

data.destroy = async function () {
    initialized = false;
};

export default data;
