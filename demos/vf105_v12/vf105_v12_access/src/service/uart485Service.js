import bus from "../../dxmodules/dxEventBus.js"
import common from "../../dxmodules/dxCommon.js"
import log from "../../dxmodules/dxLogger.js"
import std from '../../dxmodules/dxStd.js'
import driver from '../driver.js'
import utils from '../common/utils/utils.js'
import dxMap from '../../dxmodules/dxMap.js'
import config from '../../dxmodules/dxConfig.js'
const uart485Service = {}


function decimalToLittleEndianHex (decimalNumber, byteSize) {
  const littleEndianBytes = [];
  for (let i = 0; i < byteSize; i++) {
    littleEndianBytes.push(decimalNumber & 0xFF);
    decimalNumber >>= 8; // Equivalent to dividing by 256
  }
  const littleEndianHex = littleEndianBytes
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
  return littleEndianHex;
}
function pack2str (pack) {
  pack.data = (!pack.data) ? [] : pack.data.match(/.{2}/g)
  let len = decimalToLittleEndianHex(pack.data.length, 2)
  let str = "55aa" + pack.cmd + pack.result + len + pack.data.join('')
  let crc = common.calculateBcc([0x55, 0xaa, parseInt(pack.cmd, 16), parseInt(pack.result, 16), pack.data.length % 256, pack.data.length / 256].concat(pack.data.map(v => parseInt(v, 16))))
  return str + crc.toString(16).padStart(2, '0')
}

uart485Service.receive = function (data, type) {
  log.info("code:",JSON.stringify(data))
  if (type == 'code') {
    if(data.cmd == "30") {
      if(data.length > 0) {
        let code = common.hexToString(data.data)
        const now = new Date().getTime()
        let map = dxMap.get("CODETIME")
        let time = map.get("time") || 0
        let interval = Math.max(1000, config.get("sys.interval"))
        if(now -  time > interval) {
          bus.fire("getCode", code)
          map.put("time", new Date().getTime())
        }
      }
    }
  }
  if (type == 'instruction') {
    if (data.cmd == "0a") {
      // Get device SN
      if (data.length > 0) {
        console.log('---0A write--');
        
        let newSn = common.hexToString(data.data)
        // Modify SN number to passed parameter
        try {
          let wgetApp = common.systemWithRes(`test -e "/etc/.sn" && echo "OK" || echo "NO"`, 2)
          if (!wgetApp.includes('OK')) {
            // Create if not exists
            common.systemBrief("touch /etc/.sn")
          }
          std.saveFile('/etc/.sn', newSn)
          common.systemWithRes(`rm -rf /app/data/config/config.json`, 2)
        } catch (error) {
          log.info('0A write sn failure reason:', error.stack)
          let pack1 = { "cmd": '0A', "result": '90', 'data': '' }
          driver.uart485.sendVg(pack2str(pack1))
          return
        }
        // Return to serial port
        let pack1 = { "cmd": '0A', "result": '00', 'data': common.stringToHex(newSn) }
        driver.uart485.sendVg(pack2str(pack1))
        common.asyncReboot(2)
      } else {
        log.info('-----0A query-----', common.getSn());
        let pack1 = { "cmd": '0A', "result": '00', "data": common.stringToHex(common.getSn()) }
        // log.info(pack2str(pack1));
        driver.uart485.sendVg(pack2str(pack1))
      }
    } else if (data.cmd == "b0") {
        log.info("----b0---")
      // Query/modify device configuration
      let str = data.data
      if (!str) {
        return
      }
      // First byte of data field indicates modify or query   00 query 01 modify	
      if (parseInt(str.substring(0, 2)) == 0) {
        // Query configuration
        let pack1 = { "cmd": 'B0', "result": '00', "data": common.stringToHex(common.getSn()) }
        driver.uart485.sendVg(pack2str(pack1))
      } else {
        // Modify configuration
        if (data.dlen <= 1) {
          return
        }
        // ___VBAR_CONFIG_V1.1.0___{ble_name="11127S"}--lLqHBRnE2bU8D2HJ5RTioQ==
        let toString = common.hexToString(str.substring(2))
        let content = parseString(toString)
        if (content.sn) {
          // Modify SN number to passed parameter
          try {
            let wgetApp = common.systemWithRes(`test -e "/etc/.sn" && echo "OK" || echo "NO"`, 2)
            if (!wgetApp.includes('OK')) {
              // Create if not exists
              common.systemBrief("touch /etc/.sn")
            }
            std.saveFile('/etc/.sn', content.sn)
            common.systemWithRes(`rm -rf /app/data/config/config.json`, 2)
          } catch (error) {
            log.info('Write /etc/.sn file failed, reason:', error.stack)
            let pack1 = { "cmd": 'B0', "result": '90', "data": common.stringToHex(common.getSn()) }
            driver.uart485.sendVg(pack2str(pack1))
            return
          }
          // Return to serial port
          let pack1 = { "cmd": 'B0', "result": '00', "data": common.stringToHex(content.sn) }
          driver.uart485.sendVg(pack2str(pack1))
          common.asyncReboot(2)
        }

      }
    } else if (data.cmd == "0c") {
        log.info("----0c--")
      // Get master control chipID
      let pack = { "cmd": '0C', "result": '00', "data": common.stringToHex(common.getUuid()) }
      driver.uart485.sendVg(pack2str(pack))
    } 
  }
}
/**
 * Parse string to JSON, note that value cannot contain " character
 * @param {string} inputString 
 * @returns 
 */
utils.parseString = function (inputString) {
    // Get {} and content between them
    inputString = inputString.slice(inputString.indexOf("{"), inputString.lastIndexOf("}") + 1)
    // key=value regex, key is \w+ (letters, numbers, underscores, case-sensitive), spaces allowed on both sides of =, value is \w+ or content between two adjacent " (including ")
    const keyValueRegex = /(\w+)\s*=\s*("[^"]*"|\w+)/g;
    let jsonObject = {};
    let match;
    while ((match = keyValueRegex.exec(inputString)) !== null) {
        let key = match[1];
        let value = match[2]

        if (/^\d+$/.test(value)) {
            // Number
            value = parseInt(value)
        } else if (/^\d+\.\d+$/.test(value)) {
            // Decimal
            value = parseFloat(value)
        } else if (value == 'true') {
            value = true
        } else if (value == 'false') {
            value = false
        } else {
            // String
            value = value.replace(/"/g, '').trim()
        }
        jsonObject[key] = value;
    }
    return jsonObject;
}
export default uart485Service
