//build: 20240524
//摄像头取图组件，主要用于获取二维码图像然后利用dxDecoder组件来解析二维码图像
//依赖组件：dxDriver，dxCommon，dxStd，dxMap
import { capturerClass } from './libvbar-m-dxcapturer.so'
import * as os from "os"
import std from './dxStd.js'
import dxMap from './dxMap.js'
import dxCommon from './dxCommon.js';
import bus from './dxEventBus.js'
const capturerObj = new capturerClass();
const map = dxMap.get('default')
const capturer = {}

/**
 * 取图模块初始化
 * @param {object} options 配置参数，大部分可以用默认值
 * @param {string} options.path                 必填，图像采集设备路径，每种设备有差异，比如DW200对应的值是'/dev/video11', M500对应的'/dev/video0'
 * @param {number} options.width                非必填，图像宽，缺省是0
 * @param {number} options.height               非必填，图像高，缺省是0
 * @param {number} options.widthbytes           非必填，每个像素所占字节数 GREY : 1， YUV : 2，DW200缺省是1 VF203缺省是2
 * @param {number} options.pixel_format          非必填，像素格式， 缺省是1497715271表示V4L2_PIX_FMT_GREY
 * @param {number} options.max_channels          非必填，最大支持的同步输出channel数量，缺省是3
 * @param {number} options.rotation             非必填，旋转角度，缺省是90
 * @param {number} options.frame_num             非必填，帧编号，缺省是3
 * @param {number} options.preview_enable        非必填，预览是否启用，缺省是3
 * @param {number} options.preview_left          非必填，预览框左边框坐标，缺省是0
 * @param {number} options.preview_top           非必填，预览框上边框坐标，缺省是0
 * @param {number} options.preview_width         非必填，预览框宽度，VF203缺省是1024
 * @param {number} options.preview_height        非必填，预览框高度，VF203缺省是600
 * @param {number} options.preview_rotation      非必填，预览框旋转角度，缺省是0
 * @param {number} options.preview_mode          非必填，预览框模式，缺省是2
 * @param {number} options.preview_screen_index   非必填，预览框索引，缺省是0
 * @param {string} id 句柄id，非必填（若初始化多个实例需要传入唯一id）
 */
capturer.init = function (options, id) {
    if (options.path === undefined || options.path === null || options.path.length < 1) {
        throw new Error("dxCapturer.init: 'path' parameter should not be null or empty")
    }
    let pointer = capturerObj.init(options);
    if (!pointer) {
        throw new Error("dxCapturer.init: init failed")
    }
    dxCommon.handleId("capturer", id, pointer)
}

/**
 * 回调注册
 * @param {string} id 句柄id，非必填（需保持和init中的id一致）
 * @param {string} capturerDogId 摄像头看门狗句柄id，非必填
 * @returns true/false
 */
capturer.registerCallback = function (id, capturerDogId) {
    let pointer = dxCommon.handleId("capturer", id)
    let capturerDogPointer = null;
    print("capturerDogPointer:", capturerDogPointer)
    if(capturerDogId){
        capturerDogPointer = dxCommon.handleId("watchdog", capturerDogId)
        print("capturerDogPointer:", capturerDogPointer)
    }
    return capturerObj.registerCallback(pointer, "decoderCapturerImage", capturerDogPointer)
}
/**
 * 获取基本信息
 * @param {string} id 句柄id，非必填（需保持和init中的id一致）
 * @returns 格式类似： {"width":800,"widthbytes":1,"height":600,"name":{},"type":6}
 */
capturer.getInfo = function (id) {
    let pointer = dxCommon.handleId("capturer", id)
    return capturerObj.getInfo(pointer)
}
/**
 * 关闭取图模块
 * @param {string} id 句柄id，非必填（需保持和init中的id一致）
 * @returns true/false
 */
capturer.close = function (id) {
    let pointer = dxCommon.handleId("capturer", id)
    return capturerObj.close(pointer)
}

/**
 * 获取图像数据，轮询可调用此接口，类似capturer.msgReceive方法的获取，若使用这个方法，必须手动销毁获取的image指针
 * @param {string} id 句柄id，非必填（需保持和init中的id一致）
 * @returns image指针
 */
capturer.readImage = function (id) {
    let pointer = dxCommon.handleId("capturer", id)
    return capturerObj.readImage(pointer)
}

/**
 * 销毁获取的image指针，与capturer.readImage方法共同使用
 * @param {number} image image指针，必填
 * @returns true/false
 */
capturer.destroyImage = function (image) {
    return capturerObj.destroyImage(image)
}

/**
 * 使能/关闭capture预览
 * @param {number}  摄像头启用/禁用，必填
 * @param {string} id 句柄id，非必填（需保持和init中的id一致）
 * @returns true/false
 */
capturer.capturerEnable = function (enable, id) {
    if (enable == null) {
        throw new Error("nirEnable should not be null or empty")
    }
    let pointer = dxCommon.handleId("capturer", id)
    return capturerObj.capturerPreviewEnable(pointer, enable)
}

/**
 * @brief 图片文件转image
 * @param {string} fileName 文件路径
 * @param {number} type 图像类型 IMAGE_YUV420P = 0, 1IMAGE_YUV420SP = 1,
 * @return imageId image句柄id
 */
capturer.pictureFileToImage = function (fileName, type) {
    if (fileName == null) {
        throw new Error("fileName should not be null or empty")
    }
    if (type == null) {
        throw new Error("type should not be null or empty")
    }
    return capturerObj.pictureFileToImage(fileName, type)
}

/**
 * 图片数据转image
 * @param {string}  base64Data 图片base64数据
 * @param {number}  dataLen 数据长度dataLen
 * @param {number}  type 图像类型 IMAGE_YUV420P = 0, 1IMAGE_YUV420SP = 1,
 * @returns imageId image句柄id
 */
capturer.pictureDataToImage = function (base64Data, dataLen, type) {
    if (base64Data == null) {
        throw new Error("base64Data should not be null or empty")
    }
    if (dataLen == null) {
        throw new Error("dataLen should not be null or empty")
    }
    if (type == null) {
        throw new Error("type should not be null or empty")
    }
    return capturerObj.pictureDataToImage(base64Data, dataLen, type)
}

// image, (enum image_type)type, (enum vbar_drv_picture_type)save_type, quality, pic_data, data_len
/**
 * image 转图片数据
 * @param {number}  imageId image图片句柄id
 * @param {number}  type 图像类型 IMAGE_YUV420P = 0, 1IMAGE_YUV420SP = 1,
 * @param {number}  saveType 转换后的图片类型 TYPE_JPEG = 0, TYPE_BMP = 1, TYPE_PNG = 2, TYPE_UNKNOE = 3;
 * @param {number}  quality 压缩比，jpeg 0-100， png 无损压缩无需此参数， bmp位图无需此参数
 * @returns 图片base64数据
 */
capturer.imageToPictureData = function (imageId, type, saveType, quality) {
    if (imageId == null) {
        throw new Error("imageId should not be null or empty")
    }
    if (type == null) {
        throw new Error("type should not be null or empty")
    }
    if (saveType == null) {
        throw new Error("saveType should not be null or empty")
    }
    if (quality == null) {
        throw new Error("quality should not be null or empty")
    }
    return capturerObj.imageToPictureData(imageId, type, saveType, quality)
}

/**
 * 转图片文件
 * @param {number}  imageId image图像句柄id
 * @param {string}  type 图像类型 IMAGE_YUV420P = 0, 1IMAGE_YUV420SP = 1,
 * @param {number}  saveType 转换后的图片类型 YPE_JPEG = 0, TYPE_BMP = 1, TYPE_PNG = 2, TYPE_UNKNOE = 3;
 * @param {number}  quality 压缩比，jpeg 0-100， png 无损压缩无需此参数， bmp位图无需此参数
 * @param {number}  savePath 图片保存路径
 * @returns true/false
 */
capturer.imageToPictureFile = function (imageId, type, saveType, quality, savePath) {
    if (imageId == null) {
        throw new Error("imageId should not be null or empty")
    }
    if (type == null) {
        throw new Error("type should not be null or empty")
    }
    if (saveType == null) {
        throw new Error("saveType should not be null or empty")
    }
    if (quality == null) {
        throw new Error("quality should not be null or empty")
    }
    if (savePath == null) {
        throw new Error("savePath should not be null or empty")
    }
    return capturerObj.imageToPictureFile(imageId, type, saveType, quality, savePath)
}

/**
* 图片缩放
* @param {number}   imageId image图像句柄id
* @param {number}   width  目标图像宽度
* @param {number}   height 目标图像高度
* @param {number}   mode       滤波器模式
*                   FILTER_MODE_NONE     不进行滤波，直接采样；速度最快。
*                   FILTER_MODE_LINEAR   只沿水平方向滤波。
*                   FILTER_MODE_BILINEAR 双线性滤波；比盒滤波更快，但在缩小图像时质量较低。
*                   FILTER_MODE_BOX      盒滤波；提供最高的缩放质量
*/
capturer.imageResizeResolution = function (imageId, width, height, mode) {
    if (imageId == null) {
        throw new Error("imageId should not be null or empty")
    }
    if (width == null) {
        throw new Error("width should not be null or empty")
    }
    if (height == null) {
        throw new Error("height should not be null or empty")
    }
    if (mode == null) {
        throw new Error("mode should not be null or empty")
    }
    return capturerObj.imageResizeResolution(imageId, width, height, mode)
}

/**
 * 判断capturer消息队列是否为空
 * @param {string} id 句柄id，非必填（需保持和init中的id一致）
 * @returns true/false
 */
capturer.msgIsEmpty = function (id) {
    let pointer = dxCommon.handleId("capturer", id)
    return capturerObj.msgIsEmpty(pointer)
}

/**
 * 从capturer消息队列中读取数据
 * @param {string} id 句柄id，非必填（需保持和init中的id一致）
 * @returns image指针
 */
capturer.msgReceive = function (id) {
    let pointer = dxCommon.handleId("capturer", id)
    return capturerObj.msgReceive(pointer)
}

/**
 * 查询capturer消息队列大小
 * @param {string} id 句柄id，非必填（需保持和init中的id一致）
 * @returns size
 */
capturer.msgQueueSize = function (id) {
    let pointer = dxCommon.handleId("capturer", id)
    return capturerObj.msgQueueSize(pointer)
}

capturer.RECEIVE_MSG = '__capturer__MsgReceive'

/**
 * 用于简化capturer组件的使用，把capturer封装在这个worker里，使用者只需要订阅eventbus的事件就可以监听capturer
 * @param {object} options capturer组件参数，参考capturer.init，必填
 * @param {string} options.id  句柄id，非必填（若初始化多个实例需要传入唯一id）
 */
capturer.run = function (options) {
    if (options === undefined || options.length === 0) {
        throw new Error("dxcapturer.run:'options' parameter should not be null or empty")
    }
    if (options.id === undefined || options.id === null || typeof options.id !== 'string') {
        // 句柄id
        options.id = ""
    }
    if (options.path === undefined || options.path === null || options.path.length <= 0) {
        throw new Error("dxcapturer.run:'path' should not be null or empty")
    }
    let oldfilepre = '/app/code/dxmodules/capturerWorker'
    let content = std.loadFile(oldfilepre + '.js').replace("{{id}}", options.id)
    let newfile = oldfilepre + options.id + '.js'
    std.saveFile(newfile, content)
    let init = map.get("__capturer__run_init" + options.id)
    if (!init) {//确保只初始化一次
        map.put("__capturer__run_init" + options.id, options)
        bus.newWorker(options.id || '__capturer', newfile)
    }
}

/**
 * 如果capturer单独一个线程，可以直接使用run函数，会自动启动一个线程，
 * 如果想加入到其他已有的线程，可以使用以下封装的函数
 */
capturer.worker = {
    //在while循环前
    beforeLoop: function (options) {
        capturer.init(options, options.id)
        capturer.registerCallback(options.id)
    },
    //在while循环里
    loop: function (options) {
        if (!capturer.msgIsEmpty(options.id)) {
            let res = capturer.msgReceive(options.id);
            if (options.id === undefined || options.id === null || typeof options.id !== 'string') {
                // 句柄id
                options.id = ""
            }
            bus.fire(capturer.RECEIVE_MSG + options.id, res)
        }
    }
}

export default capturer;
