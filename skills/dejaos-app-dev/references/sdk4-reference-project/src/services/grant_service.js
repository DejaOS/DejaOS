/**
 * @layer    services
 * @module   grant_service
 * @listens  人员、凭证、权限、密钥、人脸录入/抓拍管理Command
 * @depends  event_bus,core/commands,data domains
 *
 * MQTT、HTTP、UI共用本Service；协议差异只能在Controller边界转换。
 */

import eventBus from '../core/event_bus.js';
import events from '../core/events.js';
import commands from '../core/commands.js';
import personDomain from '../domain/person_domain.js';
import voucherDomain from '../domain/voucher_domain.js';
import permissionDomain from '../domain/permission_domain.js';
import securityDomain from '../domain/security_domain.js';
import faceDomain from '../domain/face_domain.js';
import nfcDomain from '../domain/nfc_domain.js';
import fingerDomain from '../domain/finger_domain.js';

let initialized = false;
const registered = [];
let pendingCardCapture = null;

function finishCardCapture(result) {
    const pending = pendingCardCapture;
    pendingCardCapture = null;
    nfcDomain.restoreAccessScene();
    if (pending) pending.resolve(result || { cancelled: true });
}

function captureCard() {
    if (pendingCardCapture) throw new Error('已有刷卡采集正在进行');
    nfcDomain.setScene(nfcDomain.SCENE.CAPTURE);
    return new Promise(function (resolve) {
        pendingCardCapture = { resolve: resolve };
    });
}

function cancelCardCapture() {
    finishCardCapture({ cancelled: true });
    return true;
}

function onCardCaptured(payload) {
    if (!pendingCardCapture || !payload || payload.scene !== nfcDomain.SCENE.CAPTURE) return;
    const cardNo = String(payload.cardNo || '').trim();
    if (cardNo) finishCardCapture({ cardNo: cardNo });
}

function dataOf(request) {
    return request && Object.prototype.hasOwnProperty.call(request, 'data') ? request.data : request;
}

function register(command, handler) {
    eventBus.registerCommand(command, function (request) {
        return handler(dataOf(request));
    });
    registered.push(command);
}

const grantService = {};

grantService.init = async function () {
    if (initialized) return;
    try {
        register(commands.INSERT_USER, personDomain.insert);
        register(commands.MODIFY_USER, personDomain.modify);
        register(commands.DELETE_USER, personDomain.remove);
        register(commands.CLEAR_USER, personDomain.clear);
        register(commands.GET_USER, personDomain.query);
        register(commands.GET_USER_PROFILE, personDomain.getProfile);
        register(commands.SAVE_USER_PROFILE, personDomain.saveProfile);
        register(commands.DELETE_USER_PROFILE, personDomain.removeProfile);

        register(commands.INSERT_KEY, voucherDomain.insert);
        register(commands.MODIFY_KEY, voucherDomain.modify);
        register(commands.DELETE_KEY, voucherDomain.remove);
        register(commands.CLEAR_KEY, voucherDomain.clear);
        register(commands.GET_KEY, voucherDomain.query);

        register(commands.INSERT_PERMISSION, permissionDomain.insert);
        register(commands.MODIFY_PERMISSION, permissionDomain.modify);
        register(commands.DELETE_PERMISSION, permissionDomain.remove);
        register(commands.CLEAR_PERMISSION, permissionDomain.clear);
        register(commands.GET_PERMISSION, permissionDomain.query);

        register(commands.INSERT_SECURITY, securityDomain.insert);
        register(commands.DELETE_SECURITY, securityDomain.remove);
        register(commands.CLEAR_SECURITY, securityDomain.clear);
        register(commands.GET_SECURITY, securityDomain.query);

        register(commands.ENROLL_FACE, faceDomain.enroll);
        register(commands.REMOVE_FACE, function (data) {
            return faceDomain.remove(data && data.userId);
        });
        register(commands.CAPTURE_FACE, function (data) {
            return faceDomain.capture(data && data.timeout, {
                keepImage: !!(data && data.keepImage === true),
            });
        });
        register(commands.RELEASE_FACE_CAPTURE, faceDomain.releaseCapture);
        register(commands.CAPTURE_CARD, captureCard);
        register(commands.CANCEL_CARD_CAPTURE, cancelCardCapture);
        register(commands.ENROLL_FINGER, function (data) {
            return fingerDomain.enroll(data || {});
        });
        register(commands.INTERRUPT_FINGER, function (data) {
            return fingerDomain.interrupt(data || {});
        });
        register(commands.START_FINGER_ACCESS, function () {
            if (!fingerDomain.isActive()) return false;
            if (fingerDomain.isBusy()) return false;
            // 远程申请/录入 UI 会话中禁止恢复通行，避免与采指抢串口。
            if (fingerDomain.isUiSession()) return false;
            fingerDomain.restoreAccessScene();
            return true;
        });
        register(commands.PAUSE_FINGER_ACCESS, function () {
            if (!fingerDomain.isActive()) return false;
            // 采指/写库占用中不拆 exclusive，只表示离开首页通行意图。
            if (fingerDomain.isBusy()) return true;
            fingerDomain.setScene(fingerDomain.SCENE.OFF);
            return true;
        });
        eventBus.on(events.CARD_SWIPED, onCardCaptured);
        initialized = true;
    } catch (e) {
        await grantService.destroy();
        throw e;
    }
};

grantService.destroy = async function () {
    cancelCardCapture();
    eventBus.off(events.CARD_SWIPED, onCardCaptured);
    for (let i = 0; i < registered.length; i++) {
        eventBus.unregisterCommand(registered[i]);
    }
    registered.length = 0;
    initialized = false;
};

export default grantService;
