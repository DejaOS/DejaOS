// build : 20240524
// gpio 输出,只能输出2种状态，高电平/低电平，如果接入继电器，则高电平是开，低电平是关
import { gpioClass } from './libvbar-b-dxgpio.so'
const gpioObj = new gpioClass();
const gpio = {}

/**
 * 初始化,只需要执行一次即可
 * @returns true/false
 */
gpio.init = function () {
	return gpioObj.init();
}

/**
 * 释放gpio资源
 * @returns true/false
 */
gpio.deinit = function () {
	return gpioObj.exit();
}

/**
 * 申请gpio,每个gpio只需要申请一次
 * @param {number} gpio的标识，不同的设备不同的标识，必填
 * @returns true/false
 */
gpio.request = function (gpio_) {
	let res = gpioObj.request(gpio_)
	if (!res) {
		return res
	}
	gpioObj.setFunc(gpio_, 0x04);
	return true
}

/**
 * 释放指定gpio
 * @param {number} gpio的标识，不同的设备不同的标识，必填
 * @returns true/false
 */
gpio.free = function (gpio_) {
	return gpioObj.free(gpio_);
}

/**
 * 指定gpio输出高/低电平
 * @param {number} gpio的标识，不同的设备不同的标识，必填
 * @param {number} value 只能是1和0，1表示高电平，0表示低电平，缺省是高电平，必填
 * @returns true/false
 */
gpio.setValue = function (gpio_, value) {
	return gpioObj.setValue(gpio_, value);
}

/**
 * 获取指定gpio当前的输出 ：高/低电平
 * @param {number} gpio的标识，不同的设备不同的标识，必填
 * @returns 1和0，1表示高电平，0表示低电平
 */
gpio.getValue = function (gpio_) {
	return gpioObj.getValue(gpio_);
}

/**
 * 申请gpio,每个gpio只需要申请一次
 * @param {number} gpio的标识，不同的设备不同的标识，必填
 * @returns true/false
 */
gpio.requestGpio = function (gpio_) {
	let res = gpioObj.request(gpio_)
	return res
}

/**
 * 设置gpio功能
 * @param {number} gpio的标识，不同的设备不同的标识，必填
 * @param {number} gpio功能属性，不同的设备不同的功能属性，必填
 * @returns true/false
 */
gpio.setFuncGpio = function (gpio_, func) {
	let res = gpioObj.setFunc(gpio_, func)
	return res
}

/**
 * 设置指定gpio上拉状态
 * @param {number} gpio的标识，不同的设备不同的标识，必填
 * @param {number} state 上拉状态，必填
 * @returns true/false
 */
gpio.setPullState = function (gpio_, state) {
	return gpioObj.setPullState(gpio_, state);
}

/**
 * 获取指定gpio上拉状态
 * @param {number} gpio的标识，不同的设备不同的标识，必填
 * @returns 上拉状态(int)
 */
gpio.getPullState = function (gpio_) {
	return gpioObj.getPullState(gpio_);
}
/**
 * 设置指定gpio的驱动能力
 * @param {number} gpio的标识，不同的设备不同的标识，必填
 * @param {number} strength 能力，必填
 * @returns true/false
 */
gpio.setDriveStrength = function (gpio_, strength) {
	return gpioObj.setDriveStrength(gpio_, strength);
}

/**
 * 获取指定gpio的驱动能力
 * @param {number} gpio的标识，不同的设备不同的标识，必填
 * @returns 能力(int)
 */
gpio.getDriveStrength = function (gpio_) {
	return gpioObj.getDriveStrength(gpio_);
}

export default gpio;
