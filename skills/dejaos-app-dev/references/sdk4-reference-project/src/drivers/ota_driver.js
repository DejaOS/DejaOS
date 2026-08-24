/**
 * @layer    drivers
 * @module   ota_driver
 * @depends  dxOta,dxCommonUtils,dxOs
 *
 * 只封装升级包下载、分片落盘、校验和重启等基础能力；协议字段和流程编排
 * 分别由Protocol和Service处理。
 */

import dxOta from '../../dxmodules/dxOta.js';
import dxCommonUtils from '../../dxmodules/dxCommonUtils.js';
import dxOs from '../../dxmodules/dxOs.js';

const UPLOAD_FILE = '/upgrades.upload';
const CHUNK_FILE = '/upgrades.chunk';
const MD5_PATTERN = /^[a-fA-F0-9]{32}$/;

let initialized = false;
let operation = null;
let uploadSession = null;

function assertInitialized() {
    if (!initialized) throw new Error('ota_driver: module is not initialized');
}

async function run(command, action) {
    const code = await dxOs.systemBrief(command);
    if (code !== 0) throw new Error('ota_driver: ' + action + ' failed, code=' + code);
}

async function cleanupUploadFiles() {
    await run('rm -f /upgrades.upload /upgrades.chunk', 'cleanup upload files');
}

function validateChunk(input) {
    if (!input || typeof input !== 'object' || Array.isArray(input)) {
        throw new TypeError('ota_driver.uploadChunk: input must be an object');
    }
    const index = Number(input.index);
    const total = Number(input.total);
    const md5 = String(input.md5 || '').toLowerCase();
    if (!Number.isInteger(index) || !Number.isInteger(total) || total <= 0 || index < 0 || index >= total) {
        throw new RangeError('ota_driver.uploadChunk: invalid index or total');
    }
    if (!MD5_PATTERN.test(md5)) {
        throw new TypeError('ota_driver.uploadChunk: md5 must be a 32-character hexadecimal string');
    }
    if (typeof input.chunk !== 'string' || input.chunk.length === 0) {
        throw new TypeError('ota_driver.uploadChunk: chunk must be a non-empty Base64 string');
    }
    return { index: index, total: total, md5: md5, chunk: input.chunk };
}

const otaDriver = {};

otaDriver.init = async function () {
    initialized = true;
    // 掉电可能留下未完成分片；已校验的/upgrades.zip由系统启动脚本处理，不能删除。
    try { await cleanupUploadFiles(); } catch (_error) {}
};

otaDriver.updateHttp = async function (options) {
    assertInitialized();
    if (operation || uploadSession || dxOta.isUpdating()) {
        throw new Error('ota_driver: another upgrade operation is in progress');
    }
    operation = 'http';
    try {
        return await dxOta.updateHttp(options);
    } finally {
        operation = null;
    }
};

/**
 * 串行接收Web端Base64分片。只有最后一片完成后才调用dxOta校验并原子落位
 * /upgrades.zip；乱序、重复或不同上传会被拒绝，避免拼出不可用升级包。
 */
otaDriver.uploadChunk = async function (input) {
    assertInitialized();
    const chunk = validateChunk(input);
    if (operation || dxOta.isUpdating()) {
        throw new Error('ota_driver: another upgrade operation is in progress');
    }
    operation = 'chunk';

    try {
        if (chunk.index === 0) {
            await cleanupUploadFiles();
            uploadSession = { total: chunk.total, md5: chunk.md5, nextIndex: 0 };
        }
        if (!uploadSession) throw new Error('ota_driver: upload session is not started');
        if (uploadSession.total !== chunk.total || uploadSession.md5 !== chunk.md5) {
            throw new Error('ota_driver: upload session does not match');
        }
        if (uploadSession.nextIndex !== chunk.index) {
            throw new Error('ota_driver: unexpected chunk index, expected=' + uploadSession.nextIndex);
        }

        // 单片先解码到固定临时文件，再流式追加，避免在JS内持有完整升级包。
        dxCommonUtils.fs.base64ToFile(CHUNK_FILE, chunk.chunk);
        await run('cat /upgrades.chunk >> /upgrades.upload && rm -f /upgrades.chunk', 'append chunk');
        uploadSession.nextIndex++;
        if (chunk.index < chunk.total - 1) {
            return { complete: false, index: chunk.index, total: chunk.total };
        }

        const result = await dxOta.updateFile({ path: UPLOAD_FILE, md5: chunk.md5 });
        await cleanupUploadFiles();
        uploadSession = null;
        return Object.assign({ complete: true, index: chunk.index, total: chunk.total }, result);
    } catch (error) {
        // 任何分片失败都终止本次会话；前端必须从index=0重新上传。
        try { await cleanupUploadFiles(); } catch (_cleanupError) {}
        uploadSession = null;
        throw error;
    } finally {
        operation = null;
    }
};

otaDriver.abortUpload = async function () {
    assertInitialized();
    if (operation || dxOta.isUpdating()) {
        throw new Error('ota_driver: active OTA staging cannot be aborted');
    }
    await cleanupUploadFiles();
    uploadSession = null;
    return true;
};

otaDriver.isUpdating = function () {
    return operation !== null || uploadSession !== null || dxOta.isUpdating();
};

otaDriver.reboot = function (delaySec) {
    assertInitialized();
    return dxOta.reboot(delaySec === undefined ? 2 : delaySec);
};

otaDriver.destroy = async function () {
    // 已校验完成的/upgrades.zip必须保留给S99app，销毁时只清理未完成上传。
    if (uploadSession !== null) {
        try { await cleanupUploadFiles(); } catch (_error) {}
    }
    uploadSession = null;
    operation = null;
    initialized = false;
};

export default otaDriver;
