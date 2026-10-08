/**
 * @layer    services
 * @module   config_service
 * @listens  CMD_GET_CONFIG,CMD_SET_CONFIG,CMD_COMPLETE_FIRST_LOGIN,CMD_RESTORE_CONFIG_DEFAULTS
 *
 * 三端共用配置入口：完整校验、计算真实差异、路由模块Domain，最后统一处理重启。
 */

import eventBus from '../core/event_bus.js';
import commands from '../core/commands.js';
import softwareDomain from '../domain/software_domain.js';
import networkDomain from '../domain/network_domain.js';
import mqttDomain from '../domain/mqtt_domain.js';
import faceDomain from '../domain/face_domain.js';
import audioDomain from '../domain/audio_domain.js';
import displayDomain from '../domain/display_domain.js';
import timeDomain from '../domain/time_domain.js';
import lightDomain from '../domain/light_domain.js';
import alarmDomain from '../domain/alarm_domain.js';
import uiDomain from '../domain/ui_domain.js';
import nfcDomain from '../domain/nfc_domain.js';
import intercomDomain from '../domain/intercom_domain.js';
import verifyFlowDomain from '../domain/verify_flow_domain.js';
import wecomDomain from '../domain/wecom_domain.js';
import { isLanguageAllowed } from '../utils/language_utils.js';
import { AppError } from '../core/error.js';
import diagLog from '../utils/diag_log.js';

let initialized = false;
let writeQueue = Promise.resolve();
const registered = [];

// 写入后必然需要重启；access.verifyMode 的多人模式切换另见 needsReboot。
const REBOOT_REQUIRED_KEYS = ['ntp.timeZone'];

function unpack(request) {
    /*
     * Protocol传{data, context}，内部调用可能只传{data}，UI通常直接传业务数据。
     * 是否为Command信封只能由data字段判断，不能依赖可选的context。
     */
    if (request && typeof request === 'object' && !Array.isArray(request)
        && Object.prototype.hasOwnProperty.call(request, 'data')) {
        return {
            data: request.data,
            context: request.context || null,
        };
    }
    return { data: request, context: null };
}

function runtimeConfig() {
    return Object.assign(
        {},
        softwareDomain.getConfigDefaults(),
        softwareDomain.getRuntimeConfig(),
        networkDomain.getRuntimeConfig(),
        mqttDomain.getRuntimeConfig()
    );
}

async function getConfig(request) {
    return await softwareDomain.getConfig(unpack(request).data, runtimeConfig());
}

function sameValue(left, right) {
    if (left === right) return true;
    if (!left || !right || typeof left !== 'object' || typeof right !== 'object') return false;
    return JSON.stringify(left) === JSON.stringify(right);
}

function diffOf(values, current) {
    const result = {};
    const groups = Object.keys(values);
    for (let i = 0; i < groups.length; i++) {
        const group = groups[i];
        const fields = Object.keys(values[group]);
        for (let j = 0; j < fields.length; j++) {
            const field = fields[j];
            const oldValue = current[group] ? current[group][field] : undefined;
            if (!sameValue(values[group][field], oldValue)) {
                result[group] = result[group] || {};
                result[group][field] = values[group][field];
            }
        }
    }
    return result;
}

function changesMultiFaceMode(changes, current) {
    if (!changes.access || !Object.prototype.hasOwnProperty.call(changes.access, 'verifyMode')) return false;
    const before = Number(current && current.access ? current.access.verifyMode : 0);
    const after = Number(changes.access.verifyMode);
    return before === verifyFlowDomain.MODE.MULTI_FACE || after === verifyFlowDomain.MODE.MULTI_FACE;
}

function needsReboot(changes, current) {
    for (let i = 0; i < REBOOT_REQUIRED_KEYS.length; i++) {
        const parts = REBOOT_REQUIRED_KEYS[i].split('.');
        if (changes[parts[0]]
            && Object.prototype.hasOwnProperty.call(changes[parts[0]], parts[1])) return true;
    }
    return changesMultiFaceMode(changes, current);
}

function addResultMeta(result, context, changed, restartRequired) {
    const source = context && context.source;
    // MQTT 回包保持纯配置结构；重启由 afterResponse 直接执行。
    if (source === 'mqtt') return result;
    // Web 需要在 JSON 里看到 restartRequired，由页面自行确认后再 control(0)。
    if (source === 'http') {
        if (!result || typeof result !== 'object' || Array.isArray(result)) {
            return { restartRequired: restartRequired };
        }
        result.restartRequired = restartRequired;
        return result;
    }
    // 本机 UI / 扫码：用 _meta，由屏幕弹窗确认。
    result._meta = {
        changed: changed,
        restartRequired: restartRequired,
    };
    return result;
}

function scheduleRestartSideEffect(context, restartRequired) {
    if (!restartRequired || !context || typeof context.afterResponse !== 'function') return;
    // 仅 MQTT：回包成功后直接重启，设备屏幕不弹窗。
    // HTTP/Web：不弹窗、不自动重启，由 Web 根据 restartRequired / getPublicConfig 确认后下发 control(0)。
    if (context.source !== 'mqtt') return;
    context.afterResponse(function () {
        return softwareDomain.reboot();
    });
}

async function applyBase(values) {
    const rest = Object.assign({}, values);
    let languageToApply = null;
    let languageFailure = null;
    // 产品区域是设备固化属性：国内版只允许 CN，国际版不可选 CN。
    // 语言非法时先剥离再继续落同组其它字段，避免整组失败把错误扇出到 password 等。
    if (Object.prototype.hasOwnProperty.call(rest, 'language')) {
        const region = wecomDomain.getRegion();
        const language = String(rest.language || '').toUpperCase();
        if (!isLanguageAllowed(region, language)) {
            delete rest.language;
            languageFailure = new AppError(
                '200000',
                region === 'CN' ? '国内版仅支持中文' : 'International version does not support this language',
                undefined,
                { field: 'base.language' }
            );
        } else {
            languageToApply = language;
            rest.language = language;
        }
    }
    if (Object.prototype.hasOwnProperty.call(rest, 'volume')) {
        await audioDomain.setConfig({ volume: rest.volume });
        delete rest.volume;
    }
    if (Object.prototype.hasOwnProperty.call(rest, 'backlight')) {
        await displayDomain.setConfig({ backlight: rest.backlight });
        delete rest.backlight;
    }
    if (Object.prototype.hasOwnProperty.call(rest, 'screenOff')) {
        const screenOff = rest.screenOff;
        await softwareDomain.setConfig('base', { screenOff: screenOff });
        uiDomain.setScreenOffTimeout(screenOff);
        delete rest.screenOff;
    }
    if (Object.prototype.hasOwnProperty.call(rest, 'screensaver')) {
        const screensaver = rest.screensaver;
        await softwareDomain.setConfig('base', { screensaver: screensaver });
        uiDomain.setScreensaverTimeout(screensaver);
        delete rest.screensaver;
    }
    const light = {};
    if (Object.prototype.hasOwnProperty.call(rest, 'whiteLightMode')) {
        light.whiteLightMode = rest.whiteLightMode;
        delete rest.whiteLightMode;
    }
    if (Object.prototype.hasOwnProperty.call(rest, 'brightness')) {
        light.brightness = rest.brightness;
        delete rest.brightness;
    }
    if (Object.prototype.hasOwnProperty.call(rest, 'nirBrightness')) {
        light.nirBrightness = rest.nirBrightness;
        delete rest.nirBrightness;
    }
    if (Object.keys(light).length) await lightDomain.setConfig(light);
    // Web/MQTT 改 SN/IP 显隐后需热刷首页；先记下再落库，避免只改显隐时 rest 被掏空漏通知。
    const snIpVisibilityDirty = Object.prototype.hasOwnProperty.call(rest, 'showIp')
        || Object.prototype.hasOwnProperty.call(rest, 'showSn');
    // 程序码、主题等纯软件配置由software_domain持久化；未闭环项由rules明确标记。
    if (Object.keys(rest).length) await softwareDomain.setConfig('base', rest);
    // Web/MQTT 改语言时同步刷新设备 UI（与系统设置页 save 后 setLocale 一致）
    if (languageToApply) {
        uiDomain.applyLanguage(languageToApply);
    }
    if (snIpVisibilityDirty) {
        uiDomain.applySnIpVisibility();
    }
    if (languageFailure) throw languageFailure;
}

async function applySystem(values, context) {
    const rest = Object.assign({}, values);
    const heartbeat = {};
    if (Object.prototype.hasOwnProperty.call(rest, 'heart_en')) {
        heartbeat.heart_en = rest.heart_en;
        delete rest.heart_en;
    }
    if (Object.prototype.hasOwnProperty.call(rest, 'heart_time')) {
        heartbeat.heart_time = rest.heart_time;
        delete rest.heart_time;
    }
    if (Object.keys(heartbeat).length) await mqttDomain.setSystemConfig(heartbeat, context);
    const nfc = {};
    if (Object.prototype.hasOwnProperty.call(rest, 'nfc')) {
        nfc.nfc = rest.nfc;
        delete rest.nfc;
    }
    if (Object.keys(nfc).length) await nfcDomain.setConfig(nfc);
    // Web/MQTT 改密码开门后复用首页配置热刷（与 SN/IP 显隐同一条路径）。
    const passwordOpenDirty = Object.prototype.hasOwnProperty.call(rest, 'pwd');
    if (Object.keys(rest).length) await softwareDomain.setConfig('sys', rest);
    if (passwordOpenDirty) {
        uiDomain.applySnIpVisibility();
    }
}

async function routeGroups(changes, context, current) {
    const groups = Object.keys(changes);
    for (let i = 0; i < groups.length; i++) {
        const group = groups[i];
        const groupConfig = changes[group];
        if (group === 'net') {
            // 网络组用「当前完整配置 + diff」下发，避免只改 dhcp/ip 时驱动缺少 gateway 等字段，
            // 也避免静态↔动态切换时参数不完整导致未真正重连。
            const merged = Object.assign({}, (current && current.net) || {}, groupConfig);
            // mac 为运行时字段，不落库。
            delete merged.mac;
            await networkDomain.setConfig(merged, context);
        } else if (group === 'intercom') {
            await intercomDomain.setConfig(groupConfig);
        } else if (group === 'mqtt') {
            await mqttDomain.setConfig(groupConfig, context);
        } else if (group === 'face') {
            await faceDomain.setConfig(groupConfig);
        } else if (group === 'ntp') {
            await timeDomain.setConfig(groupConfig);
        } else if (group === 'base') {
            await applyBase(groupConfig);
        } else if (group === 'sys') {
            await applySystem(groupConfig, context);
        } else if (group === 'access') {
            await softwareDomain.setConfig('access', groupConfig);
            // 多人模型容量是启动期参数。涉及多人模式时只持久化配置，当前进程继续使用旧模式。
            const runtimeConfig = Object.assign({}, groupConfig);
            if (changesMultiFaceMode({ access: groupConfig }, current)) delete runtimeConfig.verifyMode;
            verifyFlowDomain.applyConfig(runtimeConfig);
            uiDomain.showVerifyStatus(verifyFlowDomain.getStatus());
            // 火警/防拆开关变更后立即应用运行时副作用（清状态、停音、关门）。
            await alarmDomain.applyAccessConfig(groupConfig);
        } else {
            await softwareDomain.setConfig(group, groupConfig);
        }
    }
}

async function applyGroups(values, context) {
    const startedAt = Date.now();
    const current = await getConfig('');
    const partial = softwareDomain.validateConfig(values || {});
    const requestedGroups = partial.requestedGroups;
    const failures = partial.errors.slice();
    const changes = diffOf(partial.accepted, current);
    const applied = {};
    const changedKeys = [];

    // 合法字段按组应用；单组失败不影响已成功组（与校验阶段部分成功一致）。
    const changeGroups = Object.keys(changes);
    for (let i = 0; i < changeGroups.length; i++) {
        const group = changeGroups[i];
        try {
            await routeGroups({ [group]: changes[group] }, context, current);
            applied[group] = changes[group];
            Object.keys(changes[group]).forEach(function (key) {
                changedKeys.push(group + '.' + key);
            });
        } catch (e) {
            const errmsg = e && e.message ? e.message : String(e);
            // 带 field 的业务错误只记该字段（如语言区域限制），避免扇出到同组其它已成功字段。
            if (e && e.detail && e.detail.field) {
                failures.push({ key: e.detail.field, errmsg: errmsg });
            } else {
                Object.keys(changes[group]).forEach(function (field) {
                    failures.push({ key: group + '.' + field, errmsg: errmsg });
                });
            }
        }
    }

    const restartRequired = needsReboot(applied, current);
    diagLog.info('config_service', 'config_applied', {
        changed_count: changedKeys.length,
        changed_keys: changedKeys.join(','),
        failed_count: failures.length,
        duration_ms: diagLog.duration(startedAt),
        restart_required: restartRequired,
    });

    scheduleRestartSideEffect(context, restartRequired);

    const result = await getConfig({ data: requestedGroups });
    if (failures.length) {
        const summary = failures.map(function (item) {
            if (item.errmsg && item.errmsg.indexOf(item.key) >= 0) return item.errmsg;
            return item.key + ': ' + (item.errmsg || '失败');
        }).join('; ');
        // Web 部分成功也要带上 restartRequired，便于页面决定是否提示重启。
        throw new AppError(
            '100000',
            '部分配置处理失败: ' + summary,
            undefined,
            addResultMeta(result, context, changedKeys.length > 0, restartRequired)
        );
    }
    return addResultMeta(result, context, changedKeys.length > 0, restartRequired);
}

function setConfig(request) {
    const input = unpack(request);
    // MQTT、HTTP和UI共享串行队列，防止并发配置交叉写入和应用。
    const task = writeQueue.then(function () {
        return applyGroups(input.data || {}, input.context);
    });
    writeQueue = task.catch(function () {});
    return task;
}

function completeFirstLogin(request) {
    const data = unpack(request).data || {};
    const task = writeQueue.then(function () {
        return softwareDomain.completeFirstLogin(data.password);
    });
    writeQueue = task.catch(function () {});
    return task;
}

function restoreDefaults() {
    const task = writeQueue.then(function () {
        return softwareDomain.restoreConfigDefaults();
    });
    writeQueue = task.catch(function () {});
    return task;
}

const configService = {};

configService.init = async function () {
    if (initialized) return;
    try {
        const bindings = [
            [commands.GET_CONFIG, getConfig],
            [commands.SET_CONFIG, setConfig],
            [commands.COMPLETE_FIRST_LOGIN, completeFirstLogin],
            [commands.RESTORE_CONFIG_DEFAULTS, restoreDefaults],
        ];
        for (let i = 0; i < bindings.length; i++) {
            eventBus.registerCommand(bindings[i][0], bindings[i][1]);
            registered.push(bindings[i][0]);
        }
        initialized = true;
    } catch (e) {
        await configService.destroy();
        throw e;
    }
};

configService.destroy = async function () {
    if (!initialized && registered.length === 0) return;
    initialized = false;
    for (let i = 0; i < registered.length; i++) {
        eventBus.unregisterCommand(registered[i]);
    }
    registered.length = 0;
    // 入口关闭后不会再产生新任务；必须等待当前写入及模块应用完成后才能销毁下层。
    const pending = writeQueue;
    try { await pending; } finally { writeQueue = Promise.resolve(); }
};
export default configService;
