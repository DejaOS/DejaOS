/** @layer storage @module data/permission @depends storage/sqlite,data/sql */

import sqlite from '../sqlite/sqlite.js';
import sql from './sql.js';

function fromRow(row) {
    return {
        permissionId: row.permission_id,
        door: row.door,
        timeType: row.time_type,
        beginTime: row.begin_time,
        endTime: row.end_time,
        period: sql.parseJson(row.period_json, null),
        extra: sql.parseJson(row.extra_json, {}),
        createdAt: row.created_at,
        updatedAt: row.updated_at,
    };
}

function where(filters) {
    const input = filters || {};
    const parts = [];
    if (input.permissionId !== undefined) parts.push('permission_id=' + sql.text(input.permissionId));
    if (Array.isArray(input.permissionIds) && input.permissionIds.length) {
        parts.push('permission_id IN ' + sql.textList(input.permissionIds));
    }
    return parts.length ? ' WHERE ' + parts.join(' AND ') : '';
}

const permissionStorage = {};

function db(executor) {
    return executor || sqlite;
}

permissionStorage.insert = async function (permission, executor) {
    const now = Date.now();
    return await db(executor).execute(
        'INSERT INTO permission (permission_id,door,time_type,begin_time,end_time,period_json,extra_json,created_at,updated_at) VALUES (' +
        sql.text(permission.permissionId) + ',' + sql.integer(permission.door, 0) + ',' +
        sql.integer(permission.timeType) + ',' + sql.integer(permission.beginTime, 0) + ',' +
        sql.integer(permission.endTime, 0) + ',' + sql.json(permission.period, null) + ',' +
        sql.json(permission.extra, {}) + ',' + now + ',' + now + ')'
    );
};

permissionStorage.update = async function (permission, executor) {
    return await db(executor).execute(
        'UPDATE permission SET door=' + sql.integer(permission.door, 0) +
        ',time_type=' + sql.integer(permission.timeType) +
        ',begin_time=' + sql.integer(permission.beginTime, 0) +
        ',end_time=' + sql.integer(permission.endTime, 0) +
        ',period_json=' + sql.json(permission.period, null) +
        ',extra_json=' + sql.json(permission.extra, {}) +
        ',updated_at=' + Date.now() + ' WHERE permission_id=' + sql.text(permission.permissionId)
    );
};

permissionStorage.get = async function (permissionId, executor) {
    const rows = await db(executor).query(
        'SELECT * FROM permission WHERE permission_id=' + sql.text(permissionId) + ' LIMIT 1'
    );
    return rows.length ? fromRow(rows[0]) : null;
};

permissionStorage.getMany = async function (permissionIds, executor) {
    if (!Array.isArray(permissionIds) || permissionIds.length === 0) return [];
    const rows = await db(executor).query(
        'SELECT * FROM permission WHERE permission_id IN ' + sql.textList(permissionIds)
    );
    return rows.map(fromRow);
};

permissionStorage.list = async function (filters, page, size, executor) {
    const rows = await db(executor).query(
        'SELECT * FROM permission' + where(filters) + ' ORDER BY permission_id' +
        ' LIMIT ' + sql.integer(size) + ' OFFSET ' + sql.integer(page * size)
    );
    return rows.map(fromRow);
};

permissionStorage.count = async function (filters, executor) {
    const rows = await db(executor).query('SELECT COUNT(*) AS total FROM permission' + where(filters));
    return rows.length ? rows[0].total : 0;
};

permissionStorage.remove = async function (permissionId, executor) {
    return await db(executor).execute('DELETE FROM permission WHERE permission_id=' + sql.text(permissionId));
};

permissionStorage.clear = async function (executor) {
    return await db(executor).execute('DELETE FROM permission');
};

export default permissionStorage;
