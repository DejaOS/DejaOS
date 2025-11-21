import dxPwm from '../dxmodules/dxPwm.js'
import std from '../dxmodules/dxStd.js'
import dxNet from '../dxmodules/dxNet.js'
import dxGpio from '../dxmodules/dxGpio.js'
import dxCode from '../dxmodules/dxCode.js'
import dxAlsaplay from '../dxmodules/dxAlsaplay.js'
import ota from '../dxmodules/dxOta.js'
import dxMqtt from '../dxmodules/dxMqtt.js'
import constants from './constants.js'
import logger from '../dxmodules/dxLogger.js'
import ntp from '../dxmodules/dxNtp.js'
import dxWatchdog from '../dxmodules/dxWatchdog.js'
import bus from '../dxmodules/dxEventBus.js'
const driver = {}

driver.watchdog = {
    init: function () {
        // dxWatchdog.open(1 | 2)
        // dxWatchdog.enable(1)
        // dxWatchdog.start(60000)
    },
    loop: function () {
        // dxWatchdog.loop(1)
    },
    feed: function (flag, timeout) {
        // dxWatchdog.feed(flag, timeout)
    }
}
driver.pwm = {
    init: function () {
        // Initialize PWM
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
        dxNet.worker.beforeLoop(constants.netoption())
    },
    on: function (fun) {
        bus.on(dxNet.STATUS_CHANGE, fun)
    },
    loop: function () {
        dxNet.worker.loop()
    }
}
driver.mqtt = {
    init: function () {
        dxMqtt.run(constants.mqttoption())
    },
    on: function (fun) {
        bus.on(dxMqtt.RECEIVE_MSG, fun)
    },
    onConnectChanged: function (fun) {
        bus.on("__mqtt__Connect_changed", fun)
    },
    send: function (data) {
        dxMqtt.send(data.topic, data.payload)
    }
}
driver.gpio = {
    init: function () {
        dxGpio.init()
        dxGpio.request(105)
    },
    open: function () {
        dxGpio.setValue(105, 1)
    },
    close: function () {
        dxGpio.setValue(105, 0)
    },
    toggle: function (delay) {// Open relay first, wait a bit, then close
        if (!delay || typeof delay !== 'number' || isNaN(delay)) {
            delay = 2000; // Default 2000
        }
        dxGpio.setValue(105, 1)
        std.sleep(Math.max(delay, 50))// At least sleep 50 milliseconds
        dxGpio.setValue(105, 0)
    }
}
driver.code = {
    capturerOptions: { id: 'caputurer', path: '/dev/video11' },
    decoderOptions: { id: 'decoder', name: 'dxcode', width: 800, height: 600 },
    init: function () {
        driver.code.option = constants.codeoption()
        dxCode.worker.beforeLoop(this.capturerOptions, this.decoderOptions)
    },
    loop: function () {
        dxCode.worker.loop(driver.code.option.mode, driver.code.option.interval)
    },
    on: function (fun) {
        bus.on(dxCode.RECEIVE_MSG, fun)
    }
}
driver.audio = {
    init: function () {
        dxAlsaplay.init()
        const option = constants.audiooption()
        // Range 0-60, default 30, maximum not exceeding 60, divide by 10 first, round to get 0-6
        if (option.volumn === 0) {
            dxAlsaplay.setVolume(0)
        } else {
            dxAlsaplay.setVolume(Math.ceil(Math.min(option.volumn || 30, 60) / 10))
        }
        if (option.boot) {// Default: do not play
            this.play('boot_music.wav')
        }
    },
    play: function (wav) {
        dxAlsaplay.play('/app/code/resource/wav/' + wav)
    }
}
driver.ota = {
    update: function (obj) {
        try {
            if (obj.hasOwnProperty('update_flag')) {// Upgrade installation package
                ota.update(obj.update_addr, obj.update_md5)
            }
            if (obj.hasOwnProperty('update_flg')) {// Upgrade resource files for old version
                ota.updateResource(obj.update_haddr, obj.update_md5)
            }
            driver.pwm.success()
            if (obj.from === 'mqtt') {
                driver.mqtt.send(obj.success)
            }
            ota.reboot()
        } catch (err) {
            logger.error(err)
            driver.pwm.fail()
            if (obj.from === 'mqtt') {
                driver.mqtt.send(obj.fail)
            }
        }
    }
}
driver.initMain = function () {
    this.gpio.init()
    std.sleep(100)
    this.watchdog.init()
    std.sleep(100)
    this.pwm.init()
    std.sleep(100)
    this.mqtt.init()
    std.sleep(100)
}
driver.initService = function () {
    ntp.beforeLoop()
    std.sleep(100)
    this.net.init()
    std.sleep(100)
    this.audio.init()
    std.sleep(100)
    this.code.init()
    std.sleep(100)
}
driver.loop = function (center) {
    this.net.loop(center)
    ntp.loop()
}
export default driver 