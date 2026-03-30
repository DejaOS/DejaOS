/**
 * DW200 Access Device SDK for Node.js
 *
 * Zero dependencies; built on Node.js built-in http/https modules.
 * Covers the full Access Device HTTP API v1 with client-side validation.
 *
 * Minimum: Node.js >= 14
 *
 * Quick start:
 *
 *   const DW200Client = require('./dw200');
 *   const client = new DW200Client({ host: '192.168.1.20', apiKey: 'your-key' }); // port fixed at 8080
 *
 *   // Connectivity test (no apiKey)
 *   const info = await client.test();
 *
 *   // Remote unlock
 *   await client.openDoor();
 *
 *   // Batch add users
 *   await client.addUsers([
 *     { userId: '1001', name: 'John', type: 'nfc', value: 'AABBCCDD',
 *       period: DW200Client.period.always() }
 *   ]);
 */

'use strict';

const http  = require('http');
const https = require('https');

/** Device HTTP port (matches firmware and C# SDK; fixed, not configurable). */
const DEVICE_HTTP_PORT = 8080;

/**
 * Parse host or URL and normalize to http(s)://host:8080 (ignores port and path in input).
 * Aligns with C# BuildBaseAddressWithFixedPort.
 * @param {string} hostOrBaseUrl
 * @returns {string} Origin without trailing slash, e.g. http://192.168.1.20:8080
 */
function _buildBaseWithFixedPort(hostOrBaseUrl) {
    let input = String(hostOrBaseUrl).trim();
    if (!input) throw new Error('host cannot be empty');
    if (!/^https?:\/\//.test(input)) input = `http://${input}`;
    let u;
    try {
        u = new URL(input);
    } catch {
        throw new Error(`Cannot parse device address: ${hostOrBaseUrl}`);
    }
    if (u.protocol !== 'http:' && u.protocol !== 'https:') {
        throw new Error('Only http or https device URLs are supported.');
    }
    u.port = String(DEVICE_HTTP_PORT);
    return u.origin;
}

// ─── Internal helpers ────────────────────────────────────────────────────────

function _pad2(n) { return String(n).padStart(2, '0'); }

function _dateToTimeStr(d) {
    return `${d.getFullYear()}-${_pad2(d.getMonth() + 1)}-${_pad2(d.getDate())} `
         + `${_pad2(d.getHours())}:${_pad2(d.getMinutes())}:${_pad2(d.getSeconds())}`;
}

function _isStr(v)     { return typeof v === 'string' && v.trim().length > 0; }
function _isPosInt(v)  { return Number.isInteger(v) && v > 0; }

function _isTimeStr(v) {
    return /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(v);
}

/** Send HTTP/HTTPS request; returns { status, body } */
function _request({ url, method = 'GET', headers = {}, body, timeout = 10000 }) {
    return new Promise((resolve, reject) => {
        const parsed  = new URL(url);
        const isHttps = parsed.protocol === 'https:';
        const lib     = isHttps ? https : http;
        const bodyStr = body != null ? JSON.stringify(body) : undefined;

        const reqHeaders = { 'Content-Type': 'application/json', ...headers };
        if (bodyStr) reqHeaders['Content-Length'] = Buffer.byteLength(bodyStr);

        const req = lib.request({
            hostname: parsed.hostname,
            port:     parsed.port || (isHttps ? 443 : 80),
            path:     parsed.pathname + (parsed.search || ''),
            method,
            headers:  reqHeaders,
        }, (res) => {
            let data = '';
            res.on('data', chunk => { data += chunk; });
            res.on('end', () => {
                try   { resolve({ status: res.statusCode, body: JSON.parse(data) }); }
                catch { resolve({ status: res.statusCode, body: data }); }
            });
        });

        req.setTimeout(timeout, () => req.destroy(new Error(`Request timeout (${timeout}ms)`)));
        req.on('error', reject);
        if (bodyStr) req.write(bodyStr);
        req.end();
    });
}

/** If API returns code===0, return data; otherwise throw Error with .code */
function _check(res) {
    const b = res.body;
    if (b && typeof b === 'object') {
        if (b.code === 0) return b.data ?? null;
        const err = new Error(b.message || `API error code=${b.code}`);
        err.code       = b.code;
        err.statusCode = res.status;
        throw err;
    }
    throw new Error(`Unexpected response body: ${String(res.body)}`);
}

// ─── Validation helpers ───────────────────────────────────────────────────────

/** Validate period object (appendix B) */
function _validatePeriod(p) {
    if (!p || typeof p !== 'object') throw new Error('period must be an object');
    if (![0, 1, 2, 3].includes(p.type)) throw new Error('period.type must be 0, 1, 2, or 3');

    if (p.type >= 1 && p.range) {
        const { beginTime, endTime } = p.range;
        if (!Number.isInteger(beginTime)) throw new Error('period.range.beginTime must be an integer Unix timestamp (seconds)');
        if (!Number.isInteger(endTime))   throw new Error('period.range.endTime must be an integer Unix timestamp (seconds)');
    }

    if (p.type === 2) {
        if (!_isStr(p.dayPeriodTime)) throw new Error('period type=2 requires dayPeriodTime string');
        const slots = p.dayPeriodTime.split('|');
        if (slots.length > 5) throw new Error('dayPeriodTime allows at most 5 time slots');
        slots.forEach((s, i) => {
            if (!/^\d{2}:\d{2}-\d{2}:\d{2}$/.test(s))
                throw new Error(`dayPeriodTime slot ${i + 1} must be HH:MM-HH:MM`);
        });
    }

    if (p.type === 3) {
        if (!p.weekPeriodTime || typeof p.weekPeriodTime !== 'object')
            throw new Error('period type=3 requires weekPeriodTime object');
        Object.entries(p.weekPeriodTime).forEach(([day, slots]) => {
            if (!['1','2','3','4','5','6','7'].includes(day))
                throw new Error(`weekPeriodTime key "${day}" is invalid; use 1–7`);
            String(slots).split('|').forEach((s, i) => {
                if (!/^\d{2}:\d{2}-\d{2}:\d{2}$/.test(s))
                    throw new Error(`weekPeriodTime day ${day} slot ${i + 1} must be HH:MM-HH:MM`);
            });
        });
    }
}

/** Validate a single user credential object */
function _validateUser(u) {
    if (!_isStr(u.userId)) throw new Error('userId cannot be empty');
    if (!_isStr(u.name))   throw new Error('name cannot be empty');
    const VALID_TYPES = ['nfc', 'pin', 'qr', 'ble', 'face'];
    if (!VALID_TYPES.includes(u.type))
        throw new Error(`type must be one of: ${VALID_TYPES.join(' / ')}`);
    if (!_isStr(u.value)) throw new Error('value cannot be empty');
    if (u.period !== undefined) _validatePeriod(u.period);
}

// ─── Main client ─────────────────────────────────────────────────────────────

class DW200Client {
    /**
     * @param {object}  options
     * @param {string}  options.host     Device IP or URL; port is always 8080 (port/path in URL ignored), e.g. "192.168.1.20"
     * @param {string}  [options.apiKey="password"]  API key
     * @param {number}  [options.timeout=10000]     Request timeout (ms)
     */
    constructor(options = {}) {
        if (!options.host) throw new Error('options.host is required');
        this._base    = _buildBaseWithFixedPort(options.host);
        this._apiKey  = options.apiKey  || 'password';
        this._timeout = options.timeout || 10000;
    }

    _url(path, query) {
        let url = this._base + path;
        if (query) {
            const qs = Object.entries(query)
                .filter(([, v]) => v !== undefined && v !== null)
                .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
                .join('&');
            if (qs) url += '?' + qs;
        }
        return url;
    }

    async _get(path, query) {
        const res = await _request({
            url: this._url(path, query), method: 'GET',
            headers: { 'X-API-Key': this._apiKey }, timeout: this._timeout,
        });
        return _check(res);
    }

    async _post(path, body) {
        const res = await _request({
            url: this._url(path), method: 'POST', body,
            headers: { 'X-API-Key': this._apiKey }, timeout: this._timeout,
        });
        return _check(res);
    }

    // ─── Basic ─────────────────────────────────────────────────────────────

    /**
     * Connectivity probe; no apiKey required
     * @returns {Promise<{ sn: string, model: string, timestamp: number }>}
     */
    async test() {
        const res = await _request({
            url: this._url('/api/v1/test'), method: 'GET', timeout: this._timeout,
        });
        return _check(res);
    }

    /**
     * Device information
     * @returns {Promise<{ sn, model, firmware, ip, mac, uptime, freeMem, freeStorage }>}
     */
    async getDeviceInfo() {
        return this._get('/api/v1/device/info');
    }

    // ─── Device config ───────────────────────────────────────────────────────

    /**
     * Read device config (write-only fields apiKey / adminPassword are not returned)
     * @returns {Promise<object>}
     */
    async getConfig() {
        return this._get('/api/v1/device/config');
    }

    /**
     * Update device config; send only keys to change
     * @param {object}  config
     * @param {string}  [config.apiKey]           API key (write-only)
     * @param {string}  [config.adminPassword]    6-digit PIN (write-only)
     * @param {string}  [config.screenTitle]      Screen title
     * @param {string}  [config.webhookUrl]       Must start with http:// or https://
     * @param {string|object} [config.networkConfig]  JSON string or object
     * @param {string}  [config.barcodeConfig]    JSON string, {key, timeout}
     */
    async setConfig(config) {
        if (!config || typeof config !== 'object')
            throw new Error('config must be an object');
        if (Object.keys(config).length === 0)
            throw new Error('config is empty; nothing to update');

        if (config.adminPassword !== undefined && !/^\d{6}$/.test(config.adminPassword))
            throw new Error('adminPassword must be exactly 6 digits');

        if (config.webhookUrl !== undefined && config.webhookUrl !== '') {
            if (!/^https?:\/\/.+/.test(config.webhookUrl))
                throw new Error('webhookUrl must start with http:// or https://');
        }

        // networkConfig may be an object; stringify for the wire
        const payload = { ...config };
        if (payload.networkConfig && typeof payload.networkConfig === 'object')
            payload.networkConfig = JSON.stringify(payload.networkConfig);

        return this._post('/api/v1/device/config', { config: payload });
    }

    // ─── Device control ──────────────────────────────────────────────────────

    /** Remote unlock */
    async openDoor() {
        return this._post('/api/v1/device/opendoor', {});
    }

    /** Reboot device */
    async reboot() {
        return this._post('/api/v1/device/reboot', {});
    }

    /**
     * Erase all data and reset config; irreversible; device reboots
     */
    async clearAllData() {
        return this._post('/api/v1/device/cleardata', {});
    }

    /**
     * Firmware upgrade (download + verify; device reboots on success)
     * @param {string} url  Package URL (http/https)
     * @param {string} md5  Package MD5 (32 hex chars)
     */
    async upgradeFirmware(url, md5) {
        if (!_isStr(url)) throw new Error('url cannot be empty');
        const u = String(url).trim();
        if (!/^https?:\/\/.+/.test(u))
            throw new Error('url must start with http:// or https://');

        const m = String(md5 || '').trim().toLowerCase();
        if (!/^[a-f0-9]{32}$/.test(m))
            throw new Error('md5 must be a 32-character lowercase hex string');

        return this._post('/api/v1/device/upgrade', { url: u, md5: m });
    }

    /**
     * Set device time
     * @param {string|Date} [time]  "YYYY-MM-DD HH:mm:ss" or Date; omit for current local time
     */
    async setTime(time) {
        let timeStr;
        if (!time) {
            timeStr = _dateToTimeStr(new Date());
        } else if (time instanceof Date) {
            timeStr = _dateToTimeStr(time);
        } else {
            timeStr = String(time);
        }
        if (!_isTimeStr(timeStr))
            throw new Error('time must be "YYYY-MM-DD HH:mm:ss"');
        return this._post('/api/v1/device/time', { time: timeStr });
    }

    /**
     * Update home background image; device reboots after success
     * @param {string} base64  PNG Base64 (480×320); may include data:image/png;base64, prefix
     */
    async setBackground(base64) {
        if (!_isStr(base64)) throw new Error('base64 image data cannot be empty');
        const clean = base64.replace(/^data:image\/[a-z]+;base64,/i, '');
        return this._post('/api/v1/device/background', { image: clean });
    }

    // ─── Users / credentials ─────────────────────────────────────────────────

    /**
     * Batch add/update credentials (max 100; same userId+type+value overwrites)
     * @param {Array<{ userId, name, type, value, period }>} users
     */
    async addUsers(users) {
        if (!Array.isArray(users) || users.length === 0)
            throw new Error('users must be a non-empty array');
        if (users.length > 100)
            throw new Error('At most 100 users per request');
        users.forEach((u, i) => {
            try { _validateUser(u); }
            catch (e) { throw new Error(`users[${i}]: ${e.message}`); }
        });
        return this._post('/api/v1/users/add', { users });
    }

    /**
     * Delete by userIds (removes all credentials for those users)
     * @param {string[]|string} userIds
     */
    async deleteUser(userIds) {
        const arr = Array.isArray(userIds) ? userIds : [userIds];
        const cleaned = arr
            .map((x) => (typeof x === 'string' ? x.trim() : ''))
            .filter((x) => x.length > 0);
        if (cleaned.length === 0) throw new Error('userIds cannot be empty');
        return this._post('/api/v1/users/delete', { userIds: cleaned });
    }

    /**
     * Delete specific credential rows by id (other credentials for same user remain)
     * @param {number[]} ids  Auto-increment ids from user credential list
     */
    async deleteUserByIds(ids) {
        if (!Array.isArray(ids) || ids.length === 0)
            throw new Error('ids must be a non-empty array');
        return this._post('/api/v1/users/delete', { ids });
    }

    /**
     * List user credentials with optional filters
     * @param {number} [page=1]
     * @param {number} [size=50]
     * @param {object} [filters]
     * @param {string} [filters.userId]  Partial match
     * @param {string} [filters.name]   Partial match on display name
     * @param {string} [filters.type]   Exact: nfc / pin / qr / ble / face
     * @param {string} [filters.value]  Partial match
     * @returns {Promise<{ total: number, list: Array<{ id: number, userId: string, name: string, type: string, value: string, period: object }> }>}
     */
    async listUsers(page = 1, size = 50, filters = {}) {
        if (!_isPosInt(page)) throw new Error('page must be a positive integer');
        if (!_isPosInt(size)) throw new Error('size must be a positive integer');
        const VALID_TYPES = ['nfc', 'pin', 'qr', 'ble', 'face'];
        if (filters.type && !VALID_TYPES.includes(filters.type))
            throw new Error(`filters.type must be one of: ${VALID_TYPES.join(' / ')}`);
        const query = { page, size };
        if (filters.userId) query.userId = filters.userId;
        if (filters.name)   query.name   = filters.name;
        if (filters.type)   query.type   = filters.type;
        if (filters.value)  query.value  = filters.value;
        return this._get('/api/v1/users/list', query);
    }

    /** Clear all user credentials */
    async clearUsers() {
        return this._post('/api/v1/users/clear', {});
    }

    // ─── Access records ──────────────────────────────────────────────────────

    /**
     * List access records
     * @param {number} [page=1]
     * @param {number} [size=100]
     * @param {object} [filters]
     * @param {string} [filters.userId]   Partial match
     * @param {string} [filters.name]     Partial match
     * @param {string} [filters.type]     Exact: nfc / pin / qr / ble / face / remote
     * @param {string} [filters.value]    Partial match
     * @param {number} [filters.result]   1 success / 0 failure
     * @returns {Promise<{ total: number, list: Array }>}
     */
    async listAccess(page = 1, size = 100, filters = {}) {
        if (!_isPosInt(page)) throw new Error('page must be a positive integer');
        if (!_isPosInt(size)) throw new Error('size must be a positive integer');
        const VALID_TYPES = ['nfc', 'pin', 'qr', 'ble', 'face', 'remote'];
        if (filters.type && !VALID_TYPES.includes(filters.type))
            throw new Error(`filters.type must be one of: ${VALID_TYPES.join(' / ')}`);
        if (filters.result !== undefined && filters.result !== '' &&
            filters.result !== 0 && filters.result !== 1)
            throw new Error('filters.result must be 0 or 1');
        const query = { page, size };
        if (filters.userId !== undefined && filters.userId !== '') query.userId = filters.userId;
        if (filters.name   !== undefined && filters.name   !== '') query.name   = filters.name;
        if (filters.type   !== undefined && filters.type   !== '') query.type   = filters.type;
        if (filters.value  !== undefined && filters.value  !== '') query.value  = filters.value;
        if (filters.result !== undefined && filters.result !== '') query.result = filters.result;
        return this._get('/api/v1/access', query);
    }

    /**
     * Delete access records by id
     * @param {number[]} ids
     */
    async deleteAccess(ids) {
        if (!Array.isArray(ids) || ids.length === 0)
            throw new Error('ids must be a non-empty array');
        return this._post('/api/v1/access/delete', { ids });
    }

    /** Clear all access records */
    async clearAccess() {
        return this._post('/api/v1/access/clear', {});
    }

    // ─── Event / alarm records ───────────────────────────────────────────────

    /**
     * List event records
     * @param {number} [page=1]
     * @param {number} [size=100]
     * @param {object} [filters]
     * @param {string} [filters.type]     Exact: info / warning / error
     * @param {string} [filters.message]  Partial match on message
     * @returns {Promise<{ total: number, list: Array }>}
     */
    async listEvents(page = 1, size = 100, filters = {}) {
        if (!_isPosInt(page)) throw new Error('page must be a positive integer');
        if (!_isPosInt(size)) throw new Error('size must be a positive integer');
        const VALID_TYPES = ['info', 'warning', 'error'];
        if (filters.type && !VALID_TYPES.includes(filters.type))
            throw new Error(`filters.type must be one of: ${VALID_TYPES.join(' / ')}`);
        const query = { page, size };
        if (filters.type)    query.type    = filters.type;
        if (filters.message) query.message = filters.message;
        return this._get('/api/v1/events', query);
    }

    /**
     * Delete event records by id
     * @param {number[]} ids
     */
    async deleteEvents(ids) {
        if (!Array.isArray(ids) || ids.length === 0)
            throw new Error('ids must be a non-empty array');
        return this._post('/api/v1/events/delete', { ids });
    }

    /** Clear all event records */
    async clearEvents() {
        return this._post('/api/v1/events/clear', {});
    }
}

// ─── Period builders (static) ────────────────────────────────────────────────

/**
 * Helpers for period objects (appendix B)
 *
 *   DW200Client.period.always()
 *   DW200Client.period.range(beginTs, endTs)
 *   DW200Client.period.daily('09:00-18:00')
 *   DW200Client.period.weekly({ '1': '09:00-18:00', '6': '10:00-14:00' })
 */
DW200Client.period = {
    /** No time limit */
    always() {
        return { type: 0 };
    },

    /**
     * Fixed date range (Unix seconds)
     * @param {number} beginTime
     * @param {number} endTime
     */
    range(beginTime, endTime) {
        if (!Number.isInteger(beginTime)) throw new Error('beginTime must be integer Unix seconds');
        if (!Number.isInteger(endTime))   throw new Error('endTime must be integer Unix seconds');
        if (endTime <= beginTime)         throw new Error('endTime must be greater than beginTime');
        return { type: 1, range: { beginTime, endTime } };
    },

    /**
     * Daily windows; max 5 segments, "HH:MM-HH:MM", multiple separated by |
     * @param {string}  slots   e.g. "09:00-12:00|14:00-18:00"
     * @param {object}  [range] Optional { beginTime, endTime } in seconds
     */
    daily(slots, range) {
        if (!_isStr(slots)) throw new Error('slots cannot be empty, e.g. "09:00-18:00"');
        const p = { type: 2, dayPeriodTime: slots };
        if (range) p.range = range;
        _validatePeriod(p);
        return p;
    },

    /**
     * Weekly schedule; keys 1–7 (Mon–Sun), values are slot strings
     * @param {{ [day: string]: string }} weekMap  e.g. { "1": "09:00-18:00" }
     * @param {object} [range]  Optional { beginTime, endTime }
     */
    weekly(weekMap, range) {
        if (!weekMap || typeof weekMap !== 'object')
            throw new Error('weekMap cannot be empty, e.g. { "1": "09:00-18:00" }');
        const p = { type: 3, weekPeriodTime: weekMap };
        if (range) p.range = range;
        _validatePeriod(p);
        return p;
    },
};

// ─── QR payload helper ───────────────────────────────────────────────────────

/**
 * Build JSON string for access QR payload
 *
 * Payload: { value, timestamp, sign? }
 * sign = md5( value + timestamp + key )
 *
 * @param {string} value      Credential value (same as type=qr value on device)
 * @param {string} [key=""]   Signing secret (device barcodeConfig.key)
 * @returns {string}          JSON string for QR encoding
 *
 * @example
 *   const str = DW200Client.generateQrStr('qr_0001_1', 'mySecret');
 *   // → '{"value":"qr_0001_1","timestamp":...,"sign":"..."}'
 *   // Empty/whitespace key → no sign: '{"value":"...","timestamp":...}'
 */
DW200Client.generateQrStr = function (value, key = '') {
    if (!value && value !== 0) throw new Error('value cannot be empty');
    const crypto    = require('crypto');
    const timestamp = Date.now();
    const keyTrim   = String(key != null ? key : '').trim();
    if (!keyTrim) {
        return JSON.stringify({ value: String(value), timestamp });
    }
    const sign = crypto
        .createHash('md5')
        .update(String(value) + String(timestamp) + keyTrim)
        .digest('hex');
    return JSON.stringify({ value: String(value), timestamp, sign });
};

// ─── LAN scan ────────────────────────────────────────────────────────────────

/**
 * Scan a /24 subnet for DW200 devices
 *
 * IPs .1–.254 split into concurrency groups; parallel across groups, serial within group.
 * Uses unauthenticated GET /api/v1/test.
 *
 * @param {string} subnet   Prefix "A.B.C", e.g. "192.168.50"
 * @param {object} [opts]
 * @param {number} [opts.timeout=1500]     Per-IP timeout (ms)
 * @param {number} [opts.concurrency=10]   Number of parallel groups
 * @param {Function} [opts.onFound]       onFound({ ip, sn, timestamp })
 * @returns {Promise<Array<{ ip: string, sn: string, timestamp: number }>>}
 *
 * @example
 *   const devices = await DW200Client.scan('192.168.50', {
 *     onFound: d => console.log('found:', d.ip, d.sn),
 *   });
 *   console.log('count:', devices.length);
 */
DW200Client.scan = async function (subnet, opts = {}) {
    if (!/^\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(subnet)) {
        throw new Error('subnet must be "A.B.C", e.g. "192.168.50"');
    }

    const timeout     = opts.timeout     || 1500;
    const concurrency = opts.concurrency || 10;
    const onFound     = typeof opts.onFound === 'function' ? opts.onFound : null;

    const ips = [];
    for (let i = 1; i <= 254; i++) ips.push(`${subnet}.${i}`);

    const groups = Array.from({ length: concurrency }, () => []);
    ips.forEach((ip, idx) => groups[idx % concurrency].push(ip));

    /** Probe one IP; return device info or null */
    async function probeOne(ip) {
        try {
            const res = await _request({
                url:    `http://${ip}:${DEVICE_HTTP_PORT}/api/v1/test`,
                method: 'GET',
                timeout,
            });
            if (!res.body || typeof res.body !== 'object') return null;
            if (res.body.code !== 0) return null;
            const data = res.body.data;
            if (!data || !data.sn) return null;
            const found = { ip, sn: data.sn, timestamp: data.timestamp || 0 };
            if (onFound) onFound(found);
            return found;
        } catch (e) {
            return null; // timeout, ECONNREFUSED, etc.
        }
    }

    /** Serial scan one group */
    async function scanGroup(group) {
        const results = [];
        for (const ip of group) {
            const r = await probeOne(ip);
            if (r) results.push(r);
        }
        return results;
    }

    const nested = await Promise.all(groups.map(g => scanGroup(g)));
    return nested
        .flat()
        .sort((a, b) => {
            const la = parseInt(a.ip.split('.').pop(), 10);
            const lb = parseInt(b.ip.split('.').pop(), 10);
            return la - lb;
        });
};

DW200Client.DEVICE_HTTP_PORT = DEVICE_HTTP_PORT;

module.exports = DW200Client;
module.exports.DW200Client = DW200Client;
module.exports.DEVICE_HTTP_PORT = DEVICE_HTTP_PORT;
