/**
 * @layer    services
 * @module   capcal_service
 * @listens  CMD_START_CAMERA_CALIBRATION,CMD_STOP_CAMERA_CALIBRATION,CMD_CALCULATE_CAMERA_CALIBRATION,CMD_COMPLETE_CAMERA_CALIBRATION,CMD_PLAY_CAMERA_CALIBRATION_STAGE_AUDIO
 * @depends  event_bus,commands,capcal_domain,face_domain,light_domain,audio_domain,dxLogger
 *
 * 标定流程编排：暂停识别 → 临时红外 → 会话 init/calculate/完成播音与回收。
 * Domain 只维护标定会话与驱动语义能力。
 */

import dxLogger from '../../dxmodules/dxLogger.js';
import eventBus from '../core/event_bus.js';
import commands from '../core/commands.js';
import capcalDomain from '../domain/capcal_domain.js';
import faceDomain from '../domain/face_domain.js';
import lightDomain from '../domain/light_domain.js';
import audioDomain from '../domain/audio_domain.js';

const NIR_DURING_CALIBRATION = 80;

let initialized = false;
const registered = [];

function dataOf(request) {
    return request && Object.prototype.hasOwnProperty.call(request, 'data') ? request.data : request;
}

function register(command, handler) {
    eventBus.registerCommand(command, handler);
    registered.push(command);
}

/**
 * 回收标定环境：结束会话 → 恢复红外 → 保持识别关闭。
 * 标定从设置进入，退出后仍在设置栈，识别由首页 onEnter 再打开。
 */
async function stop() {
    let cleaned = true;
    try {
        cleaned = await capcalDomain.deinitSession();
    } catch (e) {
        cleaned = false;
        dxLogger.error('capcal_service deinitSession failed: ' + (e && e.message ? e.message : e));
    }
    try {
        lightDomain.endOverrideNir();
    } catch (e) {
        dxLogger.error('capcal_service restore nir failed: ' + (e && e.message ? e.message : e));
    }
    try {
        faceDomain.suspend();
    } catch (e) {
        dxLogger.error('capcal_service keep face paused failed: ' + (e && e.message ? e.message : e));
    }
    return cleaned;
}

/**
 * 进入标定：先清理旧会话，再准备环境并 init。
 * @returns {{ box0: object, box1: object }}
 */
async function start() {
    await stop();

    try {
        faceDomain.suspend();
        lightDomain.beginOverrideNir(NIR_DURING_CALIBRATION);
        return capcalDomain.initSession();
    } catch (e) {
        try {
            await stop();
        } catch (endErr) {
            dxLogger.error('capcal_service start rollback failed: ' + (endErr && endErr.message ? endErr.message : endErr));
        }
        throw e;
    }
}

/**
 * 两档完成后写路径、播成功音并回收。
 * @returns {{ path: string }}
 */
async function complete() {
    const result = capcalDomain.applyResult();
    try {
        await audioDomain.playWav('calibration_2s');
    } catch (e) {
        dxLogger.error('capcal_service complete audio failed: ' + (e && e.message ? e.message : e));
    }
    await stop();
    return result;
}

async function playStageOneDone() {
    try {
        await audioDomain.playWav('calibration_1s');
    } catch (e) {
        dxLogger.error('capcal_service stage audio failed: ' + (e && e.message ? e.message : e));
    }
}

const capcalService = {};

capcalService.init = async function () {
    if (initialized) return;
    try {
        register(commands.START_CAMERA_CALIBRATION, function () {
            return start();
        });
        register(commands.STOP_CAMERA_CALIBRATION, function () {
            return stop();
        });
        register(commands.CALCULATE_CAMERA_CALIBRATION, function (request) {
            const data = dataOf(request) || {};
            return capcalDomain.calculate(Number(data.stage));
        });
        register(commands.COMPLETE_CAMERA_CALIBRATION, function () {
            return complete();
        });
        register(commands.PLAY_CAMERA_CALIBRATION_STAGE_AUDIO, function () {
            return playStageOneDone();
        });
        initialized = true;
    } catch (e) {
        await capcalService.destroy();
        throw e;
    }
};

capcalService.destroy = async function () {
    for (let i = 0; i < registered.length; i++) {
        eventBus.unregisterCommand(registered[i]);
    }
    registered.length = 0;
    try {
        await stop();
    } catch (_e) {}
    initialized = false;
};

export default capcalService;
