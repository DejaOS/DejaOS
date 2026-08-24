/**
 * @layer domain @module verify_domain
 * @depends voucher_domain,person_domain,permission_domain
 *
 * 门禁本地鉴权：只回答是否允许通行，不开门、不播音、不更新UI。
 */

import voucherDomain from './voucher_domain.js';
import personDomain from './person_domain.js';
import permissionDomain from './permission_domain.js';
import configStorage from '../storage/config/config.js';
import { AppError } from '../core/error.js';
import { isObject, requireText } from '../utils/data_utils.js';

const verifyDomain = {};

verifyDomain.getPolicy = async function () {
    const sys = await configStorage.getGroup('sys');
    const seconds = Number(sys.scanInterval);
    return {
        duplicateIntervalMs: Number.isFinite(seconds) && seconds > 0 ? seconds * 1000 : 1000,
        passwordEnabled: sys.pwd === undefined || Number(sys.pwd) === 1,
    };
};

verifyDomain.authorize = async function (input) {
    if (!isObject(input)) throw new AppError('200000', '鉴权参数必须是对象');
    const type = requireText(
        typeof input.type === 'string' || typeof input.type === 'number' ? String(input.type) : '',
        'type',
        32
    );
    const code = requireText(input.code, 'code');
    const time = input.time === undefined ? Math.floor(Date.now() / 1000) : Number(input.time);
    if (!Number.isFinite(time)) throw new AppError('200000', 'time格式错误');

    const voucher = await voucherDomain.findForAccess(type, code);
    if (!voucher) return { allowed: false, reason: 'VOUCHER_NOT_FOUND' };
    const person = await personDomain.get(voucher.userId);
    if (!person) return { allowed: false, reason: 'PERSON_NOT_FOUND', voucher: voucher };
    const permissions = await permissionDomain.getMany(person.permissionIds);
    for (let i = 0; i < person.permissionIds.length; i++) {
        const id = person.permissionIds[i];
        const permission = permissions.find(function (item) { return item.permissionId === id; });
        if (permissionDomain.isValid(permission, Math.trunc(time))) {
            return {
                allowed: true,
                reason: 'ALLOW',
                voucher: voucher,
                person: person,
                permissionId: permission.permissionId,
            };
        }
    }
    return { allowed: false, reason: 'PERMISSION_DENIED', voucher: voucher, person: person };
};

export default verifyDomain;
