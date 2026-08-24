/**
 * @layer    storage
 * @module   data/sql
 * @depends  none
 *
 * dxSqliteDB当前只接收完整SQL字符串。本文件集中处理值转义，业务输入不得
 * 直接拼接到SQL；表名、列名和排序字段必须由各Storage固定定义。
 */

const sql = {};

sql.text = function (value) {
    if (value === undefined || value === null) {
        return 'NULL';
    }
    return "'" + String(value).replace(/'/g, "''") + "'";
};

sql.integer = function (value, defaultValue) {
    const number = Number(value);
    if (!Number.isFinite(number)) {
        if (defaultValue !== undefined) {
            return Math.trunc(defaultValue);
        }
        throw new TypeError('sql.integer: value must be a finite number');
    }
    return Math.trunc(number);
};

sql.json = function (value, defaultValue) {
    const next = value === undefined ? defaultValue : value;
    return sql.text(JSON.stringify(next));
};

sql.parseJson = function (value, defaultValue) {
    if (value === undefined || value === null || value === '') {
        return defaultValue;
    }
    try {
        return JSON.parse(value);
    } catch (e) {
        throw new Error('storage: invalid JSON data: ' + e.message);
    }
};

sql.textList = function (values) {
    if (!Array.isArray(values) || values.length === 0) {
        throw new TypeError('sql.textList: values must be a non-empty array');
    }
    return '(' + values.map(sql.text).join(',') + ')';
};

sql.like = function (value) {
    const escaped = String(value)
        .replace(/\\/g, '\\\\')
        .replace(/%/g, '\\%')
        .replace(/_/g, '\\_');
    return sql.text('%' + escaped + '%');
};

export default sql;
