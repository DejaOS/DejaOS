import log from '../../dxmodules/dxLogger.js'
import dxMap from '../../dxmodules/dxMap.js'
import common from '../../dxmodules/dxCommon.js'
import driver from '../driver.js'
import bus from '../../dxmodules/dxEventBus.js'
import accessService from './accessService.js'

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

let packageNumMap = dxMap.get("ble_packageNum")

uartBleService.receiveMsg = function (data) {
    log.info('[uartBleService] receiveMsg :' + JSON.stringify(data))
    this["cmd" + data.cmd](data)
}

/**
 * 蓝牙回复
 * @param {*} pack eg:{"cmd":"60","length":8,"bcc":false,"data":"7e00000102030005"}
 * @returns 
 */
uartBleService.cmd60 = function (pack) {
    log.info('[uartBleService] cmd60 :' + JSON.stringify(pack))
    if (CMDIsBleUpdate(pack)) {
        let data = common.hexToArr(pack.data)
        let step = parseInt(data[3], 16)
        if(packageNumMap.get("ble_packageNum")) {
            packageNumMap.put("ble_packageNum", packageNumMap.get("ble_packageNum") + 1)
        } else {
            packageNumMap.put("ble_packageNum", 1)
        }
        if(step == 3) {
            driver.sync.response(`uartBle.upgradeCmd${step}_${packageNumMap.get("ble_packageNum")}`, data)
        } else {
            driver.sync.response(`uartBle.upgradeCmd${step}`, data)
            packageNumMap.del("ble_packageNum")
        }
        return

    }
    let res = {}
    let data = pack.data.match(/.{2}/g)
    if (data.slice(-1)[0] != 'fe') {
        log.info("[uartBleService] cmd60: other ble info data")
        return
    }
    data = data.slice(3, -1)
    let t = data[0]
    let l = data[1]
    let v = data.slice(2)
    if (t == '02') {
        if (v.length !== parseInt(l, 16)) {
            log.error("[uartBleService] cmd60: ble info data err")
            return
        }
        t = v[0]
        l = v[1]
        let bleName = ""
        if (l !== "00") {
            let v1 = v.slice(2, 2 + parseInt(l, 16))
            if (t !== '01') {
                log.error("[uartBleService] cmd60: ble info data err")
                return
            }
            bleName = common.hexToString(v1.join(''))
        }
        log.info("[uartBleService] cmd60: bleInfo.name:" + bleName)
        if (bleName) {
            res.name = bleName
        }
        v = v.slice(2 + parseInt(l, 16))


        t = v[0]
        l = v[1]
        let v2 = v.slice(2)
        if (t !== '02') {
            log.error("[uartBleService] cmd60: ble info data err")
            return
        }
        let bleMac = v2.join('')
        log.info("[uartBleService] cmd60: bleInfo.mac:" + bleMac)
        if (bleMac) {
            res.mac = bleMac
        }
        // 查询回复
        driver.uartBle.getConfigReply(res)
    } else if (t == '01') {
        // 修改回复
        driver.uartBle.setConfigReply(true)
    } else {
        log.error("[uartBleService] cmd60: ble info data err")
        return
    }
}

/**
 * 回复随机数
 * @param {*} pack
 */
uartBleService.cmd07 = function (pack) {
    log.info('[uartBleService] cmd07 :' + JSON.stringify(pack))
    let data = pack.data.match(/.{2}/g).map(v => parseInt(v, 16))
    let index = data[pack.length - 1]
    // 记录连接标识
    log.info("[uartBleService] cmd07: index " + index);
    let curr = 0
    let auth = map.get("auth")
    for (let i = 0; i < 3; i++) {
        if (auth[i].index == 0xff) {
            curr = i
            break;
        }
    }
    if (pack.length == 1 || data[0] == 0x10) {
        log.info("[uartBleService] cmd07: random 16 byte");
        auth[curr].random = getUrandom(16)
        auth[curr].randomLen = 16
    } else if (pack.length == 2 && data[0] == 0x20) {
        log.info("[uartBleService] cmd07: random 32 byte");
        auth[curr].random = getUrandom(32)
        auth[curr].randomLen = 32
    } else {
        log.info("[uartBleService] cmd07: invalid pack");
        return
    }
    auth[curr].index = index
    map.put("auth", auth)

    let content = auth[curr].random + index.toString(16).padStart(2, '0');
    let packCrc = { "head": "55aa", "cmd": "07", "result": "00", "dlen": auth[curr].randomLen + 1, "data": content.match(/.{2}/g).map(v => parseInt(v, 16)) }
    let sendData = "55aa0700" + common.decimalToLittleEndianHex(auth[curr].randomLen + 1, 2) + content + driver.uartBle.genCrc(packCrc)
    driver.uartBle.send(sendData)
}

/**
 * 回复外部授权
 * @param {*} pack 
 */
uartBleService.cmd08 = function (pack) {
    log.info('[uartBleService] cmd08 :' + JSON.stringify(pack))
    let data = pack.data.match(/.{2}/g).map(v => parseInt(v, 16))
    let index = data[pack.length - 1]
    log.info("[uartBleService] cmd08: index " + index);
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
        log.info("[uartBleService] cmd08: extern auth failed");
        result = "90"
    } else {
        // aes解密
        let key = BLE_KEY
        let cipher = data.slice(1, -1)
        let plain = common.aes128EcbDecrypt(cipher, key)
        if (plain.map((byte) => byte.toString(16).padStart(2, '0'))
            .join('') !== auth[curr].random) {
            log.info("[uartBleService] cmd08: extern auth failed");
            log.info("[uartBleService] cmd08: aes key: " + key);
            log.info("[uartBleService] cmd08: aes in: " + cipher);
            log.info("[uartBleService] cmd08: aes out: " + plain);
            result = "90"
        } else {
            auth[curr].index = 0xff;
            result = "00"
        }
    }
    map.put("auth", auth)
    let packCrc = { "head": "55aa", "cmd": "08", "result": result, "dlen": 1, "data": index }
    let sendData = "55aa08" + result + "0100" + index.toString(16).padStart(2, '0') + driver.uartBle.genCrc(packCrc)
    driver.uartBle.send(sendData)
}

/**
 * 回复开门
 * @param {*} pack 
 */
uartBleService.cmd0f = function (pack) {
    log.info('[uartBleService] cmd0f :' + JSON.stringify(pack))
    let data = pack.data.match(/.{2}/g).map(v => parseInt(v, 16))
    let index = data[pack.length - 1]
    let packCrc
    log.info("[uartBleService] cmd0f: index " + index);

    if(data[0] == 0x00 && data[1] == 0x00 && data[2] == 0x30 && data[3] == 0x06 && data[4] == 0x03 && data[5] == 0x00 && data[6] == 0x01 && data[7] == 0x01 && data[8] == 0x01){
        // 蓝牙设备远程开门
        accessService.access({ type: 600, code: null, index: index })
        return
    } else {
        let userId = data.slice(5, -1).map((byte) => byte.toString(16).padStart(2, '0')).join('')
        userId = common.hexToString(userId)
        // 用户id
        log.info("[uartBleService] cmd0f: 用户id ", userId)
        accessService.access({ type: 600, code: userId, index: index })
        return
    }
    packCrc = { "head": "55aa", "cmd": "0f", "result": "90", "dlen": 1, "data": index }
    let sendData = "55aa08" + packCrc.result + "0100" + index.toString(16).padStart(2, '0') + driver.uartBle.genCrc(packCrc)
    driver.uartBle.send(sendData)
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
        if (name && /^[0-9|a-z|A-Z]+$/.test(name) && name.length <= 10) {
            nameTlv = "10" + common.decimalToLittleEndianHex(name.length, 1) + common.stringToHex(name)
        } else {
            log.error("[uartBleService] setBleConfig: 蓝牙名称不能为中文且长度不能超过10个字符");
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
            log.error("[uartBleService] setBleConfig: 蓝牙mac地址格式错误");
            return
        }
    }

    let content = "7a00" + nameTlv + macTlv + "fe"
    let pack = { "head": "55aa", "cmd": "60", "result": "00", "dlen": content.length / 2, "data": content.match(/.{2}/g).map(v => parseInt(v, 16)) }
    let sendData = "55aa6000" + common.decimalToLittleEndianHex(pack.dlen, 2) + content + driver.uartBle.genCrc(pack)
    driver.uartBle.send(sendData)
}

function getUrandom(len) {
    return common.systemWithRes(`dd if=/dev/urandom bs=1 count="${len}" 2>/dev/null | xxd -p`, 100).split(/\s/g)[0]
}

/**
 * 过滤蓝牙升级的指令
 */
function CMDIsBleUpdate (pack) {
    let data = common.hexToArr(pack.data)
    if (data.length < 5) {
        return false
    } else if (data[0] == 0x03 && data[1] == 0x01 && data[2] == 0x80 && (data[3] == 0x01 || data[3] == 0x02 || data[3] == 0x03 || data[3] == 0x04 || data[3] == 0x05)) {
        return true
    } else {
        return false
    }
}

export default uartBleService
