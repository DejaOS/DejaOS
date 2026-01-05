import face from '../dxmodules/dxFacial.js'
import log from '../dxmodules/dxLogger.js'
import std from '../dxmodules/dxStd.js'
try {
    face.init()
} catch (error) {
    log.error(error)
}
std.setInterval(() => {
    try {
        face.loop()
    } catch (error) {
        log.error(error)
    }
}, 20)