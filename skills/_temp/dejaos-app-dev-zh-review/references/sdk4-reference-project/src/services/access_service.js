/**
 * @layer    services
 * @module   access_service
 * @listens  CARD_SWIPED,EID_DETECTED,FINGER_TOUCHED,FACE_RECOGNIZED,密码/扫码通行及记录Command
 * @depends  event_bus,verify/door/audio/ui/record/mqtt/eid/finger domains,access_reporter
 */

import dxStd from '../../dxmodules/dxStd.js';
import logger from '../../dxmodules/dxLogger.js';
import eventBus from '../core/event_bus.js';
import events from '../core/events.js';
import commands from '../core/commands.js';
import verifyDomain from '../domain/verify_domain.js';
import verifyFlowDomain from '../domain/verify_flow_domain.js';
import doorDomain from '../domain/door_domain.js';
import audioDomain from '../domain/audio_domain.js';
import uiDomain from '../domain/ui_domain.js';
import recordDomain from '../domain/record_domain.js';
import mqttDomain from '../domain/mqtt_domain.js';
import eidDomain from '../domain/eid_domain.js';
import faceDomain from '../domain/face_domain.js';
import nfcDomain from '../domain/nfc_domain.js';
import scheduleDomain from '../domain/door_schedule_domain.js';
import fingerDomain from '../domain/finger_domain.js';
import accessReporter from './access_reporter.js';
import diagLog from '../utils/diag_log.js';

let initialized = false;
let accessQueue = Promise.resolve();
const recentAccess = new Map();
const FACE_BATCH_QUIET_MS = 300;
const FACE_BATCH_MAX_MS = 1200;
let verifyTimer = null;
let verifyTickTimer = null;
let faceQuietTimer = null;
let faceMaxTimer = null;
let faceBatch = [];

const registered = [];

function dataOf(request) {
    return request && Object.prototype.hasOwnProperty.call(request, 'data') ? request.data : request;
}

function register(command, handler) {
    eventBus.registerCommand(command, function (request) {
        return handler(dataOf(request));
    });
    registered.push(command);
}

function seconds(value) {
    const time = Number(value);
    if (!Number.isFinite(time)) return Math.floor(Date.now() / 1000);
    return Math.trunc(time > 100000000000 ? time / 1000 : time);
}

function accessInput(source, payload) {
    const value = payload || {};
    if (source === 'card') {
        return {
            type: value.type === undefined ? '200' : String(value.type),
            code: value.cardNo || '',
            time: seconds(value.ts),
            raw: value,
        };
    }
    if (source === 'scan') {
        return {
            type: value.type === undefined ? '100' : String(value.type),
            code: value.credential || '',
            time: seconds(value.ts),
            raw: value,
        };
    }
    if (source === 'password') {
        return {
            type: '400',
            code: value.password || value.code || '',
            time: seconds(value.ts),
            raw: value,
        };
    }
    if (source === 'finger') {
        const finger = value.data || value;
        return {
            type: '500',
            code: finger.code != null ? String(finger.code) : String(finger.index || ''),
            time: seconds(value.ts),
            raw: value,
        };
    }
    const face = value.data || {};
    return {
        type: '300',
        code: face.isCompare === false ? '' : (face.userId ? String(face.userId) : ''),
        time: seconds(value.ts),
        imagePath: face.picPath || '',
        faceId: face.id === undefined || face.id === null ? '' : String(face.id),
        raw: value,
    };
}

async function saveRecord(input, result, recordExtra) {
    const voucher = result.voucher || {};
    const person = result.person || {};
    const policy = await recordDomain.getPolicy();
    // 关闭人脸照片留存只约束新通行数据：图片不进入记录目录，也不会参与后续离线补报。
    const keepImage = policy.retainFaceImages && (input.type !== '300' || !!input.code
        || policy.strangerImage);
    return await recordDomain.save({
        id: dxStd.genRandomStr(10),
        keyId: voucher.keyId || '',
        permissionId: result.permissionId || '',
        // 未识别凭证不能把卡号、二维码或密码冒充为人员ID。
        userId: person.userId || '',
        name: person.name || '',
        type: input.type,
        code: input.type === '300' ? '' : input.code,
        imagePath: input.imagePath || '',
        keepImage: keepImage,
        door: '',
        timeStamp: input.time,
        result: result.allowed ? 0 : 1,
        extra: Object.assign({}, person.extra || {}, recordExtra || {}),
        message: result.reason,
    });
}

async function runEffect(name, effect) {
    try {
        await effect();
    } catch (e) {
        // 提示类副作用失败不能改变已经得出的鉴权结果，也不能阻断记录落库。
        logger.error('access_service ' + name + ' failed: ' + e.message);
    }
}

async function isDuplicate(input) {
    const intervalMs = (await verifyDomain.getPolicy()).duplicateIntervalMs;
    const now = Date.now();
    const key = input.type + ':' + (input.code || input.faceId || 'stranger');
    const previous = recentAccess.get(key) || 0;
    recentAccess.forEach(function (time, item) {
        if (now - time > intervalMs * 2) recentAccess.delete(item);
    });
    if (now - previous < intervalMs) return true;
    recentAccess.set(key, now);
    return false;
}

async function evaluateAccess(input, allowOnline) {
    let result = input.code
        ? await verifyDomain.authorize(input)
        : { allowed: false, reason: 'CREDENTIAL_EMPTY' };
    const schedule = await scheduleDomain.getCurrentState(input.time * 1000);
    await doorDomain.setScheduleMode(schedule.mode);

    if (allowOnline) {
        const onlineEnabled = await mqttDomain.isOnlineVerifyEnabled();
        if (schedule.mode !== scheduleDomain.MODE.CLOSED && !result.allowed && input.code
            && onlineEnabled && mqttDomain.isConnected()) {
            try {
                await mqttDomain.verifyAccess({
                    type: input.type,
                    code: input.code,
                    timeStamp: input.time,
                    message: result.reason || '',
                });
                result = Object.assign({}, result, { allowed: true, reason: 'ONLINE_ALLOW' });
            } catch (e) {
                logger.info('access_service online verify failed: ' + e.message);
            }
        }
    }
    if (schedule.mode === scheduleDomain.MODE.CLOSED) {
        result = Object.assign({}, result, { allowed: false, reason: 'SCHEDULE_CLOSED' });
    }
    return { input: input, result: result, schedule: schedule };
}

async function openOnce(result, schedule) {
    if (result.allowed && schedule.mode !== scheduleDomain.MODE.OPEN) {
        try {
            await doorDomain.open();
        } catch (e) {
            logger.error('access_service open door failed: ' + e.message);
            return Object.assign({}, result, { allowed: false, reason: 'DOOR_OPEN_FAILED' });
        }
    }
    return result;
}

async function finishAccess(input, result, schedule, recordExtra) {
    const startedAt = Date.now();
    const finalResult = await openOnce(result, schedule);
    await runEffect('play audio', function () { return audioDomain.notifyAccess(finalResult, input); });
    await runEffect('show ui', function () { return uiDomain.showAccess(finalResult, input); });
    const record = await saveRecord(input, finalResult, recordExtra);
    accessReporter.wake();
    diagLog.info('access_service', 'access_completed', {
        type: input.type, allowed: !!finalResult.allowed,
        reason: finalResult.reason || '', record_id: record.id,
        duration_ms: diagLog.duration(startedAt),
    });
    return Object.assign({}, finalResult, { recordId: record.id });
}

function clearVerifyTimer() {
    if (verifyTimer !== null) dxStd.clearTimeout(verifyTimer);
    if (verifyTickTimer !== null) dxStd.clearInterval(verifyTickTimer);
    verifyTimer = null;
    verifyTickTimer = null;
}

function showVerifyStatus(status) {
    return runEffect('show verify status', function () {
        return uiDomain.showVerifyStatus(status || verifyFlowDomain.getStatus());
    });
}

function evidenceExtra(flow) {
    const target = flow && flow.session;
    const steps = target && Array.isArray(target.steps) ? target.steps : [];
    const dualPerson = target ? target.mode === verifyFlowDomain.MODE.DUAL_PERSON
        : verifyFlowDomain.getMode() === verifyFlowDomain.MODE.DUAL_PERSON;
    if (dualPerson) {
        const primary = steps[0] || {};
        const verifier = steps[1] || {};
        function personEvidence(step) {
            const result = step.result || {};
            const person = result.person || {};
            return {
                userId: person.userId || '',
                name: person.name || '',
                factor: step.factor || '',
                type: step.input ? step.input.type || '' : '',
                keyId: result.voucher ? result.voucher.keyId || '' : '',
            };
        }
        return {
            verify: {
                mode: 'dual_person',
                sessionId: target ? target.sessionId || '' : '',
                primary: personEvidence(primary),
                verifier: steps.length > 1 ? personEvidence(verifier) : null,
            },
        };
    }
    return {
        verify: {
            mode: 'multi_factor',
            sessionId: target ? target.sessionId : '',
            factors: steps.map(function (step) {
                return {
                    factor: step.factor,
                    type: step.input.type,
                    keyId: step.result && step.result.voucher ? step.result.voucher.keyId || '' : '',
                };
            }),
        },
    };
}

function recordInputOf(flow) {
    const target = flow && flow.session;
    const steps = target && Array.isArray(target.steps) ? target.steps : [];
    const last = steps.length ? steps[steps.length - 1] : null;
    const first = steps.length ? steps[0] : null;
    const evidence = target && target.mode === verifyFlowDomain.MODE.DUAL_PERSON ? first : last;
    const fallback = evidence ? evidence.input : (flow && flow.input ? flow.input : { type: '', time: seconds() });
    const result = Object.assign({}, fallback);
    for (let i = 0; i < steps.length; i++) {
        if (steps[i].input && steps[i].input.imagePath) {
            result.imagePath = steps[i].input.imagePath;
            break;
        }
    }
    return result;
}

function discardFlowImages(flow, keptPath) {
    const target = flow && flow.session;
    const steps = target && Array.isArray(target.steps) ? target.steps : [];
    for (let i = 0; i < steps.length; i++) {
        const path = steps[i].input && steps[i].input.imagePath;
        if (path && path !== keptPath) recordDomain.discardImage(path);
    }
    const currentPath = flow && flow.input && flow.input.imagePath;
    if (currentPath && currentPath !== keptPath) recordDomain.discardImage(currentPath);
}

async function finishVerifyFlow(flow) {
    clearVerifyTimer();
    const target = flow.session;
    const steps = target && Array.isArray(target.steps) ? target.steps : [];
    const first = steps[0] || null;
    const last = steps.length ? steps[steps.length - 1] : first;
    const base = flow.status === 'allowed' ? last : first;
    const result = Object.assign({}, base && base.result ? base.result : (flow.result || {}), {
        allowed: flow.status === 'allowed',
        reason: flow.reason,
    });
    if (first && first.result && first.result.person) result.person = first.result.person;
    const input = recordInputOf(flow);
    const schedule = await scheduleDomain.getCurrentState(input.time * 1000);
    await doorDomain.setScheduleMode(schedule.mode);
    if (schedule.mode === scheduleDomain.MODE.CLOSED) {
        result.allowed = false;
        result.reason = 'SCHEDULE_CLOSED';
    }
    const finalResult = await finishAccess(input, result, schedule, evidenceExtra(flow));
    discardFlowImages(flow, input.imagePath || '');
    await showVerifyStatus(verifyFlowDomain.getStatus());
    return finalResult;
}

function scheduleVerifyTimeout() {
    clearVerifyTimer();
    const delay = Math.max(1, verifyFlowDomain.getRemainingMs());
    // Service负责流程节拍，Domain负责会话剩余时间；页面切换不会销毁此定时器。
    verifyTickTimer = dxStd.setInterval(function () {
        const status = verifyFlowDomain.getStatus();
        if (status.state !== 'pending') clearVerifyTimer();
        showVerifyStatus(status).catch(function (e) {
            logger.error('access_service verify tick failed: ' + e.message);
        });
    }, 1000);
    verifyTimer = dxStd.setTimeout(function () {
        verifyTimer = null;
        const task = accessQueue.then(async function () {
            const flow = verifyFlowDomain.timeout();
            if (flow) return await finishVerifyFlow(flow);
            // 极小的定时精度误差下重新挂载剩余时间，不能让会话永久停留在pending。
            const current = verifyFlowDomain.getStatus();
            if (current.state === 'pending') {
                scheduleVerifyTimeout();
            } else {
                clearVerifyTimer();
            }
            return null;
        });
        accessQueue = task.catch(function (e) {
            logger.error('access_service verify timeout failed: ' + e.message);
        });
    }, delay);
}

async function handleVerifyInput(input) {
    const mode = verifyFlowDomain.getMode();
    const dualPending = mode === verifyFlowDomain.MODE.DUAL_PERSON
        && verifyFlowDomain.getStatus().state === 'pending';
    // 双人会话开始后必须让第二次输入进入Domain：同一人员或非指定人员需要保留
    // 当前会话并给出准确提示，不能被普通通行的重复间隔规则提前吞掉。
    if (!dualPending && await isDuplicate(input)) {
        recordDomain.discardImage(input.imagePath);
        diagLog.debug('access_service', 'access_ignored', { type: input.type, reason: 'DUPLICATE_IGNORED' });
        return { allowed: false, ignored: true, reason: 'DUPLICATE_IGNORED' };
    }
    const evaluated = await evaluateAccess(input, false);
    const flow = verifyFlowDomain.submit(input, evaluated.result);
    if (flow.status === 'pending') {
        scheduleVerifyTimeout();
        await showVerifyStatus(flow.view);
        diagLog.info('access_service', 'verify_pending', {
            type: input.type, reason: flow.reason || '',
            mode: mode, remaining_ms: verifyFlowDomain.getRemainingMs(),
        });
        return { allowed: false, pending: true, reason: flow.reason, status: flow.view };
    }
    if (flow.status === 'retry') {
        recordDomain.discardImage(input.imagePath);
        await showVerifyStatus(flow.view);
        return { allowed: false, pending: true, retry: true, reason: flow.reason, status: flow.view };
    }
    if (flow.status === 'ignored') {
        recordDomain.discardImage(input.imagePath);
        await showVerifyStatus(flow.view);
        return { allowed: false, ignored: true, reason: flow.reason, status: flow.view };
    }
    return await finishVerifyFlow(flow);
}

async function handleAccess(source, payload) {
    const input = accessInput(source, payload);
    const mode = verifyFlowDomain.getMode();
    if (mode === verifyFlowDomain.MODE.MULTI_FACTOR || mode === verifyFlowDomain.MODE.DUAL_PERSON) {
        return await handleVerifyInput(input);
    }
    if (await isDuplicate(input)) {
        recordDomain.discardImage(input.imagePath);
        diagLog.debug('access_service', 'access_ignored', { type: input.type, reason: 'DUPLICATE_IGNORED' });
        return { allowed: false, ignored: true, reason: 'DUPLICATE_IGNORED' };
    }
    const allowOnline = verifyFlowDomain.getMode() === verifyFlowDomain.MODE.SINGLE;
    const evaluated = await evaluateAccess(input, allowOnline);
    return await finishAccess(input, evaluated.result, evaluated.schedule);
}

function clearFaceBatchTimers() {
    if (faceQuietTimer !== null) dxStd.clearTimeout(faceQuietTimer);
    if (faceMaxTimer !== null) dxStd.clearTimeout(faceMaxTimer);
    faceQuietTimer = null;
    faceMaxTimer = null;
}

function faceBatchKey(payload) {
    const face = payload && payload.data ? payload.data : {};
    // 同一人员在一个聚合窗内只保留一次；陌生人再退回跟踪ID/图片路径区分。
    if (face.userId) return 'user:' + String(face.userId);
    if (face.id !== undefined && face.id !== null) return 'face:' + String(face.id);
    return 'path:' + String(face.picPath || '');
}

async function handleFaceBatch(items) {
    if (verifyFlowDomain.getMode() !== verifyFlowDomain.MODE.MULTI_FACE) {
        const results = [];
        for (let i = 0; i < items.length; i++) results.push(await handleAccess('face', items[i]));
        return results;
    }
    const seen = {};
    const evaluated = [];
    for (let i = 0; i < items.length; i++) {
        const key = faceBatchKey(items[i]);
        const input = accessInput('face', items[i]);
        if (seen[key] || await isDuplicate(input)) {
            recordDomain.discardImage(input.imagePath);
            continue;
        }
        seen[key] = true;
        evaluated.push(await evaluateAccess(input, false));
    }
    if (!evaluated.length) return [];
    const allowed = evaluated.filter(function (item) { return item.result.allowed; });
    if (allowed.length) {
        const opened = await openOnce({ allowed: true, reason: 'MULTI_FACE_ALLOW' }, allowed[0].schedule);
        if (!opened.allowed) {
            for (let i = 0; i < allowed.length; i++) {
                allowed[i].result = Object.assign({}, allowed[i].result, opened);
            }
        }
    }
    // 开门失败会把原本通过的逐人结果改为失败，汇总必须基于最终结果重算。
    const finalAllowed = evaluated.filter(function (item) { return item.result.allowed; });
    const batchId = dxStd.genRandomStr(12);
    const summary = {
        allowed: finalAllowed.length > 0,
        reason: finalAllowed.length ? 'MULTI_FACE_ALLOW' : 'MULTI_FACE_DENIED',
        people: evaluated.map(function (item) {
            const person = item.result.person || {};
            return {
                allowed: !!item.result.allowed,
                userId: person.userId || '',
                name: person.name || '',
                faceId: item.input.faceId || '',
                reason: item.result.reason || '',
            };
        }),
    };
    await runEffect('play batch audio', function () {
        return audioDomain.notifyAccess(summary, { type: '300' });
    });
    await runEffect('show batch ui', function () { return uiDomain.showAccessBatch(summary); });
    diagLog.info('access_service', 'face_batch_completed', {
        total: evaluated.length,
        allowed_count: finalAllowed.length,
        result: summary.allowed ? 'allowed' : 'denied',
    });
    const records = [];
    for (let i = 0; i < evaluated.length; i++) {
        const item = evaluated[i];
        records.push(await saveRecord(item.input, item.result, {
            batchId: batchId,
            batchSize: evaluated.length,
            verifyMode: 'multi_face',
        }));
    }
    accessReporter.wake();
    return records;
}

function flushFaceBatch() {
    if (!faceBatch.length) return;
    const items = faceBatch;
    faceBatch = [];
    clearFaceBatchTimers();
    const task = accessQueue.then(function () { return handleFaceBatch(items); });
    accessQueue = task.catch(function (e) {
        for (let i = 0; i < items.length; i++) {
            recordDomain.discardImage(accessInput('face', items[i]).imagePath);
        }
        logger.error('access_service face batch failed: ' + e.message);
    });
}

function enqueueFaceBatch(payload) {
    faceBatch.push(payload);
    if (faceQuietTimer !== null) dxStd.clearTimeout(faceQuietTimer);
    faceQuietTimer = dxStd.setTimeout(flushFaceBatch, FACE_BATCH_QUIET_MS);
    if (faceMaxTimer === null) faceMaxTimer = dxStd.setTimeout(flushFaceBatch, FACE_BATCH_MAX_MS);
    return { allowed: false, pending: true, reason: 'FACE_BATCH_PENDING' };

}
function enqueueAccess(source, payload) {
    const input = accessInput(source, payload);
    diagLog.debug('access_service', 'access_received', { source: source, type: input.type });
    const task = accessQueue.then(function () { return handleAccess(source, payload); });
    accessQueue = task.catch(function (e) {
        recordDomain.discardImage(input.imagePath);
        diagLog.error('access_service', 'access_failed', e, {
            source: source, type: input.type,
        });
    });
    return task;
}

function onCard(payload) {
    if (payload && payload.scene === nfcDomain.SCENE.CAPTURE) {
        return { allowed: false, ignored: true, reason: 'CARD_CAPTURE_SCENE' };
    }
    return enqueueAccess('card', payload);
}
function onScan(payload) { return enqueueAccess('scan', payload); }
function onFace(payload) {
    // 配置页人脸认证不能进入通行流程，更不能触发开门和通行记录。
    if (!payload || payload.scene !== faceDomain.SCENE.ACCESS) {
        return { allowed: false, ignored: true, reason: 'FACE_SCENE_IGNORED' };
    }
    if (verifyFlowDomain.getMode() === verifyFlowDomain.MODE.MULTI_FACE) {
        return enqueueFaceBatch(payload);
    }
    return enqueueAccess('face', payload);
}

function onFinger(payload) {
    if (!payload || payload.scene !== fingerDomain.SCENE.ACCESS) {
        return { allowed: false, ignored: true, reason: 'FINGER_SCENE_IGNORED' };
    }
    return enqueueAccess('finger', payload);
}
async function onEid(payload) {
    if (!await nfcDomain.isEnabled()) {
        return { allowed: false, disabled: true, reason: 'NFC_DISABLED' };
    }
    const raw = payload && payload.raw ? payload.raw : {};
    // 读失败必须提示，不能把芯片 UID 当通行卡号；解析成功但无卡号则忽略。
    const parsed = await eidDomain.parseAccess(raw);
    if (!parsed.ok) {
        logger.error('access_service eid read failed: ' + parsed.message
            + ' error=' + parsed.error);
        await runEffect('play audio', function () {
            return audioDomain.notifyAccess({ allowed: false, reason: 'EID_READ_FAILED' }, { type: '200' });
        });
        await runEffect('show ui', function () { return uiDomain.showError('云证读取失败'); });
        return { allowed: false, reason: 'EID_READ_FAILED', error: parsed.error };
    }
    if (!parsed.code) {
        return { allowed: false, ignored: true, reason: 'EID_CODE_EMPTY' };
    }
    return enqueueAccess('card', {
        cardNo: parsed.code,
        raw: raw,
        ts: payload && payload.ts ? payload.ts : Date.now(),
    });
}

async function onPassword(payload) {
    if (!(await verifyDomain.getPolicy()).passwordEnabled) {
        return { allowed: false, disabled: true, reason: 'PASSWORD_DISABLED' };
    }
    return await enqueueAccess('password', payload);
}
const accessService = {};

accessService.init = async function () {
    if (initialized) return;
    try {
        await verifyFlowDomain.init();
        register(commands.PASSWORD_ACCESS, onPassword);
        register(commands.SCAN_ACCESS, onScan);
        register(commands.GET_RECORDS, recordDomain.query);
        register(commands.DELETE_RECORDS, recordDomain.remove);
        register(commands.GET_RECORD_IMAGE, recordDomain.getImage);
        eventBus.on(events.CARD_SWIPED, onCard);
        eventBus.on(events.EID_DETECTED, onEid);
        eventBus.on(events.FINGER_TOUCHED, onFinger);
        eventBus.on(events.FACE_RECOGNIZED, onFace);
        accessReporter.init();
        await showVerifyStatus(verifyFlowDomain.getStatus());
        initialized = true;
    } catch (e) {
        await accessService.destroy();
        throw e;
    }
};

accessService.destroy = async function () {
    if (!initialized && registered.length === 0) {
        await accessReporter.destroy();
        return;
    }
    initialized = false;
    eventBus.off(events.CARD_SWIPED, onCard);
    eventBus.off(events.EID_DETECTED, onEid);
    eventBus.off(events.FINGER_TOUCHED, onFinger);
    eventBus.off(events.FACE_RECOGNIZED, onFace);
    for (let i = 0; i < registered.length; i++) {
        eventBus.unregisterCommand(registered[i]);
    }
    registered.length = 0;
    await accessReporter.destroy();
    clearVerifyTimer();
    clearFaceBatchTimers();
    for (let i = 0; i < faceBatch.length; i++) {
        recordDomain.discardImage(accessInput('face', faceBatch[i]).imagePath);
    }
    faceBatch = [];
    // 已进入队列的通行任务仍可能操作Domain；下层销毁前必须等待队列排空。
    const pending = accessQueue;
    try { await pending; } finally { accessQueue = Promise.resolve(); }
    verifyFlowDomain.destroy();
    await doorDomain.destroy();
    recentAccess.clear();
};

export default accessService;
