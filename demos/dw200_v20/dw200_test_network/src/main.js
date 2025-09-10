import std from "../dxmodules/dxStd.js";

import bus from '../dxmodules/dxEventBus.js'

bus.newWorker('networker', '/app/code/src/networker.js')//Try cross-thread network processing, not required
bus.newWorker('uiworker', '/app/code/src/uiworker.js')
let timer = std.setInterval(() => {
    
}, 1000) 