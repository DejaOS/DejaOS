/**
 * @layer    services
 * @module   control_service
 * @listens  CMD_CONTROL_DEVICE,CMD_GET_DEVICE_INFO,CMD_GET_DEVICE_CAPABILITIES,CMD_SCAN_WIFI,CMD_GET_NETWORK_STATUS,CMD_SET_DISPLAY_AWAKE,CMD_UPGRADE_FIRMWARE,CMD_UPLOAD_FIRMWARE_CHUNK,CMD_ABORT_FIRMWARE_UPLOAD,CMD_ACTIVATE_EID
 * @depends  dxStd,dxLogger,event_bus,software_domain,door_domain,network_domain,display_domain,ui_domain,eid_domain,time_domain,finger_domain
 */

import dxStd from '../../dxmodules/dxStd.js';
import logger from '../../dxmodules/dxLogger.js';
import eventBus from '../core/event_bus.js';
import commands from '../core/commands.js';
import softwareDomain from '../domain/software_domain.js';
import doorDomain from '../domain/door_domain.js';
import networkDomain from '../domain/network_domain.js';
import uiDomain from '../domain/ui_domain.js';
import displayDomain from '../domain/display_domain.js';
import eidDomain from '../domain/eid_domain.js';
import timeDomain from '../domain/time_domain.js';
import fingerDomain from '../domain/finger_domain.js';
import { AppError } from '../core/error.js';

let initialized = false;
const registered = [];

function unpack(request) {
    if (request && typeof request === 'object' && !Array.isArray(request)
        && Object.prototype.hasOwnProperty.call(request, 'data')) {
        return { data: request.data, context: request.context || null };
    }
    return { data: request, context: null };
}

function schedule(context, task) {
    if (context && typeof context.afterResponse === 'function') {
        context.afterResponse(task);
        return;
    }
    // UI等本地调用没有协议回包钩子，延后一拍，保证Command Promise先完成。
    dxStd.setTimeout(function () {
        Promise.resolve().then(task).catch(function (e) {
            logger.error('control_service deferred task failed: ' + e.message);
        });
    }, 100);
}

function register(command, handler) {
    eventBus.registerCommand(command, handler);
    registered.push(command);
}

async function control(request) {
    const input = unpack(request);
    const data = input.data;
    if (!data || typeof data !== 'object' || Array.isArray(data)) {
        throw new AppError('200000', '控制参数无效');
    }
    if (!Number.isInteger(data.command)) {
        throw new AppError('200000', '控制参数command必须是整数');
    }
    switch (data.command) {
        case 0:
            schedule(input.context, function () { return softwareDomain.reboot(); });
            return true;
        case 1:
            await doorDomain.open();
            return true;
        case 4:
            schedule(input.context, function () { return softwareDomain.reset(); });
            return true;
        case 8:
            return await uiDomain.captureFace(data.extra || {});
        case 12:
            // 远程指纹录入/中断：MQTT/HTTP 统一走 control，特征值经 control_reply 返回。
            if (!softwareDomain.getCapabilities().finger) {
                throw new AppError('200000', '指纹功能未启用');
            }
            if (!data.extra || data.extra.fingerprintAction === undefined || data.extra.fingerprintAction === null) {
                throw new AppError('200000', '指纹控制缺少 fingerprintAction');
            }
            if (Number(data.extra.fingerprintAction) === 1) {
                await fingerDomain.interrupt({ userId: data.extra.userId });
                return true;
            }
            if (Number(data.extra.fingerprintAction) === 0) {
                // 先停通行再拉 UI；exclusive 仅在真正采指时由 enroll 占用。
                await fingerDomain.beginEnrollSession();
                const extra = Object.assign({}, data.extra, {
                    serialNo: data.serialNo,
                });
                try {
                    return await uiDomain.enrollFinger(extra);
                } finally {
                    fingerDomain.endEnrollSession();
                }
            }
            throw new AppError('200000', '不支持的 fingerprintAction');
        default:
            throw new AppError('200000', '不支持的控制命令: ' + data.command);
    }
}

async function upgradeFirmware(request) {
    const input = unpack(request);
    const result = await softwareDomain.upgrade(input.data);
    // MQTT/HTTP先完成成功回包，再重启让S99app应用/upgrades.zip。
    schedule(input.context, function () { return softwareDomain.rebootForUpgrade(2); });
    return result;
}

async function uploadFirmwareChunk(request) {
    const input = unpack(request);
    const result = await softwareDomain.uploadUpgradeChunk(input.data);
    if (result && result.complete === true) {
        schedule(input.context, function () { return softwareDomain.rebootForUpgrade(2); });
    }
    return result;
}

const controlService = {};

controlService.init = async function () {
    if (initialized) return;
    try {
        register(commands.CONTROL_DEVICE, control);
        register(commands.GET_DEVICE_INFO, function () {
            return softwareDomain.getDeviceInfo();
        });
        register(commands.GET_DEVICE_CAPABILITIES, function () {
            return softwareDomain.getCapabilities();
        });
        register(commands.GET_SYSTEM_TIME, function () {
            return timeDomain.getTime();
        });
        register(commands.SET_SYSTEM_TIME, function (request) {
            const data = unpack(request).data || {};
            return timeDomain.setTime(data.value);
        });
        register(commands.SCAN_WIFI, function (request) {
            const data = unpack(request).data || {};
            return networkDomain.scanWifi(data.timeoutMs, data.intervalMs);
        });
        register(commands.SET_DISPLAY_AWAKE, function (request) {
            const data = unpack(request).data || {};
            return displayDomain.setAwake(data.awake === true);
        });
        register(commands.GET_NETWORK_STATUS, function () {
            return networkDomain.getActiveParams();
        });
        register(commands.UPGRADE_FIRMWARE, function (request) {
            return upgradeFirmware(request);
        });
        register(commands.UPLOAD_FIRMWARE_CHUNK, function (request) {
            return uploadFirmwareChunk(request);
        });
        register(commands.ABORT_FIRMWARE_UPLOAD, function () {
            return softwareDomain.abortUpgrade();
        });
        register(commands.ACTIVATE_EID, function (request) {
            return eidDomain.activate(unpack(request).data);
        });
        initialized = true;
    } catch (e) {
        await controlService.destroy();
        throw e;
    }
};

controlService.destroy = async function () {
    for (let i = 0; i < registered.length; i++) {
        eventBus.unregisterCommand(registered[i]);
    }
    registered.length = 0;
    initialized = false;
};

export default controlService;
