
import CryptoES from "../../../dxmodules/crypto-es/index.js";

import stringUtils from "./stringUtils.js";

const tokenUtil = {};
//密钥
const secret = "fKwW6r3sUb+l20WhS8K5Aw33RN4BtHYvQgzm/gkzFNc=";

tokenUtil.base64Encode = function(str) {
 
  return  CryptoES.encode(str)
}

/**
 * 生成token 
 * @param {*} data 加密数据
 * @returns 
 */
tokenUtil.generateToken = function (data) {
  let payload = {}
  payload.data = data;
  payload.createTime = new Date().getTime();
  // 创建加密方法
  const encryptedData = CryptoES.AES.encrypt(JSON.stringify(payload), secret).toString();
  // 输出加密后的字符串和解密后的字符串
  return encryptedData;
}

/**
 * 验证token
 * @param {*} token 加密token
 * @returns 
 */
tokenUtil.verifyToken = function (token, effectiveTime) {
  const decryptedData = CryptoES.AES.decrypt(token, secret).toString(CryptoES.enc.Utf8);
  return tokenUtil.computeSignature(decryptedData, effectiveTime);
}

/**
 * 判断token 是否有效
 * @param {*} encodedPayload 
 * @returns 
 */
tokenUtil.computeSignature = function (encodedPayload, effectiveTime) {
  if (stringUtils.isEmpty(encodedPayload)) {
    return false
  }
  try {

    let payload = JSON.parse(encodedPayload)
    if (payload.data != null && payload.createTime != null) {
        let time = payload.createTime + effectiveTime
        let nowTime = new Date().getTime();
        if (time > nowTime ) {
          return true;
        }
    }
  } catch (error) {
    return false
  }
  return false;
}

export default tokenUtil;