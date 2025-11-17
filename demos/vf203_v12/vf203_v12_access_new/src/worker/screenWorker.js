import log from '../../dxmodules/dxLogger.js'
import std from '../../dxmodules/dxStd.js'
import screen from '../screen.js'
try{
    log.info("screenworker.init")
    screen.init()
} catch (error) {
    log.error(error)
}
std.setInterval(() => {
    try {
        screen.loop()
    } catch (error) {
        log.error(error)
    }
}, 15)