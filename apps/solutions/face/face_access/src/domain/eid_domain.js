/**
 * @layer    domain
 * @module   eid_domain
 * @depends  eid_driver,storage/config,os_driver
 */

import eidDriver from '../drivers/eid_driver.js';
import osDriver from '../drivers/os_driver.js';
import configStorage from '../storage/config/config.js';
import { AppError } from '../core/error.js';
import { requireText } from '../utils/data_utils.js';
import { APP_VERSION } from '../version.js';

const EID_PREFIX = '___VBAR_ID_ACTIVE_V';

function unwrapEidInfo(eidInfo) {
    if (!eidInfo || typeof eidInfo !== 'object') {
        return {};
    }
    const inner = eidInfo.data;
    if (inner && typeof inner === 'object' && !Array.isArray(inner)
        && (inner.id || inner.idCardNo || inner.idNo || inner.name)) {
        return inner;
    }
    return eidInfo;
}

function firstText() {
    for (let i = 0; i < arguments.length; i++) {
        if (arguments[i] == null) continue;
        const text = String(arguments[i]).trim();
        if (text) return text;
    }
    return '';
}

/** dxEid.active 成功时多为 undefined；数字 0 / 无 error 的对象也视为成功。 */
function isActiveOk(result) {
    if (result === false) return false;
    if (typeof result === 'number') return result === 0;
    if (result && typeof result === 'object') {
        if (result.error !== undefined && result.error !== null && Number(result.error) !== 0) {
            return false;
        }
        if (result.ok === false || result.success === false) return false;
        const code = result.code;
        if (code !== undefined && code !== null && code !== '' && code !== 0 && code !== '0'
            && code !== 200 && code !== '200' && String(code) !== '000000') {
            return false;
        }
    }
    return true;
}

const eidDomain = {};

/**
 * 云证激活码激活。
 * @param {string|object} input 激活码字符串，或 { code / codeMsg }
 */
eidDomain.activate = async function (input) {
    let code = '';
    if (typeof input === 'string') {
        code = input;
    } else if (input && typeof input === 'object') {
        code = input.codeMsg || input.code || '';
    }
    code = requireText(code, 'code');
    if (!code.startsWith(EID_PREFIX)) {
        throw new AppError('200000', '不是有效的云证激活码');
    }

    const version = APP_VERSION;
    const macAddr = String(osDriver.getMac() || '');
    if (!version || !macAddr) {
        throw new AppError('300000', '云证激活缺少版本号或 MAC');
    }
    if (!eidDriver.isInitialized()) {
        throw new AppError('300000', '云证模块未初始化');
    }

    const result = await eidDriver.active({
        codeMsg: code,
        version: version,
        macAddr: macAddr,
    });
    if (!isActiveOk(result)) {
        throw new AppError('300000', '云证激活失败');
    }
    return true;
};

/**
 * 解析云证读卡事件中的通行码。
 * - physical：用芯片 UID（id），身份证刷卡时底层常只出 EID 事件、不出 CARD_SWIPED
 * - idCard：只用 idCardNo，读身份失败不能回退 UID
 * @param {object} eidInfo dxEid 上报的原始信息
 * @param {'physical'|'idCard'=} mode
 * @returns {Promise<{ ok: boolean, code?: string, error?: number, message?: string, id?: string }>}
 */
eidDomain.parseAccess = async function (eidInfo, mode) {
    const raw = unwrapEidInfo(eidInfo);
    const physicalId = firstText(raw.id, raw.cardNo);
    const idCardNo = firstText(raw.idCardNo, raw.idNo);
    const error = Number(raw.error);
    const hasError = raw.error !== undefined && raw.error !== null && error !== 0;
    const identity = mode === 'idCard' ? 'idCard' : 'physical';

    if (identity === 'physical') {
        // 物理卡号不依赖身份字段；有 UID 即可通行。
        if (physicalId) return { ok: true, code: physicalId };
        if (hasError) {
            return {
                ok: false,
                error: Number.isFinite(error) ? error : -1,
                message: firstText(raw.message) || 'read eid info failed',
                id: '',
            };
        }
        return { ok: true, code: '' };
    }

    if (hasError) {
        return {
            ok: false,
            error: Number.isFinite(error) ? error : -1,
            message: firstText(raw.message) || 'read eid info failed',
            id: physicalId,
        };
    }
    return { ok: true, code: idCardNo };
};

/**
 * 从云证读卡结果解析通行码；读失败返回空串。
 * @param {object} eidInfo dxEid 上报的原始信息
 * @param {'physical'|'idCard'=} mode
 * @returns {Promise<string>}
 */
eidDomain.resolveAccessCode = async function (eidInfo, mode) {
    const parsed = await eidDomain.parseAccess(eidInfo, mode);
    return parsed.ok ? String(parsed.code || '') : '';
};

export default eidDomain;
