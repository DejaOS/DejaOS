/**
 * @layer domain @module record_domain
 * @depends storage/data/record,storage/config,dxCommonUtils,dxStd,data_utils
 */

import dxCommonUtils from '../../dxmodules/dxCommonUtils.js';
import dxStd from '../../dxmodules/dxStd.js';
import recordStorage from '../storage/data/record.js';
import dataStorage from '../storage/data/data.js';
import configStorage from '../storage/config/config.js';
import { AppError } from '../core/error.js';
import { isObject, requireId, requireText, pageOf, pageResult } from '../utils/data_utils.js';

const RECORD_IMAGE_DIR = '/data/face_app/records/';

function removeFile(path) {
    if (path && path.indexOf('/data/') === 0 && dxStd.existSync(path)) {
        dxStd.removeSync(path);
    }
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

function adoptImage(record, keepImage) {
    const source = record.imagePath;
    if (!source) return null;
    if (keepImage === false) {
        removeFile(source);
        record.imagePath = '';
        return null;
    }
    if (source.indexOf('/data/') !== 0 || !dxStd.existSync(source)) {
        record.imagePath = '';
        return null;
    }
    const destination = RECORD_IMAGE_DIR + record.id + '.jpg';
    if (source === destination) return null;
    dxStd.ensurePathExists(destination);
    const result = dxStd.renameSync(source, destination);
    if (result !== 0) {
        // 图片失败不能阻止通行记录落库，但必须清理本应用临时目录。
        removeFile(source);
        record.imagePath = '';
        return null;
    }
    record.imagePath = destination;
    return { source: source, destination: destination };
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
    return {
        recordIds: Array.isArray(data.recordId) ? data.recordId : undefined,
        userIds: Array.isArray(data.userId) && data.userId[0] !== -1 ? data.userId : undefined,
        name: data.name || undefined,
        keyword: data.keyword || undefined,
        stranger: data.stranger === true ? true : undefined,
        startTime: data.startTime,
        endTime: data.endTime,
        uploadState: data.uploadState,
    };
}

const recordDomain = {};

recordDomain.getPolicy = async function () {
    const sys = await configStorage.getGroup('sys');
    return {
        retainFaceImages: sys.faceImageRetention === undefined || Number(sys.faceImageRetention) === 1,
        strangerImage: sys.strangerImage === undefined || Number(sys.strangerImage) === 1,
    };
};

recordDomain.discardImage = function (path) {
    removeFile(path);
};

recordDomain.save = async function (item) {
    const record = normalize(item);
    const moved = adoptImage(record, item.keepImage);
    const limit = await configStorage.get('access.offlineAccessNum', 2000);
    let removedImage = '';
    try {
        removedImage = await dataStorage.transaction(async function (tx) {
            let imagePath = '';
            if (limit > 0 && await recordStorage.count({}, tx) >= limit) {
                const oldest = await recordStorage.oldest(tx);
                if (oldest) {
                    await recordStorage.remove(oldest.id, tx);
                    imagePath = oldest.imagePath;
                }
            }
            await recordStorage.insert(record, tx);
            return imagePath;
        });
    } catch (e) {
        // SQLite失败时尽量把已接管的抓拍图片还原到组件临时路径。
        if (moved && dxStd.existSync(moved.destination)) {
            const restored = dxStd.renameSync(moved.destination, moved.source);
            if (restored !== 0) removeFile(moved.destination);
        }
        throw e;
    }
    removeFile(removedImage);
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
    if (typeof path !== 'string' || path.indexOf('/data/') !== 0) {
        throw new AppError('200000', '记录图片路径错误');
    }
    // 只允许读取数据库中已登记的图片路径，避免HTTP成为任意文件读取入口。
    if (!await recordStorage.findByImagePath(path) || !dxStd.existSync(path)) {
        throw new AppError('200000', '记录图片不存在');
    }
    return dxCommonUtils.fs.fileToBase64(path);
};

recordDomain.nextPending = async function () {
    const rows = await recordStorage.listPending(1);
    if (!rows.length) return null;
    const record = rows[0];
    let code = record.code;
    if (record.type === '300') {
        code = '';
        const uploadImage = await configStorage.get('access.uploadToCloud', 0);
        if ((uploadImage === 1 || uploadImage === true)
            && record.imagePath && dxStd.existSync(record.imagePath)) {
            code = dxCommonUtils.fs.fileToBase64(record.imagePath);
        }
    }
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
            extra: record.extra || {},
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
        removeFile(record.imagePath);
    } else {
        await recordStorage.markUploaded(id);
    }
    return true;
};

export default recordDomain;
