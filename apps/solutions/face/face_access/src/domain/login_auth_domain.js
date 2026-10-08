/**
 * @layer    domain
 * @module   login_auth_domain
 * @depends  storage/config,person_domain,software_domain,dxStd,dxCommonUtils,core/error
 *
 * 仅负责Web/UI管理端登录和会话，不承担门禁通行鉴权。
 */

import dxStd from '../../dxmodules/dxStd.js';
import dxCommonUtils from '../../dxmodules/dxCommonUtils.js';
import configStorage from '../storage/config/config.js';
import personDomain from './person_domain.js';
import softwareDomain from './software_domain.js';
import { AppError } from '../core/error.js';

const REGION_FILE = '/etc/app/.region';
const WECOM_MODE_FILE = '/etc/app/.weCom';

function readFlag(path) {
    try {
        const text = dxStd.loadFileSync(path);
        return text ? String(text).trim() : '';
    } catch (_e) {
        return '';
    }
}

function isWeComDevice() {
    return readFlag(WECOM_MODE_FILE) === 'weCom';
}

function getRegion() {
    return readFlag(REGION_FILE) === 'INTL' ? 'INTL' : 'CN';
}

const SESSION_TTL_MS = 24 * 60 * 60 * 1000;
const sessions = new Map();
let pendingFaceAuth = null;
let faceAuthSequence = 0;

function clearExpiredSessions() {
    const now = Date.now();
    sessions.forEach(function (expiresAt, token) {
        if (expiresAt <= now) sessions.delete(token);
    });
}

const loginAuthDomain = {};

/** 创建一次配置页人脸认证事务；结果由FACE_RECOGNIZED推进。 */
loginAuthDomain.beginFaceAuth = function () {
    if (pendingFaceAuth) throw new AppError('300000', '人脸认证正在进行');
    const id = ++faceAuthSequence;
    return new Promise(function (resolve) {
        pendingFaceAuth = { id: id, resolve: resolve };
    });
};

loginAuthDomain.getFaceAuthId = function () {
    return pendingFaceAuth ? pendingFaceAuth.id : 0;
};

loginAuthDomain.completeFaceAuth = function (result, expectedId) {
    if (!pendingFaceAuth || (expectedId && pendingFaceAuth.id !== expectedId)) return false;
    const pending = pendingFaceAuth;
    pendingFaceAuth = null;
    pending.resolve(result || { ok: false, error: 'faceFailed' });
    return true;
};

loginAuthDomain.cancelFaceAuth = function () {
    return loginAuthDomain.completeFaceAuth({ ok: false, cancelled: true });
};

/** 延续2.0规则：只有人员extra.type=1的管理员人脸可以进入配置。 */
loginAuthDomain.verifyFace = async function (payload) {
    const face = payload && payload.data ? payload.data : {};
    const userId = face.isCompare === false ? '' : String(face.userId || '');
    if (!userId) return { ok: false, error: 'faceNotMatched' };
    const person = await personDomain.get(userId);
    if (!person) return { ok: false, error: 'personNotFound' };
    if (!person.extra || Number(person.extra.type) !== 1) {
        return { ok: false, error: 'notAdmin' };
    }
    return { ok: true, userId: userId };
};

loginAuthDomain.login = async function (values) {
    const input = values || {};
    const firstLogin = Number(await configStorage.get('base.firstLogin', 0));
    const password = await configStorage.get('base.password', '');
    if (firstLogin !== 1 || password === '') {
        throw new AppError('409', '请先设置管理员密码');
    }
    if (typeof input.userPassword !== 'string' || input.userPassword !== password) {
        throw new AppError('403', '用户名或密码错误');
    }
    clearExpiredSessions();
    const token = dxCommonUtils.random.getBytes(32);
    sessions.set(token, Date.now() + SESSION_TTL_MS);
    return { accessToken: token };
};

loginAuthDomain.verifySession = function (token) {
    clearExpiredSessions();
    if (typeof token !== 'string' || !sessions.has(token)) {
        throw new AppError('401', '登录已过期');
    }
    return true;
};

loginAuthDomain.getPublicConfig = async function () {
    const firstLogin = Number(await configStorage.get('base.firstLogin', 0));
    const password = await configStorage.get('base.password', '');
    const caps = softwareDomain.getCapabilities();
    return {
        language: await configStorage.get('base.language', 'CN'),
        // Web只在首次引导已完成且管理员密码非空时进入普通登录。
        firstLogin: firstLogin === 1 && password !== '' ? 1 : 0,
        passwordLength: Number(await configStorage.get('sys.passwordLength', 6)),
        model: caps.model || '',
        version: getRegion(),
        isWeCom: isWeComDevice(),
        finger: caps.finger,
        // Web 据此在改配置后自行确认重启；verifyMode 仅多人模式切换时实际需要。
        rebootRequiredKeys: ['ntp.timeZone', 'access.verifyMode'],
    };
};

loginAuthDomain.destroy = function () {
    loginAuthDomain.cancelFaceAuth();
    sessions.clear();
};

export default loginAuthDomain;
