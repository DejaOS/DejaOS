import common from '../../dxmodules/dxCommon.js'
import log from '../../dxmodules/dxLogger.js'
import config from '../../dxmodules/dxConfig.js'
import driver from '../driver.js'
import safeService from '../service/safeService.js'
const nfcService = {}
nfcService.receiveMsg = function (data) {
    log.info('[nfcService] receiveMsg:' + JSON.stringify(data))

    let cardId = data.id
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
function isHexadecimal(str) {
    // 使用正则表达式匹配十六进制字符串的格式，即由0-9、a-f、A-F组成的字符串
    const hexRegex = /^[0-9a-fA-F]+$/;
    return hexRegex.test(str);
}

//4直接卡号处理方法
function fourHandle(cardNumber, start, length) {
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
