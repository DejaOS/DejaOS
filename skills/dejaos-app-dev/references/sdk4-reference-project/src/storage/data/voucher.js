/** @layer storage @module data/voucher @depends storage/sqlite,data/sql */

import sqlite from '../sqlite/sqlite.js';
import sql from './sql.js';

function fromRow(row) {
    return {
        keyId: row.key_id,
        type: row.type,
        code: row.code,
        userId: row.user_id,
        extra: sql.parseJson(row.extra_json, {}),
        createdAt: row.created_at,
        updatedAt: row.updated_at,
    };
}

function where(filters) {
    const input = filters || {};
    const parts = [];
    if (input.keyId !== undefined) parts.push('key_id=' + sql.text(input.keyId));
    if (Array.isArray(input.keyIds) && input.keyIds.length) parts.push('key_id IN ' + sql.textList(input.keyIds));
    if (input.userId !== undefined) parts.push('user_id=' + sql.text(input.userId));
    if (input.type !== undefined) parts.push('type=' + sql.text(input.type));
    if (input.code !== undefined) parts.push('code=' + sql.text(input.code));
    return parts.length ? ' WHERE ' + parts.join(' AND ') : '';
}

const voucherStorage = {};

function db(executor) {
    return executor || sqlite;
}

voucherStorage.insert = async function (voucher, executor) {
    const now = Date.now();
    return await db(executor).execute(
        'INSERT INTO voucher (key_id,type,code,user_id,extra_json,created_at,updated_at) VALUES (' +
        sql.text(voucher.keyId) + ',' + sql.text(voucher.type) + ',' + sql.text(voucher.code) + ',' +
        sql.text(voucher.userId) + ',' + sql.json(voucher.extra, {}) + ',' + now + ',' + now + ')'
    );
};

voucherStorage.update = async function (voucher, executor) {
    return await db(executor).execute(
        'UPDATE voucher SET type=' + sql.text(voucher.type) + ',code=' + sql.text(voucher.code) +
        ',user_id=' + sql.text(voucher.userId) + ',extra_json=' + sql.json(voucher.extra, {}) +
        ',updated_at=' + Date.now() + ' WHERE key_id=' + sql.text(voucher.keyId)
    );
};

voucherStorage.get = async function (keyId, executor) {
    const rows = await db(executor).query('SELECT * FROM voucher WHERE key_id=' + sql.text(keyId) + ' LIMIT 1');
    return rows.length ? fromRow(rows[0]) : null;
};

voucherStorage.findByCode = async function (type, code, executor) {
    const rows = await db(executor).query(
        'SELECT * FROM voucher WHERE type=' + sql.text(type) + ' AND code=' + sql.text(code) + ' LIMIT 1'
    );
    return rows.length ? fromRow(rows[0]) : null;
};

voucherStorage.findByUserType = async function (userId, type, executor) {
    const rows = await db(executor).query(
        'SELECT * FROM voucher WHERE user_id=' + sql.text(userId) + ' AND type=' + sql.text(type) + ' LIMIT 1'
    );
    return rows.length ? fromRow(rows[0]) : null;
};

voucherStorage.list = async function (filters, page, size, executor) {
    const rows = await db(executor).query(
        'SELECT * FROM voucher' + where(filters) + ' ORDER BY key_id' +
        ' LIMIT ' + sql.integer(size) + ' OFFSET ' + sql.integer(page * size)
    );
    return rows.map(fromRow);
};

voucherStorage.count = async function (filters, executor) {
    const rows = await db(executor).query('SELECT COUNT(*) AS total FROM voucher' + where(filters));
    return rows.length ? rows[0].total : 0;
};

voucherStorage.remove = async function (keyId, executor) {
    return await db(executor).execute('DELETE FROM voucher WHERE key_id=' + sql.text(keyId));
};

voucherStorage.removeByUser = async function (userId, executor) {
    return await db(executor).execute('DELETE FROM voucher WHERE user_id=' + sql.text(userId));
};

voucherStorage.clear = async function (executor) {
    return await db(executor).execute('DELETE FROM voucher');
};

export default voucherStorage;
