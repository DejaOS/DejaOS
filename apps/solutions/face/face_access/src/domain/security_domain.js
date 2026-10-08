/** @layer domain @module security_domain @depends storage/data/security,data_utils */

import securityStorage from '../storage/data/security.js';
import { AppError } from '../core/error.js';
import { isObject, requireId, requireText, pageOf, pageResult, runBatch } from '../utils/data_utils.js';

function normalize(item) {
    if (!isObject(item)) throw new AppError('200000', '密钥数据必须是对象');
    const startTime = Number(item.startTime);
    const endTime = Number(item.endTime);
    if (!Number.isFinite(startTime) || !Number.isFinite(endTime) || startTime > endTime) {
        throw new AppError('200000', '密钥有效期格式错误');
    }
    return {
        securityId: requireId(item.securityId, 'securityId'),
        type: requireText(
            typeof item.type === 'string'
                ? item.type
                : (typeof item.type === 'number' && Number.isFinite(item.type) ? String(item.type) : ''),
            'type',
            32
        ),
        key: requireText(item.key, 'key', 128),
        value: requireText(item.value, 'value'),
        startTime: Math.trunc(startTime),
        endTime: Math.trunc(endTime),
    };
}

const securityDomain = {};

function toProtocol(security) {
    return {
        securityId: security.securityId,
        type: security.type,
        key: security.key,
        value: security.value,
        startTime: security.startTime,
        endTime: security.endTime,
    };
}

securityDomain.insert = async function (items) {
    return await runBatch(items, 'securityId', async function (item) {
        const security = normalize(item);
        if (await securityStorage.get(security.securityId)) await securityStorage.update(security);
        else await securityStorage.insert(security);
    });
};

securityDomain.modify = async function (items) {
    return await runBatch(items, 'securityId', async function (item) {
        const security = normalize(item);
        if (!await securityStorage.get(security.securityId)) throw new AppError('200000', 'security not found');
        await securityStorage.update(security);
    });
};

securityDomain.remove = async function (items) {
    return await runBatch(items, 'securityId', async function (item) {
        const id = requireId(typeof item === 'string' ? item : item.securityId, 'securityId');
        if (!await securityStorage.get(id)) throw new AppError('200000', 'security not found');
        await securityStorage.remove(id);
    });
};

securityDomain.clear = async function () {
    await securityStorage.clear();
    return true;
};

securityDomain.query = async function (input) {
    const data = input || {};
    const paging = pageOf(data, 100);
    const filters = { securityId: data.securityId, type: data.type, key: data.key };
    const total = await securityStorage.count(filters);
    const content = (await securityStorage.list(filters, paging.page, paging.size)).map(toProtocol);
    return pageResult(content, paging.page, paging.size, total);
};

securityDomain.findValid = async function (input) {
    const data = input || {};
    if (data.securityId === undefined && data.type === undefined &&
        data.key === undefined && data.value === undefined) {
        throw new AppError('200000', '有效密钥查询必须提供标识条件');
    }
    return await securityStorage.findValid({
        securityId: data.securityId,
        type: data.type,
        key: data.key,
        value: data.value,
        validAt: data.time === undefined ? Math.floor(Date.now() / 1000) : data.time,
    });
};

export default securityDomain;
