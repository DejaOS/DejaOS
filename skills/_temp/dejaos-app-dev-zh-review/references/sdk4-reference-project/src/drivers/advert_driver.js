/**
 * @layer drivers
 * @module advert_driver
 * @depends dxHttpClient,dxCommonUtils,dxStd,dxOs
 *
 * 广告资源文件能力：下载/分片、受控解包、校验和目录原子切换。
 * 外部ZIP不会整体解压，只提取Domain已经校验过的清单文件。
 */
import dxHttp from '../../dxmodules/dxHttpClient.js';
import dxCommonUtils from '../../dxmodules/dxCommonUtils.js';
import dxStd from '../../dxmodules/dxStd.js';
import dxOs from '../../dxmodules/dxOs.js';

const ROOT = '/data/face_app/advert';
const DEFAULT_RESOURCE_ROOT = '/app/code/resource/advert';
const ACTIVE = ROOT + '/active';
const STAGING = ROOT + '/staging';
const BACKUP = ROOT + '/backup';
const PACKAGE = ROOT + '/advert.zip';
const UPLOAD = ROOT + '/advert.upload';
const CHUNK = ROOT + '/advert.chunk';
const TEMP_MANIFEST = ROOT + '/manifest.tmp';
const MAX_MANIFEST_BYTES = 64 * 1024;
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const MAX_PACKAGE_BYTES = 35 * 1024 * 1024;
const SAFE_FILE = /^ad_[A-Za-z0-9_-]{1,40}\.(jpg|jpeg|png)$/;

let initialized = false;
let upload = null;

function assertInitialized() {
    if (!initialized) throw new Error('advert_driver: module is not initialized');
}

function quote(value) {
    return "'" + String(value).replace(/'/g, "'\\''") + "'";
}

async function run(command, action) {
    const code = await dxOs.systemBrief(command);
    if (code !== 0) throw new Error('advert_driver: ' + action + ' failed, code=' + code);
}

async function removeWorkFiles() {
    await run('rm -rf ' + quote(STAGING) + ' ' + quote(PACKAGE) + ' ' + quote(UPLOAD)
        + ' ' + quote(CHUNK) + ' ' + quote(TEMP_MANIFEST), 'cleanup work files');
}

function sizeOf(path) {
    const result = dxStd.statSync(path);
    if (!result || result[1] !== 0 || !result[0]) {
        throw new Error('advert_driver: file not found: ' + path);
    }
    return Number(result[0].size) || 0;
}

function md5Of(path) {
    return String(dxCommonUtils.fs.fileMd5(path) || '').toLowerCase();
}

const advertDriver = {};
advertDriver.ROOT = ROOT;
advertDriver.ACTIVE = ACTIVE;

advertDriver.init = async function (options) {
    dxStd.ensurePathExists(ROOT + '/.dir');
    // 上次掉电若恰好发生在目录切换中，优先恢复已验证的旧版本。
    if (!dxStd.existSync(ACTIVE) && dxStd.existSync(BACKUP)) {
        await run('mv ' + quote(BACKUP) + ' ' + quote(ACTIVE), 'restore backup');
    }
    try { await removeWorkFiles(); } catch (_e) {}

    /*
     * 默认屏保只在没有客户广告时初始化。资源随应用只读发布，复制到/data后
     * 继续复用现有广告更新链路；后续升级应用不会覆盖客户已经激活的广告。
     */
    const model = String((options && options.model) || '').toLowerCase();
    const defaultDir = model.indexOf('vf105') === 0 ? DEFAULT_RESOURCE_ROOT + '/vf105' : '';
    if (!dxStd.existSync(ACTIVE) && defaultDir
        && dxStd.existSync(defaultDir + '/manifest.json')) {
        await run('rm -rf ' + quote(STAGING) + ' && cp -a ' + quote(defaultDir) + ' ' + quote(STAGING)
            + ' && mv ' + quote(STAGING) + ' ' + quote(ACTIVE) + ' && sync', 'install default advertisements');
    }
    initialized = true;
};

advertDriver.download = async function (url, timeoutMs) {
    assertInitialized();
    await removeWorkFiles();
    const client = dxHttp.createClient('advert_download');
    try {
        await client.download(url, PACKAGE, { timeout: timeoutMs });
        return PACKAGE;
    } finally {
        client.destroy();
    }
};

advertDriver.verifyPackageMd5 = function (path, expected) {
    const actual = md5Of(path);
    if (actual !== String(expected || '').toLowerCase()) {
        throw new Error('广告资源包MD5校验失败');
    }
    return actual;
};

advertDriver.readPackageManifest = async function (path) {
    assertInitialized();
    await run('unzip -p ' + quote(path) + ' manifest.json | head -c ' + (MAX_MANIFEST_BYTES + 1)
        + ' > ' + quote(TEMP_MANIFEST), 'read manifest');
    try {
        if (sizeOf(TEMP_MANIFEST) > MAX_MANIFEST_BYTES) throw new Error('广告资源清单过大');
        return JSON.parse(dxStd.loadFileSync(TEMP_MANIFEST));
    } finally {
        await run('rm -f ' + quote(TEMP_MANIFEST), 'cleanup manifest');
    }
};

advertDriver.stage = async function (packagePath, manifest) {
    assertInitialized();
    await run('rm -rf ' + quote(STAGING) + ' && mkdir -p ' + quote(STAGING), 'prepare staging');
    const files = [];
    try {
        for (let i = 0; i < manifest.items.length; i++) {
            const name = manifest.items[i].file;
            if (!SAFE_FILE.test(name)) throw new Error('广告图片文件名无效');
            const output = STAGING + '/' + name;
            await run('unzip -p ' + quote(packagePath) + ' ' + quote(name) + ' | head -c '
                + (MAX_IMAGE_BYTES + 1) + ' > ' + quote(output), 'extract image');
            files.push({ file: name, size: sizeOf(output), md5: md5Of(output) });
        }
        return files;
    } catch (e) {
        try { await run('rm -rf ' + quote(STAGING), 'cleanup staging'); } catch (_cleanupError) {}
        throw e;
    }
};

advertDriver.activate = async function (manifest) {
    assertInitialized();
    dxStd.saveFileSync(STAGING + '/manifest.json', JSON.stringify(manifest));
    // staging已完整校验，切换失败时恢复backup，避免出现半套广告资源。
    const command = 'rm -rf ' + quote(BACKUP)
        + '; if [ -d ' + quote(ACTIVE) + ' ]; then mv ' + quote(ACTIVE) + ' ' + quote(BACKUP) + '; fi'
        + '; if mv ' + quote(STAGING) + ' ' + quote(ACTIVE) + '; then sync; rm -rf ' + quote(BACKUP)
        + '; else if [ -d ' + quote(BACKUP) + ' ]; then mv ' + quote(BACKUP) + ' ' + quote(ACTIVE) + '; fi; exit 1; fi';
    await run(command, 'activate advertisements');
    await run('rm -f ' + quote(PACKAGE) + ' ' + quote(UPLOAD) + ' ' + quote(CHUNK), 'cleanup package');
    return true;
};

advertDriver.getManifest = function () {
    assertInitialized();
    const path = ACTIVE + '/manifest.json';
    if (!dxStd.existSync(path)) return null;
    try { return JSON.parse(dxStd.loadFileSync(path)); } catch (_e) { return null; }
};

advertDriver.getImage = function (file) {
    assertInitialized();
    if (!SAFE_FILE.test(file)) throw new Error('广告图片文件名无效');
    const path = ACTIVE + '/' + file;
    if (!dxStd.existSync(path)) throw new Error('广告图片不存在');
    return path;
};

advertDriver.appendChunk = async function (input) {
    assertInitialized();
    const index = Number(input && input.index);
    const total = Number(input && input.total);
    const chunk = input && input.chunk;
    if (!Number.isInteger(index) || !Number.isInteger(total) || total <= 0 || index < 0 || index >= total) {
        throw new Error('广告分片序号无效');
    }
    if (typeof chunk !== 'string' || !chunk) throw new Error('广告分片不能为空');
    if (index === 0) {
        await removeWorkFiles();
        upload = { total: total, next: 0 };
    }
    if (!upload || upload.total !== total || upload.next !== index) {
        throw new Error('广告分片顺序或会话不匹配');
    }
    dxCommonUtils.fs.base64ToFile(CHUNK, chunk);
    await run('cat ' + quote(CHUNK) + ' >> ' + quote(UPLOAD) + ' && rm -f ' + quote(CHUNK), 'append chunk');
    if (sizeOf(UPLOAD) > MAX_PACKAGE_BYTES) {
        await removeWorkFiles();
        upload = null;
        throw new Error('广告资源包不能超过35MB');
    }
    upload.next++;
    return { complete: index === total - 1, index: index, total: total, path: UPLOAD };
};

advertDriver.abortUpload = async function () {
    assertInitialized();
    await removeWorkFiles();
    upload = null;
    return true;
};

advertDriver.finishUpload = function () { upload = null; };
advertDriver.fileSize = sizeOf;
advertDriver.fileMd5 = md5Of;

advertDriver.destroy = async function () {
    if (!initialized) return;
    try { await removeWorkFiles(); } catch (_e) {}
    upload = null;
    initialized = false;
};

export default advertDriver;
