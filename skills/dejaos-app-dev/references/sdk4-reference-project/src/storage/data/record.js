/** @layer storage @module data/record @depends storage/sqlite,data/sql */

import sqlite from '../sqlite/sqlite.js';
import sql from './sql.js';

function fromRow(row) {
    return {
        id: row.record_id,
        keyId: row.key_id || '',
        permissionId: row.permission_id || '',
        userId: row.user_id || '',
        name: row.name,
        type: row.type,
        code: row.code,
        imagePath: row.image_path,
        door: row.door,
        timeStamp: row.time_stamp,
        result: row.result,
        extra: sql.parseJson(row.extra_json, {}),
        message: row.message,
        uploadState: row.upload_state,
        createdAt: row.created_at,
    };
}

function where(filters) {
    const input = filters || {};
    const parts = [];
    if (input.id !== undefined) parts.push('record_id=' + sql.text(input.id));
    if (Array.isArray(input.recordIds) && input.recordIds.length) {
        parts.push('record_id IN ' + sql.textList(input.recordIds));
    }
    if (Array.isArray(input.userIds) && input.userIds.length) {
        parts.push('user_id IN ' + sql.textList(input.userIds));
    }
    if (input.userId !== undefined) parts.push('user_id=' + sql.text(input.userId));
    if (input.name) parts.push("name LIKE " + sql.like(input.name) + " ESCAPE '\\'");
    // UI 搜索需要跨姓名和人员ID匹配，统一在数据库侧过滤后再分页。
    if (input.keyword) {
        parts.push("(name LIKE " + sql.like(input.keyword) + " ESCAPE '\\' OR user_id LIKE "
            + sql.like(input.keyword) + " ESCAPE '\\')");
    }
    if (input.stranger === true) parts.push("(user_id='' AND name='')");
    if (input.startTime !== undefined) parts.push('time_stamp>=' + sql.integer(input.startTime));
    if (input.endTime !== undefined) parts.push('time_stamp<=' + sql.integer(input.endTime));
    if (input.uploadState !== undefined) parts.push('upload_state=' + sql.integer(input.uploadState));
    return parts.length ? ' WHERE ' + parts.join(' AND ') : '';
}

const recordStorage = {};

function db(executor) {
    return executor || sqlite;
}

recordStorage.insert = async function (record, executor) {
    return await db(executor).execute(
        'INSERT INTO pass_record (' +
        'record_id,key_id,permission_id,user_id,name,type,code,image_path,door,time_stamp,result,extra_json,message,upload_state,created_at' +
        ') VALUES (' +
        sql.text(record.id) + ',' + sql.text(record.keyId || '') + ',' + sql.text(record.permissionId || '') + ',' +
        sql.text(record.userId || '') + ',' + sql.text(record.name || '') + ',' + sql.text(record.type) + ',' +
        sql.text(record.code || '') + ',' + sql.text(record.imagePath || '') + ',' + sql.text(record.door || '') + ',' +
        sql.integer(record.timeStamp) + ',' + sql.integer(record.result) + ',' + sql.json(record.extra, {}) + ',' +
        sql.text(record.message || '') + ',' + sql.integer(record.uploadState, 0) + ',' + Date.now() + ')'
    );
};

recordStorage.get = async function (recordId, executor) {
    const rows = await db(executor).query(
        'SELECT * FROM pass_record WHERE record_id=' + sql.text(recordId) + ' LIMIT 1'
    );
    return rows.length ? fromRow(rows[0]) : null;
};

recordStorage.findByImagePath = async function (imagePath) {
    const rows = await sqlite.query(
        'SELECT * FROM pass_record WHERE image_path=' + sql.text(imagePath) + ' LIMIT 1'
    );
    return rows.length ? fromRow(rows[0]) : null;
};

recordStorage.list = async function (filters, page, size) {
    const rows = await sqlite.query(
        'SELECT * FROM pass_record' + where(filters) + ' ORDER BY time_stamp DESC' +
        ' LIMIT ' + sql.integer(size) + ' OFFSET ' + sql.integer(page * size)
    );
    return rows.map(fromRow);
};

recordStorage.listPending = async function (size) {
    const rows = await sqlite.query(
        'SELECT * FROM pass_record WHERE upload_state=0 ORDER BY time_stamp ASC LIMIT ' + sql.integer(size)
    );
    return rows.map(fromRow);
};

recordStorage.oldest = async function (executor) {
    const rows = await db(executor).query('SELECT * FROM pass_record ORDER BY time_stamp ASC LIMIT 1');
    return rows.length ? fromRow(rows[0]) : null;
};

recordStorage.listImages = async function (filters) {
    const clause = where(filters);
    const rows = await sqlite.query(
        'SELECT image_path FROM pass_record' +
        (clause ? clause + ' AND ' : ' WHERE ') + "image_path<>''"
    );
    return rows.map(function (row) { return row.image_path; });
};

recordStorage.count = async function (filters, executor) {
    const rows = await db(executor).query('SELECT COUNT(*) AS total FROM pass_record' + where(filters));
    return rows.length ? rows[0].total : 0;
};

recordStorage.markUploaded = async function (recordId) {
    return await sqlite.execute(
        'UPDATE pass_record SET upload_state=1 WHERE record_id=' + sql.text(recordId)
    );
};

recordStorage.remove = async function (recordId, executor) {
    return await db(executor).execute('DELETE FROM pass_record WHERE record_id=' + sql.text(recordId));
};

recordStorage.removeWhere = async function (filters) {
    const clause = where(filters);
    if (!clause) {
        throw new Error('recordStorage.removeWhere: delete condition is required');
    }
    return await sqlite.execute('DELETE FROM pass_record' + clause);
};

recordStorage.clear = async function () {
    return await sqlite.execute('DELETE FROM pass_record');
};

export default recordStorage;
