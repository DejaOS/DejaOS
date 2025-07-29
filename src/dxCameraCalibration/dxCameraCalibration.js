//build: 20240528
//依赖组件:dxDriver，dxLogger，dxMap，dxCapturer
import { calibrationClass } from './libvbar-m-dxcapturer_calibration.so'
import capturer from '../dxmodules/dxCapturer.js'
import * as os from "os";
import dxMap from './dxMap.js'
import log from './dxLogger.js'
import bus from './dxEventBus.js'
const calibrationObj = new calibrationClass();
const map = dxMap.get('default')
const calibration = {}
let cnt = 0, startTime = 0;

/**
 * calibration 初始化
 * @returns true/false
 */
calibration.init = function () {
	return calibrationObj.init();
}

/**
 * calibration 销毁
 * @returns true/false
 */
calibration.deinit = function () {
	return calibrationObj.deinit();
}

/**
 * 识别标定（拿方格纸对准屏幕上的方框）
 * @param {number} imageRgb image指针，必填
 * @param {number} imageNir image指针，必填
 * @param {number} cnt 标定次数，必填（0：第一次标定,1：第二次标定）
 * @returns true/false
 */
calibration.calibrationFromImage = function (imageRgb, imageNir, cnt) {
	return calibrationObj.calibrationFromImage(imageRgb, imageNir, cnt);
}

/**
 * 计算并存储标定结果
 * @param {number} imageNir image指针，必填
 * @param {string} path 存储路径，必填
 * @returns true/false
 */
calibration.getMap = function (imageRgb, imageNir,cnt, path) {
	return calibrationObj.getMap(imageRgb, imageNir,cnt, path);
}

/**
 * 获取绘制标定ui框信息
 * @param {number} cnt 标定次数，必填（0：第一次标定,1：第二次标定）
 * @param {number} type 横竖屏，必填（1：横屏，0：竖屏）
 * @returns {x:横坐标,y:纵坐标,w:宽,h:高}
 */
calibration.getBox = function (cnt, type) {
	let box = calibrationObj.getBox(cnt);
	let coordinate = {
		x: type == 1 ? box.x : box.y,
		y: type == 1 ? box.y : box.x,
		w: type == 1 ? box.w : box.h,
		h: type == 1 ? box.h : box.w
	}
	return coordinate;
}

calibration.RECEIVE_MSG = '__calibration__MsgReceive'

/**
 * 简化cameraCalibration组件的使用，无需轮询去获取数据，数据会通过eventbus发送出去
 * 由于识别标定calibrationFromImage是阻塞线程的方法，所以必须新开一个线程执行，否则会阻塞其他线程
 * run 只会执行一次
 * @param {object} options 配置参数
 * @param {string} options.capturerRgbId      必填，rgb取图句柄id
 * @param {string} options.capturerNirId      必填，nir取图句柄id
 * @param {number} options.timeout      	单位秒，非必填（缺省20秒），标定的超时时间，在此期间内未完成两次标定，则标定失败结束线程，如需重新标定，必须再次执行run方法
 */
calibration.run = function (options) {
	if (options === undefined || options.length === 0) {
		throw new Error("dxCameraCalibration.run:'options' parameter should not be null or empty")
	}
	if (options.capturerRgbId === undefined || options.capturerRgbId === null || options.capturerRgbId.length <= 0) {
		throw new Error("dxCameraCalibration.run:'capturerRgbId' should not be null or empty")
	}
	if (options.capturerNirId === undefined || options.capturerNirId === null || options.capturerNirId.length <= 0) {
		throw new Error("dxCameraCalibration.run:'capturerNirId' should not be null or empty")
	}
	options.timeout = options.timeout ? options.timeout : 20
	try {
		if(startTime == null || startTime == 0){
			startTime = new Date().getTime()
		}
        let imageRgb = capturer.readImage(options.capturerRgbId)
        let imageNir = capturer.readImage(options.capturerNirId)
        let res = this.calibrationFromImage(imageRgb, imageNir, cnt)
        if (res) {
            if (cnt >= 1) {
                log.info("两次标定成功，结束标定")
                let path = "/etc/.cameraCalibration"
                if(options.path && options.path.length > 0){
                    path = options.path
                }
                this.getMap(imageRgb, imageNir, cnt, path)
                bus.fire(this.RECEIVE_MSG, "success1")
                capturer.destroyImage(imageRgb)
                capturer.destroyImage(imageNir)
				cnt = 0;
				startTime = 0;
                return "success1"
            }
            log.info("第" + (cnt + 1) + "次标定成功")
            bus.fire(this.RECEIVE_MSG, "success0")
            cnt += 1
            log.info("开始进行第" + (cnt + 1) + "次标定")
            return "success0"
        } else {
            log.error("第" + (cnt + 1) + "次标定失败，重试中")
        }
        capturer.destroyImage(imageRgb)
        capturer.destroyImage(imageNir)
        let endTime = new Date().getTime()
        if (endTime - startTime > options.timeout * 1000) {
            log.error('标定超时，请重新执行标定')
            bus.fire(this.RECEIVE_MSG, "timeout")
            cnt = 0
			startTime = 0;
            return "timeout"
        }
        return "failed"
    } catch (error) {
        log.error(error)
    }
}

export default calibration;