import logger from '../dxmodules/dxLogger.js'
import driver from './driver.js';
import std from '../dxmodules/dxStd.js';

driver.pwm.init(0)
logger.info("[main]: driver initialized with white light set to 0% luminance");


let value = 0;
std.setInterval(() => {
    if(value == 0){
        value = 70
    } else {
        value = 0
    }
    driver.pwm.luminanceWhite(value);
    logger.info(`[main]: driver initialized and white light set to ${value}% luminance`);
}, 3000)




