import log from './dxLogger.js'
import dxMap from './dxMap.js'
import { keyvaluedbClass } from './libvbar-m-dxkeyvaluedb.so'
import bus from './dxEventBus.js'

const map = dxMap.get('default')
const options = map.get("__kvdb__run_init")
const db = new keyvaluedbClass();

const SET_EVENT = '__kvdb.set'
const DEL_EVENT = '__kvdb.del'
function run() {
    log.info('kvdb worker start......')
    if (!options) {
        log.error('kvdb worker: options not found')
        return
    }
    db.init(options.path, options.size)
    bus.on(SET_EVENT, (data) => {
        try {
            db.set(data.key, data.value)
        } catch (error) {
            log.error(error)
        }
    })
    bus.on(DEL_EVENT, (data) => {
        try {
            db.del(data.key)
        } catch (error) {
            log.error(error)
        }
    })
}
try {
    run()
} catch (error) {
    log.error(error)
}
