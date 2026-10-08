/**
 * 统一诊断日志：只记录定位问题所需的元数据，不展开业务报文或敏感数据。
 * WARN复用dxLogger.info输出，并增加severity=warn，兼容当前日志组件能力。
 */
import logger from '../../dxmodules/dxLogger.js';

const MAX_VALUE_LENGTH = 160;
const SENSITIVE_KEY = /(password|passwd|pwd|psk|token|secret|feature|image|picture|credential|private)/i;

function safeKey(value) {
    return String(value || '').replace(/[^a-zA-Z0-9_.-]/g, '_');
}

function safeValue(key, value) {
    if (SENSITIVE_KEY.test(key)) return '[redacted]';
    if (value === null) return 'null';
    if (value === undefined) return 'undefined';
    if (typeof value === 'boolean' || typeof value === 'number') return String(value);
    if (typeof value === 'string') {
        const text = value.replace(/[\r\n\t]/g, ' ').trim();
        return text.length > MAX_VALUE_LENGTH ? text.slice(0, MAX_VALUE_LENGTH) + '...' : text;
    }
    if (Array.isArray(value)) return 'array(' + value.length + ')';
    return '[object]';
}

function errorFields(error) {
    if (!error) return { error: 'unknown' };
    return {
        error: error.message || String(error),
        error_code: error.code === undefined ? '' : error.code,
    };
}

function line(moduleName, eventName, fields) {
    const parts = ['[' + safeKey(moduleName) + ']', 'event=' + safeKey(eventName)];
    const values = fields || {};
    Object.keys(values).sort().forEach(function (key) {
        parts.push(safeKey(key) + '=' + safeValue(key, values[key]));
    });
    return parts.join(' ');
}

function write(level, moduleName, eventName, fields) {
    const text = line(moduleName, eventName, fields);
    if (level === 'error') logger.error(text);
    else if (level === 'debug') logger.debug(text);
    else logger.info(text);
}

const diagLog = {
    debug: function (moduleName, eventName, fields) {
        write('debug', moduleName, eventName, fields);
    },
    info: function (moduleName, eventName, fields) {
        write('info', moduleName, eventName, fields);
    },
    warn: function (moduleName, eventName, fields) {
        write('info', moduleName, eventName, Object.assign({ severity: 'warn' }, fields || {}));
    },
    error: function (moduleName, eventName, error, fields) {
        write('error', moduleName, eventName, Object.assign({}, fields || {}, errorFields(error)));
    },
    duration: function (startedAt) {
        return Math.max(0, Date.now() - Number(startedAt || Date.now()));
    },
};

export default diagLog;
