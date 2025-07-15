import log from '../../dxmodules/dxLogger.js'
import accessService from '../service/accessService.js'
import config from '../../dxmodules/dxConfig.js'
import driver from '../driver.js';
import common from '../../dxmodules/dxCommon.js'
import CryptoES from '../../dxmodules/crypto-es/index.js';
import bus from '../../dxmodules/dxEventBus.js'
const nfcService = {}

nfcService.receiveMsg = function (data) {
    log.info('[nfcService] receiveMsg :' + JSON.stringify(data))
    let nfcType = config.get("nfcInfo.nfcType")
    let language = config.get("sysInfo.language")
    // 首先判断是否是身份证卡
    if (data.card_type && data.id) {
        // 身份证物理卡号/普通卡
        if (nfcType == 1) { 
            accessService.access({ type: 200, code: data.id })
        } else {
            // 加密：固定扇区、一卡一密
            let sectorNumber = config.get('nfcInfo.sectorNumber')
            let blockNumber = config.get('nfcInfo.blockNumber')
            let secretkey = config.get('nfcInfo.secretkey')
            let keyType = config.get('nfcInfo.secretkeyType')
            if(nfcType == 3) {
                let md5 = CryptoES.MD5(`${data.id}${secretkey}`).toString(CryptoES.enc.Hex)
                let hmac = CryptoES.HmacMD5(md5, md5.slice(0,16)).toString(CryptoES.enc.Hex)
                secretkey = `${hmac.slice(-6)}000000`
            }
            let secretkeyArr = secretkey.match(/.{1,2}/g).map(item => '0x' + item)
            let secretkeyType = keyType == 1 ? 0x60 : 0x61
            let cardArray = driver.nfc.m1cardReadSector(0, sectorNumber, blockNumber, 1, secretkeyArr, secretkeyType)
            if (cardArray) {
                let code = common.uint8ArrayToHexString(cardArray).substring(0, 8)
                if(nfcType == 2) {
                    accessService.access({ type: 200, code })
                } else {
                    if(code == data.id) {
                        accessService.access({ type: 200, code })
                    } else {
                        driver.screen.customPopWin(language == 1 ? "Card reading failed" : "读卡失败" , 3000)
                        driver.pwm.fail()
                    }
                }
            } else {
                driver.screen.customPopWin(language == 1 ? "Card reading failed" : "读卡失败" , 3000)
                driver.pwm.fail()
            }
        }
    } else if (data.name && data.sex && data.idCardNo) {
        // 云证
        accessService.access({ type: 203, code: data.idCardNo });
    } else {
        driver.screen.customPopWin(language == 1 ? "Card reading failed" : "读卡失败" , 3000)
        driver.pwm.fail()
    }
}
export default nfcService
