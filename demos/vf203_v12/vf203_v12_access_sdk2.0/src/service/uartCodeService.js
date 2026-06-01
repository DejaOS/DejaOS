import log from '../../dxmodules/dxLogger.js'
import dxMap from '../../dxmodules/dxMap.js'
import dxCommonUtils from '../../dxmodules/dxCommonUtils.js'
import bus from '../../dxmodules/dxEventBus.js'
import config from '../../dxmodules/dxConfig.js'
const uartCodeService = {}

uartCodeService.receiveMsg = function (data) {
  log.info('[uartBleService] cmdcode :' + JSON.stringify(data))
  if (data.cmd == "30") {
    if (data.length > 0) {
      let code = dxCommonUtils.codec.utf8HexToStr(dxCommonUtils.codec.uint8ArrayToHex(data.data))
      let map = dxMap.get("SCAN")
      let time = map.get("time") || 0
      let interval = config.get("sys.scanInterval") * 1000 || 1000
      if (new Date().getTime() - time > interval) {
        bus.fire("code", code)
        map.put("time", new Date().getTime())
      }
    }
  }
}

export default uartCodeService