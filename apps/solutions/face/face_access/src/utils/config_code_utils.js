/**
 * 配置码工具：识别、验签、载荷解析、短键 → SET_CONFIG 分组。
 *
 * 格式：___VF102_CONFIG_V1.1.0___{showIp=0,showSn=0}--<base64签名>
 * 载荷优先按 key=value 解析（非 JSON）；签名分隔符固定为 --。
 */

import dxCommonUtils from '../../dxmodules/dxCommonUtils.js';

const DEFAULT_SIGN_PASSWORD = '1234567887654321';
const CONFIG_PREFIX = '___VF102_CONFIG_V1.1.0___';
const EID_PREFIX = '___VBAR_ID_ACTIVE_V';
const KEY_VALUE_RE = /(\w+)\s*=\s*("[^"]*"|[+-]?\d+(?:\.\d+)?|\w+)/g;

// 配置码短键 → group.field（与 default.json / SET_CONFIG / 触屏可改项对齐）。
// 数组项（factorSequence、accessDisplayFields）须用 JSON 载荷，key=value 无法表达。
const SHORT_KEY_MAP = {
    offlineAccessNum: 'access.offlineAccessNum',
    relayTime: 'access.relayTime',
    fire: 'access.fire',
    fireStatus: 'access.fireStatus', // 协议可写；触屏无独立开关，多为运行时告警态
    tamper: 'access.tamper',
    uploadToCloud: 'access.uploadToCloud',
    uploadFaceScores: 'access.uploadFaceScores',
    verifyMode: 'access.verifyMode',
    factorSequence: 'access.factorSequence',
    verifyTimeout: 'access.verifyTimeout',
    deleteRecordAfterUpload: 'access.deleteRecordAfterUpload',
    language: 'base.language',
    password: 'base.password',
    screenOff: 'base.screenOff',
    screensaver: 'base.screensaver',
    backlight: 'base.backlight',
    brightness: 'base.brightness',
    whiteLightMode: 'base.whiteLightMode',
    nirBrightness: 'base.nirBrightness',
    volume: 'base.volume',
    showIp: 'base.showIp',
    showSn: 'base.showSn',
    accessDisplayFields: 'base.accessDisplayFields',
    similarity: 'face.similarity',
    livenessOff: 'face.livenessOff',
    livenessVal: 'face.livenessVal',
    stranger: 'face.stranger',
    voiceMode: 'face.voiceMode',
    voiceModeDate: 'face.voiceModeDate',
    recheck: 'face.recheck',
    recognitionTimeout: 'face.recognitionTimeout',
    addr: 'mqtt.addr',
    username: 'mqtt.username',
    mqttusername: 'mqtt.username', // 旧版配置码别名
    mqttpassword: 'mqtt.password',
    qos: 'mqtt.qos',
    mqttqos: 'mqtt.qos',
    prefix: 'mqtt.prefix',
    mqttprefix: 'mqtt.prefix',
    onlinecheck: 'mqtt.onlinecheck',
    timeout: 'mqtt.timeout',
    willTopic: 'mqtt.willTopic',
    cleanSession: 'mqtt.cleanSession',
    clientIdSuffix: 'mqtt.clientIdSuffix',
    intercomServer: 'intercom.server',
    intercomPort: 'intercom.port',
    type: 'net.type',
    ssid: 'net.ssid',
    psk: 'net.psk',
    dhcp: 'net.dhcp',
    ip: 'net.ip',
    gateway: 'net.gateway',
    mask: 'net.mask',
    dns: 'net.dns',
    server: 'ntp.server',
    timeZone: 'ntp.timeZone',
    heart_en: 'sys.heart_en',
    heart_time: 'sys.heart_time',
    nfc: 'sys.nfc',
    pwd: 'sys.pwd',
    passwordLength: 'sys.passwordLength',
    strangerImage: 'sys.strangerImage',
    faceImageRetention: 'sys.faceImageRetention',
    nfcIdentityCardEnable: 'sys.nfcIdentityCardEnable',
    scanInterval: 'sys.scanInterval',
};

function coerceValue(raw) {
    if (/^\d+$/.test(raw)) return parseInt(raw, 10);
    if (/^\d+\.\d+$/.test(raw)) return parseFloat(raw);
    if (raw === 'true') return true;
    if (raw === 'false') return false;
    return raw.replace(/"/g, '').trim();
}

function parseKeyValueBody(body) {
    const result = {};
    KEY_VALUE_RE.lastIndex = 0;
    let match;
    while ((match = KEY_VALUE_RE.exec(body)) !== null) {
        result[match[1]] = coerceValue(match[2]);
    }
    return result;
}

const configCodeUtils = {};

configCodeUtils.isConfigCode = function (code) {
    return typeof code === 'string' && code.startsWith(CONFIG_PREFIX);
};

configCodeUtils.isEidActiveCode = function (code) {
    return typeof code === 'string' && code.startsWith(EID_PREFIX);
};

/**
 * 校验配置码签名。dataPart--signature，HMAC-MD5 后 Base64。
 */
configCodeUtils.verifySignature = function (code, password) {
    if (typeof code !== 'string') return false;
    const sep = code.lastIndexOf('--');
    if (sep < 0) return false;
    const dataPart = code.substring(0, sep);
    const signature = code.substring(sep + 2);
    if (!dataPart || !signature) return false;
    try {
        const hmacHex = dxCommonUtils.crypto.hmacMd5(dataPart, password || DEFAULT_SIGN_PASSWORD);
        const expected = dxCommonUtils.codec.arrayBufferToBase64(
            dxCommonUtils.codec.hexToArrayBuffer(hmacHex)
        );
        return expected === signature;
    } catch (_error) {
        return false;
    }
};

/**
 * 解析 {} 内载荷：优先 key=value，失败再试 JSON。
 */
configCodeUtils.parsePayload = function (code) {
    if (typeof code !== 'string') return {};
    const start = code.indexOf('{');
    const end = code.lastIndexOf('}');
    if (start < 0 || end <= start) return {};
    const body = code.slice(start, end + 1);

    const fromKv = parseKeyValueBody(body);
    if (Object.keys(fromKv).length) return fromKv;

    try {
        const json = JSON.parse(body);
        return json && typeof json === 'object' && !Array.isArray(json) ? json : {};
    } catch (_error) {
        return {};
    }
};

/**
 * 扁平短键 → SET_CONFIG 分组；未登记键（含 update_*）忽略。
 */
configCodeUtils.mapToConfigGroups = function (json) {
    const groups = {};
    const source = json || {};
    const keys = Object.keys(source);
    for (let i = 0; i < keys.length; i++) {
        const mapped = SHORT_KEY_MAP[keys[i]];
        if (!mapped) continue;
        const dot = mapped.indexOf('.');
        const group = mapped.substring(0, dot);
        const field = mapped.substring(dot + 1);
        if (!groups[group]) groups[group] = {};
        groups[group][field] = source[keys[i]];
    }
    return groups;
};

export default configCodeUtils;
