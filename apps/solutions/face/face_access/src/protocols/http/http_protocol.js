/**
 * @layer    protocols
 * @module   http_protocol
 * @fires    none
 * @listens  HTTP POST /api/*
 * @depends  dxHttpServer,event_bus,core/commands,dxStd,dxLogger
 *
 * 调用边界：
 * - 本文件负责HTTP路径、JSON报文、Token校验和HTTP响应格式。
 * - HTTP与MQTT共用core/commands.js和Service，不复制业务逻辑。
 * - Service和Domain不得接触req、res、HTTP路径或状态码。
 */

import dxHttpServer from '../../../dxmodules/dxHttpServer.js';
import dxStd from '../../../dxmodules/dxStd.js';
import dxLogger from '../../../dxmodules/dxLogger.js';
import eventBus from '../../core/event_bus.js';
import commands from '../../core/commands.js';
import diagLog from '../../utils/diag_log.js';

const HTTP_PORT = 8080;

/** control.extra.weComStatus → APPLY_WECOM_BIND_STATUS（协议边界归一，不进 Service） */
function mapWecomBindControl(data) {
    const extra = data && data.extra && typeof data.extra === 'object' ? data.extra : null;
    if (!extra || !Object.prototype.hasOwnProperty.call(extra, 'weComStatus')) {
        return null;
    }
    const raw = Number(extra.weComStatus);
    if (raw !== 0 && raw !== 1) {
        return null;
    }
    return {
        command: commands.APPLY_WECOM_BIND_STATUS,
        data: { status: raw === 1 ? 1 : 0 },
    };
}

const STATIC_DIR = '/app/code/resource/web';
const COMMAND_TIMEOUT_MS = 10000;
const FACE_COMMAND_TIMEOUT_MS = 35000;
/** 远程指纹 control：自申请页唤起起整段 60s（申请 + 采指共用） */
const FINGER_CONTROL_TIMEOUT_MS = 60000;
const OTA_COMMAND_TIMEOUT_MS = 310000;
const OTA_UPLOAD_TIMEOUT_MS = 120000;
const DIAG_COMMAND_TIMEOUT_MS = 20000;
const LOG_EXPORT_TIMEOUT_MS = 120000;
const DB_EXPORT_TIMEOUT_MS = 120000;
const ADVERT_TIMEOUT_MS = 310000;

/*
 * 路径保持旧标品Web接口名称，统一增加/api前缀。
 * protected=false表示登录前允许访问。
 */
const ROUTES = [
    ['login', commands.LOGIN, false, true],
    ['getPublicConfig', commands.GET_PUBLIC_CONFIG, false, false],
    // firstLogin=0或当前密码为空时允许匿名首次设密；Domain拒绝已完成设密后的重复调用。
    ['completeFirstLogin', commands.COMPLETE_FIRST_LOGIN, false, false],
    ['control', commands.CONTROL_DEVICE, true, false],
    ['upgradeFirmware', commands.UPGRADE_FIRMWARE, true, false],
    ['getConfig', commands.GET_CONFIG, true, false],
    ['setConfig', commands.SET_CONFIG, true, false],
    ['getSystemTime', commands.GET_SYSTEM_TIME, true, false],
    ['setSystemTime', commands.SET_SYSTEM_TIME, true, false],
    ['getDoorSchedules', commands.GET_DOOR_SCHEDULES, true, false],
    ['setDoorSchedules', commands.SET_DOOR_SCHEDULES, true, false],
    ['ping', commands.PING_HOST, true, false],
    ['networkDiagnosis', commands.RUN_NETWORK_DIAG, true, false],
    ['getWebrtcStatus', commands.GET_WEBRTC_STATUS, true, false],
    ['getFaceDiagnosis', commands.GET_FACE_DIAG_STATUS, true, false],
    ['setFaceDiagnosis', commands.SET_FACE_DIAG_STATUS, true, false],
    ['getAdvertisements', commands.GET_ADVERTISEMENTS, true, false],
    ['uploadAdvertChunk', commands.UPLOAD_ADVERTISEMENT_CHUNK, true, false],
    ['abortAdvertUpload', commands.ABORT_ADVERTISEMENT_UPLOAD, true, false],

    ['insertUser', commands.INSERT_USER, true, false],
    ['modifyUser', commands.MODIFY_USER, true, false],
    ['delUser', commands.DELETE_USER, true, false],
    ['getUser', commands.GET_USER, true, false],
    ['clearUser', commands.CLEAR_USER, true, false],

    ['insertKey', commands.INSERT_KEY, true, false],
    ['modifyKey', commands.MODIFY_KEY, true, false],
    ['delKey', commands.DELETE_KEY, true, false],
    ['getKey', commands.GET_KEY, true, false],
    ['clearKey', commands.CLEAR_KEY, true, false],
    ['saveLocalKeys', commands.SAVE_LOCAL_KEYS, true, false],

    ['insertPermission', commands.INSERT_PERMISSION, true, false],
    ['modifyPermission', commands.MODIFY_PERMISSION, true, false],
    ['delPermission', commands.DELETE_PERMISSION, true, false],
    ['getPermission', commands.GET_PERMISSION, true, false],
    ['clearPermission', commands.CLEAR_PERMISSION, true, false],

    ['insertSecurity', commands.INSERT_SECURITY, true, false],
    ['getSecurity', commands.GET_SECURITY, true, false],
    ['delSecurity', commands.DELETE_SECURITY, true, false],
    ['clearSecurity', commands.CLEAR_SECURITY, true, false],

    ['getRecord', commands.GET_RECORDS, true, false],
    ['delRecord', commands.DELETE_RECORDS, true, false],
    ['getRecordMsg', commands.GET_RECORD_IMAGE, true, false],
    ['eidActive', commands.ACTIVATE_EID, true, false],
    ['uploadChunk', commands.UPLOAD_FIRMWARE_CHUNK, true, false],
    ['uploadChunkAbort', commands.ABORT_FIRMWARE_UPLOAD, true, false],
];

let initialized = false;
let accepting = false;
let activeRequests = 0;

function getHeader(headers, name) {
    const target = name.toLowerCase();
    const keys = Object.keys(headers || {});
    for (let i = 0; i < keys.length; i++) {
        if (keys[i].toLowerCase() === target) {
            return headers[keys[i]];
        }
    }
    return '';
}

function parseBody(req) {
    if (!req.body) {
        return {};
    }
    if (req.bodyJson === null || req.bodyJson === undefined) {
        throw new Error('请求内容不是有效JSON');
    }
    if (typeof req.bodyJson !== 'object' || Array.isArray(req.bodyJson)) {
        throw new Error('请求内容必须是JSON对象');
    }
    return req.bodyJson;
}

function commandTimeout(command, payload) {
    const data = payload && payload.data;
    const faceWrite = (command === commands.INSERT_KEY || command === commands.MODIFY_KEY) &&
        Array.isArray(data) && data.some(function (item) { return String(item && item.type) === '300'; });
    if (faceWrite) return FACE_COMMAND_TIMEOUT_MS;
    if (command === commands.CONTROL_DEVICE && Number(data && data.command) === 12
        && data.extra && Number(data.extra.fingerprintAction) === 0) {
        return FINGER_CONTROL_TIMEOUT_MS;
    }
    if (command === commands.UPGRADE_FIRMWARE) {
        const timeoutSec = Number(data && data.timeoutSec);
        return Number.isInteger(timeoutSec) && timeoutSec > 0
            ? (timeoutSec + 10) * 1000
            : OTA_COMMAND_TIMEOUT_MS;
    }
    if (command === commands.UPLOAD_FIRMWARE_CHUNK) return OTA_UPLOAD_TIMEOUT_MS;
    if (command === commands.PING_HOST || command === commands.RUN_NETWORK_DIAG) {
        return DIAG_COMMAND_TIMEOUT_MS;
    }
    if (command === commands.PREPARE_LOG_EXPORT) return LOG_EXPORT_TIMEOUT_MS;
    if (command === commands.PREPARE_DB_EXPORT) return DB_EXPORT_TIMEOUT_MS;
    if (command === commands.UPLOAD_ADVERTISEMENT_CHUNK
        || command === commands.UPDATE_ADVERTISEMENTS_REMOTE) return ADVERT_TIMEOUT_MS;
    return COMMAND_TIMEOUT_MS;
}

function executeCommand(command, payload) {
    return new Promise(function (resolve, reject) {
        let settled = false;
        const timer = dxStd.setTimeout(function () {
            if (!settled) {
                settled = true;
                reject(new Error('命令执行超时'));
            }
        }, commandTimeout(command, payload));

        eventBus.execute(command, payload).then(function (result) {
            if (!settled) {
                settled = true;
                dxStd.clearTimeout(timer);
                resolve(result);
            }
        }).catch(function (error) {
            if (!settled) {
                settled = true;
                dxStd.clearTimeout(timer);
                reject(error);
            }
        });
    });
}

function sendSuccess(res, data) {
    res.json(200, {
        code: 200,
        message: '',
        data: data === undefined ? {} : data,
    });
}

/*
 * 当前Web页面仍消费2.0的字符串字段。兼容只放在HTTP出站边界，Domain、
 * MQTT和后续UI继续使用对象及数组，避免旧格式污染公共业务能力。
 */
function formatLegacyWebResult(command, result) {
    if (!result || !Array.isArray(result.content)) {
        return result;
    }
    const next = Object.assign({}, result);
    next.content = result.content.map(function (item) {
        const row = Object.assign({}, item);
        if (command === commands.GET_USER) {
            row.extra = JSON.stringify(row.extra || {});
            row.permissionIds = Array.isArray(row.permissionIds) ? row.permissionIds.join(',') : '';
        } else if (command === commands.GET_KEY || command === commands.GET_RECORDS) {
            row.extra = JSON.stringify(row.extra || {});
        }
        return row;
    });
    return next;
}

function sendError(res, error) {
    const errorCode = error && String(error.code);
    const notReady = error && String(error.message).indexOf('command handler not found') >= 0;
    const detail = error && error.detail;
    res.json(200, {
        code: errorCode === '401' ? 401 : (errorCode === '403' ? 403 : 400),
        message: notReady ? '功能尚未接入' : ((error && error.message) || '请求失败'),
        data: detail && (Array.isArray(detail) || typeof detail === 'object') ? detail : {},
    });
}

async function runAfterResponse(tasks) {
    // 逐个触发但不串联 await：避免长耗时任务（历史钩子）拖住调用方。
    for (let i = 0; i < tasks.length; i++) {
        Promise.resolve()
            .then(tasks[i])
            .catch(function (e) {
                dxLogger.error('http_protocol afterResponse task failed: ' + e.message);
            });
    }
}

/** 回包已发出后再跑钩子；成功/失败都要跑（部分成功落库后仍可能挂了网络重连）。 */
function scheduleAfterResponse(tasks, onDone) {
    if (!tasks || !tasks.length) {
        if (typeof onDone === 'function') onDone();
        return;
    }
    const deferredTasks = tasks.slice();
    dxStd.setTimeout(function () {
        runAfterResponse(deferredTasks).then(function () {
            if (typeof onDone === 'function') onDone();
        }).catch(function (e) {
            dxLogger.error('http_protocol afterResponse failed: ' + e.message);
        });
    }, 50);
}

function createHandler(command, protectedRoute, directBody) {
    return async function (req, res) {
        if (!accepting) {
            sendError(res, new Error('HTTP服务正在关闭'));
            return;
        }
        const startedAt = Date.now();
        const traceId = 'http-' + startedAt.toString(36) + '-' + activeRequests.toString(36);
        let routedCommand = command;
        activeRequests++;
        const afterResponseTasks = [];
        try {
            const body = parseBody(req);
            if (protectedRoute) {
                const token = getHeader(req.headers, 'Authorization');
                await executeCommand(commands.VERIFY_SESSION, {
                    data: token,
                    context: { source: 'http', traceId: traceId },
                });
            }

            const data = directBody
                ? body
                : (Object.prototype.hasOwnProperty.call(body, 'data') ? body.data : {});
            let commandName = command;
            routedCommand = commandName;
            let commandData = data;
            if (command === commands.CONTROL_DEVICE) {
                const mapped = mapWecomBindControl(data);
                if (mapped) {
                    commandName = mapped.command;
                    routedCommand = commandName;
                    commandData = mapped.data;
                }
            }
            const result = await executeCommand(commandName, {
                data: commandData,
                context: {
                    source: 'http',
                    traceId: traceId,
                    afterResponse: function (task) {
                        if (typeof task !== 'function') {
                            throw new TypeError('afterResponse task must be a function');
                        }
                        afterResponseTasks.push(task);
                    },
                },
            });
            sendSuccess(res, formatLegacyWebResult(commandName, result));
            scheduleAfterResponse(afterResponseTasks, function () {
                diagLog.info('http_protocol', 'request_done', {
                    command: routedCommand,
                    duration_ms: diagLog.duration(startedAt),
                    result: 'success',
                    trace_id: traceId,
                });
            });
        } catch (e) {
            diagLog.error('http_protocol', 'request_failed', e, {
                command: routedCommand,
                duration_ms: diagLog.duration(startedAt),
                result: 'failed',
                trace_id: traceId,
            });
            sendError(res, e);
            // 与 MQTT 一致：错误回包后仍执行已登记钩子（例如 setConfig 部分成功已落库的网络重连）。
            scheduleAfterResponse(afterResponseTasks);
        } finally {
            activeRequests--;
        }
    };
}

/** 日志导出返回二进制文件，不能套用统一 JSON 信封。 */
function createLogExportHandler() {
    return async function (req, res) {
        if (!accepting) {
            sendError(res, new Error('HTTP服务正在关闭'));
            return;
        }
        activeRequests++;
        try {
            const token = getHeader(req.headers, 'Authorization');
            await executeCommand(commands.VERIFY_SESSION, {
                data: token,
                context: { source: 'http' },
            });
            const file = await executeCommand(commands.PREPARE_LOG_EXPORT, {
                data: {},
                context: { source: 'http' },
            });
            res.file(file.path, {
                filename: file.filename,
                contentType: file.contentType,
            });
        } catch (e) {
            sendError(res, e);
        } finally {
            activeRequests--;
        }
    };
}

/** 数据库导出返回二进制文件，不能套用统一 JSON 信封。 */
function createDbExportHandler() {
    return async function (req, res) {
        if (!accepting) {
            sendError(res, new Error('HTTP服务正在关闭'));
            return;
        }
        activeRequests++;
        try {
            const token = getHeader(req.headers, 'Authorization');
            await executeCommand(commands.VERIFY_SESSION, {
                data: token,
                context: { source: 'http' },
            });
            const body = parseBody(req);
            const data = Object.prototype.hasOwnProperty.call(body, 'data') ? body.data : {};
            const file = await executeCommand(commands.PREPARE_DB_EXPORT, {
                data: data || {},
                context: { source: 'http' },
            });
            res.file(file.path, {
                filename: file.filename,
                contentType: file.contentType,
            });
        } catch (e) {
            sendError(res, e);
        } finally {
            activeRequests--;
        }
    };
}

/** 广告预览返回图片二进制，ID到真实路径的解析留在Domain。 */
function createAdvertImageHandler() {
    return async function (req, res) {
        if (!accepting) {
            sendError(res, new Error('HTTP服务正在关闭'));
            return;
        }
        activeRequests++;
        try {
            const token = getHeader(req.headers, 'Authorization');
            await executeCommand(commands.VERIFY_SESSION, {
                data: token,
                context: { source: 'http' },
            });
            const body = parseBody(req);
            const file = await executeCommand(commands.GET_ADVERTISEMENT_IMAGE, {
                data: Object.prototype.hasOwnProperty.call(body, 'data') ? body.data : {},
                context: { source: 'http' },
            });
            res.file(file.path, { filename: file.filename, contentType: file.contentType });
        } catch (e) {
            sendError(res, e);
        } finally {
            activeRequests--;
        }
    };
}

const httpProtocol = {};

httpProtocol.init = async function () {
    if (initialized) {
        return;
    }
    for (let i = 0; i < ROUTES.length; i++) {
        const route = ROUTES[i];
        dxHttpServer.post(
            '/api/' + route[0],
            createHandler(route[1], route[2], route[3])
        );
    }
    dxHttpServer.post('/api/exportLogs', createLogExportHandler());
    dxHttpServer.post('/api/exportDatabase', createDbExportHandler());
    dxHttpServer.post('/api/getAdvertImage', createAdvertImageHandler());
    dxHttpServer.start(HTTP_PORT, STATIC_DIR);
    accepting = true;
    initialized = true;
    dxLogger.info('http_protocol started: port=' + HTTP_PORT + ', static=' + STATIC_DIR);
};

httpProtocol.quiesce = async function () {
    if (!initialized) return;
    // 先拒绝新请求并停止监听，再等待已经进入的Command执行完毕。
    accepting = false;
    dxHttpServer.stop();
    while (activeRequests > 0) {
        await new Promise(function (resolve) { dxStd.setTimeout(resolve, 20); });
    }
    initialized = false;
};

httpProtocol.destroy = async function () {
    await httpProtocol.quiesce();
    accepting = false;
    activeRequests = 0;
};

export default httpProtocol;
