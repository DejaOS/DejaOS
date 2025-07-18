import pwm from '../dxmodules/dxPwm.js'
import dxDriver from '../dxmodules/dxDriver.js'
import logger from '../dxmodules/dxLogger.js'

const driver = {}

driver.pwm = {
    init: function (luminanceWhite = 70) {
        pwm.request(dxDriver.PWM.WHITE_SUPPLEMENT_CHANNEL);
        pwm.setPeriodByChannel(dxDriver.PWM.WHITE_SUPPLEMENT_CHANNEL, dxDriver.PWM.WHITE_SUPPLEMENT_PERIOD_NS)
        pwm.enable(dxDriver.PWM.WHITE_SUPPLEMENT_CHANNEL, true);
        pwm.setDutyByChannel(dxDriver.PWM.WHITE_SUPPLEMENT_CHANNEL, dxDriver.PWM.WHITE_SUPPLEMENT_PERIOD_NS - (dxDriver.PWM.WHITE_SUPPLEMENT_PERIOD_NS * (luminanceWhite / 100)))
    },
    luminanceWhite: function (value) {
        if (value < 0 || value > 100) {
            logger.error("[driver.pwm]: value should be between 0 and 100")
            return
        }
        pwm.setDutyByChannel(dxDriver.PWM.WHITE_SUPPLEMENT_CHANNEL, dxDriver.PWM.WHITE_SUPPLEMENT_PERIOD_NS - (dxDriver.PWM.WHITE_SUPPLEMENT_PERIOD_NS * (value / 100)))
    }
}

export default driver
