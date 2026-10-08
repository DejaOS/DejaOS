/** @layer view @module network_store @depends event_bus,commands,events,dxCommonUtils */

import eventBus from '../../../core/event_bus.js';
import commands from '../../../core/commands.js';
import events from '../../../core/events.js';
import dxCommonUtils from '../../../../dxmodules/dxCommonUtils.js';

let config = null;
let wifiList = [];
/** 最近一次读到的 MAC，重连空窗期用于展示兜底（mac 不落库）。 */
let lastMac = '';
/** @type {{ connected: boolean, netType: number, ip: string, gateway: string, mask: string, dns: string, mac: string }} */
let activeStatus = {
    connected: false,
    netType: 0,
    ip: '',
    gateway: '',
    mask: '',
    dns: '',
    mac: '',
};

/**
 * @param {string} mac
 */
function rememberMac(mac) {
    const value = String(mac || '').trim();
    if (value) {
        lastMac = value;
    }
}

/**
 * 解码 WiFi SSID：兼容 iw/wpa 的 \\xHH 转义，以及 UTF-8 字节被当成 Latin-1 的乱码。
 * @param {string} raw
 * @returns {string}
 */
function decodeWifiSsid(raw) {
    let s = String(raw == null ? '' : raw);
    if (!s) {
        return '';
    }
    // 1) \xNN / \NNN 转义 → 字节 → UTF-8
    if (/\\x[0-9a-fA-F]{2}/.test(s) || /\\[0-7]{3}/.test(s)) {
        const bytes = [];
        let i = 0;
        while (i < s.length) {
            if (s.charAt(i) === '\\' && s.charAt(i + 1) === 'x' && i + 3 < s.length) {
                const hex = s.substring(i + 2, i + 4);
                if (/^[0-9a-fA-F]{2}$/.test(hex)) {
                    bytes.push(parseInt(hex, 16));
                    i += 4;
                    continue;
                }
            }
            if (s.charAt(i) === '\\' && /^[0-7]{3}/.test(s.substring(i + 1, i + 4))) {
                bytes.push(parseInt(s.substring(i + 1, i + 4), 8) & 0xff);
                i += 4;
                continue;
            }
            if (s.charAt(i) === '\\' && s.charAt(i + 1) === '\\') {
                bytes.push(0x5c);
                i += 2;
                continue;
            }
            bytes.push(s.charCodeAt(i) & 0xff);
            i += 1;
        }
        try {
            const hex = dxCommonUtils.codec.bytesToHex(bytes);
            const decoded = dxCommonUtils.codec.utf8HexToStr(hex);
            if (decoded) {
                return decoded;
            }
        } catch (_e) {}
    }
    // 2) 已是正常 Unicode（含中文）直接返回
    if (/[\u0080-\uffff]/.test(s) && !isLikelyUtf8Mojibake(s)) {
        return s;
    }
    // 3) Latin-1 壳里的 UTF-8 字节
    if (isLikelyUtf8Mojibake(s)) {
        try {
            const hexParts = [];
            for (let j = 0; j < s.length; j++) {
                const code = s.charCodeAt(j);
                if (code > 255) {
                    return s;
                }
                hexParts.push((code & 0xff).toString(16).padStart(2, '0'));
            }
            const fixed = dxCommonUtils.codec.utf8HexToStr(hexParts.join(''));
            if (fixed && /[\u4e00-\u9fff]/.test(fixed)) {
                return fixed;
            }
            if (fixed && fixed.length > 0 && fixed !== s) {
                return fixed;
            }
        } catch (_e2) {}
    }
    return s;
}

/**
 * 粗判：字符串几乎全是 Latin-1 高位字节，且像 UTF-8 多字节序列。
 * @param {string} s
 * @returns {boolean}
 */
function isLikelyUtf8Mojibake(s) {
    if (!s || s.length < 2) {
        return false;
    }
    let high = 0;
    let hasUtf8Lead = false;
    for (let i = 0; i < s.length; i++) {
        const c = s.charCodeAt(i);
        if (c > 255) {
            return false;
        }
        if (c >= 0x80) {
            high += 1;
            if (c >= 0xc0 && c <= 0xf4) {
                hasUtf8Lead = true;
            }
        }
    }
    return high >= 2 && hasUtf8Lead;
}

function failure(error) {
    const message = error && error.message ? String(error.message) : '';
    // 驱动层英文校验转成字段码，由页面用当前语言展示。
    if (/gateway/i.test(message) && /empty|required/i.test(message)) {
        return { ok: false, error: 'gateway', message: '' };
    }
    if (/\bmask|netmask\b/i.test(message) && /empty|required/i.test(message)) {
        return { ok: false, error: 'mask', message: '' };
    }
    if (/\bip\b/i.test(message) && /empty|required/i.test(message)) {
        return { ok: false, error: 'ip', message: '' };
    }
    if (/\bdns\b/i.test(message) && /empty|required/i.test(message)) {
        return { ok: false, error: 'dns', message: '' };
    }
    return {
        ok: false,
        error: error && error.code === '300000' ? 'pending' : 'service',
        message: message || '网络配置操作失败',
    };
}

function missingStaticField(current) {
    if (!current.ip) return 'ip';
    if (!current.mask) return 'mask';
    if (!current.gateway) return 'gateway';
    if (!current.dns) return 'dns';
    return '';
}

function mapConfig(result) {
    const net = result && result.net ? result.net : {};
    const dhcp = Number(net.dhcp);
    return {
        type: net.type === 2 ? 'wifi' : (net.type === 4 ? 'cellular' : 'ethernet'),
        // 仅 dhcp===1 为静态；其它（含 2、异常值）按动态处理。
        ipMode: dhcp === 1 ? 'static' : 'dhcp',
        ip: net.ip || '',
        mask: net.mask || '',
        gateway: net.gateway || '',
        dns: net.dns || '',
        mac: net.mac || '',
        wifiSsid: decodeWifiSsid(net.ssid || ''),
        wifiPassword: net.psk || '',
    };
}

function mapActive(raw) {
    const src = raw && typeof raw === 'object' ? raw : {};
    const mac = src.mac || '';
    rememberMac(mac);
    return {
        connected: src.connected === true,
        netType: Number(src.netType) || 0,
        ip: src.ip || '',
        gateway: src.gateway || '',
        mask: src.mask || '',
        dns: src.dns || '',
        mac: mac || lastMac,
    };
}

function requireConfig() {
    if (!config) throw new Error('network_store: config is not loaded');
}

function signalPercent(level) {
    const value = Number(level);
    if (!Number.isFinite(value)) return 0;
    return Math.max(0, Math.min(100, Math.round((value + 100) * 2)));
}

/**
 * 已连上时用运行时参数覆盖展示用的 IP/MAC；类型与 DHCP 仍以已保存配置为准。
 * @param {object} saved
 * @param {object} active
 * @returns {object}
 */
function mergeDisplayConfig(saved, active) {
    const next = Object.assign({}, saved);
    // MAC 始终用运行时/缓存兜底，避免重连后因不落库而空白。
    next.mac = (active && active.mac) || lastMac || next.mac || '';
    if (!active || !active.connected) {
        return next;
    }
    if (active.ip) next.ip = active.ip;
    if (active.mask) next.mask = active.mask;
    if (active.gateway) next.gateway = active.gateway;
    if (active.dns) next.dns = active.dns;
    // 当前主接口类型优先反映真实连上的介质。
    if (active.netType === 2) next.type = 'wifi';
    else if (active.netType === 4) next.type = 'cellular';
    else if (active.netType === 1) next.type = 'ethernet';
    return next;
}

const networkStore = {};

networkStore.load = async function () {
    const configResult = await eventBus.execute(commands.GET_CONFIG, ['net']);
    config = mapConfig(configResult);
    try {
        activeStatus = mapActive(await eventBus.execute(commands.GET_NETWORK_STATUS));
    } catch (_error) {
        activeStatus = mapActive(null);
    }
    return networkStore.getDisplayConfig();
};

networkStore.refreshStatus = async function () {
    try {
        activeStatus = mapActive(await eventBus.execute(commands.GET_NETWORK_STATUS));
    } catch (_error) {
        activeStatus = mapActive(null);
    }
    return networkStore.getStatus();
};

networkStore.getConfig = function () {
    requireConfig();
    return Object.assign({}, config);
};

/** 设置页展示用：连上时合并当前运行时 IP 等信息。 */
networkStore.getDisplayConfig = function () {
    requireConfig();
    return mergeDisplayConfig(config, activeStatus);
};

networkStore.getStatus = function () {
    return Object.assign({}, activeStatus);
};

networkStore.getMac = function () {
    requireConfig();
    return (activeStatus && activeStatus.mac) || lastMac || (config && config.mac) || '';
};

networkStore.listWifi = function () {
    return wifiList.map(function (item) { return Object.assign({}, item); });
};

networkStore.scanWifi = async function () {
    requireConfig();
    const rows = await eventBus.execute(commands.SCAN_WIFI, {
        timeoutMs: 2500,
        intervalMs: 100,
    });
    wifiList = (Array.isArray(rows) ? rows : []).map(function (row) {
        const flags = String(row && row.flags || '');
        const ssid = decodeWifiSsid(row && row.ssid);
        return {
            ssid: ssid,
            signal: signalPercent(row && row.level),
            secured: /WPA|WEP|RSN/i.test(flags),
            connected: ssid === decodeWifiSsid(config && config.wifiSsid),
        };
    }).filter(function (row) { return row.ssid.trim().length > 0; });
    wifiList.sort(function (a, b) { return b.signal - a.signal; });
    // 同名SSID只展示信号最强项，避免用户看到无法区分的重复网络。
    const seen = Object.create(null);
    wifiList = wifiList.filter(function (row) {
        if (seen[row.ssid]) return false;
        seen[row.ssid] = true;
        return true;
    });
    return networkStore.listWifi();
};

networkStore.save = async function (next) {
    requireConfig();
    if (!next || !next.type) return { ok: false, error: 'required' };
    const previousMode = config.ipMode;
    const previousIp = String(config.ip || (activeStatus && activeStatus.ip) || '');
    const current = Object.assign({}, config, next);
    if (current.type !== 'cellular' && current.ipMode === 'static') {
        const missing = missingStaticField(current);
        if (missing) return { ok: false, error: missing };
    }
    if (current.type === 'wifi' && !current.wifiSsid) {
        return { ok: false, error: 'wifiSsid' };
    }
    const type = current.type === 'wifi' ? 2 : (current.type === 'cellular' ? 4 : 1);
    const dhcp = current.ipMode === 'static' ? 1 : 2;
    const netPayload = {
        type: type,
        dhcp: dhcp,
        ssid: current.wifiSsid || '',
        psk: current.wifiPassword || '',
    };
    // 动态模式不要把表单里旧的静态 IP 再写回配置，等 DHCP 拿到后再 sync。
    if (current.ipMode === 'static') {
        netPayload.ip = current.ip || '';
        netPayload.mask = current.mask || '';
        netPayload.gateway = current.gateway || '';
        netPayload.dns = current.dns || '';
    }
    try {
        const result = await eventBus.execute(commands.SET_CONFIG, { net: netPayload });
        config = mapConfig(result);
        config.ipMode = current.ipMode === 'static' ? 'static' : 'dhcp';
        config.type = current.type;
        rememberMac(config.mac);
        if (!config.mac && lastMac) {
            config.mac = lastMac;
        }
        if (config.ipMode === 'dhcp') {
            // 切动态后清空运行时 IP 缓存，避免继续显示上一份静态值；MAC 用 lastMac 兜底。
            const keptMac = lastMac;
            activeStatus = mapActive(null);
            if (keptMac) {
                activeStatus.mac = keptMac;
                lastMac = keptMac;
            }
            if (previousMode === 'static') {
                config.ip = '';
                config.mask = '';
                config.gateway = '';
                config.dns = '';
            }
        } else {
            await networkStore.refreshStatus();
        }
        return {
            ok: true,
            config: networkStore.getDisplayConfig(),
            previousMode: previousMode,
            previousIp: previousIp,
        };
    } catch (error) {
        return failure(error);
    }
};

networkStore.connectWifi = function (ssid, password) {
    requireConfig();
    if (!String(ssid || '').trim()) return Promise.resolve({ ok: false, error: 'required' });
    return networkStore.save({
        type: 'wifi',
        wifiSsid: String(ssid).trim(),
        wifiPassword: String(password || ''),
    });
};

/**
 * 订阅网络连接态变化；返回取消订阅函数。
 * @param {function(object): void} handler
 * @returns {function(): void}
 */
networkStore.onNetworkChanged = function (handler) {
    if (typeof handler !== 'function') {
        return function () {};
    }
    eventBus.on(events.NETWORK_CHANGED, handler);
    return function () {
        eventBus.off(events.NETWORK_CHANGED, handler);
    };
};

export default networkStore;
