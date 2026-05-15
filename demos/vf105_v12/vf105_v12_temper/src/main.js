import log from '../dxmodules/dxLogger.js'
import std from '../dxmodules/dxStd.js'
import bus from '../dxmodules/dxEventBus.js'

function init(){
    bus.newWorker('screen', '/app/code/src/worker_test/uiworker.js')
    bus.newWorker('face', '/app/code/src/worker_test/faceworker.js')
}
try{
    init()
}catch(error){
    log.error(error)
}