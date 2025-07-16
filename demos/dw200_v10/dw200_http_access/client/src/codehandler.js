//Scan result processing
import logger from '../dxmodules/dxLogger.js'
import driver from './driver.js'
import common from '../dxmodules/dxCommon.js'
import std from '../dxmodules/dxStd.js'
import httphandler from './httphandler.js'
const vg = {}
vg.invoke = function (pack) {
    let data = Array.from(new Uint8Array(pack))
    if (!data || data.length < 0) {
        return
    }
    data = common.arrToHex(data)
    driver.pwm.press()
    logger.info('code: ', data)
    httphandler.send('code', data)
}
export default vg