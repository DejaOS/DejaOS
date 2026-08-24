/** 广告资源业务规则及发布编排。 */
import advertDriver from '../drivers/advert_driver.js';
import { AppError } from '../core/error.js';

const MAX_COUNT = 10;
const MAX_IMAGE = 5 * 1024 * 1024;
const MAX_TOTAL = 30 * 1024 * 1024;
const MAX_PACKAGE = 35 * 1024 * 1024;
const MD5 = /^[a-fA-F0-9]{32}$/;
const ID = /^[A-Za-z0-9_-]{1,40}$/;
const FILE = /^ad_[A-Za-z0-9_-]{1,40}\.(jpg|jpeg|png)$/;
let busy = false;
let uploading = false;

function fail(message) { throw new AppError('200000', message); }
function object(value) { return value && typeof value === 'object' && !Array.isArray(value); }

function normalizeManifest(raw) {
    if (!object(raw)) fail('广告资源清单无效');
    const intervalSec = Number(raw.intervalSec);
    if (!Number.isInteger(intervalSec) || intervalSec < 3 || intervalSec > 300) {
        fail('广告轮播间隔必须为3到300秒');
    }
    const source = Array.isArray(raw.items) ? raw.items : [];
    if (source.length > MAX_COUNT) fail('广告图片最多10张');
    const ids = {};
    const files = {};
    const items = source.map(function (item, index) {
        if (!object(item)) fail('第' + (index + 1) + '张广告信息无效');
        const id = String(item.id || '');
        const file = String(item.file || '');
        if (!ID.test(id) || ids[id]) fail('广告图片ID无效或重复');
        if (!FILE.test(file) || files[file]) fail('广告图片文件名无效或重复');
        ids[id] = true;
        files[file] = true;
        const expectedMd5 = item.md5 ? String(item.md5).toLowerCase() : '';
        if (expectedMd5 && !MD5.test(expectedMd5)) fail('广告图片MD5无效');
        return { id: id, file: file, name: String(item.name || file).substring(0, 80), md5: expectedMd5 };
    });
    return {
        version: 1,
        enabled: source.length > 0 && raw.enabled !== false,
        intervalSec: intervalSec,
        showClock: raw.showClock === true,
        items: items,
    };
}

function empty() {
    return { version: 1, enabled: false, intervalSec: 10, showClock: false, items: [] };
}

function publicState(manifest) {
    const value = manifest || empty();
    return {
        version: 1,
        enabled: value.enabled === true && value.items.length > 0,
        intervalSec: value.intervalSec,
        showClock: value.showClock === true,
        items: value.items.map(function (item) {
            return Object.assign({}, item, { path: advertDriver.ACTIVE + '/' + item.file });
        }),
    };
}

async function install(path) {
    const raw = await advertDriver.readPackageManifest(path);
    const manifest = normalizeManifest(raw);
    const files = await advertDriver.stage(path, manifest);
    let total = 0;
    for (let i = 0; i < files.length; i++) {
        const info = files[i];
        if (info.size <= 0 || info.size > MAX_IMAGE) fail('单张广告图片不能超过5MB');
        total += info.size;
        if (total > MAX_TOTAL) fail('广告图片总量不能超过30MB');
        if (manifest.items[i].md5 && manifest.items[i].md5 !== info.md5) {
            fail('广告图片MD5校验失败: ' + manifest.items[i].name);
        }
        manifest.items[i].md5 = info.md5;
        manifest.items[i].size = info.size;
    }
    await advertDriver.activate(manifest);
    return publicState(manifest);
}

async function exclusive(task, uploadOperation) {
    if (busy || (uploading && !uploadOperation)) throw new AppError('300000', '广告资源正在更新');
    busy = true;
    try { return await task(); } finally { busy = false; }
}

const advertDomain = {};
advertDomain.get = function () {
    const raw = advertDriver.getManifest();
    if (!raw) return empty();
    try { return publicState(normalizeManifest(raw)); } catch (_e) { return empty(); }
};

advertDomain.getImage = function (input) {
    const id = String((input && input.id) || '');
    const state = advertDomain.get();
    const item = state.items.find(function (row) { return row.id === id; });
    if (!item) fail('广告图片不存在');
    return {
        path: advertDriver.getImage(item.file),
        filename: item.name || item.file,
        contentType: /\.png$/i.test(item.file) ? 'image/png' : 'image/jpeg',
    };
};

advertDomain.updateRemote = function (input) {
    return exclusive(async function () {
        if (!object(input) || Number(input.type) !== 10) fail('广告资源类型必须为10');
        if (!object(input.extra) || input.extra.kind !== 'advertisement') fail('广告资源extra.kind必须为advertisement');
        const url = String(input.url || '');
        const md5 = String(input.md5 || '').toLowerCase();
        if (!/^https?:\/\//i.test(url)) fail('广告资源下载地址无效');
        if (!MD5.test(md5)) fail('广告资源包MD5无效');
        const timeoutSec = Number(input.timeoutSec || 300);
        const path = await advertDriver.download(url, timeoutSec * 1000);
        if (advertDriver.fileSize(path) > MAX_PACKAGE) fail('广告资源包不能超过35MB');
        advertDriver.verifyPackageMd5(path, md5);
        try {
            return await install(path);
        } catch (e) {
            try { await advertDriver.abortUpload(); } catch (_cleanupError) {}
            throw e;
        }
    });
};

advertDomain.uploadChunk = function (input) {
    return exclusive(async function () {
        try {
            const result = await advertDriver.appendChunk(input || {});
            uploading = !result.complete;
            if (!result.complete) return result;
            if (advertDriver.fileSize(result.path) > MAX_PACKAGE) fail('广告资源包不能超过35MB');
            const state = await install(result.path);
            advertDriver.finishUpload();
            uploading = false;
            return Object.assign({}, result, { state: state });
        } catch (e) {
            try { await advertDriver.abortUpload(); } catch (_cleanupError) {}
            uploading = false;
            throw e;
        }
    }, true);
};

advertDomain.abortUpload = async function () {
    if (busy) throw new AppError('300000', '广告资源正在更新');
    const result = await advertDriver.abortUpload();
    uploading = false;
    return result;
};
export default advertDomain;
