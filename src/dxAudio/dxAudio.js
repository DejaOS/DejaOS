/**
 * Audio Module
 * Features:
 * - Supports GET/POST requests
 * - Supports file upload, Content-Type should be 'application/octet-stream' or 'text/plain' etc, not support 'multipart/form-data'
 * - Supports file download
 * - Supports static html file service
 * 
 * Usage:
 * - Simple WebServer
 * - Simple Web API Service
 * 
 * Doc/Demo : https://github.com/DejaOS/DejaOS
 */
import { audioClass } from './libvbar-m-dxaudio.so'
import dxCommon from './dxCommon.js'
const audioObj = new audioClass();
const audio = {}

audio.PLAY_CODE = {
    SUCCESS: 0,
    FAILED: -1,
    QUEUE_IS_FULL: -2
}

audio.PLAY_TYPE = {
    CHINESE_DATA: 0,     /** Chinese */
    ENGLISH_DATA: 1,     /** English */
}

/**
 * Audio initialization
 * @param {string} id Handle ID, not required (if initializing multiple instances, a unique ID needs to be passed in)
 * @param {number} volume Volume, not required
 * @param {number} periodSize Cycle size, not required
 * @param {number} bufferSize Cache size, not required
 * @returns Handle ID
 */
audio.init = function (id, volume, periodSize, bufferSize) {
	if (volume === undefined || volume === null) {
		volume = 35
	}
	if (periodSize === undefined || periodSize === null) {
		periodSize = 512
	}
	if (bufferSize === undefined || bufferSize === null) {
		bufferSize = 2048
	}
	let pointer = audioObj.audioInit(volume, periodSize, bufferSize)
	if (!pointer) {
		throw new Error("audio.init: init failed")
	}
	return dxCommon.handleId("audio", id, pointer)
}

/**
 * audio Dinit
 * @param {string} id Handle ID, not required (must be consistent with the ID in init)
 * @returns true/false
 */
audio.deinit = function (id) {
	let pointer = dxCommon.handleId("audio", id)
	return audioObj.audioDeinit(pointer)
}

/**
 * Determine if the volume is valid
 * @param {number} volume Volume, required
 * @param {string} id Handle ID, not required (must be consistent with the ID in init)
 * @returns {boolean} true/false
 */
audio.validVolume = function (volume, id) {
	if (volume == undefined || volume == null) {
		throw new Error("audio.setVolume: 'volume' parameter should not be null")
	}
	let pointer = dxCommon.handleId("audio", id)
	return audioObj.audioIsValidVolume(pointer, volume)
}

/**
 * Obtain the range of audio volume adjustment
 * @param {string} id Handle ID, not required (must be consistent with the ID in init)
 * @returns {JSON} Get success returns JSON (including max and min fields)/failure returns NULL
 */
audio.getRange = function (id) {
	let pointer = dxCommon.handleId("audio", id)
	return audioObj.audioGetVolumeRange(pointer)
}

/**
 * Get volume
 * @param {string} id Handle ID, not required (must be consistent with the ID in init)
 * @returns Return the volume of numeric type without exceeding the volume range
 */
audio.getVolume = function (id) {
	let pointer = dxCommon.handleId("audio", id)
	return audioObj.audioGetVolume(pointer)
}

/**
 * Setting the volume too high or too low will default to the maximum or minimum value of the volume range
 * @param {number} volume Volume, required
 * @param {string} id Handle ID, not required (must be consistent with the ID in init)
 * @returns true/false
 */
audio.setVolume = function (volume, id) {
	let pointer = dxCommon.handleId("audio", id)
	if (volume == undefined || volume == null) {
		throw new Error("audio.setVolume: 'volume' parameter should not be null")
	}
	return audioObj.audioSetVolume(pointer, volume)
}

/**
 * Play music files (refer to audio.PLAY_CDE status code for successful playback)
 * @param {string} path The absolute path of the wav file starts with '/app/code/' and is usually placed in the project's resource directory (at the same level as src). It is required
 * @param {string} id Handle ID, not required (must be consistent with the ID in init)
 * @returns true/false
 */
audio.play = function (path, id) {
	if (!path) {
		throw new Error("audio.play: 'path' parameter should not be null")
	}
	let pointer = dxCommon.handleId("audio", id)
	return audioObj.audioPlayWav(pointer, path)
}

/**
 * Play streaming audio (refer to audio.PLAY_CDE status code for successful playback)
 * @param {ArrayBuffer} Audio stream, required
 * @param {string} id Handle ID, not required (must be consistent with the ID in init)
 * @returns true/false
 */
audio.audioWavData = function (buffer, id) {
	if (!buffer) {
		throw new Error("audio.audioWavData: 'buffer' parameter should not be null")
	}
	let pointer = dxCommon.handleId("audio", id)
	return audioObj.audioPlayWavData(pointer, buffer)
}

/**
 * Play text (refer to audio.PLAY_CDE status code for successful playback)
 * @param {string} Audio text, required
 * @param {string} Language type, required 0 CN; 1 EN
 * @param {string} id Handle ID, not required (must be consistent with the ID in init)
 * @returns true/false
 */
audio.playTxt = function (txt, type, id) {
	if (!txt) {
		throw new Error("audio.audioWavData: 'buffer' parameter should not be null")
	}
    if (type != null && type != undefined) {
		throw new Error("audio.audioWavData: 'type' parameter should not be null")
	}
	let pointer = dxCommon.handleId("audio", id)
	return audioObj.audioPlayTxt(pointer, txt, type)
}

/**
 * Interrupt the currently playing audio
 * @param {string} id Handle ID, not required (must be consistent with the ID in init)
 * @returns {boolean} true/false
 */
audio.interrupt = function (id) {
	let pointer = dxCommon.handleId("audio", id)
	return audioObj.audioPlayingInterrupt(pointer)
}

/**
 * Clear the playback cache (this interface needs to be mutually exclusive with vbar_maudio_play/vbar_maudio_play_data)
 * @param {string} id Handle ID, not required (must be consistent with the ID in init)
 * @returns {boolean} true/false
 */
audio.clearCache = function (id) {
	let pointer = dxCommon.handleId("audio", id)
	return audioObj.audioClearPlayCache(pointer)
}

export default audio;
