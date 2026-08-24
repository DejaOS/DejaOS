/**
 * @layer    services
 * @module   code_service
 * @listens  CODE_SCANNED
 * @depends  event_bus,commands,events,eid/ui/software/network domains,config_code_utils
 *
 * 扫码分流：云证激活 / 配置码 / OTA / 通行码。
 */

import logger from '../../dxmodules/dxLogger.js';
import eventBus from '../core/event_bus.js';
import events from '../core/events.js';
import commands from '../core/commands.js';
import eidDomain from '../domain/eid_domain.js';
import uiDomain from '../domain/ui_domain.js';
import softwareDomain from '../domain/software_domain.js';
import networkDomain from '../domain/network_domain.js';
import configCodeUtils from '../utils/config_code_utils.js';

let initialized = false;

async function runEffect(name, effect) {
    try {
        await effect();
    } catch (e) {
        logger.error('code_service ' + name + ' failed: ' + e.message);
    }
}

async function handleEidActiveCode(code) {
    try {
        await eidDomain.activate(code);
        await runEffect('show ui', function () { return uiDomain.showSuccess('云证激活成功'); });
        return { ok: true, kind: 'eid' };
    } catch (e) {
        logger.error('code_service eid activate failed: ' + e.message);
        await runEffect('show ui', function () { return uiDomain.showError('云证激活失败'); });
        return { ok: false, kind: 'eid', reason: e.message };
    }
}

async function handleOta(url, md5) {
    if (!networkDomain.getActiveParams().connected) {
        await runEffect('show ui', function () { return uiDomain.showError('请检查网络'); });
        return { ok: false, kind: 'ota', reason: 'NETWORK_OFFLINE' };
    }
    try {
        await runEffect('show ui', function () { return uiDomain.showSuccess('开始升级'); });
        // upgradeFromHttp 内会重启；成功提示无意义。
        await softwareDomain.upgradeFromHttp({
            url: url,
            md5: md5,
            timeoutSec: 300,
        });
        await runEffect('show ui', function () { return uiDomain.showSuccess('升级成功'); });
        return { ok: true, kind: 'ota' };
    } catch (e) {
        logger.error('code_service ota failed: ' + e.message);
        await runEffect('show ui', function () {
            return uiDomain.showError('升级失败: ' + (e.message || '下载失败'));
        });
        return { ok: false, kind: 'ota', reason: e.message };
    }
}

async function handleConfigCode(code) {
    if (!configCodeUtils.verifySignature(code)) {
        logger.error('code_service config code signature invalid');
        await runEffect('show ui', function () { return uiDomain.showError('配置码校验失败'); });
        return { ok: false, kind: 'config', reason: 'SIGNATURE_INVALID' };
    }

    const payload = configCodeUtils.parsePayload(code);
    if (payload.update_flag === 1 || payload.update_flag === '1') {
        return await handleOta(payload.update_addr || '', payload.update_md5 || '');
    }

    const groups = configCodeUtils.mapToConfigGroups(payload);
    if (!Object.keys(groups).length) {
        await runEffect('show ui', function () { return uiDomain.showError('配置失败'); });
        return { ok: false, kind: 'config', reason: 'EMPTY_CONFIG' };
    }
    try {
        await eventBus.execute(commands.SET_CONFIG, { data: groups });
        await runEffect('show ui', function () { return uiDomain.showSuccess('配置成功'); });
        return { ok: true, kind: 'config' };
    } catch (e) {
        const message = e && e.message ? e.message : String(e);
        logger.error('code_service config code apply failed: ' + message);
        await runEffect('show ui', function () { return uiDomain.showError('配置失败'); });
        return { ok: false, kind: 'config', reason: message };
    }
}

async function onScanned(payload) {
    const code = payload && payload.credential ? String(payload.credential) : '';
    if (configCodeUtils.isEidActiveCode(code)) {
        return await handleEidActiveCode(code);
    }
    if (configCodeUtils.isConfigCode(code)) {
        return await handleConfigCode(code);
    }
    return await eventBus.execute(commands.SCAN_ACCESS, payload || {});
}

const codeService = {};

codeService.init = async function () {
    if (initialized) return;
    eventBus.on(events.CODE_SCANNED, onScanned);
    initialized = true;
};

codeService.destroy = async function () {
    if (!initialized) return;
    eventBus.off(events.CODE_SCANNED, onScanned);
    initialized = false;
};

export default codeService;
