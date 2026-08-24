/**
 * @layer storage
 * @module config_rules
 *
 * config.json定义字段、默认值和默认类型；这里只描述额外约束。
 */

import { AppError } from '../../core/error.js';
import { parseMqttEndpoint, buildMqttEndpoint } from '../../utils/mqtt_endpoint.js';

const INTERNAL_GROUPS = ['watchdog', 'gpioKey'];
// weComStatus 仅业务侧维护的绑定运行态，不允许 setConfig 修改。
const READONLY = {
    base: ['firstLogin'],
    sys: ['model', 'appVersion', 'weComStatus'],
};
// 占位项允许校验和持久化，但当前不承诺运行时立即生效。
// TODO：以下分组由负责对应业务的同事逐项闭环；闭环后必须从PLACEHOLDER移除。
const PLACEHOLDER = {
    // TODO：程序码显示尚未接入运行时UI。
    base: ['showProgramCode'],
};

const RUNTIME_DEFAULTS = {
    'mqtt.clientId': '',
    'net.mac': '',
    'sys.mac': '',
    'sys.uuid': '',
    'sys.sn': '',
    'sys.releaseTime': '',
};

const ENUMS = {
    face: {
        livenessOff: [0, 1], stranger: [0, 1, 2], voiceMode: [0, 1, 2],
    },
    mqtt: { qos: [0, 1, 2], onlinecheck: [0, 1], cleanSession: [0, 1], clientIdSuffix: [0, 1] },
    net: { type: [1, 2, 4], dhcp: [1, 2] },
    access: {
        deleteRecordAfterUpload: [0, 1], fire: [0, 1], fireStatus: [0, 1],
        tamper: [0, 1], uploadToCloud: [0, 1], verifyMode: [0, 1, 2, 3],
    },
    base: {
        language: ['CN', 'EN'],
        showIp: [0, 1], showSn: [0, 1], showProgramCode: [0, 1],
        whiteLightMode: [0, 1, 2],
        // 废弃兼容：工作主题已取消，固定简洁模式；MQTT/配置码仍可读写，运行时忽略。
        appMode: [0, 1],
    },
    sys: {
        heart_en: [0, 1], nfc: [0, 1], pwd: [0, 1], faceImageRetention: [0, 1], strangerImage: [0, 1],
        nfcIdentityCardEnable: [1, 3],
    },
};

const RANGES = {
    face: {
        similarity: [0, 1], livenessVal: [0, 10],
        recheck: [1, 100], recognitionTimeout: [1, 30],
    },
    mqtt: { timeout: [1] },
    intercom: { port: [1, 65535] },
    // 延续2.0协议约定：gmt使用0~24的固定时区编号。
    ntp: { gmt: [0, 24] },
    access: { offlineAccessNum: [1, 2000], relayTime: [1], verifyTimeout: [3, 300] },
    base: {
        screenOff: [0], screensaver: [0], backlight: [0, 100],
        brightness: [0, 100], nirBrightness: [0, 100], volume: [0, 10],
    },
    sys: { heart_time: [30], scanInterval: [1] },
    watchdog: { timeoutMs: [1], channelId: [0], feedIntervalMs: [1] },
    gpioKey: { maxCallbackNum: [1] },
};

const NON_EMPTY = ['mqtt.addr', 'intercom.server', 'ntp.server', 'ntp.timeZone', 'base.password', 'gpioKey.devPath'];
// 默认值是整数但协议允许小数的字段。
const NUMBER_FIELDS = ['face.similarity', 'ntp.gmt', 'base.backlight'];
const GROUP_ALIASES = { sysinfo: 'sys' };

let defaults = {};

function fail(message, code) {
    throw new AppError(code || '200000', message);
}

function has(map, group, field) {
    return !!(map[group] && map[group].indexOf(field) >= 0);
}

function constraint(map, group, field) {
    return map[group] ? map[group][field] : undefined;
}

function keyList(map) {
    const result = [];
    const groups = Object.keys(map);
    for (let i = 0; i < groups.length; i++) {
        const fields = Array.isArray(map[groups[i]]) ? map[groups[i]] : Object.keys(map[groups[i]]);
        for (let j = 0; j < fields.length; j++) result.push(groups[i] + '.' + fields[j]);
    }
    return result;
}

function validateValue(group, field, value) {
    if (group === 'base' && field === 'accessDisplayFields') {
        const supported = ['name', 'department', 'employeeNo'];
        if (!Array.isArray(value) || value.length > 3) {
            fail('base.accessDisplayFields必须是最多3项的数组');
        }
        const seen = {};
        for (let i = 0; i < value.length; i++) {
            if (supported.indexOf(value[i]) < 0) fail('base.accessDisplayFields包含不支持的字段');
            if (seen[value[i]]) fail('base.accessDisplayFields中的字段不能重复');
            seen[value[i]] = true;
        }
        return;
    }
    if (group === 'access' && field === 'factorSequence') {
        const supported = ['face', 'card', 'code', 'password', 'finger'];
        if (!Array.isArray(value) || value.length !== 2) {
            fail('access.factorSequence当前版本必须配置两个因子');
        }
        const seen = {};
        for (let i = 0; i < value.length; i++) {
            if (supported.indexOf(value[i]) < 0) fail('access.factorSequence包含不支持的因子');
            if (seen[value[i]]) fail('access.factorSequence中的因子不能重复');
            seen[value[i]] = true;
        }
        return;
    }
    const key = group + '.' + field;
    const expected = Object.prototype.hasOwnProperty.call(defaults, key)
        ? defaults[key]
        : RUNTIME_DEFAULTS[key];
    if (expected === undefined) fail('不支持的配置项: ' + key);
    if (typeof value !== typeof expected || (typeof value === 'number' && !Number.isFinite(value))) {
        fail(key + '类型不正确');
    }
    if (typeof value === 'number' && NUMBER_FIELDS.indexOf(key) < 0 && !Number.isInteger(value)) {
        fail(key + '必须是整数');
    }
    if (NON_EMPTY.indexOf(key) >= 0 && !value) fail(key + '不能为空');

    const values = constraint(ENUMS, group, field);
    if (values && values.indexOf(value) < 0) fail(key + '取值不受支持');
    const range = constraint(RANGES, group, field);
    if (range && value < range[0]) fail(key + '不能小于' + range[0]);
    if (range && range[1] !== undefined && value > range[1]) fail(key + '不能大于' + range[1]);
    if (key === 'mqtt.addr') {
        try {
            buildMqttEndpoint(parseMqttEndpoint(value));
        } catch (e) {
            fail(e.message || key + '格式不正确');
        }
    }
    if (key === 'intercom.server' && !isHost(value)) fail(key + '格式不正确');
    if (key === 'ntp.server' && !isHost(value)) fail(key + '格式不正确');
}

function isIpv4(value) {
    if (typeof value !== 'string') return false;
    const parts = value.split('.');
    if (parts.length !== 4) return false;
    for (let i = 0; i < parts.length; i++) {
        if (!/^\d{1,3}$/.test(parts[i])) return false;
        const number = Number(parts[i]);
        if (number < 0 || number > 255) return false;
    }
    return true;
}

function isHost(value) {
    if (isIpv4(value)) return true;
    return typeof value === 'string'
        && value.length <= 253
        && /^(?=.{1,253}$)(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)*[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?$/.test(value);
}
function validateNetwork(values) {
    const addresses = ['ip', 'gateway', 'mask'];
    for (let i = 0; i < addresses.length; i++) {
        const value = values[addresses[i]];
        if (value !== undefined && value !== '' && !isIpv4(value)) {
            fail('net.' + addresses[i] + '不是有效IPv4地址');
        }
    }
    if (values.dns) {
        const dns = values.dns.split(',');
        for (let i = 0; i < dns.length; i++) {
            if (!isIpv4(dns[i].trim())) fail('net.dns不是有效IPv4地址列表');
        }
    }
    if (values.type === 2 && !values.ssid) fail('Wi-Fi配置的net.ssid不能为空');
}

function validateVerifyConfig(access, mqtt) {
    const mode = Number(access && access.verifyMode);
    const sequence = access && access.factorSequence;
    if (mode === 2) {
        validateValue('access', 'factorSequence', sequence);
    }
    if (mode > 0 && Number(mqtt && mqtt.onlinecheck) === 1) {
        fail('多人识别、单人多凭证或双人核验模式不能与在线验证同时开启');
    }
}

function groupOf(flat, group) {
    const result = {};
    const prefix = group + '.';
    const keys = Object.keys(flat || {});
    for (let i = 0; i < keys.length; i++) {
        if (keys[i].indexOf(prefix) === 0) result[keys[i].substring(prefix.length)] = flat[keys[i]];
    }
    return result;
}

const rules = {};

rules.init = function (values) {
    if (!values || typeof values !== 'object' || Array.isArray(values)) fail('默认配置必须是对象');
    defaults = Object.assign({}, values);

    const ruleKeys = keyList(ENUMS).concat(
        keyList(RANGES), NON_EMPTY, keyList(PLACEHOLDER), keyList(READONLY)
    );
    for (let i = 0; i < ruleKeys.length; i++) {
        if (!Object.prototype.hasOwnProperty.call(defaults, ruleKeys[i])
            && !Object.prototype.hasOwnProperty.call(RUNTIME_DEFAULTS, ruleKeys[i])) {
            fail('配置规则引用了未定义字段: ' + ruleKeys[i]);
        }
    }

    const keys = Object.keys(defaults);
    for (let i = 0; i < keys.length; i++) {
        const dot = keys[i].indexOf('.');
        if (dot < 1 || dot === keys[i].length - 1) {
            fail('默认配置键必须使用group.field格式: ' + keys[i]);
        }
        if (Object.prototype.hasOwnProperty.call(RUNTIME_DEFAULTS, keys[i])) {
            fail('运行时字段不能写入config.json: ' + keys[i]);
        }
        validateValue(keys[i].substring(0, dot), keys[i].substring(dot + 1), defaults[keys[i]]);
    }
    validateNetwork(groupOf(defaults, 'net'));
    validateVerifyConfig(groupOf(defaults, 'access'), groupOf(defaults, 'mqtt'));
};

rules.normalize = function (groups) {
    if (!groups || typeof groups !== 'object' || Array.isArray(groups)) fail('配置数据必须是分组对象');
    const result = {};
    const names = Object.keys(groups);
    for (let i = 0; i < names.length; i++) {
        const group = GROUP_ALIASES[names[i]] || names[i];
        const values = groups[names[i]];
        if (!values || typeof values !== 'object' || Array.isArray(values)) {
            fail('配置分组必须是对象: ' + names[i]);
        }
        result[group] = Object.assign(result[group] || {}, values);
    }
    return result;
};

rules.validate = function (groups, current) {
    const values = rules.normalize(groups);
    const names = Object.keys(values);
    for (let i = 0; i < names.length; i++) {
        const group = names[i];
        const fields = Object.keys(values[group]);
        for (let j = 0; j < fields.length; j++) {
            const field = fields[j];
            const key = group + '.' + field;
            if (Object.prototype.hasOwnProperty.call(RUNTIME_DEFAULTS, key)
                || has(READONLY, group, field)) fail('配置项不可修改: ' + key);
            if (INTERNAL_GROUPS.indexOf(group) >= 0
                || !Object.prototype.hasOwnProperty.call(defaults, key)) {
                fail('不支持的配置项: ' + key);
            }
            validateValue(group, field, values[group][field]);
        }
    }
    if (values.net) validateNetwork(Object.assign({}, current && current.net, values.net));
    validateVerifyConfig(
        Object.assign({}, current && current.access, values.access),
        Object.assign({}, current && current.mqtt, values.mqtt)
    );
    return values;
};

rules.project = function (flat, runtime) {
    const source = Object.assign({}, flat || {}, runtime || {});
    const result = {};
    const keys = Object.keys(source);
    for (let i = 0; i < keys.length; i++) {
        const dot = keys[i].indexOf('.');
        if (dot < 1) continue;
        const group = keys[i].substring(0, dot);
        if (INTERNAL_GROUPS.indexOf(group) >= 0) continue;
        if (!Object.prototype.hasOwnProperty.call(defaults, keys[i])
            && !Object.prototype.hasOwnProperty.call(RUNTIME_DEFAULTS, keys[i])) continue;
        result[group] = result[group] || {};
        result[group][keys[i].substring(dot + 1)] = source[keys[i]];
    }
    return result;
};

rules.select = function (grouped, selection) {
    if (selection === undefined || selection === null || selection === '') return grouped;
    const names = Array.isArray(selection) ? selection : [selection];
    const result = {};
    for (let i = 0; i < names.length; i++) {
        if (typeof names[i] !== 'string' || !names[i]) fail('配置查询条件必须是字符串');
        const dot = names[i].indexOf('.');
        const rawGroup = dot < 0 ? names[i] : names[i].substring(0, dot);
        const group = GROUP_ALIASES[rawGroup] || rawGroup;
        if (dot < 0) {
            if (grouped[group]) result[group] = grouped[group];
        } else {
            const field = names[i].substring(dot + 1);
            if (grouped[group] && Object.prototype.hasOwnProperty.call(grouped[group], field)) {
                result[group] = result[group] || {};
                result[group][field] = grouped[group][field];
            }
        }
    }
    return result;
};

rules.runtimeDefaults = RUNTIME_DEFAULTS;

export default rules;
