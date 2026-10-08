/**
 * @layer    services
 * @module   scanner_service
 * @listens  CODE_SCANNED
 * @depends  event_bus,commands,events,eid/ui/software/network/security domains,config_code_utils,dxQrRule(按需)
 *
 * 扫码分流：云证激活 / 配置码 / OTA / 通行码（100/101/103）。
 * dxQrRule 仅在解码通行码时动态加载（无 /etc/app/.scanner 时本服务不会启动）。
 */

import logger from '../../dxmodules/dxLogger.js';
import eventBus from '../core/event_bus.js';
import events from '../core/events.js';
import commands from '../core/commands.js';
import eidDomain from '../domain/eid_domain.js';
import uiDomain from '../domain/ui_domain.js';
import softwareDomain from '../domain/software_domain.js';
import networkDomain from '../domain/network_domain.js';
import securityDomain from '../domain/security_domain.js';
import configCodeUtils from '../utils/config_code_utils.js';

const MAX_PUBLIC_KEYS = 5;

let initialized = false;
/** @type {null|{ default: object, QrRuleError: Function }} */
let qrRuleMod = null;

const QR_ERROR_MESSAGES = {
    EXPIRED: '二维码已过期',
    NOT_YET_VALID: '二维码尚未生效',
    DECRYPT_FAILED: '二维码校验失败',
    PUBLIC_KEY_NOT_FOUND: '未配置机构密钥',
    TOO_MANY_PUBLIC_KEYS: '机构密钥配置过多',
    INVALID_FORMAT: '二维码格式错误',
    INVALID_BASE64: '二维码格式错误',
    INVALID_UTF8: '二维码格式错误',
    INVALID_TLV: '二维码格式错误',
    UNSUPPORTED_TLV: '二维码格式错误',
    DUPLICATE_TLV: '二维码格式错误',
    MISSING_TLV: '二维码格式错误',
    INVALID_FIELD: '二维码格式错误',
    INVALID_RANDOM_CODE: '二维码格式错误',
    INVALID_IDENTITY_TYPE: '二维码格式错误',
    CODE_TOO_LONG: '二维码过长',
};

async function loadQrRule() {
    if (!qrRuleMod) {
        qrRuleMod = await import('../../dxmodules/dxQrRule.js');
    }
    return qrRuleMod;
}

async function runEffect(name, effect) {
    try {
        await effect();
    } catch (e) {
        logger.error('scanner_service ' + name + ' failed: ' + e.message);
    }
}

function qrErrorMessage(error) {
    if (error && error.code && QR_ERROR_MESSAGES[error.code]) {
        return QR_ERROR_MESSAGES[error.code];
    }
    return '二维码无效';
}

async function resolvePublicKeys(organization) {
    const now = Math.floor(Date.now() / 1000);
    const result = await securityDomain.query({ key: organization, page: 0, size: MAX_PUBLIC_KEYS });
    const content = result && result.content ? result.content : [];
    const keys = [];
    for (let i = 0; i < content.length; i++) {
        const item = content[i];
        if (item.startTime <= now && item.endTime >= now) keys.push(item.value);
    }
    return keys;
}

async function handleEidActiveCode(code) {
    try {
        await eidDomain.activate(code);
        await runEffect('show ui', function () { return uiDomain.showSuccess('云证激活成功'); });
        return { ok: true, kind: 'eid' };
    } catch (e) {
        logger.error('scanner_service eid activate failed: ' + e.message);
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
        logger.error('scanner_service ota failed: ' + e.message);
        await runEffect('show ui', function () {
            return uiDomain.showError('升级失败: ' + (e.message || '下载失败'));
        });
        return { ok: false, kind: 'ota', reason: e.message };
    }
}

async function handleConfigCode(code) {
    if (!configCodeUtils.verifySignature(code)) {
        logger.error('scanner_service config code signature invalid');
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
        const result = await eventBus.execute(commands.SET_CONFIG, { data: groups });
        // 配置码改需重启项：本机扫码属屏幕操作，弹确认框（MQTT/Web 不走此路径）。
        if (result && result._meta && result._meta.restartRequired) {
            await runEffect('show ui', function () { return uiDomain.promptRestartRequired(); });
            return { ok: true, kind: 'config', restartRequired: true };
        }
        await runEffect('show ui', function () { return uiDomain.showSuccess('配置成功'); });
        return { ok: true, kind: 'config' };
    } catch (e) {
        const message = e && e.message ? e.message : String(e);
        logger.error('scanner_service config code apply failed: ' + message);
        await runEffect('show ui', function () { return uiDomain.showError('配置失败'); });
        return { ok: false, kind: 'config', reason: message };
    }
}

async function handleAccessCode(rawCode, payload) {
    const mod = await loadQrRule();
    const dxQrRule = mod.default;
    const QrRuleError = mod.QrRuleError;
    try {
        const decoded = await dxQrRule.decode(rawCode, { resolvePublicKeys: resolvePublicKeys });
        const accessPayload = {
            ts: payload && payload.ts,
            type: decoded.type,
            credential: decoded.credential,
            randomCode: decoded.randomCode,
            organization: decoded.organization,
            generatedAt: decoded.generatedAt,
            expiresAt: decoded.expiresAt,
            additionalData: decoded.additionalData,
        };
        return await eventBus.execute(commands.SCAN_ACCESS, accessPayload);
    } catch (e) {
        if (QrRuleError && e instanceof QrRuleError) {
            logger.error('scanner_service access decode failed: ' + e.code + ' ' + e.message);
            const message = qrErrorMessage(e);
            await runEffect('show ui', function () { return uiDomain.showError(message); });
            return { ok: false, kind: 'access', reason: e.code };
        }
        const message = e && e.message ? e.message : String(e);
        logger.error('scanner_service access failed: ' + message);
        await runEffect('show ui', function () { return uiDomain.showError('二维码无效'); });
        return { ok: false, kind: 'access', reason: message };
    }
}

async function onScanned(payload) {
    const code = payload && payload.credential ? String(payload.credential) : '';
    if (!code) return { ok: false, reason: 'EMPTY_CODE' };
    if (configCodeUtils.isEidActiveCode(code)) {
        return await handleEidActiveCode(code);
    }
    if (configCodeUtils.isConfigCode(code)) {
        return await handleConfigCode(code);
    }
    return await handleAccessCode(code, payload || {});
}

const scannerService = {};

scannerService.init = async function () {
    if (initialized) return;
    eventBus.on(events.CODE_SCANNED, onScanned);
    initialized = true;
};

scannerService.destroy = async function () {
    if (!initialized) return;
    eventBus.off(events.CODE_SCANNED, onScanned);
    initialized = false;
    qrRuleMod = null;
};

export default scannerService;
