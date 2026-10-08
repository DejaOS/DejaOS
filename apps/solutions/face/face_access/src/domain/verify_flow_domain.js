/**
 * @layer domain
 * @module verify_flow_domain
 * @depends storage/config,record_domain
 *
 * 设备级核验策略与单人多凭证会话。因子用数组建模，当前配置入口限制为两个，
 * 后续扩展到三个及以上时无需改动状态机。
 */

import configStorage from '../storage/config/config.js';
import recordDomain from './record_domain.js';
import personDomain from './person_domain.js';
import osDriver from '../drivers/os_driver.js';
import voucherTypes from '../core/voucher_types.js';

const MODE = {
    SINGLE: 0,
    MULTI_FACE: 1,
    MULTI_FACTOR: 2,
    DUAL_PERSON: 3,
};

const FACTOR = {
    FACE: 'face',
    CARD: 'card',
    CODE: 'code',
    PASSWORD: 'password',
    FINGER: 'finger',
};

const DEFAULT_CONFIG = {
    verifyMode: MODE.SINGLE,
    factorSequence: [FACTOR.FACE, FACTOR.CARD],
    verifyTimeout: 15,
};

let config = Object.assign({}, DEFAULT_CONFIG);
let session = null;

function cloneConfig(value) {
    const source = value || {};
    return {
        verifyMode: Number(source.verifyMode),
        factorSequence: Array.isArray(source.factorSequence)
            ? source.factorSequence.slice() : DEFAULT_CONFIG.factorSequence.slice(),
        verifyTimeout: Number(source.verifyTimeout) || DEFAULT_CONFIG.verifyTimeout,
    };
}

function factorOf(type) {
    const value = String(type || '');
    if (value === '300') return FACTOR.FACE;
    if (value === '400') return FACTOR.PASSWORD;
    if (value === '500') return FACTOR.FINGER;
    if (voucherTypes.isCard(value)) return FACTOR.CARD;
    if (value === '100' || value === '101' || value === '103' || value === '104') return FACTOR.CODE;
    return '';
}

function discardEvidence(target) {
    const steps = target && Array.isArray(target.steps) ? target.steps : [];
    for (let i = 0; i < steps.length; i++) {
        const path = steps[i].input && steps[i].input.imagePath;
        if (path) recordDomain.discardImage(path);
    }
}

function clear(discard) {
    const previous = session;
    session = null;
    if (discard && previous) discardEvidence(previous);
    return previous;
}

function monotonicNow(nowMs) {
    return Number.isFinite(nowMs) ? nowMs : osDriver.getUptimeMs();
}

function remainingMs(nowMs) {
    if (!session) return 0;
    return Math.max(0, session.expiresUptimeMs - monotonicNow(nowMs));
}

function statusSequence() {
    return config.verifyMode === MODE.DUAL_PERSON
        ? ['primary', 'verifier'] : config.factorSequence.slice();
}

function publicStatus(nowMs) {
    const sequence = statusSequence();
    if (!session) {
        return {
            mode: config.verifyMode,
            sequence: sequence,
            state: 'idle',
            completed: 0,
            nextFactor: config.verifyMode === MODE.DUAL_PERSON ? '' : (sequence[0] || ''),
            nextRole: config.verifyMode === MODE.DUAL_PERSON ? 'primary' : '',
            primary: null,
            timeout: config.verifyTimeout,
        };
    }
    return {
        mode: config.verifyMode,
        sequence: sequence,
        state: 'pending',
        completed: session.steps.length,
        nextFactor: config.verifyMode === MODE.DUAL_PERSON ? '' : (sequence[session.steps.length] || ''),
        nextRole: config.verifyMode === MODE.DUAL_PERSON ? 'verifier' : '',
        primary: session.steps[0] && session.steps[0].result
            ? session.steps[0].result.person || null : null,
        reason: session.noticeReason || '',
        // UI只消费剩余时间，不接触系统时间，避免NTP或手动校时导致跳秒。
        remainingSeconds: Math.ceil(remainingMs(nowMs) / 1000),
        timeout: config.verifyTimeout,
    };
}

function outcome(status, reason, target, result, input) {
    return {
        status: status,
        reason: reason,
        session: target || null,
        result: result || null,
        input: input || null,
        view: publicStatus(),
    };
}

const verifyFlowDomain = {
    MODE: MODE,
    FACTOR: FACTOR,
    factorOf: factorOf,
};

verifyFlowDomain.init = async function () {
    config = cloneConfig(await configStorage.getGroup('access'));
    clear(true);
    return verifyFlowDomain.getConfig();
};

verifyFlowDomain.applyConfig = function (values) {
    const next = Object.assign({}, config, values || {});
    config = cloneConfig(next);
    clear(true);
    return verifyFlowDomain.getConfig();
};

verifyFlowDomain.getConfig = function () {
    return cloneConfig(config);
};

verifyFlowDomain.getMode = function () {
    return config.verifyMode;
};

verifyFlowDomain.getStatus = function () {
    return publicStatus();
};

verifyFlowDomain.getRemainingMs = function () {
    return remainingMs();
};

function submitMultiFactor(input, result, nowMs) {
    const now = monotonicNow(nowMs);
    const sequence = config.factorSequence;
    const actual = factorOf(input && input.type);
    if (config.verifyMode !== MODE.MULTI_FACTOR) {
        return outcome('bypass', 'MODE_BYPASS', null, result, input);
    }
    if (!actual || sequence.indexOf(actual) < 0) {
        // 未配置的因子（尤其是后台持续上报的人脸）不参与多凭证计数，
        // 也不能冲掉正在等待下一因子的会话，否则会出现“必失败一条/超时后再失败”。
        return outcome('ignored', 'FACTOR_NOT_ALLOWED', session, result, input);
    }
    if (session && now >= session.expiresUptimeMs) {
        const expired = clear(false);
        return outcome('timeout', 'MULTI_FACTOR_TIMEOUT', expired, expired.steps[0].result, expired.steps[0].input);
    }
    if (!session) {
        if (actual !== sequence[0]) {
            return outcome('denied', 'FACTOR_ORDER_INVALID', null, result, input);
        }
        if (!result || !result.allowed || !result.person || !result.person.userId) {
            return outcome('denied', result && result.reason ? result.reason : 'FACTOR_DENIED', null, result, input);
        }
        session = {
            mode: MODE.MULTI_FACTOR,
            sessionId: String(Date.now()) + '_' + String(result.person.userId),
            userId: String(result.person.userId),
            startedUptimeMs: now,
            expiresUptimeMs: now + config.verifyTimeout * 1000,
            steps: [{ factor: actual, input: input, result: result }],
        };
        if (session.steps.length >= sequence.length) {
            const completed = clear(false);
            return outcome('allowed', 'MULTI_FACTOR_ALLOW', completed, result, input);
        }
        return outcome('pending', 'WAIT_NEXT_FACTOR', session, result, input);
    }

    const expected = sequence[session.steps.length];
    const completedFactor = session.steps.some(function (step) { return step.factor === actual; });
    if (completedFactor) {
        // 人脸组件可能在等待下一因子时重复上报，不能因此冲掉当前人员的会话。
        return outcome('ignored', 'FACTOR_ALREADY_COMPLETED', session, result, input);
    }
    if (actual !== expected) {
        const failed = clear(false);
        return outcome('denied', 'FACTOR_ORDER_INVALID', failed, result, input);
    }
    if (!result || !result.allowed || !result.person || !result.person.userId) {
        const failed = clear(false);
        return outcome('denied', result && result.reason ? result.reason : 'FACTOR_DENIED', failed, result, input);
    }
    if (String(result.person.userId) !== session.userId) {
        const failed = clear(false);
        return outcome('denied', 'FACTOR_PERSON_MISMATCH', failed, result, input);
    }
    session.steps.push({ factor: actual, input: input, result: result });
    if (session.steps.length < sequence.length) {
        return outcome('pending', 'WAIT_NEXT_FACTOR', session, result, input);
    }
    const completed = clear(false);
    return outcome('allowed', 'MULTI_FACTOR_ALLOW', completed, result, input);
}

function dualOutcome(status, reason, target, result, input) {
    const value = outcome(status, reason, target, result, input);
    if (target && (status === 'retry' || status === 'pending')) target.noticeReason = status === 'retry' ? reason : '';
    value.view.reason = reason;
    return value;
}

function submitDualPerson(input, result, nowMs) {
    const now = monotonicNow(nowMs);
    if (session && now >= session.expiresUptimeMs) {
        const expired = clear(false);
        return dualOutcome('timeout', 'DUAL_PERSON_TIMEOUT', expired,
            expired.steps[0].result, expired.steps[0].input);
    }
    if (!session) {
        if (!result || !result.allowed || !result.person || !result.person.userId) {
            return dualOutcome('denied', result && result.reason ? result.reason : 'PERSON_DENIED', null, result, input);
        }
        const policy = personDomain.getDualVerifyPolicy(result.person);
        const created = {
            mode: MODE.DUAL_PERSON,
            sessionId: String(Date.now()) + '_' + String(result.person.userId),
            userId: String(result.person.userId),
            policy: policy,
            startedUptimeMs: now,
            expiresUptimeMs: now + config.verifyTimeout * 1000,
            steps: [{ role: 'primary', factor: factorOf(input && input.type), input: input, result: result }],
        };
        if (policy.mode === personDomain.DUAL_VERIFY_MODE.NONE) {
            return dualOutcome('allowed', 'DUAL_PERSON_NOT_REQUIRED', created, result, input);
        }
        session = created;
        return dualOutcome('pending', 'WAIT_VERIFIER', session, result, input);
    }

    if (!result || !result.allowed || !result.person || !result.person.userId) {
        return dualOutcome('retry', result && result.reason ? result.reason : 'VERIFIER_DENIED', session, result, input);
    }
    const verifierId = String(result.person.userId);
    if (verifierId === session.userId) {
        return dualOutcome('retry', 'DUAL_PERSON_SAME_PERSON', session, result, input);
    }
    if (session.policy.mode === personDomain.DUAL_VERIFY_MODE.SPECIFIED
        && session.policy.userIds.indexOf(verifierId) < 0) {
        return dualOutcome('retry', 'DUAL_PERSON_NOT_SPECIFIED', session, result, input);
    }
    session.steps.push({
        role: 'verifier',
        factor: factorOf(input && input.type),
        input: input,
        result: result,
    });
    const completed = clear(false);
    return dualOutcome('allowed', 'DUAL_PERSON_ALLOW', completed, result, input);
}

verifyFlowDomain.submit = function (input, result, nowMs) {
    if (config.verifyMode === MODE.MULTI_FACTOR) return submitMultiFactor(input, result, nowMs);
    if (config.verifyMode === MODE.DUAL_PERSON) return submitDualPerson(input, result, nowMs);
    return outcome('bypass', 'MODE_BYPASS', null, result, input);
};

verifyFlowDomain.timeout = function (nowMs) {
    if (!session) return null;
    const now = monotonicNow(nowMs);
    if (now < session.expiresUptimeMs) return null;
    const expired = clear(false);
    const reason = expired.mode === MODE.DUAL_PERSON ? 'DUAL_PERSON_TIMEOUT' : 'MULTI_FACTOR_TIMEOUT';
    return outcome('timeout', reason, expired, expired.steps[0].result, expired.steps[0].input);
};

verifyFlowDomain.cancel = function () {
    clear(true);
    return publicStatus();
};

verifyFlowDomain.destroy = function () {
    clear(true);
    config = Object.assign({}, DEFAULT_CONFIG, { factorSequence: DEFAULT_CONFIG.factorSequence.slice() });
};

export default verifyFlowDomain;
