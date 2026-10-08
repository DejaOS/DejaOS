/** @layer domain @module time_domain @depends time_driver,storage/config */

import timeDriver from '../drivers/time_driver.js';
import configStorage from '../storage/config/config.js';

const timeDomain = {};

timeDomain.getConfig = async function () {
    return await configStorage.getGroup('ntp');
};

timeDomain.setConfig = async function (values) {
    // 先由Driver校验时区文件等运行环境约束，避免写入无法应用的配置。
    if (Object.prototype.hasOwnProperty.call(values, 'timeZone')) {
        timeDriver.validateTimeZone(values.timeZone);
    }
    await configStorage.setGroup('ntp', values);
    await timeDriver.updateConfig(values);
    return await timeDomain.getConfig();
};

timeDomain.sync = function () {
    return timeDriver.sync();
};

timeDomain.suspend = function () {
    return timeDriver.suspend();
};

timeDomain.getStatus = function () {
    return timeDriver.getStatus();
};

timeDomain.getTime = function () {
    return timeDriver.getTime();
};

timeDomain.setTime = function (value) {
    return timeDriver.setTime(value);
};

export default timeDomain;
