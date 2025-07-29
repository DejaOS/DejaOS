//build:20250422
import { foxconnClass } from './libvbar-s-dxfoxconn.so'
const foxconnObj = new foxconnClass();
const foxconn = {}

/**
 * 初始化
 * @returns 0:成功/非0:失败
 */
foxconn.init = function () {
	return foxconnObj.init()
}

/**
 * 获取卡号
 * @returns cardNo:成功/非0:失败
 */
foxconn.getCardNum = function () {
	return foxconnObj.getCardNum()
}

/**
 * 读卡
 * @param {object} cardInfo 卡信息
 * @returns card:成功/非0:失败
 */
foxconn.readCard = function (cardInfo) {
	return foxconnObj.readCard(JSON.parse(cardInfo))
}

/**
 * 生成二维码
 * @param {string} baseUrl url
 * @param {string} sn 设备标识
 * @returns qrcode:成功/非0:失败
 */
foxconn.generateQrcode = function (baseUrl, sn) {
	return foxconnObj.generateQrcode({baseUrl : baseUrl, mac : sn})
}

/**
 * 解密二维码
 * @param {string} baseUrl url
 * @param {string} sn 设备标识
 * @returns qrcode:成功/非0:失败
 */
foxconn.processQrcode = function (qrcodeData) {
	return foxconnObj.processQrcode({qrcodeData : qrcodeData})
}

export default foxconn;
