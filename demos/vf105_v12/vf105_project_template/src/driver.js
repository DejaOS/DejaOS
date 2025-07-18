import std from '../dxmodules/dxStd.js'
import dxCommon from '../dxmodules/dxCommon.js'
import dxUart from '../dxmodules/dxUart.js'
import gpio from '../dxmodules/dxGpio.js'
import alsa from '../dxmodules/dxAlsa.js'
import dxNet from '../dxmodules/dxNet.js'
import boardConst from './common/boardConst.js'
import capturer from '../dxmodules/dxCapturer.js'
import face from '../dxmodules/dxFace.js'

const driver = {}

driver.gpio = {
    RELAY1: 44,
    RELAY2: 84,
    init: function () {
        gpio.init()
        gpio.request(this.RELAY1)
        gpio.request(this.RELAY2)
    },
    open: function () {
        gpio.setValue(this.RELAY1, 1)
    },
    close: function () {
        gpio.setValue(this.RELAY1, 0)
    },
    setValue: function (id, valus) {
        gpio.setValue(id, valus)
    }
}


driver.alsa = {
    init: function () {
        alsa.init()
    },
    play: function (src) {
        alsa.play(src)
    },
    ttsPlay: function (text) {
        alsa.ttsPlay(text)
    },
    volume: function (volume) {
        alsa.setVolume(volume)
    }
}


driver.uart485 = {
    id: 'uart485',
    init: function () {
        dxUart.runvg({ id: this.id, type: dxUart.TYPE.UART, path: '/dev/ttySLB2', result: 0, passThrough: false })
        std.sleep(100)
        dxUart.ioctl(1, '115200-8-N-1', this.id)
    },
    ioctl: function (data) {
        dxUart.ioctl(1, data, this.id)
    },
    send: function (data) {
        dxUart.send(data, this.id)
    },
    sendVg: function (data) {
        if (typeof data == 'object') {
            data.length = data.length ? data.length : (data.data ? data.data.length / 2 : 0)
        }
        dxUart.sendVg(data, this.id)
    }
}

driver.uartCode = {
    id: 'uartCode',
    init: function () {
        dxUart.runvg({ id: this.id, type: dxUart.TYPE.UART, path: '/dev/ttySLB1', result: 0, passThrough: false })
        std.sleep(100)
        dxUart.ioctl(1, '115200-8-N-1', this.id)
    },
    ioctl: function (data) {
        dxUart.ioctl(1, data, this.id)
    },
    send: function (data) {
        dxUart.send(data, this.id)
    },
    sendVg: function (data) {
        if (typeof data == 'object') {
            data.length = data.length ? data.length : (data.data ? data.data.length / 2 : 0)
        }
        dxUart.sendVg(data, this.id)
    }
}


driver.net = {
    options : {
        type: dxNet.TYPE.ETHERNET,
        dhcp: dxNet.DHCP.DYNAMIC,
        macAddr: dxCommon.getUuid2mac(),
    },
    init: function () {
        dxNet.worker.beforeLoop(this.options)
    },
    loop: function () {
        dxNet.worker.loop()
    }
}


driver.capturer = {
    // 彩色摄像头
    options1: {
        id: boardConst.CAPTURER.capturerRgbId,
        path: boardConst.CAPTURER.RGB_PATH,
        width: boardConst.CAPTURER.RGB_WIDTH,
        height: boardConst.CAPTURER.RGB_HEIGHT,
        preview_width: boardConst.CAPTURER.RGB_PREVIEW_WIDTH,
        preview_height: boardConst.CAPTURER.RGB_PREVIEW_HEIGTH,
        preview_mode: boardConst.CAPTURER.RGB_PREVIEW_MODE,
        preview_screen_index: boardConst.CAPTURER.RGB_PREVIEW_SCREEN_INDEX
    },
    // 红外摄像头
    options2: {
        id: boardConst.CAPTURER.capturerNirId,
        path: boardConst.CAPTURER.NIR_PATH,
        width: boardConst.CAPTURER.NIR_WIDTH,
        height: boardConst.CAPTURER.NIR_HEIGHT,
        preview_width: boardConst.CAPTURER.NIR_PREVIEW_WIDTH,
        preview_height: boardConst.CAPTURER.NIR_PREVIEW_HEIGTH,
        preview_mode: boardConst.CAPTURER.NIR_PREVIEW_MODE,
        preview_screen_index: boardConst.CAPTURER.NIR_PREVIEW_SCREEN_INDEX
    },

    init: function () {
        capturer.worker.beforeLoop(this.options1)
        capturer.worker.beforeLoop(this.options2)
        capturer.capturerEnable(false,boardConst.CAPTURER.capturerNirId)
    },
    loop: function () {
        capturer.worker.loop(this.options1)
        capturer.worker.loop(this.options2)
    }
}

driver.face = {
    options : {
        dbPath: "/app/data/vgmj.db",
        rgbPath: boardConst.CAPTURER.RGB_PATH,
        nirPath: boardConst.CAPTURER.NIR_PATH,
        capturerRgbId: boardConst.CAPTURER.capturerRgbId,
        capturerNirId: boardConst.CAPTURER.capturerNirId,
        fflitMax: 5000, //人脸注册上限
        pictureType: 2, //照片类型 0 JPG 1 BMP 2 PNG
        score: 0.6,
        mapPath: "/app/path.txt",
        // 保存完整人脸照片路径
        saveFacePath: "/app/code/resource/image/face_whole.png",
        // 保存人脸缩略图照片路径
        saveFaceThumbnailPath: "/app/code/resource/image/face_thumb.png"
    },
    init: function () {
        face.worker.beforeLoop(this.options)
        face.regSnapshot()
        this.mode(0)
        // this.delete()
     
    },
    loop: function () {
        face.worker.loop()
    },
    // 0 人脸识别模式；1 人脸注册模式
    mode: function (value) {
        face.setRecgMode(value)
    },
    //人脸线程启用开关
    status: function (flag) {
        face.faceSetEnable(flag)
    },
    //人脸注册
    reg: function (id, data) {
        return face.addFaceFeatures(id, data);
    },
    //清空人脸数据
    clean: function () {
        // 清空人脸，需要在初始化人脸组件之前才能执行，否则报错
        face.faceFeaturesClean()
        dxCommon.systemBrief("rm -rf /app/data/vgmj.db")
        return !std.exist("/app/data/vgmj.db")
    }
}

export default driver
