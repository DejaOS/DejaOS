/** @layer storage @module data/security @depends storage/sqlite,data/sql */

import sqlite from '../sqlite/sqlite.js';
import sql from './sql.js';

function fromRow(row) {
    return {
        securityId: row.security_id,
        type: row.type,
        key: row.key_name,
        value: row.key_value,
        startTime: row.start_time,
        endTime: row.end_time,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
    };
}

function where(filters) {
    const input = filters || {};
    const parts = [];
    if (input.securityId !== undefined) parts.push('security_id=' + sql.text(input.securityId));
    if (Array.isArray(input.securityIds) && input.securityIds.length) {
        parts.push('security_id IN ' + sql.textList(input.securityIds));
    }
    if (input.type !== undefined) parts.push('type=' + sql.text(input.type));
    if (input.key !== undefined) parts.push('key_name=' + sql.text(input.key));
    if (input.value !== undefined) parts.push('key_value=' + sql.text(input.value));
    if (input.validAt !== undefined) {
        parts.push('start_time<=' + sql.integer(input.validAt));
        parts.push('end_time>=' + sql.integer(input.validAt));
    }
    return parts.length ? ' WHERE ' + parts.join(' AND ') : '';
}

const securityStorage = {};

securityStorage.insert = async function (security) {
    const now = Date.now();
    return await sqlite.execute(
        'INSERT INTO security (security_id,type,key_name,key_value,start_time,end_time,created_at,updated_at) VALUES (' +
        sql.text(security.securityId) + ',' + sql.text(security.type) + ',' + sql.text(security.key) + ',' +
        sql.text(security.value) + ',' + sql.integer(security.startTime) + ',' + sql.integer(security.endTime) +
        ',' + now + ',' + now + ')'
    );
};

securityStorage.update = async function (security) {
    return await sqlite.execute(
        'UPDATE security SET type=' + sql.text(security.type) + ',key_name=' + sql.text(security.key) +
        ',key_value=' + sql.text(security.value) + ',start_time=' + sql.integer(security.startTime) +
        ',end_time=' + sql.integer(security.endTime) + ',updated_at=' + Date.now() +
        ' WHERE security_id=' + sql.text(security.securityId)
    );
};

securityStorage.get = async function (securityId) {
    const rows = await sqlite.query(
        'SELECT * FROM security WHERE security_id=' + sql.text(securityId) + ' LIMIT 1'
    );
    return rows.length ? fromRow(rows[0]) : null;
};

securityStorage.list = async function (filters, page, size) {
    const rows = await sqlite.query(
        'SELECT * FROM security' + where(filters) + ' ORDER BY security_id' +
        ' LIMIT ' + sql.integer(size) + ' OFFSET ' + sql.integer(page * size)
    );
    return rows.map(fromRow);
};

securityStorage.count = async function (filters) {
    const rows = await sqlite.query('SELECT COUNT(*) AS total FROM security' + where(filters));
    return rows.length ? rows[0].total : 0;
};

securityStorage.findValid = async function (filters) {
    const rows = await sqlite.query('SELECT * FROM security' + where(filters) + ' ORDER BY end_time DESC LIMIT 1');
    return rows.length ? fromRow(rows[0]) : null;
};

securityStorage.remove = async function (securityId) {
    return await sqlite.execute('DELETE FROM security WHERE security_id=' + sql.text(securityId));
};

securityStorage.clear = async function () {
    return await sqlite.execute('DELETE FROM security');
};

export default securityStorage;
