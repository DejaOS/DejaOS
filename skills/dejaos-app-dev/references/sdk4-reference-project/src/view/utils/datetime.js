/**
 * @layer    view
 * @module   datetime
 * @fires    none
 * @listens  none
 * @depends  none
 *
 * 日期时间格式化工具。
 */

/**
 * 格式化为 YYYY-MM-DD HH:mm:ss。
 * @param {Date} date
 * @returns {string}
 */
export function formatDateTime(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    const hh = String(date.getHours()).padStart(2, '0');
    const mm = String(date.getMinutes()).padStart(2, '0');
    const ss = String(date.getSeconds()).padStart(2, '0');
    return y + '-' + m + '-' + d + ' ' + hh + ':' + mm + ':' + ss;
}

export default {
    formatDateTime: formatDateTime,
};
