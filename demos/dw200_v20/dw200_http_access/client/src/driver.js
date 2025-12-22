import dxPwm from '../dxmodules/dxPwm.js'
import std from '../dxmodules/dxStd.js'
import dxNet from '../dxmodules/dxNet.js'
import dxGpio from '../dxmodules/dxGpio.js'
import dxCode from '../dxmodules/dxCode.js'
import logger from '../dxmodules/dxLogger.js'
import ntp from '../dxmodules/dxNtp.js'
import bus from '../dxmodules/dxEventBus.js'
import common from '../dxmodules/dxCommon.js'
const driver = {}

driver.pwm = {
    init: function () {
        // Initialize pwm
        dxPwm.request(4);
        dxPwm.setPeriodByChannel(4, 366166)
        dxPwm.enable(4, true)
    },
    // Key press sound
    press: function () {
        dxPwm.beep({ channel: 4 })
    },
    // Failure sound
    fail: function () {
        dxPwm.beep({ channel: 4, time: 500 })
    },
    // Success sound
    success: function () {
        dxPwm.beep({ channel: 4, count: 2 })
    }
}
driver.net = {
    init: function () {
        dxNet.worker.beforeLoop({ type: 1, dhcp: dxNet.DHCP.DYNAMIC, macAddr: common.getUuid2mac() })
    },
    on: function (fun) {
        bus.on(dxNet.STATUS_CHANGE, fun)
    },
    loop: function () {
        dxNet.worker.loop()
    }
}
driver.gpio = {
    init: function () {
        dxGpio.init()
        dxGpio.request(35)
    },
    open: function () {
        dxGpio.setValue(35, 1)
    },
    close: function () {
        dxGpio.setValue(35, 0)
    },
    toggle: function (delay) {//First turn on relay, wait a bit, then turn off
        if (!delay || typeof delay !== 'number' || isNaN(delay)) {
            delay = 2000; // Default 2000
        }
        dxGpio.setValue(35, 1)
        std.sleep(Math.max(delay, 50))//Minimum sleep 50 milliseconds
        dxGpio.setValue(35, 0)
    }
}
driver.code = {
    capturerOptions: { id: 'caputurer', path: '/dev/video11' },
    decoderOptions: { id: 'decoder', name: 'dxcode', width: 800, height: 600 },
    init: function () {
        dxCode.worker.beforeLoop(this.capturerOptions, this.decoderOptions)
    },
    loop: function () {
        dxCode.worker.loop(0, 1000)
    },
    on: function (fun) {
        bus.on(dxCode.RECEIVE_MSG, fun)
    }
}
driver.initMain = function () {
    this.gpio.init()
    std.sleep(100)
    this.pwm.init()
    std.sleep(100)
}
driver.initService = function () {
    ntp.beforeLoop()
    std.sleep(100)
    this.net.init()
    std.sleep(100)
    this.code.init()
    std.sleep(100)
}
driver.loop = function (center) {
    this.net.loop(center)
    ntp.loop()
}
export default driver 