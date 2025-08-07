import log from '../dxmodules/dxLogger.js'
import std from '../dxmodules/dxStd.js'
import dxCode from '../dxmodules/dxCode.js'

let code = {
    options1: { id: 'capturer1', path: '/dev/video11' },
    options2: { id: 'decoder1', name: "decoder v4", width: 800, height: 600 },
    init: function () {
        dxCode.worker.beforeLoop(this.options1, this.options2)
    },
    loop: function () {
        dxCode.worker.loop()
    }
}
function run() {
    code.init()
    std.setInterval(() => {
        try {
           code.loop()
        } catch (error) {
            log.error(error)
        }
    }, 5)
}

try {
    run()
} catch (error) {
    log.error(error)
}
