/**
 * @layer drivers
 * @module db_export_driver
 * @depends dxOs,dxStd
 *
 * 只允许导出系统约定的人脸特征库与业务库；本层不接受外部路径，
 * 防止 HTTP 参数穿透为任意文件读取。
 */

import dxOs from '../../dxmodules/dxOs.js';
import dxStd from '../../dxmodules/dxStd.js';

const EXPORT_DIR = '/data/face_app/export';

const SOURCES = {
    face: {
        path: '/data/face.db',
        prefix: 'face_db_',
    },
    business: {
        path: '/data/face_app/app.db',
        prefix: 'app_db_',
    },
};

function assertFile(path) {
    if (!dxStd.existSync(path)) {
        throw new Error('db_export_driver: export file was not created');
    }
}

const dbExportDriver = {};

/**
 * @param {'face'|'business'} type
 * @returns {Promise<{path:string,filename:string,contentType:string}>}
 */
dbExportDriver.prepare = async function (type) {
    const source = SOURCES[type];
    if (!source) {
        throw new Error('不支持的数据库类型');
    }
    if (!dxStd.existSync(source.path)) {
        throw new Error('数据库文件不存在: ' + source.path);
    }

    const stamp = Math.floor(Date.now());
    const filename = source.prefix + stamp + '.db';
    const path = EXPORT_DIR + '/' + filename;
    const temp = EXPORT_DIR + '/.' + filename + '.tmp';

    dxStd.ensurePathExists(EXPORT_DIR + '/.dir');
    /*
     * 快照复制固定路径数据库；不拼接 HTTP/UI 输入。
     * 先写临时文件再原子改名，并清理同类历史导出。
     */
    const command = 'rm -f ' + EXPORT_DIR + '/' + source.prefix + '*.db '
        + EXPORT_DIR + '/.' + source.prefix + '*.tmp'
        + ' && cp -f ' + source.path + ' ' + temp
        + ' && mv ' + temp + ' ' + path
        + '; code=$?; rm -f ' + temp + '; exit $code';
    const code = await dxOs.systemBrief(command);
    if (code !== 0) {
        throw new Error('数据库导出失败，code=' + code);
    }
    assertFile(path);
    return {
        path: path,
        filename: filename,
        contentType: 'application/octet-stream',
    };
};

export default dbExportDriver;
