/**
 * @layer    view
 * @module   record_store
 * @fires    CMD_GET_RECORDS
 * @listens  none
 * @depends  event_bus,commands
 *
 * UI 通行记录适配器：只做 Command 调用和显示模型转换，不直接访问 Domain/Storage。
 */

import eventBus from '../../../core/event_bus.js';
import commands from '../../../core/commands.js';

function pad2(n) {
    return n < 10 ? '0' + n : String(n);
}

function object(value) {
    if (value && typeof value === 'object' && !Array.isArray(value)) return value;
    if (typeof value === 'string' && value) {
        try {
            const parsed = JSON.parse(value);
            return parsed && typeof parsed === 'object' ? parsed : {};
        } catch (_e) {}
    }
    return {};
}

function evidence(value, fallback) {
    const item = object(value);
    const base = fallback || {};
    return {
        userId: String(item.userId || base.userId || ''),
        name: String(item.name || base.name || ''),
        keyId: String(item.keyId || base.keyId || ''),
        type: String(item.type || base.type || ''),
        code: String(item.code || base.code || ''),
        factor: String(item.factor || ''),
        imagePath: String(item.imagePath || base.imagePath || ''),
    };
}

function verification(item, extra, code) {
    const verify = object(extra.verify);
    const legacyMode = String(extra.verifyMode || '');
    const mode = String(verify.mode || legacyMode || (item.message === 'ONLINE_ALLOW' ? 'online' : 'single'));
    const fallback = {
        userId: item.userId,
        name: item.name,
        keyId: item.keyId,
        type: item.type,
        code: code,
        imagePath: item.imagePath || '',
    };
    const primary = evidence(verify.primary, fallback);
    let additional = Array.isArray(verify.additional)
        ? verify.additional.map(function (row) { return evidence(row); })
        : [];
    // 兼容本版本早期真机数据：双人使用verifier，多凭证使用factors。
    if (!additional.length && verify.verifier) additional = [evidence(verify.verifier)];
    if (!additional.length && Array.isArray(verify.factors) && verify.factors.length > 1) {
        additional = verify.factors.slice(1).map(function (row) { return evidence(row); });
    }
    return {
        mode: mode,
        sessionId: String(verify.sessionId || ''),
        primary: primary,
        additional: additional,
    };
}

function toRecord(record) {
    const item = record || {};
    const extra = object(item.extra);
    const type = String(item.type || '');
    const rawCode = String(item.code || '');
    const imagePath = String(item.imagePath || (type === '300' && rawCode.indexOf('/data/') === 0 ? rawCode : ''));
    const code = type === '300' || type === '500' ? '' : rawCode;
    return {
        id: String(item.id || ''),
        keyId: String(item.keyId || ''),
        type: type,
        code: code,
        userId: String(item.userId || ''),
        name: String(item.name || ''),
        idCard: String(extra.idCard || ''),
        timeStamp: Number(item.timeStamp || 0),
        result: Number(item.result || 0),
        uploadState: Number(item.uploadState) === 1 ? 1 : 0,
        message: String(item.message || ''),
        // 兼容历史人脸记录：旧结构可能仍把图片路径放在 code 字段。
        imagePath: imagePath,
        extra: extra,
        verify: verification(item, extra, code),
    };
}

const recordStore = {};

recordStore.list = async function (page, size, keyword, strangerLabel) {
    const query = {
        page: Number.isInteger(page) && page >= 0 ? page : 0,
        size: Number.isInteger(size) && size > 0 ? size : 10,
    };
    const kw = String(keyword || '').trim();
    if (kw) {
        const stranger = String(strangerLabel || '').trim().toLowerCase();
        if (stranger && stranger.indexOf(kw.toLowerCase()) >= 0) {
            query.stranger = true;
        } else {
            query.keyword = kw;
        }
    }
    const result = await eventBus.execute(commands.GET_RECORDS, query);
    const content = result && Array.isArray(result.content) ? result.content : [];
    return {
        records: content.map(toRecord),
        page: result && Number.isInteger(result.page) ? result.page : query.page,
        total: result ? Number(result.total || 0) : 0,
        totalPage: result ? Number(result.totalPage || 0) : 0,
    };
};

recordStore.get = async function (id) {
    const key = String(id || '');
    if (!key) return null;
    const result = await eventBus.execute(commands.GET_RECORDS, {
        page: 0,
        size: 1,
        recordId: [key],
    });
    return result && Array.isArray(result.content) && result.content.length
        ? toRecord(result.content[0])
        : null;
};

recordStore.isFaceType = function (type) {
    return String(type) === '300';
};

recordStore.typeKey = function (type) {
    const value = String(type || '');
    return value === '101' || value === '103' || value === '104' ? '100' : value;
};

recordStore.isStranger = function (record) {
    return !!record
        && !String(record.userId || '').trim()
        && !String(record.name || '').trim();
};

recordStore.formatTime = function (timeStamp) {
    let ms = Number(timeStamp);
    if (!ms || isNaN(ms)) return '';
    // 通行域统一使用秒，UI 日期对象使用毫秒。
    if (Math.abs(ms) < 1000000000000) ms *= 1000;
    const d = new Date(ms);
    return d.getFullYear()
        + '-' + pad2(d.getMonth() + 1)
        + '-' + pad2(d.getDate())
        + ' ' + pad2(d.getHours())
        + ':' + pad2(d.getMinutes())
        + ':' + pad2(d.getSeconds());
};

export default recordStore;
