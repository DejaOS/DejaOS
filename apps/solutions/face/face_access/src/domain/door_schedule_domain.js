/** @layer domain @module door_schedule_domain @depends dxStd,storage/data */

import dxStd from '../../dxmodules/dxStd.js';
import scheduleStorage from '../storage/data/door_schedule.js';
import dataStorage from '../storage/data/data.js';
import { AppError } from '../core/error.js';

const MODE = { NORMAL: 'normal', OPEN: 'open', CLOSED: 'closed' };
const MAX_SCHEDULES = 32;

function minuteOf(value, field) {
    const text = String(value || '').trim();
    const match = /^(\d{2}):(\d{2})$/.exec(text);
    if (!match) throw new AppError('200000', field + '格式必须为HH:mm');
    const hour = Number(match[1]);
    const minute = Number(match[2]);
    if (hour > 23 || minute > 59) throw new AppError('200000', field + '无效');
    return hour * 60 + minute;
}

function timeOf(minutes) {
    const hour = Math.floor(minutes / 60);
    const minute = minutes % 60;
    return (hour < 10 ? '0' : '') + hour + ':' + (minute < 10 ? '0' : '') + minute;
}

function maskOf(weekdays) {
    if (!Array.isArray(weekdays) || weekdays.length === 0) {
        throw new AppError('200000', 'weekdays不能为空');
    }
    let mask = 0;
    for (let i = 0; i < weekdays.length; i++) {
        const day = Number(weekdays[i]);
        if (!Number.isInteger(day) || day < 1 || day > 7) {
            throw new AppError('200000', 'weekdays仅支持1到7');
        }
        mask |= 1 << (day - 1);
    }
    return mask;
}

function weekdaysOf(mask) {
    const result = [];
    for (let day = 1; day <= 7; day++) {
        if ((mask & (1 << (day - 1))) !== 0) result.push(day);
    }
    return result;
}

function normalize(item) {
    if (!item || typeof item !== 'object' || Array.isArray(item)) {
        throw new AppError('200000', '时段必须是对象');
    }
    const mode = String(item.mode || '');
    if (mode !== MODE.OPEN && mode !== MODE.CLOSED) {
        throw new AppError('200000', 'mode仅支持open或closed');
    }
    const name = String(item.name || '').trim();
    if (!name || name.length > 32) throw new AppError('200000', '时段名称长度必须为1到32');
    const startMinute = minuteOf(item.startTime, 'startTime');
    const endMinute = minuteOf(item.endTime, 'endTime');
    if (startMinute === endMinute) throw new AppError('200000', '开始时间不能等于结束时间');
    return {
        scheduleId: String(item.scheduleId || dxStd.genRandomStr(12)),
        name: name,
        mode: mode,
        weekMask: maskOf(item.weekdays),
        startMinute: startMinute,
        endMinute: endMinute,
        enabled: item.enabled !== false && Number(item.enabled) !== 0,
    };
}

function toPublic(item) {
    return {
        scheduleId: item.scheduleId,
        name: item.name,
        mode: item.mode,
        weekdays: weekdaysOf(item.weekMask),
        startTime: timeOf(item.startMinute),
        endTime: timeOf(item.endMinute),
        enabled: item.enabled === true,
    };
}

function dayOf(date) {
    return date.getDay() === 0 ? 7 : date.getDay();
}

function hasDay(mask, day) {
    return (mask & (1 << (day - 1))) !== 0;
}

function matches(item, date) {
    if (!item.enabled) return false;
    const minute = date.getHours() * 60 + date.getMinutes();
    const today = dayOf(date);
    if (item.startMinute < item.endMinute) {
        return hasDay(item.weekMask, today)
            && minute >= item.startMinute && minute < item.endMinute;
    }
    // 跨天时段归属开始日：当天开始段，或前一天开始后延续到今天的结束段。
    if (minute >= item.startMinute) return hasDay(item.weekMask, today);
    const previous = today === 1 ? 7 : today - 1;
    return minute < item.endMinute && hasDay(item.weekMask, previous);
}

const scheduleDomain = { MODE: MODE };

scheduleDomain.list = async function () {
    return (await scheduleStorage.list()).map(toPublic);
};

scheduleDomain.replaceAll = async function (input) {
    const items = Array.isArray(input) ? input : (input && input.items);
    if (!Array.isArray(items)) throw new AppError('200000', 'items必须是数组');
    if (items.length > MAX_SCHEDULES) throw new AppError('200000', '时段数量不能超过32条');
    const normalized = items.map(normalize);
    const ids = new Set();
    for (let i = 0; i < normalized.length; i++) {
        if (ids.has(normalized[i].scheduleId)) throw new AppError('200000', 'scheduleId重复');
        ids.add(normalized[i].scheduleId);
    }
    await dataStorage.transaction(function (tx) {
        return scheduleStorage.replaceAll(normalized, tx);
    });
    return normalized.map(toPublic);
};

scheduleDomain.getCurrentState = async function (timeMs) {
    const date = new Date(Number.isFinite(timeMs) ? timeMs : Date.now());
    const rows = await scheduleStorage.list();
    const active = rows.filter(function (item) { return matches(item, date); });
    // 常闭优先于常开；消防与临时远程控制由door_domain在更高优先级处理。
    let mode = MODE.NORMAL;
    if (active.some(function (item) { return item.mode === MODE.CLOSED; })) mode = MODE.CLOSED;
    else if (active.some(function (item) { return item.mode === MODE.OPEN; })) mode = MODE.OPEN;
    return { mode: mode, scheduleIds: active.map(function (item) { return item.scheduleId; }) };
};

scheduleDomain.getOverview = async function () {
    return { items: await scheduleDomain.list(), state: await scheduleDomain.getCurrentState() };
};

export default scheduleDomain;
