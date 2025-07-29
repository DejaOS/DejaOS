//build: 20240301
//微光二维码码制规则，包括101，103 等
//依赖组件: dxDriver,dxCommon,dxLogger
import common from './dxCommon.js'
import base64 from './dxBase64.js'
import logger from './dxLogger.js'
let sqliteObj

// 比较两个字符串的前N个字符是否相等
function comparePrefix(str1, str2, N) {
    let substring1 = str1.substring(0, N);
    let substring2 = str2.substring(0, N);
    return substring1 === substring2;
}



// 101码值解码
function decode101(str) {
    if (str.length < 5) {
        logger.info("无效二维码")
        throw new Error("code invalid,length too short")
    }
    let decodeBuf = base64.decode(str.slice(0, -4))
    decodeBuf=decodeBuf.substring(4)

    return decodeBuf
}
function hexStringToArrayBuffer (hexString) {
    var byteString = hexString.match(/.{1,2}/g);
    var byteArray = byteString.map(function (byte) {
        return parseInt(byte, 16);
    });
    var buffer = new Uint8Array(byteArray).buffer;
    return buffer;
}

/**
 * 103码值解码
 * 1、base64解码
 * 2、解析组织编号
 * 3、RSA解密
 * 4、解析身份类型
 * 5、解析权限标识
 * 6、解析生码时间
 * 7、解析码过期时间
 * 8、校验通行码是否过期
 * @param {*} str 
 * @returns 
 */
function decode103(str) {
    // FIXME 这个pubKey后期需要从配置中查询
    let TLV_T_SIZE = 2, TLV_L_SIZE = 2, offset = 0, code, decryptedData, generationCodeTime, expirationTime

    // 1、base64解码
    let decodeBuf = base64.toHexString(str)
    decodeBuf= hexStringToArrayBuffer(decodeBuf)
    let view = new Uint8Array(decodeBuf)
    let organizationNumber;
    // 2、解析组织编号
    if (view[offset] == 0x01) {
        offset += TLV_T_SIZE
        let orgNumLen = view[offset]
        offset += TLV_L_SIZE
        let orgNumBuf = new Uint8Array(decodeBuf, offset, orgNumLen);
        organizationNumber = String.fromCharCode.apply(null, new Uint8Array(orgNumBuf));
        logger.info("组织编号: " + organizationNumber)
        offset += orgNumLen
    } else {
        throw new Error("code invalid,organization number error")
    }

    // 3、RSA解密
    if (view[offset] == 0x02) {
        // 组织编号数据长度
        offset += TLV_T_SIZE
        let cipherTextLen = view[offset]
        offset += TLV_L_SIZE
        // 对密文进行RSA解密
        let encryptedData = decodeBuf.slice(offset, offset + cipherTextLen)


        // TODO 秘钥写死，后续需要暴露出来
        // RSA 查询密钥(也可以固定，也可以写在文本中)，根据密钥再次解密
        // RSA解密后的数据
        let arr = sqliteObj.securityFindAllByCodeAndTypeAndTimeAndkey(undefined, undefined, undefined, Math.floor(Date.parse(new Date()) / 1000), organizationNumber)
        if (arr && arr.length > 0) {
            for (let data of arr) {
                decryptedData = common.arrayBufferRsaDecrypt(encryptedData, data.value)
                if (decryptedData != null) {
                    break
                }
            }
        }
        if (!arr && arr.length <= 0 || decryptedData == null) {
            return str
        }
    }
    // 一个设备一个密钥，相当于设备内用于解密的公钥是固定的，可以把公钥放到配置中，这里先默认写死
    // "MTlBODExMDA2MTkwMzQ4Q0I5QUY3QTc4QzAzOTQzNUU5NzNFODAzMEU4QUU1QzBEMkZFOEYwRjEzRjU4M0M5MTU5QUU5MTdDMDIzRDU0RDgxRUY2NTI0NkUyQ0Y2MUMzMTQzNTNENjA2NDU5N0Y2OTY5RUE4QjA5MUY1RTYyODM=";
    // let buf = common.arrayBufferRsaDecrypt(deData, deData.length)
    // 0 3 0 3 0 31 30 33 4 0 a 0 31 30 35 34 33 32 33 33 32 33 5 0 4 0 af 8c fa 5a 6 0 1 0 35 7 0 0 0
    // 0 
    // 3 0 3 0 31 30 33 
    // 4 0 a 0 31 30 35 34 33 32 33 33 32 33 
    // 5 0 4 0 af 8c fa 5a 
    // 6 0 1 0 35 
    // 7 0 0 0

    offset = 1;
    view = new Uint8Array(decryptedData)
    // 4、解析身份类型(type:103)
    if (view[offset] == 0x03) {
        // 身份类型数据长度
        offset += TLV_T_SIZE
        let identityTypeLength = view[offset]
        // 身份类型数据
        offset += TLV_L_SIZE
        let identityTypeBuf = new Uint8Array(decryptedData, offset, identityTypeLength);
        let identityType = String.fromCharCode.apply(null, identityTypeBuf);
        offset += identityTypeLength
        logger.info("身份类型数据: " + identityType)
    }


    // 5、解析权限标识(code)
    if (view[offset] == 0x04) {
        // 权限标识数据长度
        offset += TLV_T_SIZE
        let identityCodeLength = view[offset]
        // 权限标识数据
        offset += TLV_L_SIZE
        let identityCodeBuf = new Uint8Array(decryptedData, offset, identityCodeLength);
        offset += identityCodeLength
        code = String.fromCharCode.apply(null, identityCodeBuf);
    }


    // 6、解析生码时间
    if (view[offset] == 0x05) {
        // 生码时间数据长度
        offset += TLV_T_SIZE
        let createTimeLength = view[offset]
        // 生码时间数据
        offset += TLV_L_SIZE
        let createTimeBuf = new Uint8Array(decryptedData, offset, createTimeLength);
        offset += createTimeLength
        generationCodeTime = parseInt(common.arrayBufferToHexString(createTimeBuf.reverse()), 16)
    }


    // 7、解析码过期时间
    if (view[offset] == 0x06) {
        // 码过期时间数据长度
        offset += TLV_T_SIZE
        let expireTimeLength = view[offset]
        // 码过期时间数据
        offset += TLV_L_SIZE
        let expireTimeBuf = new Uint8Array(decryptedData, offset, expireTimeLength);
        offset += expireTimeLength
        expirationTime = parseInt(String.fromCharCode.apply(null, expireTimeBuf))
    }

    // 8、校验通行码是否过期
    let timestamp = Date.now();
    expirationTime = generationCodeTime + expirationTime
    if (expirationTime * 1000 > timestamp) {
        return code
    } else {
        return null
    }

}

const code = {
    formatCode: function (msg, sqlObj) {
        if (!msg) {
            throw new Error("msg should not be null or empty")
        }
        if (!sqlObj) {
            throw new Error("sqlObj should not be null or empty")
        }
        if (!sqliteObj) {
            sqliteObj = sqlObj
        }

        let data = {}
        // 判断码值
        if (comparePrefix(msg, "&llgy", "&llgy".length) || comparePrefix(msg, "&v101", "&v101".length)) {
            // 101码值
            data.type = 101
            data.code = decode101(msg.substring(5))
        }
        else if (comparePrefix(msg, "vg://v103", "vg://v103".length)) {
            // 103码值
            data.type = 103
            data.code = decode103(msg.substring(9)) ? decode103(msg.substring(9)) : msg.substring(9)
        } else if (comparePrefix(msg, "___VBAR_CONFIG_V1.1.0___", "___VBAR_CONFIG_V1.1.0___".length) || comparePrefix(msg, "___VBAR_KZB_V1.1.0___", "___VBAR_KZB_V1.1.0___".length)) {
            //TODO 先这样写，讨论好后更改流转逻辑
            data.type = 'config'
            data.code = msg
        } else {
            data.type = 100
            data.code = msg
        }
        if (data.code) {
            return data
        } else {
            console.log("decode fail")
            return
        }
    }
}

export default code;