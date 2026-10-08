/** @layer domain @module db_export_domain @depends db_export_driver */

import dbExportDriver from '../drivers/db_export_driver.js';

/** 按导出类型分别去重，避免 face/business 并发时互相复用错误结果。 */
const preparing = Object.create(null);
const dbExportDomain = {};

/** 同类型多次点击只复用同一个导出任务，避免临时文件互相覆盖。 */
dbExportDomain.prepare = function (type) {
    const key = String(type || '');
    if (preparing[key]) return preparing[key];
    preparing[key] = Promise.resolve().then(function () {
        return dbExportDriver.prepare(key);
    }).finally(function () {
        preparing[key] = null;
    });
    return preparing[key];
};

export default dbExportDomain;
