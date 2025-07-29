//build:20240524
//用于简化capturer组件的使用，把capturer封装在这个worker里，使用者只需要订阅eventbus的事件就可以监听capturer
import log from './dxLogger.js'
import capturer from './dxCapturer.js'
import dxMap from './dxMap.js'
import std from './dxStd.js'
const map = dxMap.get('default')
const id = "{{id}}"
const options = map.get("__capturer__run_init" + id)

function run() {
    capturer.worker.beforeLoop(options)
    log.info('capturer start......,id =', options.id)
    std.setInterval (function() {
        try {
            capturer.worker.loop(options)
        } catch (error) {
            log.error(error)
        }
    },10)
}

try {
    run()
} catch (error) {
    log.error(error)
}