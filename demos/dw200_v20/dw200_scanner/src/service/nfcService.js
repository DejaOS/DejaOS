import common from '../../dxmodules/dxCommon.js'
import log from '../../dxmodules/dxLogger.js'
import config from '../../dxmodules/dxConfig.js'
import CryptoES from '../../dxmodules/crypto-es/index.js';
import driver from '../driver.js'
import safeService from '../service/safeService.js'
const nfcService = {}
nfcService.receiveMsg = function (data) {
    log.info('[nfcService] receiveMsg:' + JSON.stringify(data))
    let nfcType = config.get("sysInfo.nfcType")
    let cardId = ""
    if (nfcType == 1) {
        cardId = data.id
    } else {
        // 加密：固定扇区、一卡一密
        let sectorNumber = config.get('sysInfo.sectorNumber')
        let blockNumber = config.get('sysInfo.blockNumber')
        let secretkey = config.get('sysInfo.secretkey')
        let keyType = config.get('sysInfo.secretkeyType')
        if (nfcType == 3) {
            let md5 = CryptoES.MD5(`${data.id}${secretkey}`).toString(CryptoES.enc.Hex)
            let hmac = CryptoES.HmacMD5(md5, md5.slice(0, 16)).toString(CryptoES.enc.Hex)
            secretkey = `${hmac.slice(-6)}000000`
        }
        let secretkeyArr = secretkey.match(/.{1,2}/g).map(item => '0x' + item)
        let secretkeyType = keyType == 1 ? 0x60 : 0x61
        let cardArray = driver.nfc.m1cardReadSector(0, sectorNumber, blockNumber, 1, secretkeyArr, secretkeyType)
        if (cardArray) {
            let code = common.uint8ArrayToHexString(cardArray).substring(0, 8)
            if (nfcType == 2) {
                cardId = code
            } else {
                cardId = code == data.id ? code : ""
            }
        }
    }
    if (!cardId) {
        let tipMsg = config.get("sysInfo.language") == 1 ? "Card reading failed" : "读卡失败"
        driver.screen.customPopWin(tipMsg, 3000, undefined, false)
        driver.pwm.fail()
        return
    }
    //正反
    if (config.get("sysInfo.ord") == 1) {
        cardId = cardId.match(/.{2}/g).reverse().join('')
    }
    // 起始位，按字节算
    let st = config.get("sysInfo.st")
    // 输出长度，按字节算
    let len = config.get("sysInfo.len")
    if (cardId.length == 8) {
        //4直接卡号处理逻辑
        cardId = fourHandle(cardId, st, len)
    } else {
        //其他处理逻辑
        cardId = cardId.substring((st - 1) * 2, len * 2)
    }
    // 输出格式
    let nft = parseInt(config.get("sysInfo.nft"))
    if (nft == 0) {
        if (cardId.length % 2 != 0) {
            cardId = '0' + cardId
        }
    } else if (nft == 1) {
        cardId = common.stringToHex(cardId)
    } else if (nft == 2) {
        let parseIntCardId = BigInt('0x' + cardId).toString().padStart(10, '0')
        cardId = common.stringToHex(parseIntCardId)
    }
    // 前后缀
    let pri = config.get("sysInfo.pri")
    let pos = config.get("sysInfo.pos")
    if (config.get("sysInfo.horc") == 1) {
        if (!isHexadecimal(pri) || pri.length % 2 != 0) {
            pri = ""
        }
        if (!isHexadecimal(pos) || pos.length % 2 != 0) {
            pos = ""
        }
    } else {
        pri = common.stringToHex(pri)
        pos = common.stringToHex(pos)
    }

    cardId = pri + cardId
    cardId += pos

    if (config.get("sysInfo.nnl") == 1) {
        cardId += "0D"
    }
    if (config.get("sysInfo.ncr") == 1) {
        cardId += "0A"
    }
    cardId = cardId

    // 刷卡后动作
    let anfc = parseInt(config.get("sysInfo.anfc"))
    if (anfc & 1 == 1) {
        driver.pwm.beep(config.get('sysInfo.beepd'), null, 1)
    }
    log.info('最终刷卡输出数据为', cardId);
    let nfcReport = config.get("sysInfo.nfcReport")
    if (nfcReport === 0 && config.get('sysInfo.w_mode') == 2) {
        //关了上报直接结束
        return
    }
    // safeService.open()
    //safeService.openDoorByTime(100 * 50);
    driver.passage.beforeReport({ source: 'nfc', data: cardId })
}

//判断是否是 16 进制字符串不是跳过
function isHexadecimal (str) {
    // 使用正则表达式匹配十六进制字符串的格式，即由0-9、a-f、A-F组成的字符串
    const hexRegex = /^[0-9a-fA-F]+$/;
    return hexRegex.test(str);
}

//4直接卡号处理方法
function fourHandle (cardNumber, start, length) {
    start = start > 4 ? 4 : start
    length = length > 4 ? 4 : length
    let startChar = (start - 1) * 2; // 将字节起始位置转换为字符索引
    let lengthInChars = length * 2;  // 将字节长度转换为字符数

    // 特殊处理：起始位置 4 的规则，长度从 1 到 4 的特殊情况
    if (start === 4) {
        if (length === 1) {
            return cardNumber.substring(startChar, startChar + 2); // 长度 1 时直接取 "40"
        } else {
            // 从头开始循环输出
            startChar = 0; // 从头开始
            lengthInChars = length * 2; // 计算正确的字符数
        }
    }

    return cardNumber.substring(startChar, startChar + lengthInChars);
}
export default nfcService
