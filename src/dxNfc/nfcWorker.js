//build:20240524
//用于简化nfc组件微光通信协议的使用，把nfc封装在这个worker里，使用者只需要订阅eventcenter的事件就可以监听nfc
import log from './dxLogger.js'
import nfc from './dxNfc.js'
import dxMap from './dxMap.js'
import std from './dxStd.js'
import * as os from "os";
const map = dxMap.get('default')
const options = map.get("__nfc__run_init")

function run() {
    nfc.worker.beforeLoop(options)
    log.info('nfc start......')
    std.setInterval(() => {
        try {
            nfc.worker.loop(options)
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