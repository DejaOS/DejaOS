//build: 20240525
//依赖组件:dxDriver，dxCommon
import { alsaClass } from './libvbar-m-dxalsa.so'
import dxCommon from './dxCommon.js'
const alsaObj = new alsaClass();
const alsa = {}

/**
 * alsa 初始化
 * @param {string} id 句柄id，非必填（若初始化多个实例需要传入唯一id）
 * @param {number} volume 音量，非必填
 * @param {number} periodSize 周期大小，非必填
 * @param {number} bufferSize 缓存大小，非必填
 * @returns 句柄id
 */
alsa.init = function (id, volume, periodSize, bufferSize) {
	if (volume === undefined || volume === null) {
		volume = 35
	}
	if (periodSize === undefined || periodSize === null) {
		periodSize = 512
	}
	if (bufferSize === undefined || bufferSize === null) {
		bufferSize = 2048
	}
	let pointer = alsaObj.alsaInit(volume, periodSize, bufferSize)
	if (!pointer) {
		throw new Error("alsa.init: init failed")
	}
	return dxCommon.handleId("alsa", id, pointer)
}

/**
 * alsa 取消初始化
 * @param {string} id 句柄id，非必填（需保持和init中的id一致）
 * @returns true/false
 */
alsa.deinit = function (id) {
	let pointer = dxCommon.handleId("alsa", id)
	return alsaObj.alsaDeinit(pointer)
}

/**
 * 播放音乐文件
 * @param {string} path wav文件绝对路径，路径是以'/app/code/' 开头，通常放在项目的resource目录下（和src同级)，必填
 * @param {string} id 句柄id，非必填（需保持和init中的id一致）
 * @returns true/false
 */
alsa.play = function (path, id) {
	if (!path) {
		throw new Error("alsa.play: 'path' parameter should not be null")
	}
	let pointer = dxCommon.handleId("alsa", id)
	return alsaObj.alsaWav(pointer, path)
}

/**
 * TTS文字转语音
 * @param {string} 要播放的音频文字，必填
 * @param {string} id 句柄id，非必填（需保持和init中的id一致）
 * @returns true/false
 */
alsa.ttsPlay = function (str, id) {
	if (!str) {
		throw new Error("alsa.ttsPlay: 'str' parameter should not be null")
	}
	let pointer = dxCommon.handleId("alsa", id)
	return alsaObj.alsaAudioPlayString(pointer, str)
}

/**
 * 获取音量
 * @param {string} id 句柄id，非必填（需保持和init中的id一致）
 * @returns 返回数字类型的音量，不会超出音量范围
 */
alsa.getVolume = function (id) {
	let pointer = dxCommon.handleId("alsa", id)
	return alsaObj.alsaGetVolume(pointer)
}

/**
 * 设置音量 设置过大或过小会缺省等于音量范围的最大或最小值
 * @param {number} volume 音量，必填
 * @param {string} id 句柄id，非必填（需保持和init中的id一致）
 * @returns true/false
 */
alsa.setVolume = function (volume, id) {
	let pointer = dxCommon.handleId("alsa", id)
	return alsaObj.alsaSetVolume(pointer, volume)
}
/**
 * 播放流式音频
 * @param {ArrayBuffer} 音频流 ，必填
 * @param {string} id 句柄id，非必填（需保持和init中的id一致）
 * @returns true/false
 */
alsa.alsaWavData = function (buffer, id) {
	if (!buffer) {
		throw new Error("alsa.alsaWavData: 'buffer' parameter should not be null")
	}
	let pointer = dxCommon.handleId("alsa", id)
	return alsaObj.alsaWavData(pointer, buffer)
}

/**
 * 中断当前正在播放的音频
 * @param {string} id 句柄id，非必填（需保持和init中的id一致）
 * @returns true/false
 */
alsa.interrupt = function (id) {
	let pointer = dxCommon.handleId("alsa", id)
	return alsaObj.alsaPlayingInterrupt(pointer)
}

/**
 * 清除播放缓存
 * @param {string} id 句柄id，非必填（需保持和init中的id一致）
 * @returns true/false
 */
alsa.clearPlayCache = function (id) {
	let pointer = dxCommon.handleId("alsa", id)
	return alsaObj.alsaClearPlayCache(pointer)
}

export default alsa;
