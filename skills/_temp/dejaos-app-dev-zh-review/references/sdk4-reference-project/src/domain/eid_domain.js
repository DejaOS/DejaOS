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

    const sys = await configStorage.getGroup('sys');
    const version = String(sys.appVersion || '');
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
 * 解析云证读卡事件。底层读身份失败时带 error，不能把芯片 UID 当通行卡号。
 * @param {object} eidInfo dxEid 上报的原始信息
 * @returns {Promise<{ ok: boolean, code?: string, error?: number, message?: string, id?: string }>}
 */
eidDomain.parseAccess = async function (eidInfo) {
    const raw = unwrapEidInfo(eidInfo);
    const error = Number(raw.error);
    if (raw.error !== undefined && raw.error !== null && error !== 0) {
        return {
            ok: false,
            error: Number.isFinite(error) ? error : -1,
            message: firstText(raw.message) || 'read eid info failed',
            id: firstText(raw.id, raw.cardNo),
        };
    }
    const useIdCardNo = Number(await configStorage.get('sys.nfcIdentityCardEnable', 1)) === 3;
    const idCardNo = firstText(raw.idCardNo, raw.idNo);
    const physicalId = firstText(raw.id, raw.cardNo);
    const code = useIdCardNo && idCardNo ? idCardNo : (physicalId || idCardNo);
    return { ok: true, code: code };
};

/**
 * 按 sys.nfcIdentityCardEnable 从云证读卡结果解析通行卡号。
 * 1=物理卡号，3=身份证号（云证号）；读失败返回空串。
 * @param {object} eidInfo dxEid 上报的原始信息
 * @returns {Promise<string>}
 */
eidDomain.resolveAccessCode = async function (eidInfo) {
    const parsed = await eidDomain.parseAccess(eidInfo);
    return parsed.ok ? String(parsed.code || '') : '';
};

export default eidDomain;
