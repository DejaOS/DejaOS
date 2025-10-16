import gpio from '../../dxmodules/dxGpio.js'
import dxDriver from '../../dxmodules/dxDriver.js'
import config from '../../dxmodules/dxConfig.js'
import std from '../../dxmodules/dxStd.js'

const gpioDriver = {
    init: function () {
        gpio.init()
        gpio.request(dxDriver.GPIO.RELAY0)
    },
    open: function () {
        gpio.setValue(dxDriver.GPIO.RELAY0, 1);

        let relayTime = config.get("access.relayTime")

        std.setTimeout(() => {
            gpio.setValue(dxDriver.GPIO.RELAY0, 0);
        }, relayTime)
    },
    close: function () {
        gpio.setValue(dxDriver.GPIO.RELAY0, 0)
    }
}

export default gpioDriver

