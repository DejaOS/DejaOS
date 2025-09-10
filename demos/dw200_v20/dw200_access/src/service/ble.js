import dxUart from '../../dxmodules/dxUart.js'
import std from '../../dxmodules/dxStd.js'
const bleservice = {}

bleservice.id = 'uartBle'
bleservice.init = function () {
    dxUart.runvg({ id: bleservice.id, type: dxUart.TYPE.UART, path: '/dev/ttyS5', result: 0 })
    std.sleep(1000)
    dxUart.ioctl(6, '921600-8-N-1', bleservice.id)
}

export default bleservice;