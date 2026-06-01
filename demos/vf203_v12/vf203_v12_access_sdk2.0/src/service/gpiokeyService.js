import config from "../../dxmodules/dxConfig.js";
import logger from "../../dxmodules/dxLogger.js";
import std from "../../dxmodules/dxStd.js";
import driver from "../driver.js";

const gpiokeyService = {}

gpiokeyService.receiveMsg = function (data) {
    logger.info('[gpiokeyService] receiveMsg :' + JSON.stringify(data))
    this["key" + data.code](data)
}

/**
 * 门磁报警
 * @param {*} data 
 */
gpiokeyService.key0 = function (data) {
    logger.info('[gpiokeyService] key0 :' + JSON.stringify(data))
    driver.gpiokey.sensorChanged(driver.gpiokey.TYPE.DOOR_SENSOR, data.value)
}

/**
 * 火警报警
 * @param {*} data 
 */
gpiokeyService.key1 = function (data) {
    logger.info('[gpiokeyService] key1 :' + JSON.stringify(data))
    // 判断火警开关是否开启
    if (config.get("access.fire") == 1 && data.value == 1) {
        // 火警触发，记录触发状态
        config.setAndSave("access.fireStatus", 1)
        // 火警触发，打开继电器
        driver.gpio.open()
        // 火警触发，播放报警音
        gpiokeyService.fireAlarm()
        // 上报火警状态
        driver.gpiokey.sensorChanged(driver.gpiokey.TYPE.FIRE_ALARM, data.value)
    }
}

/**
 * 防拆报警
 * @param {*} data 
 */
gpiokeyService.key2 = function (data) {
    logger.info('[gpiokeyService] key2 :' + JSON.stringify(data))
    // 判断防拆开关是否开启
    if (config.get("access.tamper") == 1) {
        if(data.value == 1){
            // 防拆触发，播放报警音
            gpiokeyService.tamperAlarm()
        } else {
            // 防拆解除，停止播放报警音
            gpiokeyService.clearTamperAlarm()
        }
        // 上报防拆状态
        driver.gpiokey.sensorChanged(driver.gpiokey.TYPE.TAMPER_ALARM, data.value)
    }
}

/**
 * 播放火警报警音
 */
gpiokeyService.fireAlarm = function () {
    if(!gpiokeyService.fireTimer && config.get("access.fire") == 1 && config.get("access.fireStatus") == 1){
        driver.audio.play("/app/code/resource/wav/alarm.wav")
        gpiokeyService.fireTimer = std.setInterval(() => {
            logger.info('[gpiokeyService] fireAlarm')
            if(config.get("access.fire") == 1 && config.get("access.fireStatus") == 1){
                driver.audio.play("/app/code/resource/wav/alarm.wav")
            }else{
                gpiokeyService.clearFireAlarm()
            }
        }, 4000)
    }
}

/**
 * 播放防拆报警音
 */
gpiokeyService.tamperAlarm = function () {
    if(!gpiokeyService.tamperTimer && config.get("access.tamper") == 1){
        driver.audio.play("/app/code/resource/wav/tamper.wav")
        gpiokeyService.tamperTimer = std.setInterval(() => {
            logger.info('[gpiokeyService] tamperAlarm')
            if(config.get("access.tamper") == 1){
                driver.audio.play("/app/code/resource/wav/tamper.wav")
            }
        }, 8000)
    }
}

/**
 * 清除火警报警音
 */
gpiokeyService.clearFireAlarm = function () {
    logger.info('[gpiokeyService] clearFireAlarm')
    std.clearInterval(gpiokeyService.fireTimer)
    gpiokeyService.fireTimer = null
    driver.audio.interrupt()
    driver.audio.clearCache()
}

/**
 * 清除防拆报警音
 */
gpiokeyService.clearTamperAlarm = function () {
    logger.info('[gpiokeyService] clearTamperAlarm')
    std.clearInterval(gpiokeyService.tamperTimer)
    gpiokeyService.tamperTimer = null
    driver.audio.interrupt()
    driver.audio.clearCache()
}

export default gpiokeyService