//build: 20240524 
//音频播放组件，只支持wav文件
//依赖组件:dxDriver,dxCommon
import { alsaplayClass } from './libvbar-m-dxalsaplay.so'
import dxCommon from './dxCommon.js'
const alsaplayObj = new alsaplayClass();
const alsaplay = {}

/**
 * alsaplay 初始化
 * @param {string} id 句柄id，非必填（若初始化多个实例需要传入唯一id）
 * @param {number} volume 音量，非必填
 * @param {number} card 非必填
 * @param {number} device 非必填
 * @param {number} mixer_ctl_num 非必填
 * @returns 句柄id
 */
alsaplay.init = function (id, volume, card, device, mixer_ctl_num) {
	if (volume === undefined || volume === null) {
		volume = 30
	}
	if (card === undefined || card === null) {
		card = 0
	}
	if (device === undefined || device === null) {
		device = 0
	}
	if (mixer_ctl_num === undefined || mixer_ctl_num === null) {
		mixer_ctl_num = 3
	}
	let pointer = alsaplayObj.alsaplayInit(volume, card, device, mixer_ctl_num)
	if (pointer === undefined || pointer === null) {
		throw new Error("alsaplay.init: init failed")
	}

	return dxCommon.handleId("alsaplay", id, pointer)
}

/**
 * alsaplay 取消初始化
 * @param {string} id 句柄id，非必填（需保持和init中的id一致）
 * @returns true/false
 */
alsaplay.deinit = function (id) {
	let pointer = dxCommon.handleId("alsaplay", id)
	return alsaplayObj.alsaplayDeinit(pointer)
}

/**
 * 播放音乐文件
 * @param {string} path wav文件绝对路径，路径是以'/app/code/' 开头，通常放在项目的resource目录下（和src同级)，必填
 * @param {string} id 句柄id，非必填（需保持和init中的id一致）
 * @returns true/false
 */
alsaplay.play = function (path, id) {
	if (!path) {
		throw new Error("alsaplay.play: 'path' parameter should not be null")
	}
	let pointer = dxCommon.handleId("alsaplay", id)
	return alsaplayObj.alsaplayWav(pointer, path)
}

/**
 * 中断当前正在播放的音频
 * @param {string} id 句柄id，非必填（需保持和init中的id一致）
 * @returns true/false
 */
alsaplay.interrupt = function (id) {
	let pointer = dxCommon.handleId("alsaplay", id)
	return alsaplayObj.alsaplayPlayingInterrupt(pointer)
}

/**
 * 清除播放缓存
 * @param {string} id 句柄id，非必填（需保持和init中的id一致）
 * @returns true/false
 */
alsaplay.clearPlayCache = function (id) {
	let pointer = dxCommon.handleId("alsaplay", id)
	return alsaplayObj.alsaplayClearPlayCache(pointer)
}

/**
 * 获取音量
 * @param {string} id 句柄id，非必填（需保持和init中的id一致）
 * @returns 返回数字类型的音量，不会超出音量范围
 */
alsaplay.getVolume = function (id) {
	let pointer = dxCommon.handleId("alsaplay", id)
	return alsaplayObj.alsaplayGetVolume(pointer)
}

/**
 * 设置音量 设置过大或过小会缺省等于音量范围的最大或最小值
 * @param {number} volume 必填
 * @param {string} id 句柄id，非必填（需保持和init中的id一致）
 * @returns 
 */
alsaplay.setVolume = function (volume, id) {
	let pointer = dxCommon.handleId("alsaplay", id)
	return alsaplayObj.alsaplaySetVolume(pointer, volume)
}
/**
 * 获取音量范围
 * @param {string} id 句柄id，非必填（需保持和init中的id一致）
 * @returns 格式 {"min":0,"max":6}
 */
alsaplay.getVolumeRange = function (id) {
	let pointer = dxCommon.handleId("alsaplay", id)
	return alsaplayObj.alsaplayGetVolumeRange(pointer)
}

export default alsaplay;
