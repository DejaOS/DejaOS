/** @layer drivers @module time_driver @depends dxNtp,dxTimeZones,dxStd */

import dxNtp from '../../dxmodules/dxNtp.js';
import dxTimeZones from '../../dxmodules/dxTimeZones.js';
import dxStd from '../../dxmodules/dxStd.js';
import logger from '../../dxmodules/dxLogger.js';

let initialized = false;
let config = { server: '', timeZone: 'Asia/Shanghai' };

function assertInitialized() {
    if (!initialized) throw new Error('time_driver: module is not initialized');
}

function validateServer(server) {
    if (typeof server !== 'string' || !server.trim()) {
        throw new TypeError('time_driver: NTP server is required');
    }
}

function pad2(value) {
    return value < 10 ? '0' + value : String(value);
}

function formatDate(date) {
    return date.getFullYear() + '-' + pad2(date.getMonth() + 1) + '-' + pad2(date.getDate())
        + ' ' + pad2(date.getHours()) + ':' + pad2(date.getMinutes()) + ':' + pad2(date.getSeconds());
}

function normalizeManualTime(value) {
    const text = String(value || '').trim();
    const match = /^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2}):(\d{2})$/.exec(text);
    if (!match) throw new RangeError('时间格式必须为YYYY-MM-DD HH:mm:ss');
    const parts = match.slice(1).map(Number);
    const date = new Date(parts[0], parts[1] - 1, parts[2], parts[3], parts[4], parts[5]);
    if (parts[0] < 2000 || parts[0] > 2099
        || date.getFullYear() !== parts[0] || date.getMonth() !== parts[1] - 1
        || date.getDate() !== parts[2] || date.getHours() !== parts[3]
        || date.getMinutes() !== parts[4] || date.getSeconds() !== parts[5]) {
        throw new RangeError('日期或时间无效');
    }
    return text;
}

const timeDriver = {};

timeDriver.init = async function (options) {
    if (initialized) return;
    const next = Object.assign({}, config, options || {});
    validateServer(next.server);
    timeDriver.validateTimeZone(next.timeZone);
    config = next;
    initialized = true;
};

timeDriver.validateTimeZone = function (timeZone) {
    if (typeof timeZone !== 'string' || !timeZone
        || !dxStd.existSync(dxTimeZones.root + timeZone)) {
        throw new RangeError('time_driver: unsupported timeZone ' + timeZone);
    }
};

timeDriver.updateConfig = async function (values) {
    assertInitialized();
    const next = Object.assign({}, config, values || {});
    if (Object.prototype.hasOwnProperty.call(values || {}, 'server')) validateServer(next.server);
    if (Object.prototype.hasOwnProperty.call(values || {}, 'timeZone')) {
        timeDriver.validateTimeZone(next.timeZone);
    }
    const status = dxNtp.getSyncStatus();
    config = next;
    if (Object.prototype.hasOwnProperty.call(values || {}, 'timeZone')) {
        await dxTimeZones.updateTimeZone(next.timeZone);
    }
    // 在线同步过程中修改服务器时，立即从新服务器重建同步周期。
    if (Object.prototype.hasOwnProperty.call(values || {}, 'server') && status.isRunning) {
        dxNtp.startSync(next.server);
    }
};

timeDriver.sync = function () {
    assertInitialized();
    dxNtp.startSync(config.server);
};

timeDriver.suspend = function () {
    if (initialized) dxNtp.stopSync();
};

timeDriver.getStatus = function () {
    return dxNtp.getSyncStatus();
};

timeDriver.getTime = function () {
    assertInitialized();
    return { value: formatDate(new Date()), timeStamp: Math.floor(Date.now() / 1000) };
};

timeDriver.setTime = async function (value) {
    assertInitialized();
    const text = normalizeManualTime(value);
    // 手动校时同步系统时钟与硬件时钟；后续NTP同步仍可按原周期进行校准。
    await dxNtp.setTime(text, true);
    return timeDriver.getTime();
};

timeDriver.destroy = async function () {
    if (!initialized) return;
    dxNtp.stopSync();
    initialized = false;
};

export default timeDriver;
