//build: 20241230
import { idr210Class } from './libvbar-m-dxidr210.so'
const idr210Obj = new idr210Class();
const idr210 = {}

/**
 * 初始化
 * @param {string} path 	  串口通道path
 * @param {function} callback 回调函数
 * @param callback -> cardType		卡证类型
 * @param callback -> name			姓名
 * @param callback -> gender_code	性别码
 * @param callback -> birthday		出生
 * @param callback -> address		住址
 * @param callback -> id			居民身份证号
 * @param callback -> agency		签发机关
 * @param callback -> expireStart	有效期起始日期
 * @param callback -> expireEnd		有效期截至日期
 * @param callback -> nation		民族or国籍
 * @param callback -> nation_code	民族码
 * @param callback -> ver			换证次数
 * @param callback -> englishName	英文名
 * @param callback -> agencyCode	受理机关代码
 * @param callback -> oldId			历史号码
 * @returns true/false
 */
idr210.init = function (path, callback) {
	idr210Obj.init(path, callback);
}


/**
 * 取消初始化
 * @param {string} id 句柄id，非必填（需保持和init中的id一致）
 * @returns true/false
 */
idr210.deinit = function () {
	idr210Obj.deinit()
}

export default idr210;
