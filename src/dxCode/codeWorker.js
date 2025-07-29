//build:20240304
//用于简化code组件的使用，把code封装在这个worker里，使用者只需要订阅eventcenter的事件就可以收到扫描后的内容
import log from './dxLogger.js'
import dxMap from './dxMap.js'
import * as os from "os";
import code from './dxCode.js'
import std from './dxStd.js'

const map = dxMap.get("default")
let options = map.get("__code__run_init")
let capturerOptions = options.capturer
let decoderOptions = options.decoder
function run() {
    code.worker.beforeLoop(capturerOptions, decoderOptions)
    log.info('code start......')
    std.setInterval(() => {
        try {
            code.worker.loop(options.mode, options.interval)
        } catch (error) {
            log.error(error)
        }
    }, 10)
}
try {
    run()
} catch (error) {
    log.error(error)
}