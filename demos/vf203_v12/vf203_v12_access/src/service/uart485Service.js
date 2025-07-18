import bus from "../../dxmodules/dxEventBus.js"
import common from "../../dxmodules/dxCommon.js"
import log from "../../dxmodules/dxLogger.js"
import std from '../../dxmodules/dxStd.js'
import driver from '../driver.js'
import utils from '../common/utils/utils.js'
const uart485Service = {}


function decimalToLittleEndianHex (decimalNumber, byteSize) {
  const littleEndianBytes = [];
  for (let i = 0; i < byteSize; i++) {
    littleEndianBytes.push(decimalNumber & 0xFF);
    decimalNumber >>= 8;//相当于除以256
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
    if (data.cmd == "0a") {
      // 获取设备SN
      if (data.length > 0) {
        let newSn = common.hexToString(data.data)
        //修改 sn 号改成传入参数
        try {
          let wgetApp = common.systemWithRes(`test -e "/etc/.sn" && echo "OK" || echo "NO"`, 2)
          if (!wgetApp.includes('OK')) {
            //没有创建一下
            common.systemBrief("touch /etc/.sn")
          }
          std.saveFile('/etc/.sn', newSn)
          common.systemWithRes(`rm -rf /app/data/config/config.json`, 2)
        } catch (error) {
          log.info('0A写入 sn 失败原因:', error.stack)
          let pack1 = { "cmd": '0A', "result": '90', 'data': '' }
          driver.uart485.sendVg(pack2str(pack1))
          return
        }
        //返回串口
        let pack1 = { "cmd": '0A', "result": '00', 'data': common.stringToHex(newSn) }
        driver.uart485.sendVg(pack2str(pack1))
        common.asyncReboot(2)
      } else {
        let pack1 = { "cmd": '0A', "result": '00', "data": common.stringToHex(common.getSn()) }
        driver.uart485.sendVg(pack2str(pack1))
      }
    } else if (data.cmd == "b0") {
      // 查询/修改设备配置
      let str = data.data
      if (!str) {
        return
      }
      //数据域第一个字节表示修改还是查询   00 查询 01 修改	
      if (parseInt(str.substring(0, 2)) == 0) {
        //查询配置
        let pack1 = { "cmd": 'B0', "result": '00', "data": common.stringToHex(common.getSn()) }
        driver.uart485.sendVg(pack2str(pack1))
      } else {
        //修改配置
        if (data.dlen <= 1) {
          return
        }
        // ___VBAR_CONFIG_V1.1.0___{ble_name="11127S"}--lLqHBRnE2bU8D2HJ5RTioQ==
        let toString = common.hexToString(str.substring(2))
        let content = parseString(toString)
        if (content.sn) {
          //修改 sn 号改成传入参数
          try {
            let wgetApp = common.systemWithRes(`test -e "/etc/.sn" && echo "OK" || echo "NO"`, 2)
            if (!wgetApp.includes('OK')) {
              //没有创建一下
              common.systemBrief("touch /etc/.sn")
            }
            std.saveFile('/etc/.sn', content.sn)
            common.systemWithRes(`rm -rf /app/data/config/config.json`, 2)
          } catch (error) {
            log.info('写入/etc/.sn文件失败,原因:', error.stack)
            let pack1 = { "cmd": 'B0', "result": '90', "data": common.stringToHex(common.getSn()) }
            driver.uart485.sendVg(pack2str(pack1))
            return
          }
          //返回串口
          let pack1 = { "cmd": 'B0', "result": '00', "data": common.stringToHex(content.sn) }
          driver.uart485.sendVg(pack2str(pack1))
          common.asyncReboot(2)
        }

      }
    } else if (data.cmd == "0c") {
      // 获取主控chipID
      let pack = { "cmd": '0C', "result": '00', "data": common.stringToHex(common.getUuid()) }
      driver.uart485.sendVg(pack2str(pack))
    } 
}
/**
 * 解析字符串改为 json，注意value内不能有"号
 * @param {string} inputString 
 * @returns 
 */
utils.parseString = function (inputString) {
    // 获取{}及其之间的内容
    inputString = inputString.slice(inputString.indexOf("{"), inputString.lastIndexOf("}") + 1)
    // key=value正则，key是\w+（字母数字下划线，区别大小写），=两边可有空格，value是\w+或相邻两个"之间的内容（包含"）
    const keyValueRegex = /(\w+)\s*=\s*("[^"]*"|\w+)/g;
    let jsonObject = {};
    let match;
    while ((match = keyValueRegex.exec(inputString)) !== null) {
        let key = match[1];
        let value = match[2]

        if (/^\d+$/.test(value)) {
            // 数字
            value = parseInt(value)
        } else if (/^\d+\.\d+$/.test(value)) {
            // 小数
            value = parseFloat(value)
        } else if (value == 'true') {
            value = true
        } else if (value == 'false') {
            value = false
        } else {
            // 字符串
            value = value.replace(/"/g, '').trim()
        }
        jsonObject[key] = value;
    }
    return jsonObject;
}
export default uart485Service
