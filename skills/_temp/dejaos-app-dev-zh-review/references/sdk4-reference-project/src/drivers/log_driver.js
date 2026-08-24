/**
 * @layer drivers
 * @module log_driver
 * @depends dxOs,dxStd
 *
 * 只允许打包系统约定的 /data/var/log/dejaos.log*；本层不接受外部路径，
 * 防止 HTTP 参数穿透为任意文件读取。
 */

import dxOs from '../../dxmodules/dxOs.js';
import dxStd from '../../dxmodules/dxStd.js';

const EXPORT_DIR = '/data/face_app/export';
const PREFIX = 'dejaos_logs_';

function assertArchive(path) {
    if (!dxStd.existSync(path)) {
        throw new Error('log_driver: archive was not created');
    }
}

const logDriver = {};

logDriver.prepare = async function () {
    const stamp = Math.floor(Date.now());
    const filename = PREFIX + stamp + '.tar.gz';
    const path = EXPORT_DIR + '/' + filename;
    const temp = EXPORT_DIR + '/.' + filename + '.tmp';
    const snapshot = EXPORT_DIR + '/.snapshot_' + stamp;

    dxStd.ensurePathExists(EXPORT_DIR + '/.dir');
    /*
     * 先复制固定日志到独立快照，避免syslog轮转时tar读到变化中的文件。
     * 命令不拼接HTTP/UI输入；压缩包先写临时文件再原子改名。
     */
    const command = 'rm -f ' + EXPORT_DIR + '/' + PREFIX + '*.tar.gz '
        + EXPORT_DIR + '/.' + PREFIX + '*.tmp'
        + ' && rm -rf ' + snapshot
        + ' && mkdir -p ' + snapshot
        + ' && cp -f /data/var/log/dejaos.log* ' + snapshot + '/'
        + ' && tar -czf ' + temp + ' -C ' + snapshot + ' .'
        + ' && mv ' + temp + ' ' + path
        + '; code=$?; rm -rf ' + snapshot + ' ' + temp + '; exit $code';
    const code = await dxOs.systemBrief(command);
    if (code !== 0) {
        throw new Error('运行日志打包失败，code=' + code);
    }
    assertArchive(path);
    return { path: path, filename: filename, contentType: 'application/gzip' };
};

export default logDriver;
