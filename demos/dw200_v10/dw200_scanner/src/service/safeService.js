import driver from '../driver.js'
import log from '../../dxmodules/dxLogger.js'
import common from '../../dxmodules/dxCommon.js'
import CryptoES from '../../dxmodules/crypto-es/index.js';
import utils from '../common/utils/utils.js';
import config from '../../dxmodules/dxConfig.js'
const safeService = {}

/**
 * 安全模块开门指令
   认证流程： 
    上位机发送0x07指令，获取一段随机数(32字节)
    上位机将此随机数加密得到V
    上位机发送此指令，进行认证
    注：P1=0x01使用AES密钥区1      P1=0x11 使用AES密钥区2
    P1=0x02使用SM2密钥区1      P1=0x22 使用SM2密钥区2
    P1=0x04使用SM4密钥区1      P1=0x44 使用SM4密钥区2
 */
safeService.open = function () {
    let random = this.getRandomNumber();
    if (utils.isEmpty(random)) {
        return;
    }
    let type = config.get('sysInfo.safe_keytype');
    let secretType;
    let head = "55AA21";
    //加密
    switch (type) {
        case 1:
            log.info("安全模块AES加密")
            secretType = "01";
            let key = CryptoES.enc.Hex.parse(config.get('sysInfo.safe_key_pub'));
            let iv = CryptoES.enc.Hex.parse(config.get('sysInfo.safe_iv_pri'));
            let plaintext = CryptoES.enc.Hex.parse(random);
            let encrypted = CryptoES.AES.encrypt(plaintext, key, { iv: iv, mode: CryptoES.mode.CBC, padding: CryptoES.pad.Pkcs7 });
            let hexDate = "01" + encrypted.ciphertext.toString(CryptoES.enc.Hex);
            log.info("-------随机数加密结果---------" + hexDate)
            let hexLen = (hexDate.length / 2).toString(16).padStart(2, '0') + "00";
            let date = head + hexLen + hexDate;
            let bcc = common.calculateBcc(common.hexToArr(date)).toString(16)
            date = date + bcc;
            //发送开么指令
            log.info("--------date--------" + date)
            driver.uart485.sendVg(date)
            break;
        case 2:
            log.info("安全模块SM2加密")
            break;
        case 3:
            log.info("安全模块SM4加密")
            break;
        default:
            log.error("No such cmdType ")
            break;
    }


}

/**
 * 修改安全模块开关
 * @param {*} data 0关闭 1开启 2重置秘钥
 */
safeService.updateSafeOpen = function (data) {
    if (data === 2) {
        log.info("秘钥重置")
        config.setAndSave("sysInfo.safe_key_pub", "5de3dd7f5b725c7d27f36019a2ddd94f3866e0d383c93bd51780e938a2ddda4f");
        config.setAndSave("sysInfo.safe_iv_pri", "39fe007b83c92bd527f36019a2ddd94f5da3dd7f1780e93828e3601a1d8cb9f8");
        //同时开启安全模块
        config.setAndSave("sysInfo.safe_open", 1);
    } else {
        config.setAndSave("sysInfo.safe_open", data);
    }


}
safeService.updateConfig = function (key, value) {
    switch (key) {
        case "safe_key_pub":
            log.info("修改安全模块秘钥: " + value);
            this.updateSecretKey({ "aes_key": value, "iv": config.get("sysInfo.safe_iv_pri") });
            break;
        case "safe_iv_pri":
            log.info("修改安全模块 iv: " + value);
            this.updateSecretKey({ "aes_key": config.get("sysInfo.safe_key_pub"), "iv": value });
            break;
        case "safe_open":
            log.info("修改安全开关: " + value);
            this.updateSafeOpen(value);
            break;
        default:
            log.error("错误安全模块配置项");
            break;
    }
}


/**
 * 修改安全模块的继电器动作时间
 */
safeService.updateRelayd = function (time) {
    if (config.get('sysInfo.safe_open') === 1) {
        log.info("修改安全模块的继电器动作时间:" + time)
        time = decimalToHexLE(time / 50);
        if (utils.isEmpty(time)) {
            return;
        }
        let date = "55aa450100" + time
        let bcc = common.calculateBcc(common.hexToArr(date)).toString(16)
        date = date + bcc
        driver.uart485.sendVg(date)
        let result = driver.sync.request("updateRelayd", 2000)
        if (result === "00") {
            return true;
        }
        return false;
    }

}
/**
 * 开指定时长的继电器
 * @param {*} time 
 */
safeService.openDoorByTime = function (time) {
    //1.修改继电器时间
    let result = this.updateRelayd(time);
    if (result) {
        log.info("修改指定开门时间成功")
        //2.开门
        this.open()
    } else {
        log.error("修改指定开门时间失败");
    }
    let openDoorResult = driver.sync.request("openDoor", 2000)
    log.info("开门完成,结果：" + openDoorResult)
    //3.开门完成后恢复继电器动作时间
    this.updateRelayd(config.get("sysInfo.relayd"))

}


/**
 * 修改秘钥
 * 说明：
V的明文格式：密钥参数(TLV) + 随机数(TLV格式) + 补全数据(TLV) +  签名(sha256)
密钥参数TLV: T=0x01    L(1byte): V的字节数  
随机数TLV:   T=0x03    L= X(1 byte)     V: 向设备获取的随机数
补全数据(TLV): T=0x04    L= X(1 byte)    整个明文V的长度要是旧密钥长度的倍数。 此项不一定存在, 补全的数据是任意的
签名(sha256): P1 + V明(sha256域除外)

V的密文加密方式: 
1. 修改什么密钥，就用其旧密钥加密
密钥修改流程:
1. 向设备获取随机数
2. 按此指令格式计算密文, 然后发送给设备
 * @param {} date 
 */
safeService.updateSecretKey = function (date) {
    log.info("修改秘钥" + JSON.stringify(date))
    let random = this.getRandomNumber();
    if (utils.isEmpty(random)) {
        return;
    }
    let type = config.get('sysInfo.safe_keytype');
    let secretType;
    let head = "55AA0b";
    //加密
    switch (type) {
        case 1:
            log.info("安全模块AES加密")
            secretType = "01";
            //密钥参数:新秘钥aes_key + iv(aes_key的长度和iv的长度相等)
            let aesKeyType = "01";
            let aesKeyValue = date.aes_key + date.iv;
            log.info("------------aesKeyValue:" + aesKeyValue)
            let aesKeyLen = (aesKeyValue.length / 2).toString(16).padStart(2, '0');
            let aesKeyDate = aesKeyType + aesKeyLen + aesKeyValue
            log.info("新秘钥:" + aesKeyDate)
            //随机数
            //  random="e497f897e85d7053c871bdb633b5674dfa56f477edc23d42352b9300c0e6b898"
            let randomType = "03";
            let randomValue = random;
            let randomLen = (randomValue.length / 2).toString(16).padStart(2, '0');
            let randomDate = randomType + randomLen + randomValue
            log.info("随机数:" + randomDate)
            //补全数据:要保证密钥参数+随机数 是新秘钥的倍数
            let completionValue = checkDivisibility(aesKeyDate + randomDate, config.get("sysInfo.safe_key_pub"));
            log.info("completionValue:" + completionValue)
            // let completionDate = "041a0000000000000000000000000000000000000000000000000000";
            log.info("补充数据:" + completionValue)
            let value = aesKeyDate + randomDate + completionValue
            log.info("组合数据" + value)
            //对数据进行签名(sha256)
            const sha256Digest = CryptoES.SHA256(CryptoES.enc.Hex.parse(secretType + value)).toString(CryptoES.enc.Hex);
            log.info("签名" + sha256Digest)
            value = value + sha256Digest
            log.info("完整数据" + value)
            //整体进行AES加密---使用老秘钥
            let oldKey = CryptoES.enc.Hex.parse(config.get('sysInfo.safe_key_pub'));
            let oldIv = CryptoES.enc.Hex.parse(config.get('sysInfo.safe_iv_pri'));
            log.info("--------oldKey--------" + oldKey)
            log.info("--------oldIv--------" + oldIv)
            let plaintext = CryptoES.enc.Hex.parse(value);
            let encrypted = CryptoES.AES.encrypt(plaintext, oldKey, { iv: oldIv, mode: CryptoES.mode.CBC, padding: CryptoES.pad.NoPadding });
            let hexDate = encrypted.ciphertext.toString(CryptoES.enc.Hex);

            hexDate = "01" + hexDate;
            log.info("01+AES加密:" + hexDate)
            let len = (hexDate.length / 2).toString(16).padStart(2, '0') + "00"
            //组装发送的指令
            let keyDate = head + len + hexDate
            let bcc = common.calculateBcc(common.hexToArr(keyDate)).toString(16)
            keyDate = keyDate + bcc;
            //发送开么指令
            log.info("发送数据" + keyDate)
            driver.uart485.sendVg(keyDate)
            //等待结果
            let updateKeyResute = driver.sync.request("updateKey", 2000)
            //判断超时
            if (utils.isEmpty(updateKeyResute) || random == "") {
                log.error("设置秘钥超时")
                return;
            }
            log.info("updateKeyResute-----------------"+updateKeyResute)
            if (updateKeyResute == "00") {
                log.info("设置秘钥成功")
                //更新新秘钥
                config.setAndSave('sysInfo.safe_key_pub', date.aes_key);
                config.setAndSave('sysInfo.safe_iv_pri', date.iv);
            } else {
                log.error("设置秘钥失败")
                return;
            }

            break;
        case 2:
            log.info("安全模块SM2加密")
            break;
        case 3:
            log.info("安全模块SM4加密")
            break;
        default:
            log.error("No such cmdType ")
            break;
    }
}

safeService.getRandomNumber = function () {
    //获取随机数
    driver.uart485.sendVg("55aa07010020d9")
    let random = driver.sync.request("getRandom", 2000)
    //判断超时
    if (utils.isEmpty(random) || random == "") {
        log.error("获取随机数超时")
        return null;
    }
    log.info("--------random--------" + random)
    return random;
}


function decimalToHexLE(decimal) {
    // 限制在2字节范围内
    if (decimal < 0 || decimal > 255) {
        log.error("输入必须是0到255之间的整数");
        return null;
    }
    // 将十进制转换为2字节的16进制
    let hexString = decimal.toString(16).padStart(2, '0');
    return hexString;
}

function checkDivisibility(date, newSafeKey) {
    // 获取 A 和 B 的长度的一半
    let dateLen = Math.floor(date.toString().length / 2);
    let newSafeKeyLen = Math.floor(newSafeKey.toString().length / 2);
    log.info("dateLen----" + dateLen);
    log.info("newSafeKeyLen----" + newSafeKeyLen);
    // 计算余数
    const remainder = dateLen % newSafeKeyLen;
    log.info("余数----" + newSafeKeyLen);
    let patch;

    if (dateLen === 0) {
        return ""; // 如果 原数据 为 0，直接返回空字符串
    }

    // 根据余数计算 补全数据 的值
    if (remainder === 1) {
        patch = "04";
    } else if (remainder === 2) {
        patch = "0400";
    } else {
        let patchLen = newSafeKeyLen - remainder; // 使用 lenB 和 remainder 计算 len
        log.info("补全个数----" + patchLen);
        patch = "04" + (patchLen - 2).toString(16).padStart(2, '0') + "00".repeat(patchLen - 2); // padStart 确保长度为2
    }

    return patch;
}
export default safeService
