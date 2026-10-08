/** @layer storage @module data/door_schedule @depends storage/sqlite,data/sql */

import sqlite from '../sqlite/sqlite.js';
import sql from './sql.js';

function db(executor) {
    return executor || sqlite;
}

function fromRow(row) {
    return {
        scheduleId: row.schedule_id,
        name: row.name,
        mode: row.mode,
        weekMask: Number(row.week_mask),
        startMinute: Number(row.start_minute),
        endMinute: Number(row.end_minute),
        enabled: Number(row.enabled) === 1,
        createdAt: Number(row.created_at),
        updatedAt: Number(row.updated_at),
    };
}

const scheduleStorage = {};

scheduleStorage.list = async function (executor) {
    const rows = await db(executor).query(
        'SELECT * FROM door_schedule ORDER BY created_at,schedule_id'
    );
    return rows.map(fromRow);
};

scheduleStorage.insert = async function (item, executor) {
    const now = Date.now();
    return await db(executor).execute(
        'INSERT INTO door_schedule (' +
        'schedule_id,name,mode,week_mask,start_minute,end_minute,enabled,created_at,updated_at' +
        ') VALUES (' +
        sql.text(item.scheduleId) + ',' +
        sql.text(item.name) + ',' +
        sql.text(item.mode) + ',' +
        sql.integer(item.weekMask) + ',' +
        sql.integer(item.startMinute) + ',' +
        sql.integer(item.endMinute) + ',' +
        (item.enabled ? 1 : 0) + ',' + now + ',' + now + ')'
    );
};

scheduleStorage.clear = async function (executor) {
    return await db(executor).execute('DELETE FROM door_schedule');
};

scheduleStorage.replaceAll = async function (items, executor) {
    const target = db(executor);
    await scheduleStorage.clear(target);
    for (let i = 0; i < items.length; i++) {
        await scheduleStorage.insert(items[i], target);
    }
    return true;
};

export default scheduleStorage;
