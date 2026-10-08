/** @layer domain @module diag_domain @depends diag_driver,core/error */

import diagDriver from '../drivers/diag_driver.js';
import { AppError } from '../core/error.js';

const IPV4_PATTERN = /^\d{1,3}(?:\.\d{1,3}){3}$/;
const DOMAIN_PATTERN = /^(?=.{1,253}$)(?:[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?\.)*[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?$/;

function validIpv4(value) {
    if (!IPV4_PATTERN.test(value)) return false;
    const parts = value.split('.');
    for (let i = 0; i < parts.length; i++) {
        if (Number(parts[i]) > 255) return false;
    }
    return true;
}

function normalizeTarget(value) {
    const target = String(value || '').trim().toLowerCase();
    if (!validIpv4(target) && !DOMAIN_PATTERN.test(target)) {
        throw new AppError('200000', 'Ping目标必须是IPv4地址或域名');
    }
    return target;
}

const diagDomain = {};

diagDomain.isIpv4 = validIpv4;
diagDomain.normalizeTarget = normalizeTarget;
diagDomain.ping = function (target, count) {
    return diagDriver.ping(normalizeTarget(target), count);
};
diagDomain.resolve = function (target) {
    return diagDriver.resolve(normalizeTarget(target));
};
diagDomain.endpointHost = function (value) {
    const text = String(value || '').trim();
    const match = /^(?:mqtt|mqtts|tcp|ssl):\/\/([^\s/:]+)(?::\d+)?$/.exec(text);
    return match ? match[1].toLowerCase() : '';
};

export default diagDomain;
