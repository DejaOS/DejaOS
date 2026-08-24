/** @layer domain @module permission_domain @depends storage/data/permission,data_utils */

import permissionStorage from '../storage/data/permission.js';
import personStorage from '../storage/data/person.js';
import dataStorage from '../storage/data/data.js';
import { AppError } from '../core/error.js';
import { isObject, requireId, pageOf, pageResult, runBatch } from '../utils/data_utils.js';

function normalize(item) {
    if (!isObject(item) || !isObject(item.time)) {
        throw new AppError('200000', '权限及time必须是对象');
    }
    const type = Number(item.time.type);
    if (![0, 1, 2, 3].includes(type)) throw new AppError('200000', 'time.type不支持');
    const range = item.time.range || {};
    const beginTime = type === 0 ? 0 : Number(range.beginTime);
    const endTime = type === 0 ? 0 : Number(range.endTime);
    if (type !== 0 && (!Number.isFinite(beginTime) || !Number.isFinite(endTime) || beginTime > endTime)) {
        throw new AppError('200000', '权限有效期格式错误');
    }
    let period = null;
    if (type === 2) period = item.time.dayPeriodTime;
    if (type === 3) period = item.time.weekPeriodTime;
    if ((type === 2 || type === 3) && !period) throw new AppError('200000', '权限周期不能为空');
    return {
        permissionId: requireId(item.permissionId, 'permissionId'),
        door: item.index === undefined ? 0 : Number(item.index),
        timeType: type,
        beginTime: beginTime,
        endTime: endTime,
        period: period,
        extra: isObject(item.extra) ? item.extra : {},
    };
}

function toProtocol(permission) {
    const time = {
        type: permission.timeType,
        range: permission.timeType === 0 ? undefined : {
            beginTime: permission.beginTime,
            endTime: permission.endTime,
        },
        dayPeriodTime: permission.timeType === 2 ? permission.period : undefined,
        weekPeriodTime: permission.timeType === 3 ? permission.period : undefined,
    };
    return {
        permissionId: permission.permissionId,
        index: permission.door,
        extra: permission.extra,
        time: time,
    };
}

function inDayRange(range, date) {
    if (typeof range !== 'string') return false;
    const parts = range.split('-');
    if (parts.length !== 2) return false;
    function minutes(value) {
        const fields = value.split(':');
        if (fields.length !== 2) return -1;
        return Number(fields[0]) * 60 + Number(fields[1]);
    }
    const start = minutes(parts[0]);
    const end = minutes(parts[1]);
    const current = date.getHours() * 60 + date.getMinutes();
    return start >= 0 && end >= 0 && current >= start && current < end;
}

function anyRange(value, date) {
    return typeof value === 'string' && value.split('|').some(function (range) {
        return inDayRange(range, date);
    });
}

const permissionDomain = {};

async function unlinkFromPersons(permissionId, tx) {
    const total = await personStorage.count({}, tx);
    if (!total) return;
    const persons = await personStorage.list({}, 0, total, tx);
    for (let i = 0; i < persons.length; i++) {
        const person = persons[i];
        const next = person.permissionIds.filter(function (id) { return id !== permissionId; });
        if (next.length !== person.permissionIds.length) {
            person.permissionIds = next;
            await personStorage.update(person, tx);
        }
    }
}

permissionDomain.insert = async function (items) {
    return await runBatch(items, 'permissionId', async function (item) {
        const permission = normalize(item);
        if (await permissionStorage.get(permission.permissionId)) await permissionStorage.update(permission);
        else await permissionStorage.insert(permission);
    });
};

permissionDomain.modify = async function (items) {
    return await runBatch(items, 'permissionId', async function (item) {
        const permission = normalize(item);
        if (!await permissionStorage.get(permission.permissionId)) throw new AppError('200000', 'permission not found');
        await permissionStorage.update(permission);
    });
};

permissionDomain.remove = async function (input) {
    const ids = Array.isArray(input) ? input : (input && input.permissionIds);
    return await runBatch(ids, 'permissionId', async function (item) {
        const id = requireId(typeof item === 'string' ? item : item.permissionId, 'permissionId');
        await dataStorage.transaction(async function (tx) {
            if (!await permissionStorage.get(id, tx)) throw new AppError('200000', 'permission not found');
            await permissionStorage.remove(id, tx);
            await unlinkFromPersons(id, tx);
        });
    });
};

permissionDomain.clear = async function () {
    await dataStorage.transaction(async function (tx) {
        await permissionStorage.clear(tx);
        const total = await personStorage.count({}, tx);
        if (total) {
            const persons = await personStorage.list({}, 0, total, tx);
            for (let i = 0; i < persons.length; i++) {
                if (persons[i].permissionIds.length) {
                    persons[i].permissionIds = [];
                    await personStorage.update(persons[i], tx);
                }
            }
        }
    });
    return true;
};

permissionDomain.query = async function (input) {
    const data = input || {};
    const paging = pageOf(data, 100);
    const filters = { permissionId: data.permissionId };
    const total = await permissionStorage.count(filters);
    const rows = await permissionStorage.list(filters, paging.page, paging.size);
    return pageResult(rows.map(toProtocol), paging.page, paging.size, total);
};

permissionDomain.getMany = async function (permissionIds) {
    return await permissionStorage.getMany(permissionIds);
};

permissionDomain.isValid = function (permission, timeSeconds) {
    if (!permission) return false;
    if (permission.timeType === 0) return true;
    const now = Number.isFinite(timeSeconds) ? timeSeconds : Math.floor(Date.now() / 1000);
    if (now < permission.beginTime || now > permission.endTime) return false;
    if (permission.timeType === 1) return true;
    const date = new Date(now * 1000);
    if (permission.timeType === 2) return anyRange(permission.period, date);
    if (permission.timeType === 3 && isObject(permission.period)) {
        const day = date.getDay() === 0 ? 7 : date.getDay();
        return anyRange(permission.period[day] || permission.period[String(day)], date);
    }
    return false;
};

export default permissionDomain;
