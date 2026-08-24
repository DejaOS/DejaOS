/** @layer storage @module data/person @depends storage/sqlite,data/sql */

import sqlite from '../sqlite/sqlite.js';
import sql from './sql.js';

function fromRow(row) {
    return {
        userId: row.user_id,
        name: row.name,
        extra: sql.parseJson(row.extra_json, {}),
        permissionIds: sql.parseJson(row.permission_ids_json, []),
        createdAt: row.created_at,
        updatedAt: row.updated_at,
    };
}

function where(filters) {
    const input = filters || {};
    const parts = [];
    if (input.userId !== undefined) {
        parts.push('user_id=' + sql.text(input.userId));
    }
    if (Array.isArray(input.userIds) && input.userIds.length > 0) {
        parts.push('user_id IN ' + sql.textList(input.userIds));
    }
    if (input.name) {
        parts.push("name LIKE " + sql.like(input.name) + " ESCAPE '\\'");
    if (input.keyword) {
        // UI只有一个搜索框，人员ID和姓名必须使用OR匹配，不能拆成两个AND条件。
        parts.push("(user_id LIKE " + sql.like(input.keyword) + " ESCAPE '\\' OR name LIKE " +
            sql.like(input.keyword) + " ESCAPE '\\')");
    }
    }
    return parts.length ? ' WHERE ' + parts.join(' AND ') : '';
}

const personStorage = {};

function db(executor) {
    return executor || sqlite;
}

personStorage.insert = async function (person, executor) {
    const now = Date.now();
    return await db(executor).execute(
        'INSERT INTO person (user_id,name,extra_json,permission_ids_json,created_at,updated_at) VALUES (' +
        sql.text(person.userId) + ',' + sql.text(person.name) + ',' +
        sql.json(person.extra, {}) + ',' + sql.json(person.permissionIds, []) + ',' + now + ',' + now + ')'
    );
};

personStorage.update = async function (person, executor) {
    return await db(executor).execute(
        'UPDATE person SET name=' + sql.text(person.name) +
        ',extra_json=' + sql.json(person.extra, {}) +
        ',permission_ids_json=' + sql.json(person.permissionIds, []) +
        ',updated_at=' + Date.now() +
        ' WHERE user_id=' + sql.text(person.userId)
    );
};

personStorage.get = async function (userId, executor) {
    const rows = await db(executor).query('SELECT * FROM person WHERE user_id=' + sql.text(userId) + ' LIMIT 1');
    return rows.length ? fromRow(rows[0]) : null;
};

personStorage.list = async function (filters, page, size, executor) {
    const rows = await db(executor).query(
        'SELECT * FROM person' + where(filters) + ' ORDER BY user_id' +
        ' LIMIT ' + sql.integer(size) + ' OFFSET ' + sql.integer(page * size)
    );
    return rows.map(fromRow);
};

personStorage.count = async function (filters, executor) {
    const rows = await db(executor).query('SELECT COUNT(*) AS total FROM person' + where(filters));
    return rows.length ? rows[0].total : 0;
};

personStorage.remove = async function (userId, executor) {
    return await db(executor).execute('DELETE FROM person WHERE user_id=' + sql.text(userId));
};

personStorage.clear = async function (executor) {
    return await db(executor).execute('DELETE FROM person');
};

export default personStorage;
