/**
 * @layer    domain
 * @module   wecom_domain
 * @depends  storage/config,mqtt_domain,network_domain,face_domain,person_domain,permission_domain,dxStd,dxOs,core/error
 *
 * 企微单项稳定能力：产品标志、绑定态、拉码、抓拍回包组装、解绑清库。
 * 跨模块编排（提示音、跳转、broker 切换）由 wecom_service 负责。
 */

import dxStd from '../../dxmodules/dxStd.js';
import dxOs from '../../dxmodules/dxOs.js';
import configStorage from '../storage/config/config.js';
import mqttDomain from './mqtt_domain.js';
import networkDomain from './network_domain.js';
import faceDomain from './face_domain.js';
import personDomain from './person_domain.js';
import permissionDomain from './permission_domain.js';
import { AppError } from '../core/error.js';

const INITIAL_FILE = '/etc/app/.initial';
const REGION_FILE = '/etc/app/.region';
const WECOM_MODE_FILE = '/etc/app/.weCom';
const DEFAULT_CAPTURE_TIMEOUT_MS = 6500;

function asStatus(value) {
    return Number(value) === 1 ? 1 : 0;
}

function readFlag(path) {
    try {
        const text = dxStd.loadFileSync(path);
        return text ? String(text).trim() : '';
    } catch (_e) {
        return '';
    }
}

async function writeFlag(path, content) {
    await dxStd.saveFileAsync(path, String(content));
}

function normalizeProductType(value) {
    if (value === 'standard' || value === 'prod') return 'standard';
    if (value === 'wecom' || value === 'weCom') return 'wecom';
    return '';
}

function normalizeRegion(value) {
    return (value === 'INTL' || value === 'international') ? 'INTL' : 'CN';
}

const wecomDomain = {};

/** @returns {'CN'|'INTL'} */
wecomDomain.getRegion = function () {
    return readFlag(REGION_FILE) === 'INTL' ? 'INTL' : 'CN';
};

/**
 * - 无 .initial → 未初始化
 * - 有 .weCom → 企微
 * - 已初始化无 .weCom → 标品
 * @returns {'none'|'standard'|'wecom'}
 */
wecomDomain.getProductMode = function () {
    if (readFlag(INITIAL_FILE) !== 'true') return 'none';
    return readFlag(WECOM_MODE_FILE) === 'weCom' ? 'wecom' : 'standard';
};

wecomDomain.isWeCom = function () {
    return wecomDomain.getProductMode() === 'wecom';
};

wecomDomain.getStatus = async function () {
    return asStatus(await configStorage.get('sys.weComStatus', 0));
};

/** 仅持久化绑定态，不做清库/播报/跳转。 */
wecomDomain.setStatus = async function (status) {
    const next = asStatus(status);
    await configStorage.setGroup('sys', { weComStatus: next });
    return next;
};

/** 启动分流用：产品形态 + 区域 + 企微绑定态 */
wecomDomain.getProductStatus = async function () {
    const productType = wecomDomain.getProductMode();
    return {
        productType: productType,
        region: wecomDomain.getRegion(),
        weComStatus: productType === 'wecom' ? await wecomDomain.getStatus() : 0,
    };
};

/** 底栏 SN/IP 与联网态 */
wecomDomain.getPanelStatus = async function () {
    const net = networkDomain.getActiveParams() || {};
    return {
        sn: dxOs.getSn() || '',
        ip: net.ip || '',
        connected: net.connected === true,
        mqttConnected: mqttDomain.isConnected(),
    };
};

/**
 * 首次初始化落盘（只能激活一次）。
 * 企微写顺序：.region → .weCom → .initial。
 * 已激活时幂等返回，不改语言/标志。
 * @param {{ productType?: string, region?: string, language?: string }} input
 */
wecomDomain.activateProductMode = async function (input) {
    const data = input || {};
    const next = normalizeProductType(data.productType);
    if (!next) throw new AppError('200000', '产品类型无效');

    const current = wecomDomain.getProductMode();
    if (current !== 'none') {
        if (current !== next) throw new AppError('200000', '产品已激活，不可更改');
        return {
            productType: current,
            region: wecomDomain.getRegion(),
            weComStatus: current === 'wecom' ? await wecomDomain.getStatus() : 0,
        };
    }

    const regionCode = normalizeRegion(data.region);
    const language = data.language === 'EN' || regionCode === 'INTL' ? 'EN' : 'CN';

    try {
        await writeFlag(REGION_FILE, regionCode);
        if (next === 'wecom') await writeFlag(WECOM_MODE_FILE, 'weCom');
        await writeFlag(INITIAL_FILE, 'true');
    } catch (e) {
        const detail = e && e.message ? String(e.message) : String(e);
        throw new AppError('100000', '产品激活失败: ' + detail);
    }

    try { await configStorage.setGroup('base', { language: language }); } catch (_e) {}

    if (next !== 'wecom') {
        return { productType: 'standard', region: regionCode, weComStatus: 0 };
    }

    try { await configStorage.setGroup('sys', { weComStatus: 0 }); } catch (_e2) {}

    return {
        productType: 'wecom',
        region: regionCode,
        weComStatus: 0,
    };
};

/** 企微 MQTT 地址（激活后由 Service 热切换 broker）。 */
wecomDomain.getWeComMqttAddr = async function () {
    return String(await configStorage.get('sys.weComMqttAddr', '') || '');
};

wecomDomain.fetchBindQr = async function () {
    if (!wecomDomain.isWeCom()) throw new AppError('200000', '非企微设备');
    if (!mqttDomain.isConnected()) throw new AppError('100005', '设备离线');

    const payload = await mqttDomain.reportWecom({ type: 0 }) || {};
    return {
        bindQr: typeof payload.bindQr === 'string' ? payload.bindQr : '',
        status: await wecomDomain.getStatus(),
    };
};

/**
 * 远程抓拍并按 type 组装 control_reply.data。
 * type 1=仅图，2=仅特征，其它=两者。
 * @param {{ keyId?: *, type?: number, timeout?: number }} input
 */
wecomDomain.captureForControl = async function (input) {
    const opts = input || {};
    const type = Number(opts.type);
    const timeout = opts.timeout == null ? DEFAULT_CAPTURE_TIMEOUT_MS : Number(opts.timeout);
    const cap = await faceDomain.capture(timeout);
    const featureBase64 = cap && cap.feature ? String(cap.feature) : '';
    const faceBase64 = cap && cap.code ? String(cap.code) : '';

    const payload = { keyId: opts.keyId, type: type };
    if (type === 1) {
        if (!faceBase64) throw new AppError('300000', '抓拍图片为空');
        payload.faceBase64 = faceBase64;
    } else if (type === 2) {
        if (!featureBase64) throw new AppError('300000', '抓拍特征为空');
        payload.featureBase64 = featureBase64;
    } else {
        if (!featureBase64 || !faceBase64) throw new AppError('300000', '抓拍结果不完整');
        payload.featureBase64 = featureBase64;
        payload.faceBase64 = faceBase64;
    }
    return payload;
};

/** 解绑清库：人员、权限、人脸特征。 */
wecomDomain.clearBoundData = async function () {
    await permissionDomain.clear();
    await personDomain.clear();
    try { faceDomain.clear(); } catch (_e) {}
};

export default wecomDomain;
