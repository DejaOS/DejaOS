/**
 * @layer    services
 * @module   wecom_service
 * @listens  CMD_ACTIVATE_PRODUCT_MODE,CMD_GET_PRODUCT_STATUS,CMD_FETCH_WECOM_BIND_QR,CMD_GET_WECOM_PANEL_STATUS,CMD_CAPTURE_WECOM_FACE,CMD_APPLY_WECOM_BIND_STATUS
 * @depends  dxStd,dxLogger,event_bus,commands,wecom_domain,ui_domain,audio_domain,mqtt_domain,core/error
 *
 * 企微流程编排：绑定/解绑副作用、激活后 broker 切换在此完成；Domain 只执行单项能力。
 */

import dxStd from '../../dxmodules/dxStd.js';
import logger from '../../dxmodules/dxLogger.js';
import eventBus from '../core/event_bus.js';
import commands from '../core/commands.js';
import wecomDomain from '../domain/wecom_domain.js';
import uiDomain from '../domain/ui_domain.js';
import audioDomain from '../domain/audio_domain.js';
import mqttDomain from '../domain/mqtt_domain.js';
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

function dataOf(request) {
    return unpack(request).data;
}

function register(command, handler) {
    eventBus.registerCommand(command, handler);
    registered.push(command);
}

function schedule(context, task, delayMs) {
    const run = function () {
        dxStd.setTimeout(function () {
            Promise.resolve().then(task).catch(function (e) {
                logger.error('wecom_service deferred task failed: ' + (e && e.message ? e.message : String(e)));
            });
        }, delayMs || 100);
    };
    if (context && typeof context.afterResponse === 'function') {
        context.afterResponse(run);
        return;
    }
    run();
}

/**
 * 绑定态变更编排：落库 → 解绑清库/跳转 或 绑定播报/进首页。
 * @param {{ status?: number, announce?: boolean }} data
 * @param {object|null} context
 */
async function applyBindStatus(data, context) {
    const next = Number(data && data.status) === 1 ? 1 : 0;
    const announce = !(data && data.announce === false);

    if (!wecomDomain.isWeCom()) {
        throw new AppError('200000', '非企微设备');
    }

    const current = await wecomDomain.getStatus();
    if (current === next) {
        return { status: next, navigated: null };
    }

    await wecomDomain.setStatus(next);

    if (next === 0) {
        await wecomDomain.clearBoundData();
        schedule(context, function () { return uiDomain.replace('wecom_network'); }, 100);
        return { status: 0, navigated: 'wecom_network' };
    }

    // 提示与跳转放在回包之后，避免 TTS 拖住 MQTT/HTTP 应答。
    schedule(context, async function () {
        if (announce) {
            try { await audioDomain.playTts('绑定成功'); } catch (_e) {}
            try { uiDomain.showSuccess('绑定成功'); } catch (_e2) {}
            await new Promise(function (resolve) {
                dxStd.setTimeout(resolve, 2500);
            });
        }
        return uiDomain.replace('home');
    }, 100);
    return { status: 1, navigated: 'home' };
}

async function activateProductMode(request) {
    const input = unpack(request);
    // 仅首次激活切 broker；幂等复读已激活态时不重复热切。
    const firstActivation = wecomDomain.getProductMode() === 'none';
    const result = await wecomDomain.activateProductMode(input.data || {});
    if (firstActivation && result && result.productType === 'wecom') {
        try {
            const addr = await wecomDomain.getWeComMqttAddr();
            if (addr) await mqttDomain.useBrokerAddr(addr, input.context);
        } catch (e) {
            logger.error('wecom_service broker switch failed: ' + (e && e.message ? e.message : String(e)));
        }
    }
    return result;
}

const wecomService = {};

wecomService.init = async function () {
    if (initialized) return;
    try {
        register(commands.ACTIVATE_PRODUCT_MODE, activateProductMode);
        register(commands.GET_PRODUCT_STATUS, function () {
            return wecomDomain.getProductStatus();
        });
        register(commands.FETCH_WECOM_BIND_QR, function () {
            return wecomDomain.fetchBindQr();
        });
        register(commands.GET_WECOM_PANEL_STATUS, function () {
            return wecomDomain.getPanelStatus();
        });
        register(commands.CAPTURE_WECOM_FACE, function (request) {
            return wecomDomain.captureForControl(dataOf(request) || {});
        });
        register(commands.APPLY_WECOM_BIND_STATUS, function (request) {
            const input = unpack(request);
            return applyBindStatus(input.data || {}, input.context);
        });
        initialized = true;
    } catch (e) {
        await wecomService.destroy();
        throw e;
    }
};

wecomService.destroy = async function () {
    for (let i = 0; i < registered.length; i++) {
        eventBus.unregisterCommand(registered[i]);
    }
    registered.length = 0;
    initialized = false;
};

export default wecomService;
