//build: 20250513
//依赖组件:dxDriver，dxStd，dxLogger，dxMap，dxEventBus,dxCommon
import { faceClass } from './libvbar-b-dxface.so'
import dxCommon from './dxCommon.js'
import bus from './dxEventBus.js'
const faceObj = new faceClass();
const face = {}

/**
 * 人脸处理初始化
 * @param {object} options 配置参数，大部分可以用默认值
 * @param {string} options.rgbPath 必填，rgb图像采集设备路径，每种设备有差异，比如DW200对应的值是'/dev/video11', M500对应的'/dev/video0'
 * @param {string} options.nirPath 必填，红外图像采集设备路径，每种设备有差异
 * @param {string} options.dbPath 数据库路径，必填
 * @param {number} options.score 特征值对比成功所需最低对比得分 ，非必填（缺省0.6）
 * @param {number} options.dbMax 内存中加载的最大特征列表数量，非必填（缺省5000）
 * @param {string} options.mapPath 标定结果文件路径，非必填
 * @param {string} options.picPath 保存完整人脸照片路径，非必填
 * @param {string} capturerRgbId 必填，rgb取图句柄id
 * @param {string} capturerNirId 必填，nir取图句柄id
 * @returns true/false
 */
face.init = function (options, capturerRgbId, capturerNirId) {
	if (options.rgbPath === undefined || options.rgbPath === null || options.rgbPath.length < 1) {
		throw new Error("dxFace.init: 'rgbPath' parameter should not be null or empty")
	}
	if (options.nirPath === undefined || options.nirPath === null || options.nirPath.length < 1) {
		throw new Error("dxFace.init: 'nirPath' parameter should not be null or empty")
	}
	if (capturerRgbId === undefined || capturerRgbId === null || capturerRgbId.length < 1) {
		throw new Error("dxFace.init: 'capturerRgbId' parameter should not be null or empty")
	}
	if (capturerNirId === undefined || capturerNirId === null || capturerNirId.length < 1) {
		throw new Error("dxFace.init: 'capturerNirId' parameter should not be null or empty")
	}
	capturerRgbId = dxCommon.handleId("capturer", capturerRgbId)
	capturerNirId = dxCommon.handleId("capturer", capturerNirId)

	return faceObj.init(options, capturerRgbId, capturerNirId);
}
/**
 * 人脸处理去初始化
 * @returns true/false
 */
face.deinit = function () {
	return faceObj.deinit();
}

/**
 * 人脸工作模式
 * @param {number} mode 工作模式，必填（ 0 人脸识别模式；1 人脸注册模式）
 * @returns true/false
 */
face.setRecgMode = function (mode) {
	if (mode === undefined || mode === null) {
		throw new Error("dxFace.setRecgMode: 'mode' parameter should not be null or empty")
	}
	return faceObj.setRecgMode(mode)
}
/**
 * 人脸注册
 * @param {string} userId 	人员ID，必填
 * @param {string} feature 	特征值 base64字符串，必填
 * @returns 0:成功/非0:失败
 */
face.addFaceFeatures = function (userId, feature) {
	if (userId === undefined || userId === null) {
		throw new Error("dxFace.addFaceFeatures: 'userId' parameter should not be null or empty")
	}
	if (feature === undefined || feature === null) {
		throw new Error("dxFace.addFaceFeatures: 'feature' parameter should not be null or empty")
	}

	return faceObj.addFaceFeatures(userId, feature)
}
/**
 * 人脸特征值对比
 * @param {string} feature 	特征值 base64字符串，必填
 * @returns string userId
 */
face.faceFeatureCompare = function (feature) {
	if (feature === undefined || feature === null) {
		throw new Error("dxFace.faceFeatureCompare: 'feature' parameter should not be null or empty")
	}
	return faceObj.faceFeatureCompare(feature)
}
/**
 * 更新配置
 * @param {object} options 注册参数，由注册回调获取，参考face.addFaceFeatures方法
 * @returns true/false
 */
face.faceUpdateConfig = function (options) {
	if (options === null || options === undefined) {
		throw new Error("dxFace.faceUpdateConfig: 'options' parameter should not be null or empty")
	}
	return faceObj.faceUpdateConfig(options)
}
/**
 * 人脸删除
 * @param {string} userId 人员ID，必填
 * @returns true/false
 */
face.deleteFaceFeatures = function (userId) {
	if (userId === null || userId === undefined) {
		throw new Error("dxFace.deleteFaceFeatures: 'userId' parameter should not be null or empty")
	}
	return faceObj.deleteFaceFeatures(userId)
}
/**
 * 根据照片路径和userId注册人脸
 * @param {string} userId 	用户id，必填
 * @param {string} picPath	照片路径，必填
 * @returns true/false
 */
face.registerFaceByPicFile = function (userId, picPath) {
	if (userId === undefined || userId === null || userId.length < 1) {
		throw new Error("dxFace.registerFaceByPicFile: 'userId' parameter should not be null or empty")
	}
	if (picPath === undefined || picPath === null || picPath.length < 1) {
		throw new Error("dxFace.registerFaceByPicFile: 'picPath' parameter should not be null or empty")
	}
	return faceObj.registerFaceByPicFile(userId, picPath)
}
/**
 * 人脸线程启用/禁用，功能开关
 * @param {bool} en 启用、禁用，必填
 * @returns true/false
 */
face.faceSetEnable = function (en) {
	if (en === undefined || en === null) {
		throw new Error("dxFace.faceSetEnable: 'en' parameter should not be null or empty")
	}
	return faceObj.detectSetEnable(en)
}
/**
 * 清空人脸数据
 * @returns true/false
 */
face.faceFeaturesClean = function () {
	return faceObj.faceFeaturesClean()
}
/**
 * 获取屏幕亮度
 * @returns number 屏幕亮度
 */
face.getDisplayBacklight = function () {
	return faceObj.getDisplayBacklight()
}
/**
 * 设置屏幕亮度
 * @param {number} light 屏幕亮度，必填
 * @returns true/false
 */
face.setDisplayBacklight = function (light) {
	if (light === undefined || light === null) {
		throw new Error("dxFace.setDisplayBacklight: 'light' parameter should not be null or empty")
	}
	return faceObj.setDisplayBacklight(light)
}
/**
 * 获取屏幕状态
 * @returns number 0-禁用 1-启用
 */
face.getEnableStatus = function () {
	return faceObj.getEnableStatus()
}
/**
 * 设置屏幕状态
 * @param {number} enable 0-禁用 1-启用
 * @returns true/false
 */
face.setEnableStatus = function (enable) {
	if (enable === undefined || enable === null) {
		throw new Error("dxFace.setEnableStatus: 'enable' parameter should not be null or empty")
	}
	return faceObj.setEnableStatus(enable)
}
/**
/**
 * 获取屏幕状态
 * @returns number 0-NORMAL 1-STANDBY
 */
face.getPowerMode = function () {
	return faceObj.getPowerMode()
}
/**
 * 设置屏幕状态
 * @param {number} mode 0-NORMAL 1-STANDBY
 * @returns true/false
 */
face.setPowerMode = function (mode) {
	if (mode === undefined || mode === null) {
		throw new Error("dxFace.setPowerMode: 'mode' parameter should not be null or empty")
	}
	return faceObj.setPowerMode(mode)
}
/**
 * 获取环境光
 * @returns number 环境光亮度
 */
face.getEnvBrightness = function () {
	return faceObj.getEnvBrightness()
}
/**
 * 获取人脸坐标
 * @returns string 人脸坐标JSON
 */
face.getTrackingBox = function () {
	return faceObj.getTrackingBox()
}
/**
 * 查询用户总数
 * @returns number
 */
face.selectCount = function () {
	return faceObj.selectFaceFeatures(1)
}
/**
 * 查询所有userId
 * @returns JSON
 */
face.selectAll = function () {
	return faceObj.selectFaceFeatures(2)
}
/**
 * 判断用户是否存在
 * @returns true/false
 */
face.userExist = function (userId) {
	return faceObj.selectFaceFeatures(3, userId)
}
/**
 * 判断face消息队列是否为空
 * @returns true/false
 */
face.msgIsEmpty = function () {
	return faceObj.msgIsEmpty()
}
/**
 * 从face消息队列中读取数据
 * @returns json
 */
face.msgReceive = function () {
	return JSON.parse(faceObj.msgReceive());
}

face.RECEIVE_MSG = '__face__MsgReceive'

/**
 * 用于简化face组件微光通信协议的使用，把face封装在这个worker里，使用者只需要订阅eventbus的事件就可以监听face
 */
face.run = function () {
	let workerFile = '/app/code/dxmodules/faceWorker.js'
	bus.newWorker('__face', workerFile)
}

/**
 * 如果face单独一个线程，可以直接使用run函数，会自动启动一个线程，
 * 如果想加入到其他已有的线程，可以使用以下封装的函数
 */
face.worker = {
	//在while循环前
	beforeLoop: function (options) {
		// 人脸算法初始化
		face.init(options, options.capturerRgbId, options.capturerNirId)
	},
	//在while循环里
	loop: function () {
		if (!face.msgIsEmpty()) {
			let res = face.msgReceive();
			bus.fire(face.RECEIVE_MSG, res)
		}
	}
}

export default face;
