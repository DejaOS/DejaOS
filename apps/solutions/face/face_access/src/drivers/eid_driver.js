/**
 * @layer    drivers
 * @module   eid_driver
 * @fires    EID_DETECTED
 * @listens  none
 * @depends  dxEid,dxDriver,dxLogger,event_bus,core/events
 *
 * 云证（eID）激活与读卡事件；与刷卡模块解耦。
 * dxEid 按能力在 init 时动态加载，无 NFC/云证型号不会因静态 import 报错。
 */

import dxDriver from '../../dxmodules/dxDriver.js';
import dxLogger from '../../dxmodules/dxLogger.js';
import eventBus from '../core/event_bus.js';
import events from '../core/events.js';

/** @type {object|null} */
let dxEid = null;
let initialized = false;

const EID_SERVER_IP = 'deviceid.dxiot.com';
const EID_SERVER_PORT = 9989;

/**
 * 云证 device_model 使用短机型（如 vf105）。
 * 4.0 板级 MODEL 可能是 VF105_V12，需压成 vf105。
 * @param {string} boardModel
 * @returns {string}
 */
function resolveEidDeviceModel(boardModel) {
    const raw = String(boardModel || '').trim();
    if (!raw) return '';
    const lower = raw.toLowerCase();
    const match = lower.match(/^(vf\d+)/);
    return match ? match[1] : lower;
}

/**
 * 云证日志：截断 picture，避免 Base64 刷屏。
 * @param {object} eidInfo
 * @returns {string}
 */
function formatEidLog(eidInfo) {
    const raw = eidInfo && typeof eidInfo === 'object' ? eidInfo : {};
    const copy = {};
    const keys = Object.keys(raw);
    for (let i = 0; i < keys.length; i++) {
        const key = keys[i];
        if (key === 'picture') {
            const pic = raw.picture == null ? '' : String(raw.picture);
            copy.picture = pic ? ('[base64 len=' + pic.length + ']') : '';
        } else {
            copy[key] = raw[key];
        }
    }
    try {
        return JSON.stringify(copy);
    } catch (_e) {
        return 'keys=' + keys.join(',');
    }
}

function onEidDetected(eidInfo) {
    const raw = eidInfo || {};
    if (raw.error !== undefined && raw.error !== null && Number(raw.error) !== 0) {
        dxLogger.error('eid_driver read failed: ' + formatEidLog(raw));
    } else {
        dxLogger.info('eid_driver read: ' + formatEidLog(raw));
    }
    eventBus.fire(events.EID_DETECTED, {
        raw: raw,
        ts: Date.now(),
    }).catch(function (e) {
        dxLogger.error('eid_driver event dispatch failed: ' + e.message);
    });
}

const eidDriver = {};

eidDriver.init = async function (options) {
    if (initialized) return;
    const boardModel = (dxDriver.DRIVER && dxDriver.DRIVER.MODEL) || '';
    const model = String(
        (options && options.device_model)
        || resolveEidDeviceModel(boardModel)
        || ''
    );
    if (!model) {
        throw new Error('eid_driver: device_model is required');
    }
    const mod = await import('../../dxmodules/dxEid.js');
    dxEid = mod.default;
    const ip = String((options && options.ip) || EID_SERVER_IP);
    const port = Number((options && options.port) || EID_SERVER_PORT);
    dxLogger.info('eid_driver init device_model=' + model + ' server=' + ip + ':' + port);
    dxEid.init({
        ip: ip,
        port: port,
        config: { device_model: model },
    });
    try {
        dxEid.on('eid', onEidDetected);
    } catch (e) {
        try { dxEid.deinit(); } catch (_e) {}
        dxEid = null;
        throw e;
    }
    initialized = true;
};

eidDriver.updateConfig = async function () {};

eidDriver.active = async function (options) {
    if (!initialized) {
        throw new Error('eid_driver: module is not initialized');
    }
    try {
        return await dxEid.active(options);
    } catch (e) {
        dxLogger.error('eid_driver active failed: ' + (e && e.message ? e.message : String(e)));
        throw e;
    }
};

eidDriver.isInitialized = function () {
    return initialized;
};

eidDriver.destroy = async function () {
    if (!initialized) return;
    try {
        try {
            dxEid.off('eid', onEidDetected);
        } catch (e) {
            dxLogger.error('eid_driver off failed: ' + e.message);
        }
        dxEid.deinit();
    } catch (e) {
        dxLogger.error('eid_driver destroy failed: ' + e.message);
        throw e;
    } finally {
        initialized = false;
        dxEid = null;
    }
};

export default eidDriver;
