import log from '../dxmodules/dxLogger.js'
import std from '../dxmodules/dxStd.js'
import common from '../dxmodules/dxCommon.js'
import dxCode from '../dxmodules/dxCode.js'
import dxNet from '../dxmodules/dxNet.js'

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
let net={
    init:function(){
        dxNet.worker.beforeLoop({type:dxNet.TYPE.ETHERNET, dhcp:dxNet.DHCP.DYNAMIC,macaddr: common.getUuid2mac(),})
    },
    loop:function(){
        dxNet.worker.loop()
    }
}
function run() {
    code.init()
    net.init()
    std.setInterval(() => {
        try {
           code.loop()
           net.loop()
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
