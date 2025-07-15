import logger from '../dxmodules/dxLogger.js'
import code from '../dxmodules/dxCode.js'
import center from '../dxmodules/dxEventBus.js'
import common from '../dxmodules/dxCommon.js'
import std from '../dxmodules/dxStd.js'
import ota from '../dxmodules/dxOta.js'

logger.info("before update...")
center.newWorker('code', '/app/code/src/codeservice.js')
center.on(code.RECEIVE_MSG, function (data) {
    let str = common.utf8HexToStr(common.arrayBufferToHexString(data))
    logger.info(str)
    str = JSON.parse(str)
    ota.updateHttp(str.url,str.md5)
    ota.reboot()
})

std.setInterval(() => {

}, 5)


