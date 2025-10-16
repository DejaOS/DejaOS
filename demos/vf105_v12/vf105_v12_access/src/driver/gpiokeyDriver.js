import dxGpioKey from '../../dxmodules/dxGpioKey.js'

const gpiokeyDriver = {
    init: function () {
        dxGpioKey.worker.beforeLoop()
    },
    loop: function () {
        dxGpioKey.worker.loop()
    },
}

export default gpiokeyDriver

