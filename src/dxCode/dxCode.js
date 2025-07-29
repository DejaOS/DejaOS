//build: 20240715
//依赖组件：dxDriver,dxMap,dxEventBus,dxLogger,dxCommon,dxQueue
//用于识别和解析二维码图片
import { codeClass } from './libvbar-m-dxcode.so'
import dxMap from './dxMap.js'
import * as os from "os"
import dxCommon from './dxCommon.js';
import bus from './dxEventBus.js'
import log from './dxLogger.js'
const code = {}
const map = dxMap.get('default')
const codeObj = new codeClass();

/**
 * 取图模块初始化
 * @param {object} options 配置参数，大部分可以用默认值
 *      @param {string} options.path                 必填，图像采集设备路径，每种设备有差异，比如DW200对应的值是'/dev/video11', M500对应的'/dev/video0'
 *      @param {number} options.width                非必填，图像宽，缺省是0
 *      @param {number} options.height               非必填，图像高，缺省是0
 *      @param {number} options.widthbytes           非必填，每个像素所占字节数 GREY : 1， YUV : 2，DW200缺省是1 VF203缺省是2
 *      @param {number} options.pixel_format          非必填，像素格式， 缺省是1497715271表示V4L2_PIX_FMT_GREY
 *      @param {number} options.max_channels          非必填，最大支持的同步输出channel数量，缺省是3
 *      @param {number} options.rotation             非必填，旋转角度，缺省是90
 *      @param {number} options.frame_num             非必填，帧编号，缺省是3
 *      @param {string} options.capturerDogId         非必填，摄像头看门狗句柄
 */
code.capturerInit = function (options) {
    if (options.path === undefined || options.path === null || options.path.length < 1) {
        throw new Error("dxCode.init: 'path' parameter should not be null or empty")
    }
    let pointer = codeObj.capturerInit(options);
    if (!pointer) {
        throw new Error("dxCode.init: init failed")
    }
    os.sleep(100)
    let capturerDogPointer = dxCommon.handleId("watchdog", options.capturerDogId)
    codeObj.capturerRegisterCallback(pointer, "decoderCapturerImage", capturerDogPointer)
    dxCommon.handleId("code", "capturerid", pointer)
}


/**
 * 图形解码模块初始化 
 * @param {object} options 配置参数，大部分可以用默认值
 *      @param {string} options.name         必填，自定义解码器名称，随意填
 *      @param {number} options.width        必填，图像宽，不同的设备不一样，比如DW200是800
 *      @param {number} options.height       必填，图像高，不同的设备不一样，比如DW200是600
 *      @param {number} options.widthbytes   非必填，每个像素所占字节数 GREY : 1， YUV : 2，缺省是1
 *      @param {object} options.config       非必填，配置项，缺省是{}
 *      @param {number} options.max_channels 非必填，最大支持的同步输出channel数量，缺省是10
 */
code.decoderInit = function (options) {
    if (options.name === null || options.name.length < 1) {
        throw new Error("dxCode.init: 'name' parameter should not be null or empty")
    }
    if (options.width === undefined || options.width === null) {
        throw new Error("dxCode.init: 'width' parameter should not be null")
    }
    if (options.height === undefined || options.height === null) {
        throw new Error("dxCode.init: 'height' parameter should not be null")
    }
    _setDefaultOptions(options, 'config', {});
    _setDefaultOptions(options, 'widthbytes', 1);
    _setDefaultOptions(options, 'maxChannels', 10);
    let pointer = codeObj.decoderInit(options.name, options.config, options.width, options.widthbytes, options.height, options.maxChannels);
    if (!pointer) {
        throw new Error("dxCode.init: init failed")
    }
    os.sleep(100)
    codeObj.decoderCbRegister(pointer, "decoderOut")
    dxCommon.handleId("code", "decoderid", pointer)
    return pointer
}


/**
 * 图形解码模块配置更新
 * @param {object} options 配置参数，大部分可以用默认值
 *      @param {string} options.decoder         非必填，解码引擎类型
 *      @param {number} options.deType          非必填，码制类型
 *      @param {number} options.sMode           非必填，根据码内容的过滤策略                                                                                                                                                                                  │  
                                                │         默认 s_mode = 0                                                                                                                                                                                     │  
                                                │         0 : 同一个码的间隔模式                                                                                                                                                                              │  
                                                │         1 : 单次模式                                                                                                                                                                                        │  
                                                │         2 : 不同码的间隔模式   
 *      @param {number} options.interval        非必填，间隔模式下的间隔时间 
 *      @param {object} options.searchTimeout   非必填，检索码的超时时间
 *      @param {object} options.decoderTimeout  非必填，解码的超时时间
 *      @param {number} options.searchMode      非必填，解码引擎对应的策略
 *      @param {object} options.decoderMode     非必填，解码引擎特性配置 
 *      @param {number} options.qrMode          非必填，qr码的参数配置，默认不对外开放                                                                                                                                                                        │  
                                                │         默认 qr_mode = 15                                                                                                                                                                                   │  
                                                │         bit0 : 支持图像占比较小的qr码                                                                                                                                                                       │  
                                                │         bit1 : 支持定位符不是方形的qr码，默认可不开                                                                                                                                                         │  
                                                │         bit2 : qr码识别增强，针对医疗、异常、拉丝场景，普通场景可不开                                                                                                                                       │  
                                                │         bit3 : 打点qr码增强（耗时操作），普通场景可不开                                                                                                                                                     │  
                                                │         bit4 : 支持无静区二维码（耗时操作），默认不开
 *      @param {object} options.decoderDelay    非必填，两次解码间的延时
 */
code.decoderUpdateConfig = function (options) {
    if (options === null) {
        throw new Error("dxCode.decoderUpdateConfig: 'options' parameter should not be null or empty")
    }
    let pointer = dxCommon.handleId("code", "decoderid")
    codeObj.decoderUpdateConfig(pointer, options)
    return pointer
}

/**
 * 解码器注册特殊码回调
 */
code.decodeSpecialCBRegister = function () {
    let pointer = dxCommon.handleId("code", "decoderid")
    let cbType = typeof codeObj.decodeSpecialCBRegister
    // 这个方法是后加的，判断库中没有该方法(没有该方法的说明不需要调用，在库中已经做了相关操作)
    if (cbType === "function") {
        return codeObj.decodeSpecialCBRegister(pointer)
    }
}

/**
 * @param {object} options 配置参数，大部分可以用默认值
 * @param {number} options.method 非必填，isp main func
 * @param {number} options.sub_method 非必填，isp sub func
 * @param {number} options.target_luminance 非必填，图像目标亮度值
 * @param {number} options.target_percentile 非必填，目标亮度占比
 * @param {number} options.sample_gap 非必填，计算时的采样间隔
 * @param {number} options.min_exp 非必填，最小曝光值
 * @param {number} options.max_exp 非必填，最大曝光值
 * @param {number} options.min_gain 非必填，最小增益值
 * @param {number} options.max_gain 非必填，最大增益值
 * @returns true/false
 */
code.capturerUpdateIspConfig = function (options) {
    if (options === null) {
        throw new Error("dxCode.capturerUpdateIspConfig: 'options' parameter should not be null or empty")
    }
    let pointer = dxCommon.handleId("code", "capturerid")
    return codeObj.capturerUpdateIspConfig(pointer, options)
}

/**
 * 开启取图监听线程
 * @param {string} id1 必填，串口id
 * @param {number} timeout 非必填，超时时间，毫秒，规定时间内未收到取图指令将自动停止取图
 * @returns undefined
 */
code.startGetImageListen = function (id1, timeout = 1000) {
    if (id1 === null || id1 === undefined) {
        throw new Error("dxCode.startGetImageListen: 'id1' parameter should not be null or empty")
    }
    return codeObj.startGetImageListen(dxCommon.handleId("uart", id1), dxCommon.handleId("code", "capturerid"), timeout)
}

/**
 * 停止取图监听线程，仅监听微光协议5c/5d指令，中途发送任何其余指令都将停止取图线程
 * @returns undefined
 */
code.stopGetImageListen = function () {
    return codeObj.stopGetImageListen()
}

/**
 * 获取取图状态
 * @returns true/false
 */
code.getImageListenStatus = function () {
    return codeObj.getImageListenStatus()
}

/**
 * 判断解码器消息队列是否为空
 */
code.msgIsEmpty = function () {
    let pointer = dxCommon.handleId("code", "decoderid")
    return codeObj.msgIsEmpty(pointer)
}
/**
 * 从解码器消息队列中读取数据
 */
code.msgReceive = function () {
    let pointer = dxCommon.handleId("code", "decoderid")
    return codeObj.msgReceive(pointer)
}

function _setDefaultOptions(options, key, defaultValue) {
    if (options[key] === undefined || options[key] === null) {
        options[key] = defaultValue;
    }
}

/**
 * 判断两个Arraybuffer的值是否相同
 * @param {*} buffer1 
 * @param {*} buffer2 
 * @returns true/false
 */
function bufferIsEqual(buffer1, buffer2) {
    if (!buffer1 || !buffer2 || buffer1.byteLength !== buffer2.byteLength) {
        return false;
    }

    let view1 = new Uint8Array(buffer1);
    let view2 = new Uint8Array(buffer2);

    for (let i = 0; i < view1.length; i++) {
        if (view1[i] !== view2[i]) {
            return false;
        }
    }

    return true;
}

code.RECEIVE_MSG = '__code__MsgReceive'

/**
 * 用于简化code组件的使用，把code封装在这个worker里，使用者只需要订阅eventbus的事件就可以监听
 * @param {object} options 
 *      @param {object} options.capturer  capturer组件参数，参考capturerInit，必填
 *      @param {object} options.decoder  decoder组件参数，参考decoderInit，必填
 *      @param {number} options.mode  缺省是间隔模式，也就是扫描到重复的二维码会重复上报，上报的间隔是interval，如果为1表示单次模式，重复的二维码只会上报一次
 *      @param {number} options.interval  扫描间隔，只有mode为0的时候才有意义,缺省是0.6秒
 */

code.run = function (options) {
    if (!options || !options.capturer || !options.decoder) {
        throw new Error("dxcode.run:'options.capturer' and 'options.decoder' parameter should not be null or empty")
    }
    let init = map.get("__code__run_init")
    if (!init) {//确保只初始化一次
        map.put("__code__run_init", options)
        bus.newWorker("__code", '/app/code/dxmodules/codeWorker.js')
    }
}

/**
 * 如果capturer单独一个线程，可以直接使用run函数，会自动启动一个线程，
 * 如果想加入到其他已有的线程，可以使用以下封装的函数
 */
code.worker = {
    //在while循环前
    beforeLoop: function (capturer, decoder) {
        code.capturerInit(capturer)
        code.worker.pointer = code.decoderInit(decoder)
        code.decodeSpecialCBRegister()
    },
    //在while循环里
    loop: function (mode = 0, interval = 600) {
        let pointer = code.worker.pointer
        if (!pointer) {
            pointer = dxCommon.handleId("code", "decoderid")
        }
        if (!codeObj.msgIsEmpty(pointer)) {
            let res = codeObj.msgReceive(pointer)
            if (res != undefined && res != null && res.length > 0) {
                res = JSON.parse(res)
                res.data = dxCommon.hexStringToArrayBuffer(res.data)
                const now = new Date().getTime()
                if (mode == 1) {//单次模式
                    if (!bufferIsEqual(res.data, code.worker.singleOldContent)) {
                        bus.fire(code.RECEIVE_MSG, res)
                        code.worker.lastTimestamp = now
                        code.worker.singleOldContent = res.data
                    }
                } else {//间隔模式 
                    let _interval = Math.max(300, interval)//最少也是300毫秒
                    if ((now - code.worker.lastTimestamp) > _interval || !bufferIsEqual(res.data, code.worker.intervalOldContent)) {//1秒内不发送重复的数据
                        bus.fire(code.RECEIVE_MSG, res)
                        code.worker.lastTimestamp = now
                        code.worker.intervalOldContent = res.data
                    }
                }
            }
        }
    }
}

export default code;