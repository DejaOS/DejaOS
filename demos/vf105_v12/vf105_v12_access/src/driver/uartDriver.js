import dxUart from '../../dxmodules/dxUart.js'
import std from '../../dxmodules/dxStd.js'

const uart485Driver = {
    id: 'uart485',
    init: function () {
        dxUart.runvg({ id: this.id, type: dxUart.TYPE.UART, path: '/dev/ttySLB2', result: 0, passThrough: false })
        std.sleep(2000)
        dxUart.ioctl(6, '115200-8-N-1', this.id)
    },
    ioctl: function (data) {
        dxUart.ioctl(6, data, this.id)
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

const uartCodeDriver = {
    id: 'uartCode',
    init: function () {
        dxUart.runvg({ id: this.id, type: dxUart.TYPE.UART, path: '/dev/ttySLB1', result: 0, passThrough: false })
        std.sleep(500)
        dxUart.ioctl(6, '115200-8-N-1', this.id)
    },
    ioctl: function (data) {
        dxUart.ioctl(6, data, this.id)
    },
    send: function (data) {
        dxUart.send(data, this.id)
    },
    sendVg: function (data) {
        if (typeof data == 'object') {
            data.length = data.length ? data.length : (data.data ? data.data.length / 2 : 0)
        }
        dxUart.sendVg(data, this.id)
    },
}

export { uart485Driver, uartCodeDriver }

