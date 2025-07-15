import std from '../dxmodules/dxStd.js'
import dxCommon from '../dxmodules/dxCommon.js'
import dxUart from '../dxmodules/dxUart.js'
import gpio from '../dxmodules/dxGpio.js'
import alsa from '../dxmodules/dxAlsaplay.js'
import nfc from '../dxmodules/dxNfc.js'
import dxCode from '../dxmodules/dxCode.js'
import dxNet from '../dxmodules/dxNet.js'

const driver = {}

driver.gpio = {
    RELAY1: 105,
    init: function () {
        gpio.init()
        gpio.request(this.RELAY1)
    },
    open: function () {
        gpio.setValue(this.RELAY1, 1)
    },
    close: function () {
        gpio.setValue(this.RELAY1, 0)
    }
}


driver.alsa = {
    init: function () {
        alsa.init()
    },
    play: function (src) {
        alsa.play(src)
    },
    volume: function (volume) {
        alsa.setVolume(volume)
    }
}


driver.nfc = {
    options: { m1: true, psam: false },
    init: function () {
        nfc.worker.beforeLoop(this.options)
    },
    loop: function () {
        nfc.worker.loop(this.options)
    }
}


driver.code = {
    options1: { id: 'capturer1', path: '/dev/video11' },
    options2: { id: 'decoder1', name: "decoder v4", width: 800, height: 600 },
    init: function () {
        dxCode.worker.beforeLoop(this.options1, this.options2)
    },
    loop: function () {
        dxCode.worker.loop(0,1000)
    }
}


driver.uart485 = {
    id: 'uart485',
    init: function () {
        dxUart.runvg({ id: this.id, type: dxUart.TYPE.UART, path: '/dev/ttyS3', result: 0, passThrough: false })
        std.sleep(100)
        dxUart.ioctl(1, '115200-8-N-1', this.id)
    },
    ioctl: function (data) {
        dxUart.ioctl(1, data, this.id)
    },
    send: function (data) {
        dxUart.send(data, this.id)
    },
    sendVg: function (data) {
        if (typeof data == 'object') {
            data.length = data.length ? data.length : (data.data ? data.data.length / 2 : 0)
        }
        dxUart.sendVg(data, this.id)
    }
}


driver.net = {
    options : {
        type: dxNet.TYPE.ETHERNET,
        dhcp: dxNet.DHCP.DYNAMIC,
        macAddr: dxCommon.getUuid2mac(),
    },
    init: function () {
        dxNet.worker.beforeLoop(this.options)
    },
    loop: function () {
        dxNet.worker.loop()
    }
}

export default driver
