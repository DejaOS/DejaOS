/**
 * MQTT 连接地址在 UI 中拆成协议、主机、端口，存储和对外协议仍使用 mqtt.addr。
 * 域名允许省略端口且必须原样传给底层组件；IP 地址必须显式配置端口。
 */

const SCHEMES = ['mqtt://', 'mqtts://'];

function isIpv4(value) {
    const parts = String(value || '').split('.');
    if (parts.length !== 4) return false;
    for (let i = 0; i < parts.length; i++) {
        if (!/^\d+$/.test(parts[i])) return false;
        const n = Number(parts[i]);
        if (n < 0 || n > 255) return false;
    }
    return true;
}

function normalizeScheme(value) {
    const scheme = String(value || '').toLowerCase();
    if (scheme === 'tcp://') return 'mqtt://';
    if (scheme === 'ssl://') return 'mqtts://';
    return scheme;
}

export function parseMqttEndpoint(value) {
    const match = /^(mqtt|mqtts|tcp|ssl):\/\/([^\s/:]+)(?::(\d+))?$/.exec(String(value || '').trim());
    if (!match) throw new Error('MQTT连接地址格式不正确');
    return {
        scheme: normalizeScheme(match[1] + '://'),
        host: match[2],
        port: match[3] || '',
    };
}

export function buildMqttEndpoint(input) {
    const value = input || {};
    const scheme = normalizeScheme(value.scheme);
    const host = String(value.host || '').trim();
    const portText = String(value.port == null ? '' : value.port).trim();
    if (SCHEMES.indexOf(scheme) < 0 || !host || /[\s/:]/.test(host)) {
        throw new Error('MQTT连接协议或服务器地址不正确');
    }
    if (!portText) {
        if (isIpv4(host)) throw new Error('MQTT IP地址必须填写端口');
        return scheme + host;
    }
    if (!/^\d+$/.test(portText)) throw new Error('MQTT端口必须是数字');
    const port = Number(portText);
    if (port < 1 || port > 65535) throw new Error('MQTT端口范围必须是1~65535');
    return scheme + host + ':' + port;
}

export function normalizeMqttEndpoint(value) {
    return buildMqttEndpoint(parseMqttEndpoint(value));
}

export default {
    parse: parseMqttEndpoint,
    build: buildMqttEndpoint,
    normalize: normalizeMqttEndpoint,
};
