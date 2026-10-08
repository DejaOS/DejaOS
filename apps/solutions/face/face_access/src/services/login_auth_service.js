/**
 * @layer    services
 * @module   login_auth_service
 * @listens  CMD_LOGIN,CMD_GET_PUBLIC_CONFIG,CMD_VERIFY_SESSION,CMD_START_CONFIG_FACE_AUTH,CMD_CANCEL_CONFIG_FACE_AUTH,FACE_RECOGNIZED
 * @depends  event_bus,core/events,core/commands,login_auth_domain,face_domain
 */

import eventBus from '../core/event_bus.js';
import commands from '../core/commands.js';
import events from '../core/events.js';
import loginAuthDomain from '../domain/login_auth_domain.js';
import faceDomain from '../domain/face_domain.js';
import softwareDomain from '../domain/software_domain.js';

let initialized = false;
const registeredCommands = [];

function dataOf(request) {
    return request && Object.prototype.hasOwnProperty.call(request, 'data') ? request.data : request;
}

function startConfigFaceAuth() {
    loginAuthDomain.cancelFaceAuth();
    faceDomain.restartScene(faceDomain.SCENE.CONFIG_AUTH);
    return loginAuthDomain.beginFaceAuth();
}

function cancelConfigFaceAuth() {
    faceDomain.setScene(faceDomain.SCENE.OFF);
    loginAuthDomain.cancelFaceAuth();
    return true;
}

async function onFaceRecognized(payload) {
    if (!payload || payload.scene !== faceDomain.SCENE.CONFIG_AUTH) return;
    const authId = loginAuthDomain.getFaceAuthId();
    if (!authId) {
        faceDomain.discardResultImage(payload);
        return;
    }
    let result;
    try {
        result = await loginAuthDomain.verifyFace(payload);
    } catch (e) {
        result = { ok: false, error: e && e.message ? e.message : 'faceFailed' };
    }
    faceDomain.discardResultImage(payload);
    // 页面可能已退出或开启了新会话；迟到结果不得覆盖当前人脸场景。
    if (loginAuthDomain.getFaceAuthId() !== authId) return;
    faceDomain.setScene(faceDomain.SCENE.OFF);
    loginAuthDomain.completeFaceAuth(result, authId);
}

function registerCommand(command, handler) {
    eventBus.registerCommand(command, handler);
    registeredCommands.push(command);
}

function cleanup() {
    eventBus.off(events.FACE_RECOGNIZED, onFaceRecognized);
    while (registeredCommands.length > 0) {
        eventBus.unregisterCommand(registeredCommands.pop());
    }
    try { faceDomain.setScene(faceDomain.SCENE.OFF); } catch (_e) {}
    loginAuthDomain.destroy();
    initialized = false;
}

const loginAuthService = {};

loginAuthService.init = async function () {
    if (initialized) return;
    try {
        registerCommand(commands.LOGIN, function (request) {
            return loginAuthDomain.login(dataOf(request));
        });
        registerCommand(commands.GET_PUBLIC_CONFIG, async function () {
            const result = await loginAuthDomain.getPublicConfig();
            result.capabilities = softwareDomain.getCapabilities();
            return result;
        });
        registerCommand(commands.VERIFY_SESSION, function (request) {
            return loginAuthDomain.verifySession(dataOf(request));
        });
        registerCommand(commands.START_CONFIG_FACE_AUTH, startConfigFaceAuth);
        registerCommand(commands.CANCEL_CONFIG_FACE_AUTH, cancelConfigFaceAuth);
        eventBus.on(events.FACE_RECOGNIZED, onFaceRecognized);
        initialized = true;
    } catch (e) {
        // 初始化中途失败时回滚已注册入口，避免下次启动出现重复命令。
        cleanup();
        throw e;
    }
};

loginAuthService.destroy = async function () {
    cleanup();
};

export default loginAuthService;
