import log from '../../dxmodules/dxLogger.js'
import dxMap from '../../dxmodules/dxMap.js'
import common from '../../dxmodules/dxCommon.js'
import bus from '../../dxmodules/dxEventBus.js'
import driver from '../driver.js'
import utils from '../common/utils/utils.js'
import config from '../../dxmodules/dxConfig.js'
const uartBleService = {}

// 写死的密钥
let BLE_KEY = [0x01, 0x23, 0x45, 0x67, 0x89, 0x01, 0x23, 0x45, 0x67, 0x89, 0x01, 0x23, 0x45, 0x67, 0x89, 0x01]

// 保存连接记录
let map = dxMap.get("uartBleService")
// 3个连接
map.put("auth", [
    {
        random: [0],
        randomLen: 0,
        index: 0xff,
    },
    {
        random: [0],
        randomLen: 0,
        index: 0xff,
    },
    {
        random: [0],
        randomLen: 0,
        index: 0xff,
    },
])

uartBleService.receiveMsg = function (data) {
    log.info('[uartBleService] receiveMsg :' + JSON.stringify(data))
    this["cmd" + data.cmd](data)
}

//处理上报数据
uartBleService.handleBle = function (msg) {
    log.info('[uartBleService] handleBle:' + msg)
    // 处理编码格式
    let encodedMsg = msg;
    switch (config.get('sysInfo.blft')) {
        case 1:
            // char(数字字符)转hex
            encodedMsg = /^\d+(\.\d+)?$/.test(msg) ? utils.decimalToLittleEndian(parseInt(msg)) : '00'
            break;
        case 2:
            // char(数字字符)转hex反序
            encodedMsg = /^\d+(\.\d+)?$/.test(msg) ? utils.decimalToLittleEndian(parseInt(msg)).match(/.{1,2}/g).reverse().join('') : '00'
            break;
        case 4:
            if (!isHexadecimal(msg) && msg.length % 2 === 0) {
                return
            }
            encodedMsg = msg
            break;
        case 8:
            if (!isHexadecimal(msg) && msg.length % 2 != 0) {
                return
            }
            // char(16进制字符)转hex反序
            encodedMsg = msg.match(/.{1,2}/g).reverse().join('')
            break;
        default:
            // 原始消息不动
            encodedMsg = common.stringToHex(msg)
            break
    }
    let prefix = config.get('sysInfo.blpri')
    let postfix = config.get('sysInfo.blpos')
    //增加前后缀
    if (config.get('sysInfo.blhorc') == 2) {
        //前后缀转 16 进制转化为16进制
        if (isHexadecimal(prefix) && prefix.length % 2 === 0) {
            encodedMsg = (/\s/.test(prefix) ? '' : prefix) + encodedMsg
        }
        if (isHexadecimal(postfix) && postfix.length % 2 === 0) {

            encodedMsg += (/\s/.test(postfix) ? '' : postfix)
        }
    } else if (config.get('sysInfo.blhorc') == 1) {
        //字符形式
        encodedMsg = common.stringToHex(prefix) + encodedMsg
        encodedMsg += common.stringToHex(postfix)
    }
    //增加回车空格
    if (config.get('sysInfo.blnl') == 1) {
        //添加回车
        encodedMsg += "0d";
    }
    if (config.get('sysInfo.blcr') == 1) {
        //添加换行
        encodedMsg += "0a";
    }
    if ((config.get('sysInfo.ascan') & 1) == 1) {
        driver.pwm.beep(config.get('sysInfo.beepd'), null, 1)
    }
    log.info('最终蓝牙输出数据为', encodedMsg);
    driver.passage.beforeReport({ source: 'ble', data: encodedMsg })
}

/**
 * 蓝牙回复
 * @param {*} pack eg:{"cmd":"60","length":8,"bcc":false,"data":"7e00000102030005"}
 * @returns 
 */
uartBleService.cmd60 = function (pack) {
    log.info('[uartBleService] cmd60:' + JSON.stringify(pack))
    let res = {}
    let data = pack.data.match(/.{2}/g)
    if (data.slice(-1)[0] != 'fe') {
        log.info("other ble info data")
        return
    }
    data = data.slice(3, -1)
    let t = data[0]
    let l = data[1]
    let v = data.slice(2)
    if (t == '02') {
        if (v.length !== parseInt(l, 16)) {
            log.error("ble info data err")
            return
        }
        t = v[0]
        l = v[1]
        let bleName = ""
        if (l !== "00") {
            let v1 = v.slice(2, 2 + parseInt(l, 16))
            if (t !== '01') {
                log.error("ble info data err")
                return
            }
            bleName = common.hexToString(v1.join(''))
        }
        log.info("ble_name:" + bleName)
        if (bleName) {
            res.name = bleName
        }
        v = v.slice(2 + parseInt(l, 16))

        t = v[0]
        l = v[1]
        let v2 = v.slice(2)
        if (t !== '02') {
            log.error("ble info data err")
            return
        }
        let bleMac = v2.join('')
        log.info("ble_mac:" + bleMac)
        if (bleMac) {
            res.mac = bleMac
        }
        // 查询回复
        driver.sync.response("uartBle.getConfig", res)
    } else if (t == '01') {
        // 修改回复
    } else {
        log.error("ble info data err")
        return
    }
}

/**
 * 回复随机数
 * @param {*} pack
 */
uartBleService.cmd07 = function (pack) {
    log.info('[uartBleService] cmd07:' + JSON.stringify(pack))
    let data = pack.data.match(/.{2}/g).map(v => parseInt(v, 16))
    let index = data[pack.length - 1]
    // 记录连接标识
    log.info("index:" + index);
    let curr = 0
    let auth = map.get("auth")
    for (let i = 0; i < 3; i++) {
        if (auth[i].index == 0xff) {
            curr = i
            break;
        }
    }
    if (pack.length == 1 || data[0] == 0x10) {
        log.info("random 16 byte");
        auth[curr].random = getUrandom(16)
        auth[curr].randomLen = 16
    } else if (pack.length == 2 && data[0] == 0x20) {
        log.info("random 32 byte");
        auth[curr].random = getUrandom(32)
        auth[curr].randomLen = 32
    } else {
        log.info("invalid pack");
        return
    }
    auth[curr].index = index
    map.put("auth", auth)
    log.info("random:" + auth[curr].random);

    let content = auth[curr].random + index.toString(16).padStart(2, '0');
    let packCrc = { "head": "55aa", "cmd": "07", "result": "00", "dlen": auth[curr].randomLen + 1, "data": content.match(/.{2}/g).map(v => parseInt(v, 16)) }
    let sendData = "55aa0700" + common.decimalToLittleEndianHex(auth[curr].randomLen + 1, 2) + content + driver.uartBle.genCrc(packCrc)
    driver.uartBle.sendVg(sendData)
}

/**
 * 回复外部授权
 * @param {*} pack 
 */
uartBleService.cmd08 = function (pack) {
    log.info('[uartBleService] cmd08:' + JSON.stringify(pack))
    let data = pack.data.match(/.{2}/g).map(v => parseInt(v, 16))
    let index = data[pack.length - 1]
    log.info("index:" + index);
    let curr = -1
    let result = "90"
    let auth = map.get("auth")
    for (let i = 0; i < 3; i++) {
        // 查询指定的连接
        if (auth[i].index == index) {
            curr = i
            break;
        }
    }
    if (curr === -1) {
        log.info("extern auth failed");
        result = "90"
    } else {
        // aes解密
        let key = BLE_KEY
        let cipher = data.slice(1, -1)
        let plain = common.aes128EcbDecrypt(cipher, key)
        if (plain.map((byte) => byte.toString(16).padStart(2, '0'))
            .join('') !== auth[curr].random) {
            log.info("extern auth failed");
            log.info("aes key: " + key);
            log.info("aes in: " + cipher);
            log.info("aes out: " + plain);
            result = "90"
        } else {
            auth[curr].index = 0xff;
            result = "00"
        }
    }
    map.put("auth", auth)
    let packCrc = { "head": "55aa", "cmd": "08", "result": result, "dlen": 1, "data": index }
    let sendData = "55aa08" + result + "0100" + index.toString(16).padStart(2, '0') + driver.uartBle.genCrc(packCrc)
    driver.uartBle.sendVg(sendData)
}

/**
 * 回复开门
 * @param {*} pack 
 */
uartBleService.cmd0f = function (pack) {
    log.info('[uartBleService] cmd0f:' + JSON.stringify(pack))
    let data = pack.data.match(/.{2}/g).map(v => parseInt(v, 16))
    let index = data[pack.length - 1]
    let packCrc
    log.info("index:" + index);
    if (pack.length >= 4) {
        let userData = data.slice(5, -1).map((byte) => byte.toString(16).padStart(2, '0')).join('')
        userData = common.hexToString(userData)
        // 用户数据
        log.info("用户数据: ", userData)
        this.handleBle(userData)
        // 直接回复成功
        let replyPack = { "head": "55aa", "cmd": "0f", "result": "00", "dlen": 1, "data": index }
        driver.uartBle.sendVg("55aa0f000100" + index + driver.uartBle.genCrc(replyPack))
        return
    }
    packCrc = { "head": "55aa", "cmd": "0f", "result": "90", "dlen": 1, "data": index }
    let sendData = "55aa08" + packCrc.result + "0100" + index.toString(16).padStart(2, '0') + driver.uartBle.genCrc(packCrc)
    driver.uartBle.sendVg(sendData)
}

/**
 * 设置蓝牙配置信息
 * @param {*} param param.name蓝牙名称 param.mac蓝牙mac
 * @returns 
 */
uartBleService.setBleConfig = function (param) {
    if (!param) {
        return
    }
    if (!param.name && !param.mac) {
        return
    }
    let nameTlv = ""
    let macTlv = ""

    let name = param.name
    if (name !== undefined) {
        if (name && /^[a-zA-Z0-9_]{1,10}$/.test(name) && name.length <= 10) {
            nameTlv = "10" + common.decimalToLittleEndianHex(name.length, 1) + common.stringToHex(name)
        } else {
            log.error("蓝牙名称不能为中文且长度不能超过10个字符");
            return 
        }
    }

    // 内部方法，mac校验
    let VBAR_M_BLE_MACLEN = 6
    function bleMacIsValid(mac) {
        if (mac.length != VBAR_M_BLE_MACLEN) {
            return false;
        }
        if (!mac.some(v => v !== "00") || mac[VBAR_M_BLE_MACLEN - 1] & 0xc0 !== 0xc0) {
            return false;
        }
        return true;
    }

    let mac = param.mac
    if (mac !== undefined) {
        if (mac && /^[0-9|a-f|A-F]{12}$/.test(mac) && bleMacIsValid(mac.match(/.{2}/g))) {
            macTlv = "11" + "06" + mac
        } else {
            log.error("蓝牙mac地址格式错误");
            return
        }
    }

    let content = "7a00" + nameTlv + macTlv + "fe"
    let pack = { "head": "55aa", "cmd": "60", "result": "00", "dlen": content.length / 2, "data": content.match(/.{2}/g).map(v => parseInt(v, 16)) }
    let sendData = "55aa6000" + common.decimalToLittleEndianHex(pack.dlen, 2) + content + driver.uartBle.genCrc(pack)
    driver.uartBle.sendVg(sendData)
}

// 获取随机数
function getUrandom(len) {
    return common.systemWithRes(`dd if=/dev/urandom bs=1 count="${len}" 2>/dev/null | xxd -p`, 100).split(/\s/g)[0]
}

//判断是否是 16 进制字符串不是跳过
function isHexadecimal(str) {
    // 使用正则表达式匹配十六进制字符串的格式，即由0-9、a-f、A-F组成的字符串
    const hexRegex = /^[0-9a-fA-F]+$/;
    return hexRegex.test(str);
}

export default uartBleService
