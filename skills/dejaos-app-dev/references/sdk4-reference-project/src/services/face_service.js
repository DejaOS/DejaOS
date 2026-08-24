/**
 * @layer services
 * @module face_service
 * @listens FACE_DETECTED,FACE_RECOGNIZED及人脸场景Command
 * @depends event_bus,face_domain,face_view_domain,display_domain,ui_domain
 */

import eventBus from '../core/event_bus.js';
import events from '../core/events.js';
import commands from '../core/commands.js';
import faceDomain from '../domain/face_domain.js';
import faceViewDomain from '../domain/face_view_domain.js';
import displayDomain from '../domain/display_domain.js';
import uiDomain from '../domain/ui_domain.js';
import logger from '../../dxmodules/dxLogger.js';

let initialized = false;
const registered = [];

function register(command, handler) {
    eventBus.registerCommand(command, handler);
    registered.push(command);
}

function viewOptions() {
    return {
        policy: faceDomain.getLivenessPolicy(),
        diagnosticEnabled: faceDomain.isDiagnosticEnabled(),
    };
}

/**
 * 该函数只会在检测结果确实包含人脸时调用。
 * 背光已亮不代表设备仍在主页，屏保也是亮屏状态；因此背光只按需点亮，
 * 但每个有效检测帧都必须刷新UI活动时间并退出屏保，使“人仍在镜头前”保持唤醒。
 */
function wake() {
    try {
        if (!displayDomain.isAwake()) {
            logger.info('screen_off woke by face');
            displayDomain.setAwake(true);
        }
    } catch (e) {
        logger.error('face_service display wake failed: ' + e.message);
    }
    try {
        uiDomain.notifyActivity();
    } catch (e) {
        logger.error('face_service UI activity failed: ' + e.message);
    }
}

function onDetected(payload) {
    const scene = payload && payload.scene;
    if (scene !== faceDomain.SCENE.ACCESS
        && scene !== faceDomain.SCENE.CONFIG_AUTH
        && scene !== faceDomain.SCENE.ENROLL) return;
    // 空检测帧只清理检测框，不能被当成“检测到人”而唤醒设备。
    const hasFace = faceViewDomain.showDetected(payload, viewOptions());
    if (scene === faceDomain.SCENE.ACCESS && hasFace) wake();
}

function onRecognized(payload) {
    const scene = payload && payload.scene;
    // 注册取景只跟检测框，不把库内比对结果画成通行绿/红框。
    if (scene !== faceDomain.SCENE.ACCESS && scene !== faceDomain.SCENE.CONFIG_AUTH) return;
    const hasFace = faceViewDomain.showRecognized(payload, viewOptions());
    if (scene === faceDomain.SCENE.ACCESS && hasFace) wake();
}

const faceService = {};

faceService.init = async function () {
    if (initialized) return;
    try {
        // 预热Domain配置快照，后续检测帧只做同步读取，不访问SQLite。
        await faceDomain.getConfig();
        eventBus.on(events.FACE_DETECTED, onDetected);
        eventBus.on(events.FACE_RECOGNIZED, onRecognized);
        register(commands.START_FACE_RECOGNITION, function () {
            faceViewDomain.clear();
            return faceDomain.setScene(faceDomain.SCENE.ACCESS);
        });
        register(commands.PAUSE_FACE_RECOGNITION, function () {
            faceViewDomain.clear();
            return faceDomain.setScene(faceDomain.SCENE.OFF);
        });
        register(commands.START_FACE_ENROLL, function () {
            faceViewDomain.clear();
            return faceDomain.restartScene(faceDomain.SCENE.ENROLL);
        });
        register(commands.PAUSE_FACE_ENROLL, function () {
            faceViewDomain.clear();
            return faceDomain.setScene(faceDomain.SCENE.OFF);
        });
        initialized = true;
    } catch (e) {
        await faceService.destroy();
        throw e;
    }
};

faceService.destroy = async function () {
    // 初始化中途失败时initialized尚未置位，但已注册的监听和Command仍需撤销。
    initialized = false;
    eventBus.off(events.FACE_DETECTED, onDetected);
    eventBus.off(events.FACE_RECOGNIZED, onRecognized);
    for (let i = 0; i < registered.length; i++) eventBus.unregisterCommand(registered[i]);
    registered.length = 0;
    faceViewDomain.destroy();
    try { faceDomain.suspend(); } catch (_e) {}
};

export default faceService;
