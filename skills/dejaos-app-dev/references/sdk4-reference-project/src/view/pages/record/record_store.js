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

function toRecord(record) {
    const item = record || {};
    const extra = item.extra && typeof item.extra === 'object' ? item.extra : {};
    const type = String(item.type || '');
    const code = String(item.code || '');
    return {
        id: String(item.id || ''),
        type: type,
        userId: String(item.userId || ''),
        name: String(item.name || ''),
        idCard: String(extra.idCard || ''),
        timeStamp: Number(item.timeStamp || 0),
        result: Number(item.result || 0),
        uploadState: Number(item.uploadState) === 1 ? 1 : 0,
        // 兼容历史人脸记录：旧结构可能仍把图片路径放在 code 字段。
        imagePath: String(item.imagePath || (type === '300' && code.indexOf('/data/') === 0 ? code : '')),
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
