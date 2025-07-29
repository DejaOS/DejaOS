// build : 20240910
import { udpClass } from './libvbar-drv-dxudp.so'
import dxCommon from './dxCommon.js'
const udpObj = new udpClass();
const udp = {}

/**
 * udp创建
 * @param {object} config udp相关参数,必填
 * 		@param {string} config.group_ip udp 组播地址
 *      @param {number} config.group_port upd 组播端口
 *      @param {number} config.ttl udp ttl
 * @param {number} id udp句柄，必填
 * @returns 句柄指针
 */
udp.udpCreate = function (config, id) {
	let pointer = udpObj.udpCreate(config);
	if (pointer === undefined || pointer === null) {
		throw new Error("udp.udpCreate: create failed")
	}
	dxCommon.handleId("udp", id, pointer)
}

/**
 * udp销毁
 * @param {number} id udp句柄，必填
 * @returns true/false
 */
udp.udpDestory = function (id) {
	let pointer = dxCommon.handleId("udp", id)
	return udpObj.udpDestory(pointer);
}

/**
 * udp连接重新打开
 * @param {number} id udp句柄，必填
 * @returns true/false
 */
udp.udpSocketReopen = function (id) {
	let pointer = dxCommon.handleId("udp", id)
	return udpObj.udpSocketReopen(pointer)
}

/**
 * udp数据发送
 * @param {string} data 要发送的数据
 * @param {number} id udp句柄，必填
 * @returns true/false
 */
udp.udpSend = function (data, id) {
	let pointer = dxCommon.handleId("udp", id)
	return udpObj.udpSend(pointer, data);
}

/**
 * udp 回调函数注册
 * @param {number} udp句柄，必填
 * @returns true/false
 */
udp.udpRegisterConfigCb = function (callback, id) {
	let pointer = dxCommon.handleId("udp", id)
	return udpObj.udpRegisterConfigCb(pointer, callback);
}

/**
 * 设置udp配置
 * @param {object} config udp相关参数,必填
 * 		@param {string} config.group_ip udp 组播地址
 *      @param {number} config.group_port upd 组播端口
 *      @param {number} config.ttl udp ttl
 * @param {number} id udp句柄，必填
 * @returns true/false
 */
udp.udpSetConfig = function (config, id) {
	let pointer = dxCommon.handleId("udp", id)
	return udpObj.udpSetConfig(pointer, config);
}

/**
 * 判断udp消息队列是否为空
 * @returns true/false
 */
udp.msgIsEmpty = function () {
	return udpObj.msgIsEmpty()
}

/**
 * 从udp消息队列中读取数据
 * @returns json
 */
udp.msgReceive = function () {
	return udpObj.msgReceive();
}

/**
 * 获取udp队列大小
 * @returns num
 */
udp.msgSize = function () {
	return udpObj.msgSize();
}

export default udp;
