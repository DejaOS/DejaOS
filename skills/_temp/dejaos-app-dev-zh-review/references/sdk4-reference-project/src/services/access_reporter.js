/**
 * @layer services
 * @module access_reporter
 *
 * access_service的内部上报协调器：串行补报、ACK确认和有上限退避。
 * 不注册Command，不产生新业务Event。
 */

import dxStd from '../../dxmodules/dxStd.js';
import eventBus from '../core/event_bus.js';
import events from '../core/events.js';
import recordDomain from '../domain/record_domain.js';
import mqttDomain from '../domain/mqtt_domain.js';
import diagLog from '../utils/diag_log.js';

const BASE_RETRY_MS = 5000;
const MAX_RETRY_MS = 60000;
let running = false;
let online = false;
let timer = null;
let inFlight = null;
let wakePending = false;
let retryMs = BASE_RETRY_MS;

function clearTimer() {
    if (timer !== null) dxStd.clearTimeout(timer);
    timer = null;
}

function schedule(delayMs) {
    if (!running || !online || timer !== null || inFlight) return;
    timer = dxStd.setTimeout(function () {
        timer = null;
        run();
    }, Math.max(0, Number(delayMs) || 0));
}

function run() {
    if (!running || !online || inFlight) return;
    let nextDelay = null;
    inFlight = (async function () {
        try {
            const job = await recordDomain.nextPending();
            if (!job) {
                // 队列为空属于正常停止条件，等待新记录或MQTT重连再次唤醒。
                retryMs = BASE_RETRY_MS;
                return;
            }
            const startedAt = Date.now();
            await mqttDomain.reportAccess(job.data, job.recordId);
            await recordDomain.confirmUploaded(job.recordId);
            diagLog.info('access_reporter', 'record_uploaded', {
                record_id: job.recordId,
                duration_ms: diagLog.duration(startedAt),
            });
            retryMs = BASE_RETRY_MS;
            nextDelay = BASE_RETRY_MS;
        } catch (e) {
            diagLog.warn('access_reporter', 'upload_retry', {
                error: e.message,
                retry_ms: retryMs,
            });
            nextDelay = retryMs;
            retryMs = Math.min(MAX_RETRY_MS, retryMs * 2);
        }
    })().finally(function () {
        inFlight = null;
        if (!running || !online) {
            wakePending = false;
            return;
        }
        // 查询空队列期间可能恰好写入新记录；延迟唤醒保证这次通知不会丢失。
        if (wakePending) {
            wakePending = false;
            schedule(0);
            return;
        }
        if (nextDelay !== null) schedule(nextDelay);
    });
}

function requestWake() {
    if (!running || !online) return;
    retryMs = BASE_RETRY_MS;
    clearTimer();
    if (inFlight) {
        wakePending = true;
        return;
    }
    schedule(0);
}

function onMqttChanged(payload) {
    online = !!(payload && payload.current && payload.current.connected === true);
    diagLog.info('access_reporter', 'transport_changed', {
        online: online,
    });
    clearTimer();
    retryMs = BASE_RETRY_MS;
    if (online) requestWake();
    else wakePending = false;
}

const accessReporter = {};

accessReporter.init = function () {
    if (running) return;
    running = true;
    online = mqttDomain.isConnected();
    wakePending = false;
    retryMs = BASE_RETRY_MS;
    eventBus.on(events.MQTT_CHANGED, onMqttChanged);
    if (online) requestWake();
};

accessReporter.wake = function () {
    requestWake();
};

accessReporter.destroy = async function () {
    if (!running) return;
    running = false;
    online = false;
    eventBus.off(events.MQTT_CHANGED, onMqttChanged);
    clearTimer();
    const task = inFlight;
    if (task) {
        try { await task; } catch (_e) {}
    }
    inFlight = null;
    wakePending = false;
    retryMs = BASE_RETRY_MS;
};

export default accessReporter;