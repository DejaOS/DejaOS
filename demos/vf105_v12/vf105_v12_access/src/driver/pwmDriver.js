import pwm from '../../dxmodules/dxPwm.js'
import dxDriver from '../../dxmodules/dxDriver.js'
import logger from '../../dxmodules/dxLogger.js'

const pwmDriver = {
    init: function () {
        // White supplementary light
        let luminanceWhite = 0
        pwm.request(dxDriver.PWM.WHITE_SUPPLEMENT_CHANNEL);
        pwm.setPeriodByChannel(dxDriver.PWM.WHITE_SUPPLEMENT_CHANNEL, dxDriver.PWM.WHITE_SUPPLEMENT_PERIOD_NS)
        pwm.enable(dxDriver.PWM.WHITE_SUPPLEMENT_CHANNEL, true);
        pwm.setDutyByChannel(dxDriver.PWM.WHITE_SUPPLEMENT_CHANNEL, dxDriver.PWM.WHITE_SUPPLEMENT_PERIOD_NS - (dxDriver.PWM.WHITE_SUPPLEMENT_PERIOD_NS * (luminanceWhite / 100)))
        // Infrared supplementary light
        let luminanceNir = 0
        pwm.request(dxDriver.PWM.NIR_SUPPLEMENT_CHANNEL);
        pwm.setPeriodByChannel(dxDriver.PWM.NIR_SUPPLEMENT_CHANNEL, dxDriver.PWM.NIR_SUPPLEMENT_PERIOD_NS)
        pwm.enable(dxDriver.PWM.NIR_SUPPLEMENT_CHANNEL, true);
        pwm.setDutyByChannel(dxDriver.PWM.NIR_SUPPLEMENT_CHANNEL, dxDriver.PWM.NIR_SUPPLEMENT_PERIOD_NS - (dxDriver.PWM.NIR_SUPPLEMENT_PERIOD_NS * (luminanceNir / 100)))
    },
    // Adjust white supplementary light brightness, range 0-100
    luminanceWhite: function (value) {
        if (value < 0 || value > 100) {
            logger.error("[driver.pwm]: value should be between 0 and 100")
            return
        }
        pwm.setDutyByChannel(dxDriver.PWM.WHITE_SUPPLEMENT_CHANNEL, dxDriver.PWM.WHITE_SUPPLEMENT_PERIOD_NS - (dxDriver.PWM.WHITE_SUPPLEMENT_PERIOD_NS * (value / 100)))
    },
    // Adjust infrared supplementary light brightness, range 0-100
    luminanceNir: function (value) {
        if (value < 0 || value > 100) {
            logger.error("[driver.pwm]: value should be between 0 and 100")
            return
        }
        pwm.setDutyByChannel(dxDriver.PWM.NIR_SUPPLEMENT_CHANNEL, dxDriver.PWM.NIR_SUPPLEMENT_PERIOD_NS - (dxDriver.PWM.NIR_SUPPLEMENT_PERIOD_NS * (value / 100)))
    }
}

export default pwmDriver

