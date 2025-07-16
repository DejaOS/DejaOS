import log from '../dxmodules/dxLogger.js'
import driver from './driver.js'
import std from '../dxmodules/dxStd.js'
import codehandler from './codehandler.js'
const worker = 'service'
function run() {
    driver.initService()
    driver.code.on(function (data) { codehandler.invoke(data) })
    log.info('service start............')
    std.setInterval(() => {
        try {
            driver.loop()
            driver.code.loop()
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