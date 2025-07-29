/**
 * Key events of GPIO buttons
 * Features:
 * - Event during registration listening
 * 
 * Usage:
 * - Monitoring key events of GPIO buttons
 * 
 * Doc/Demo : https://github.com/DejaOS/DejaOS
 */
import { gpioKeyClass } from './libvbar-m-dxkey.so'
import bus from './dxEventBus.js'
import * as os from "os";

let gpioKeyObj = null
const gpioKey = {}

/**
 * gpioKey 初始化
 * @returns true:成功,false:失败
 */
gpioKey.init = function () {
	if(!gpioKeyObj){
		gpioKeyObj = new gpioKeyClass();
	}
	const res = gpioKeyObj.init()
	if (res) {
		gpioKeyObj.registerCb("gpioKeyCb")
	}
	return res
}

/**
 * gpioKey 取消初始化
 * @returns true:成功,false:失败
 */
gpioKey.deinit = function () {
	gpioKeyObj.unRegisterCb("gpioKeyCb")
	return gpioKeyObj.deinit()
}

/**
 * 判断gpioKey消息队列是否为空
 * @returns true:成功,false:失败
 */
gpioKey.msgIsEmpty = function () {
	return gpioKeyObj.msgIsEmpty()
}

/**
 * 从gpioKey消息队列中读取数据
 * @returns json消息对象，格式：{"code":30,"type":1,"value":1}
 */
gpioKey.msgReceive = function () {
	let msg = gpioKeyObj.msgReceive()
	return JSON.parse(msg);
}

gpioKey.RECEIVE_MSG = '__gpioKey__MsgReceive'

/**
 * 简化gpiokey组件的使用，无需轮询去获取数据，数据会通过eventbus发送出去
 * run 只会执行一次
 * 如果需要实时获取数据，可以订阅 eventbus的事件，事件的topic是GPIO_KEY，事件的内容是类似{"code":30,"type":1,"value":1}
 * 其中code是gpio的标识，表示是那个gpio有输入，value值只能是0，1通常表示低电平和高电平
 * type是事件类型，遵循Linux的标准输入规定,以下列出常用几个：
	(0x01):按键事件，包括所有的键盘和按钮事件。例如，当按下或释放键盘上的一个键时，将报告此类事件。
	(0x05):开关事件，例如笔记本电脑盖的开关可以报告开合状态。
	(Ox11):LED事件，用于控制设备上的LED指示灯，
	(Ox12):声音事件，用于控制设备上的声音输出，
	(0x16):电源事件，可以用于报告电源按钮事件或电池电量低
 * 
 */
gpioKey.run = function () {
	bus.newWorker("__gpiokey", '/app/code/dxmodules/gpioKeyWorker.js')
}

/**
 * 如果gpioKey单独一个线程，可以直接使用run函数，会自动启动一个线程，
 * 如果想加入到其他已有的线程，可以使用以下封装的函数
 */
gpioKey.worker = {
	//在while循环前
	beforeLoop: function () {
		gpioKey.init()
	},
	//在while循环里
	loop: function () {
		if (!gpioKey.msgIsEmpty()) {
			let res = gpioKey.msgReceive();
			bus.fire(gpioKey.RECEIVE_MSG, res)
		}
	}
}
export default gpioKey;
