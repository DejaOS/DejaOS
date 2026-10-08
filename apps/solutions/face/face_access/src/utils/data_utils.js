/** @layer utils @module data_utils @depends core/error */

import { AppError } from '../core/error.js';

export function isObject(value) {
    return !!value && typeof value === 'object' && !Array.isArray(value);
}

export function requireId(value, name) {
    if (typeof value !== 'string' || value.length === 0 || value.length > 128 ||
        value.indexOf('/') >= 0 || value.indexOf('\\') >= 0 || value.indexOf('..') >= 0) {
        throw new AppError('200000', (name || 'id') + '格式错误');
    }
    return value;
}

export function requireText(value, name, maxLength) {
    if (typeof value !== 'string' || value.length === 0 || (maxLength && value.length > maxLength)) {
        throw new AppError('200000', (name || 'value') + '格式错误');
    }
    return value;
}

export function requireArray(value, name) {
    if (!Array.isArray(value)) {
        throw new AppError('200000', (name || 'data') + '必须是数组');
    }
    return value;
}

export function pageOf(input, maxSize) {
    const value = input || {};
    if (!Number.isInteger(value.page) || value.page < 0) {
        throw new AppError('200000', 'page必须是大于等于0的整数');
    }
    if (!Number.isInteger(value.size) || value.size <= 0 || value.size > maxSize) {
        throw new AppError('200000', 'size必须是1到' + maxSize + '之间的整数');
    }
    return { page: value.page, size: value.size };
}

export function pageResult(content, page, size, total) {
    return {
        content: content,
        page: page,
        size: size,
        total: total,
        totalPage: Math.ceil(total / size),
        count: content.length,
    };
}

export async function runBatch(items, idKey, handler) {
    requireArray(items);
    if (items.length > 100) {
        throw new AppError('200000', '批量数据不能超过100条');
    }
    const errors = [];
    for (let i = 0; i < items.length; i++) {
        const item = items[i];
        try {
            // 每一项由Domain自行决定是否开启事务，批次本身允许部分成功。
            await handler(item);
        } catch (e) {
            const error = { errmsg: e && e.message ? e.message : String(e) };
            error[idKey] = typeof item === 'string'
                ? item
                : (item && item[idKey] ? item[idKey] : 'unknown');
            errors.push(error);
        }
    }
    if (errors.length) {
        throw new AppError('100000', '部分数据处理失败', undefined, errors);
    }
    return true;
}
