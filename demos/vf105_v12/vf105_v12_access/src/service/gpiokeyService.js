import logger from "../../dxmodules/dxLogger.js";
import config from "../../dxmodules/dxConfig.js";
import driver from "../driver.js";

const gpiokeyService = {}

gpiokeyService.receiveMsg = function (data) {
    if (config.get("access.tamperAlarm") && data.type == 1 && data.value == 1) {
        driver.alsa.play("/app/code/resource/wav/alarm.wav")
    }
}

export default gpiokeyService