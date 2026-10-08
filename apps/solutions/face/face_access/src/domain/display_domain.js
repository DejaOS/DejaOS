/** @layer domain @module display_domain @depends display_driver,storage/config */

import displayDriver from '../drivers/display_driver.js';
import configStorage from '../storage/config/config.js';

const displayDomain = {};

displayDomain.setConfig = async function (values) {
    await configStorage.setGroup('base', values);
    if (Object.prototype.hasOwnProperty.call(values, 'backlight')) {
        await displayDriver.updateConfig({ backlight: values.backlight });
    }
    return await configStorage.getGroup('base');
};

displayDomain.setAwake = function (awake) {
    displayDriver.setAwake(awake === true);
    return displayDriver.isAwake();
};

displayDomain.isAwake = function () {
    return displayDriver.isAwake();
};
export default displayDomain;
