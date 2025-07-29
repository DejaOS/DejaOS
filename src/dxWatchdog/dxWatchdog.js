//build 20240425
//看门狗组件，用于监控应用是否卡死，设置一个超时时间，如果超过这个时间没有喂狗，会自动触发设备重启
//注意使用看门狗之前可能需要先初始化gpio
//依赖组件 dxDriver,dxLogger,dxCommon,dxMap,dxGpio
import { watchdogClass } from './libvbar-b-dxwatchdog.so'
import dxMap from './dxMap.js'
import logger from './dxLogger.js'
import dxCommon from './dxCommon.js'

const map = dxMap.get("___watchdog")
const watchdogObj = new watchdogClass();

const watchdog = {}
watchdog.last = new Date().getTime()
/**
 * 打开看门狗设备
 * @param {number} type 必填
 * @param {string} id 句柄id，非必填（若初始化多个实例需要传入唯一id）
 */
watchdog.open = function (type, id) {
	let pointer = watchdogObj.open(type)
	if (pointer === undefined || pointer === null) {
		throw new Error("watchdog.open: open failed")
	}
	dxCommon.handleId("watchdog", id, pointer)
}
/**
 * 控制指定通道开关
 * @param {number} chan 通道id,必填
 * @param {string} id 句柄id，非必填（需保持和init中的id一致）
 * @returns true/false
 */
watchdog.enable = function (chan, id) {
	let pointer = dxCommon.handleId("watchdog", id)
	return watchdogObj.enable(pointer, chan)
}
/**
 * 开启看门狗总定时器
 * @param {*} timeout 必填
 * @param {string} id 句柄id，非必填（需保持和init中的id一致）
 * @returns true/false
 */
watchdog.start = function (timeout, id) {
	let pointer = dxCommon.handleId("watchdog", id)
	return watchdogObj.start(pointer, timeout)
}
/**
 * 判断是否是上电复位，看门狗是否已经启动
 * @param {string} id 句柄id，非必填（需保持和init中的id一致）
 * @returns true/false
 */
watchdog.isPoweron = function (id) {
	let pointer = dxCommon.handleId("watchdog", id)
	return watchdogObj.isPoweron(pointer)
}
/**
 * 喂狗指定通道
 * @param {*} chan 通道id，必填
 * @param {string} id 句柄id，非必填（需保持和init中的id一致）
 * @returns true/false
 */
watchdog.restart = function (chan, id) {
	let pointer = dxCommon.handleId("watchdog", id)
	return watchdogObj.restart(pointer, chan)
}
/**
 * 关闭看门狗总定时器
 * @param {string} id 句柄id，非必填（需保持和init中的id一致）
 * @returns true/false
 */
watchdog.stop = function (id) {
	let pointer = dxCommon.handleId("watchdog", id)
	return watchdogObj.stop(pointer)
}
/**
 * 关闭看门狗设备
 * @param {string} id 句柄id，非必填（需保持和init中的id一致）
 * @returns true/false
 */
watchdog.close = function (id) {
	let pointer = dxCommon.handleId("watchdog", id)
	return watchdogObj.close(pointer)
}
/**
 * 循环检查每个线程的喂狗情况，任何一个线程没有喂狗，则不启动restart
 * @param {number} chan 通道id，必填
 * @param {string} id 句柄id，非必填（需保持和init中的id一致）
 */
watchdog.loop = function (chan, id) {
	const now = new Date().getTime()
	const minus = now - watchdog.last
	if (minus > 3000 || minus < 0) {//每3秒检查一次或者小于0代表操作了往前改时间
		watchdog.last = now
		let keys = map.keys()
		let check = true
		for (let i = 0; i < keys.length; i++) {
			let key = keys[i]
			let value = map.get(key)
			const temp = now - value.now
			if (temp > value.timeout * 1000 && temp < 1700000000) {
				logger.error(`The worker ${key} did not feed the dog in time.`, temp)
				check = false
				break
			}
		}
		if (check) {
			this.restart(chan, id)
		}
	}
}
/**
 * 不同的线程喂狗
 * @param {string} flag 线程的标识,必填不能为空 
 * @param {number} timeout 线程可以多长时间不喂狗（秒），缺省是10秒
 */
watchdog.feed = function (flag, timeout = 10) {
	if (!flag || flag.length <= 0) {
		return
	}
	map.put(flag, { now: new Date().getTime(), timeout: timeout })
}

export default watchdog;
