/**
 * @layer domain @module record_domain
 * @depends storage/data/record,storage/config,dxCommonUtils,dxStd,data_utils
 */

import dxCommonUtils from '../../dxmodules/dxCommonUtils.js';
import dxStd from '../../dxmodules/dxStd.js';
import recordStorage from '../storage/data/record.js';
import dataStorage from '../storage/data/data.js';
import configStorage from '../storage/config/config.js';
import voucherTypes from '../core/voucher_types.js';
import { AppError } from '../core/error.js';
import { isObject, requireId, requireText, pageOf, pageResult } from '../utils/data_utils.js';

const RECORD_IMAGE_DIR = '/data/face_app/records/';

function removeFile(path) {
    if (path && path.indexOf('/data/') === 0 && dxStd.existSync(path)) {
        dxStd.removeSync(path);
    }
}

function evidenceRows(record) {
    const extra = isObject(record && record.extra) ? record.extra : {};
    const verify = isObject(extra.verify) ? extra.verify : {};
    const rows = [];
    if (isObject(verify.primary)) rows.push(verify.primary);
    if (Array.isArray(verify.additional)) {
        verify.additional.forEach(function (item) {
            if (isObject(item)) rows.push(item);
        });
    }
    return rows;
}

function imagePathsOf(record) {
    const paths = [];
    function append(path) {
        const value = String(path || '');
        if (value && paths.indexOf(value) < 0) paths.push(value);
    }
    append(record && record.imagePath);
    evidenceRows(record).forEach(function (item) { append(item.imagePath); });
    return paths;
}

function cloneJson(value) {
    try { return JSON.parse(JSON.stringify(value || {})); } catch (_e) { return {}; }
}

function recordIdFromImagePath(path) {
    if (typeof path !== 'string' || path.indexOf(RECORD_IMAGE_DIR) !== 0) return '';
    const name = path.substring(RECORD_IMAGE_DIR.length);
    const match = /^([A-Za-z0-9]+)(?:_[0-9]+)?\.jpg$/.exec(name);
    return match ? match[1] : '';
}

function normalize(item) {
    if (!isObject(item)) throw new AppError('200000', '通行记录必须是对象');
    const timeStamp = Number(item.timeStamp);
    const result = Number(item.result);
    if (!Number.isFinite(timeStamp) || !Number.isFinite(result)) {
        throw new AppError('200000', 'timeStamp或result格式错误');
    }
    let code = item.code || '';
    let imagePath = item.imagePath || '';
    // 兼容2.0：人脸记录曾把图片路径放在code字段。
    if (String(item.type) === '300' && !imagePath && code.indexOf('/data/') === 0) {
        imagePath = code;
        code = '';
    }
    return {
        id: requireId(item.id, 'recordId'),
        keyId: item.keyId || '',
        permissionId: item.permissionId || '',
        userId: item.userId || '',
        name: item.name || (isObject(item.extra) ? item.extra.name || '' : ''),
        type: requireText(typeof item.type === 'string' || typeof item.type === 'number' ? String(item.type) : '', 'type', 32),
        code: String(code),
        imagePath: String(imagePath),
        door: item.door === undefined ? '' : String(item.door),
        timeStamp: Math.trunc(timeStamp),
        result: Math.trunc(result),
        extra: isObject(item.extra) ? item.extra : {},
        message: item.message || item.error || '',
        uploadState: item.uploadState === undefined ? 0 : Number(item.uploadState),
    };
}

function adoptImages(record, keepImage) {
    const sources = imagePathsOf(record);
    const evidence = evidenceRows(record);
    const pathMap = {};
    const moved = [];
    if (keepImage === false) {
        sources.forEach(removeFile);
        record.imagePath = '';
        evidence.forEach(function (item) { item.imagePath = ''; });
        return moved;
    }
    let retained = 0;
    for (let i = 0; i < sources.length; i++) {
        const source = sources[i];
        if (source.indexOf('/data/') !== 0 || !dxStd.existSync(source)) continue;
        retained += 1;
        const suffix = retained === 1 ? '' : '_' + retained;
        const destination = RECORD_IMAGE_DIR + record.id + suffix + '.jpg';
        if (source === destination) {
            pathMap[source] = destination;
            continue;
        }
        dxStd.ensurePathExists(destination);
        if (dxStd.renameSync(source, destination) !== 0) {
            // 单张图片接管失败不能阻止通行记录落库，但必须清理临时文件。
            removeFile(source);
            retained -= 1;
            continue;
        }
        pathMap[source] = destination;
        moved.push({ source: source, destination: destination });
    }
    record.imagePath = pathMap[record.imagePath] || '';
    evidence.forEach(function (item) {
        item.imagePath = pathMap[item.imagePath] || '';
    });
    return moved;
}

function rollbackImages(moved) {
    for (let i = moved.length - 1; i >= 0; i--) {
        if (!dxStd.existSync(moved[i].destination)) continue;
        if (dxStd.renameSync(moved[i].destination, moved[i].source) !== 0) {
            removeFile(moved[i].destination);
        }
    }
}

function toProtocol(record) {
    return {
        id: record.id,
        keyId: record.keyId,
        permissionId: record.permissionId,
        userId: record.userId,
        name: record.name,
        type: record.type,
        code: record.imagePath || record.code,
        imagePath: record.imagePath || '',
        door: record.door,
        timeStamp: record.timeStamp,
        result: record.result,
        extra: record.extra,
        uploadState: Number(record.uploadState) === 1 ? 1 : 0,
        message: record.message,
    };
}

function filtersOf(data) {
    const filters = {
        recordIds: Array.isArray(data.recordId) ? data.recordId : undefined,
        userIds: Array.isArray(data.userId) && data.userId[0] !== -1 ? data.userId : undefined,
        name: data.name || undefined,
        keyword: data.keyword || undefined,
        stranger: data.stranger === true ? true : undefined,
        startTime: data.startTime,
        endTime: data.endTime,
        uploadState: data.uploadState,
    };
    // 凭证过滤仅针对记录顶层第一凭证；组合核验后续步在 extra 中，不参与匹配。
    if (data.type !== undefined && data.type !== null && String(data.type) !== '') {
        filters.type = String(data.type);
    }
    if (data.code !== undefined && data.code !== null && String(data.code) !== '') {
        let code = String(data.code);
        // 卡类与凭证查询一致：十六进制卡号按大写精确匹配。
        if (filters.type && voucherTypes.isCard(filters.type)) code = code.toUpperCase();
        filters.code = code;
    }
    return filters;
}

const recordDomain = {};

recordDomain.getPolicy = async function () {
    const sys = await configStorage.getGroup('sys');
    const uploadFaceScores = await configStorage.get('access.uploadFaceScores', 0);
    return {
        retainFaceImages: sys.faceImageRetention === undefined || Number(sys.faceImageRetention) === 1,
        strangerImage: sys.strangerImage === undefined || Number(sys.strangerImage) === 1,
        uploadFaceScores: uploadFaceScores === 1 || uploadFaceScores === true,
    };
};

recordDomain.discardImage = function (path) {
    removeFile(path);
};

recordDomain.save = async function (item) {
    const record = normalize(item);
    const moved = adoptImages(record, item.keepImage);
    const limit = await configStorage.get('access.offlineAccessNum', 2000);
    let removedImages = [];
    try {
        removedImages = await dataStorage.transaction(async function (tx) {
            let imagePaths = [];
            if (limit > 0 && await recordStorage.count({}, tx) >= limit) {
                const oldest = await recordStorage.oldest(tx);
                if (oldest) {
                    await recordStorage.remove(oldest.id, tx);
                    imagePaths = imagePathsOf(oldest);
                }
            }
            await recordStorage.insert(record, tx);
            return imagePaths;
        });
    } catch (e) {
        // SQLite失败时尽量把已接管的全部抓拍图片还原到组件临时路径。
        rollbackImages(moved);
        // 记录未落库时图片没有保留价值，恢复后立即清理，避免组合核验留下孤儿文件。
        moved.forEach(function (item) { removeFile(item.source); });
        throw e;
    }
    removedImages.forEach(removeFile);
    return record;
};

recordDomain.query = async function (input) {
    const data = input || {};
    const paging = pageOf(data, 1000);
    const filters = filtersOf(data);
    const total = await recordStorage.count(filters);
    const rows = await recordStorage.list(filters, paging.page, paging.size);
    return pageResult(rows.map(toProtocol), paging.page, paging.size, total);
};

recordDomain.count = async function () {
    return Number(await recordStorage.count({})) || 0;
};

recordDomain.remove = async function (input) {
    const data = input || {};
    const filters = filtersOf(data);
    const hasFilter = Object.keys(filters).some(function (key) {
        return filters[key] !== undefined;
    });
    if (!hasFilter && data.all !== true) {
        throw new AppError('200000', '删除通行记录必须提供条件或all=true');
    }
    if (data.all === true) {
        const paths = await recordStorage.listImages({});
        await recordStorage.clear();
        paths.forEach(removeFile);
    } else {
        const paths = await recordStorage.listImages(filters);
        await recordStorage.removeWhere(filters);
        paths.forEach(removeFile);
    }
    return true;
};

recordDomain.getImage = async function (path) {
    const recordId = recordIdFromImagePath(path);
    if (!recordId) {
        throw new AppError('200000', '记录图片路径错误');
    }
    // 只允许读取数据库中已登记的图片路径，避免HTTP成为任意文件读取入口。
    const record = await recordStorage.get(recordId);
    if (!record || imagePathsOf(record).indexOf(path) < 0 || !dxStd.existSync(path)) {
        throw new AppError('200000', '记录图片不存在');
    }
    return dxCommonUtils.fs.fileToBase64(path);
};

recordDomain.nextPending = async function () {
    const rows = await recordStorage.listPending(1);
    if (!rows.length) return null;
    const record = rows[0];
    let code = record.code;
    const extra = cloneJson(record.extra);
    const uploadImage = await configStorage.get('access.uploadToCloud', 0);
    const shouldUploadImage = uploadImage === 1 || uploadImage === true;
    if (record.type === '300') {
        code = '';
        if (shouldUploadImage && record.imagePath && dxStd.existSync(record.imagePath)) {
            code = dxCommonUtils.fs.fileToBase64(record.imagePath);
        }
    }
    const verify = isObject(extra.verify) ? extra.verify : {};
    if (isObject(verify.primary)) {
        delete verify.primary.imagePath;
        delete verify.primary.image;
    }
    const additional = Array.isArray(verify.additional) ? verify.additional : [];
    additional.forEach(function (item) {
        if (!isObject(item)) return;
        const path = String(item.imagePath || '');
        delete item.imagePath;
        // 主照片继续沿用2.0的code字段；后续核验照片放在扩展证据中。
        if (shouldUploadImage && path && dxStd.existSync(path)) {
            item.image = dxCommonUtils.fs.fileToBase64(path);
        } else {
            delete item.image;
        }
    });
    return {
        recordId: record.id,
        // MQTT access事件保持2.0结构：data始终是单条记录数组。
        data: [{
            userId: record.userId,
            type: record.type,
            result: record.result,
            code: code,
            name: record.name,
            timeStamp: record.timeStamp,
            extra: extra,
            error: record.message || '',
        }],
    };
};

recordDomain.confirmUploaded = async function (recordId) {
    const id = requireId(recordId, 'recordId');
    const record = await recordStorage.get(id);
    if (!record) return false;
    const deleteAfterUpload = await configStorage.get('access.deleteRecordAfterUpload', 1);
    if (deleteAfterUpload === 1 || deleteAfterUpload === true) {
        await recordStorage.remove(id);
        imagePathsOf(record).forEach(removeFile);
    } else {
        await recordStorage.markUploaded(id);
    }
    return true;
};

export default recordDomain;
