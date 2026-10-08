/** @layer domain @module log_domain @depends log_driver */

import logDriver from '../drivers/log_driver.js';

let preparing = null;
const logDomain = {};

/** 多次点击只复用同一个打包任务，避免压缩进程相互删除临时文件。 */
logDomain.prepare = function () {
    if (preparing) return preparing;
    preparing = Promise.resolve().then(function () {
        return logDriver.prepare();
    }).finally(function () {
        preparing = null;
    });
    return preparing;
};

export default logDomain;
