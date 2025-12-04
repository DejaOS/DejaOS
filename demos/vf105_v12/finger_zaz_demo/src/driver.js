import bus from '../dxmodules/dxEventBus.js'
import alsa from '../dxmodules/dxAlsa.js'
import dxFingerZaz from '../dxmodules/dxFingerZaz.js'

const driver = {}


driver.alsa = {
    init: function () {
        alsa.init()
    },
    play: function (src) {
        alsa.play(src)
    },
    ttsPlay: function (text) {
        alsa.ttsPlay(text)
    },
    volume: function (volume) {
        alsa.setVolume(volume)
    }
}


driver.fingerZaz = {
    id: 'fingerUart',
    init: function () {
        dxFingerZaz.init({
            type: 3,
            path: '/dev/ttySLB1',
            baudrate: '115200-8-N-1'
        })
    },
}

driver.screen = {
    popWin: function (msg) {
        bus.fire('popWin', msg)
    }
}




export default driver
