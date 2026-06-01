import logger from "../dxmodules/dxLogger.js"
import std from '../dxmodules/dxStd.js'
import bus from "../dxmodules/dxEventBus.js"
import dxos from '../dxmodules/dxOs.js'
import config from '../dxmodules/dxConfig.js'
import dxMap from '../dxmodules/dxMap.js'
import dxFacial from '../dxmodules/dxFacial.js'
import dxCapcal from '../dxmodules/dxCapcal.js'
import dxCamera from '../dxmodules/dxCamera.js'
import audio from '../dxmodules/dxAudio.js'
import fingerMz from '../dxmodules/dxFingerMz.js'
import fingerZaz from '../dxmodules/dxFingerZaz.js'
import pwm from '../dxmodules/dxPwm.js'
import ntp from '../dxmodules/dxNtp.js'
import gpio from "../dxmodules/dxGpio.js"
import dxNfcCard from "../dxmodules/dxNfcCard.js"
import watchdog from "../dxmodules/dxWatchdog.js"
import dxGpioKey from "../dxmodules/dxGpioKey.js"
import net from "../dxmodules/dxNetwork.js"
import dxDriver from "../dxmodules/dxDriver.js"
import dxDisplay from "../dxmodules/dxDisplay.js"
import sqliteService from "./service/sqliteService.js"
import mqttService from "./service/mqttService.js"
import mqtt from '../dxmodules/dxMqttClient.js'
import dxVgCode from './common/utils/codeUtils.js'
import dxUartBle from '../dxmodules/dxVgBle.js'
import utils from "./common/utils/utils.js"
import common from "../dxmodules/dxCommon.js"

const driver = {}

driver.config = {
    init: function () {
        config.init()
        let mac = dxos.getUuid2mac(19)
        let uuid = dxos.getSn(19)
        if (!config.get('sys.mac') && mac) {
            config.set('sys.mac', mac)
        }
        if (!config.get('sys.uuid') && uuid) {
            config.set('sys.uuid', uuid)
        }
        //如果 sn 为空先用设备 uuid
        if (!config.get('sys.sn') && uuid) {
            config.set('sys.sn', uuid)
        }
        if (!config.get('mqtt.clientId') && uuid) {
            config.set('mqtt.clientId', uuid)
        }
        if (driver.device.finger) {
            if (dxDriver.DRIVER.MODEL == "vf105") {
                config.set('sys.model', "vf107")
            } else if (dxDriver.DRIVER.MODEL == "vf114") {
                config.set('sys.model', "vf124")
            }
        } else {
            config.set('sys.model', dxDriver.DRIVER.MODEL)
        }
        
        config.save()
    }
}

driver.screen = {
    accessFail: function () {
        bus.fire('accessRes', false)
    },
    accessSuccess: function () {
        bus.fire('accessRes', true)
    },
    upgrade: function (data) {
        bus.fire('upgrade', data)
    },
    getCard: function (card) {
        let language = config.get("base.language") || "CN";
        driver.audio.play(`/app/code/resource/wav/${language}/read.wav`)
        bus.fire('getCard', card)
    },
    hideSn: function (data) {
        bus.fire('hideSn', data)
    },
    appMode: function (data) {
        bus.fire('appMode', data)
    },
    hideIp: function (data) {
        bus.fire('hideIp', data)
    },
    changeLanguage: function () {
        bus.fire('changeLanguage')
    },
    reload: function () {
        bus.fire('reload')
    },
    error: function (msg) {
        bus.fire('showMessage', { status: false, msg: msg })
    },
    success: function (msg) {
        bus.fire('showMessage', { status: true, msg: msg })
    },
}

driver.sqlite = {
    DB_PATH: '/data/db/app.db',
    init: function () {
        std.ensurePathExists(driver.sqlite.DB_PATH)
        sqliteService.init(driver.sqlite.DB_PATH)
    }
}

driver.pwm = {
    init: function () {
        let nirLuminance = config.get("base.nirBrightness")
        let whiteLuminance = config.get("base.brightness")
        if (dxDriver.DRIVER.MODEL == "vf203") {
            pwm.init(dxDriver.PWM.NIR_SUPPLEMENT_CHANNEL);
            pwm.setPower(nirLuminance, dxDriver.PWM.NIR_SUPPLEMENT_CHANNEL);
        } else if (dxDriver.DRIVER.MODEL == "vf202" || dxDriver.DRIVER.MODEL == "vf114" || dxDriver.DRIVER.MODEL == "vf105") {
            pwm.init(dxDriver.PWM.WHITE_SUPPLEMENT_CHANNEL);
            pwm.init(dxDriver.PWM.NIR_SUPPLEMENT_CHANNEL);
            pwm.setPower(whiteLuminance, dxDriver.PWM.WHITE_SUPPLEMENT_CHANNEL);
            pwm.setPower(nirLuminance, dxDriver.PWM.NIR_SUPPLEMENT_CHANNEL);
        }
    },
    setWhitePower: function (whiteLuminance) {
        pwm.setPower(whiteLuminance, dxDriver.PWM.WHITE_SUPPLEMENT_CHANNEL);
    },
    setNirPower: function (nirLuminance) {
        pwm.setPower(nirLuminance, dxDriver.PWM.NIR_SUPPLEMENT_CHANNEL);
    }
}

driver.audio = {
    init: function () {
        audio.init();
        audio.setVolume(config.get("base.volume"))
    },
    play: function (src) {
        audio.play(src)
    },
    ttsPlay: function (text) {
        let type = config.get("base.language") == "CN" ? 0 : 1
        audio.playTxt(text, type)
    },
    volume: function (volume) {
        if (volume === undefined || volume === null) {
            return audio.getVolume()
        } else if (volume < 0 || volume > 10) {
            throw new Error('输入值必须在0到10之间');
        } else {
            audio.setVolume(volume)
        }
    },
    interrupt: function () {
        audio.interrupt()
    },
    clearCache: function () {
        audio.clearCache()
    }
}

driver.nfc = {
    NFC_CARD_RECEIVE: "nfcCardReceive",
    EID_RECEIVE: "eidReceive",
    init: function () {
        dxNfcCard.init();
    },
    eidInit: function () {
        try {
            dxNfcCard.eidInit({ config: {
                device_model: dxDriver.DRIVER.MODEL
            } })
        } catch (error) {
            logger.error(error)
        }
    },
    eidActive: function (code) {
        const options = {
            codeMsg: code,
            version: config.get("sys.appVersion"),
            macAddr: config.get("sys.mac")
        };
        return dxNfcCard.eidActive(options);
    },
    getConfig: function () {
        return dxNfcCard.getConfig();
    },
    setConfig: function (options) {
        dxNfcCard.updateConfig(options);
    },
    setCallbacks: function (callbacks) {
        dxNfcCard.setCallbacks(callbacks);
    },
    loop: function () {
        dxNfcCard.loop();
    },
}

driver.face = {
    options: {
        det_max: 1,
        liv_threshold: 5,
        rec_timeout_ms: 5000,
        det_timeout_ms: 100000,
        nir: {
            preview_width: dxDriver.DISPLAY.WIDTH * (120 / 600),
            preview_height: dxDriver.DISPLAY.HEIGHT * (150 / 1024),
            preview_top: dxDriver.DISPLAY.HEIGHT * (60 / 1024),
        }
    },
    init: function () {
        this.options.com_threshold = config.get("face.similarity")
        this.options.liv_enable = config.get("face.livenessOff")
        this.options.liv_threshold = config.get("face.livenessVal")
        this.options.det_timeout_ms = config.get("face.recheck") === 1 ? 8000 : 100000
        dxFacial.init(this.options);
        // 默认关闭红外摄像头预览
        this.capPreviewEnable(config.get("face.showNir"))
        this.status(0)
    },
    capPreviewEnable: function (enable) {
        dxCamera.capPreviewEnable(1, enable);
    },
    getTrackingBox: function () {
        let data = dxFacial.getDetectionData();
        return data
    },
    status: function (flag) {
        dxFacial.setStatus(flag);
    },
    setCallbacks: function (callbacks) {
        dxFacial.setCallbacks(callbacks);
    },
    loop: function () {
        dxFacial.loop();
    },
    // 配置管理
    setConfig: function (options) {
        dxFacial.setConfig(options);
    },
    getConfig: function () {
        return dxFacial.getConfig();
    },
    // 特征值管理
    getFeaByCap: function (timeout) {
        return dxFacial.getFeaByCap(timeout);
    },
    getFeaByFile: function (picPath) {
        return dxFacial.getFeaByFile(picPath);
    },
    addFea: function (userId, feature) {
        try {
            let ret = dxFacial.addFea(userId, feature)
            return ret;
        } catch (error) {
            logger.error(error)
            return error.message;
        }

        // TODO 这个逻辑很奇怪，异常没有抛上去，必须try catch return
        // logger.info("addFea start", userId, feature)
        // let ret = dxFacial.addFea(userId, feature)
        // logger.info("addFea ret", ret)
        // return ret;
    },
    updateFea: function (userId, feature) {
        try {
            return dxFacial.updateFea(userId, feature);
        } catch (error) {
            logger.error(error)
            return error.message;
        }
    },
    clean: function () {
        return dxFacial.cleanFea()
    },
    deleteFea: function (userId) {
        return dxFacial.deleteFea(userId)
    },
}

driver.display = {
    setBacklight: function (backlight) {
        dxDisplay.setBacklight(backlight)
    },
}

driver.capcal = {
    init: function () {
        dxCapcal.init()
    },
    deinit: function () {
        dxCapcal.deinit()
    },
    calculate: function (cnt) {
        return dxCapcal.calculate(cnt)
    },
    getBox: function (cnt) {
        return dxCapcal.getBox(cnt)
    }
}

driver.ntp = {
    init: function () {
        ntp.startSync(config.get("ntp.server"))
    }
}

driver.uartBle = {
    init: function () {
        dxUartBle.init()
        let bleKey = config.get("sys.bleKey") || "01234567890123456789012345678901"
        dxUartBle.slave.setConfig(bleKey)
    },
    setCallbacks: function (callbacks) {
        dxUartBle.slave.setCallbacks(callbacks)
    },
    loop: function () {
        dxUartBle.loop()
    },
    send: function (data) {
        let connId = dxMap.get("connId").get("connId")
        if (connId) {
            dxUartBle.slave.sendMessage(data, connId)
        }
    }
}

driver.uartCode = {
    RECEIVE_MSG: '__UART_RECEIVE_MSG__',
    init: function () {
        if (dxDriver.DRIVER.MODEL == 'vf105') {
            dxVgCode.init('/dev/ttySLB1', '115200-8-N-1')
        } else if (dxDriver.DRIVER.MODEL == 'vf114') {
            dxVgCode.init('/dev/ttySLB3', '115200-8-N-1')
        }
    },
    setCallbacks: function (callbacks) {
        dxVgCode.setCallbacks(callbacks)
    },
    loop: function () {
        dxVgCode.loop()
    }
}

driver.sync = {
    // 异步转同步实现优化
    request: function (topic, timeout = 2000) {
        const map = dxMap.get("SYNC");
        // 并发重复topic丢弃
        if (map.get(topic)) {
            logger.error("当前已有相同的topic正在等待，请稍后再试")
            return;
        }
        map.put(topic, "waiting");
        const interval = 10;
        const maxCount = Math.ceil(timeout / interval);
        let count = 0;
        let data = "waiting";
        while (count < maxCount) {
            data = map.get(topic);
            if (data !== "waiting") break;
            std.sleep(interval);
            count++;
        }
        // 只有在不是"waiting"时才返回data，否则返回undefined
        map.del(topic);
        if (data === "waiting" || data === undefined) {
            return;
        }
        return data;
    },
    response: function (topic, data) {
        const map = dxMap.get("SYNC");
        // 只有在topic为"waiting"时才允许响应
        if (map.get(topic) !== "waiting") {
            logger.error("没有正在等待的topic，禁止回复")
            return;
        }
        map.put(topic, data);
    }
}

driver.net = {
    RECONNECT: "__NET_RECONNECT__",
    SCAN_WIFI: "__NET_SCAN_WIFI__",
    WIFI_LIST: "__NET_WIFI_LIST__",
    CONNECTED_CHANGED: "__NET_CONNECTED_CHANGED__",
    DISCONNECT: "__NET_DISCONNECT__",
    init: () => {
        bus.newWorker('netWorker', '/app/code/src/worker/netWorker.js')
    },
    disconnect: () => {
        bus.fire(driver.net.DISCONNECT)
    },
    reconnect: () => {
        bus.fire(driver.net.RECONNECT)
    },
    getNetParam: net.getNetParam,
    isConnected: net.isConnected,
    getNetMac: net.getNetMac
}

driver.mqtt = {
    REINIT: "__MQTT_REINIT__",
    SEND_MSG: "__MQTT_SEND_MSG__",
    RECEIVE_MSG: "__MQTT_RECEIVE_MSG__",
    CONNECTED_CHANGED: "__MQTT_CONNECTED_CHANGED__",
    RESTART_HEARTBEAT: "__MQTT_RESTART_HEARTBEAT__",
    UNSUBSCRIBE: "__MQTT_UNSUBSCRIBE__",
    init: () => {
        bus.newWorker('mqttWorker', '/app/code/src/worker/mqttWorker.js')
    },
    reinit: () => {
        // 重连mqtt，针对换了mqtt连接信息时需要执行，没换不用重连
        bus.fire(driver.mqtt.REINIT)
    },
    send: function (topic, payload) {
        bus.fire(driver.mqtt.SEND_MSG, {
            topic, payload
        })
    },
    // 修改了心跳相关配置需要重启心跳定时器，调这个
    restartHeartbeat: () => {
        bus.fire(driver.mqtt.RESTART_HEARTBEAT)
    },
    isConnected: () => {
        return mqtt.getNative() && mqtt.isConnected()
    },
}

driver.gpio = {
    init: function () {
        gpio.init()
        gpio.request(dxDriver.GPIO.RELAY0)
    },
    open: function () {
        gpio.setValue(dxDriver.GPIO.RELAY0, 1);

        let relayTime = config.get("access.relayTime") * 1000

        // 记录最后关门时间
        const relayTopic = dxMap.get("RELAY_TIMERS")
        const deadlineKey = "RELAY0_deadline"
        const now = new Date().getTime()
        const deadline = now + relayTime
        relayTopic.put(deadlineKey, deadline)

        std.setTimeout(() => {
            // 判断是否超过截止时间
            const latest = relayTopic.get(deadlineKey)
            const nowTs = new Date().getTime()
            if (typeof latest === 'number' && nowTs >= latest) {
                // 只有在火警未触发的情况下才关闭继电器，火警触发后继电器需要常开
                if (config.get("access.fireStatus") === 0) {
                    gpio.setValue(dxDriver.GPIO.RELAY0, 0);
                }
            }
        }, relayTime)
    },
    close: function () {
        // 只有在火警未触发的情况下才关闭继电器，火警触发后继电器需要常开
        if (config.get("access.fireStatus") === 0) {
            gpio.setValue(dxDriver.GPIO.RELAY0, 0);
        }
    },
    setValue: function (value) {
        if (config.get("access.fireStatus") === 0) {
            gpio.setValue(dxDriver.GPIO.RELAY0, value)
        }
    }
}

driver.gpiokey = {
    RECEIVE_MSG: "__GPIOKEY_RECEIVE_MSG__",
    TYPE: {
        DOOR_SENSOR: 0, // 门磁
        FIRE_ALARM: 1, // 火警
        TAMPER_ALARM: 2, // 防拆
    },
    VALUE: {
        OPEN: 1, // 开
        CLOSE: 0, // 关
    },
    init: function () {
        dxGpioKey.init()
        // 默认需要延续火警的状态
        if (config.get("access.fire") == 1 && config.get("access.fireStatus") == 1) {
            std.setTimeout(() => {
                bus.fire(driver.gpiokey.RECEIVE_MSG, { code: 1, value: 1 })
            }, 5000)
        }
    },
    sensorChanged: function (type, value) {
        let prefix = config.get("mqtt.prefix") || ''
        driver.mqtt.send(prefix + "access_device/v2/event/alarm", JSON.stringify(mqttService.mqttReply(std.genRandomStr(10), { type: type, value: value }, mqttService.CODE.S_000)))
    },
    loop: function () {
        dxGpioKey.loop()
    },
    setCallbacks: function (callbacks) {
        dxGpioKey.setCallbacks(callbacks);
    },
    statusConfig: function (fire) {
        config.setAndSave("access.fire", fire)
        if (fire === 0) {
            // 从配置上关闭火警时，也需要把火警状态重置
            config.setAndSave("access.fireStatus", 0)
            // 关闭继电器
            driver.gpio.close()
        }
    },
    controlFire: function (fire) {
        if (config.get("access.fire") == 1) {
            if (fire == 1) {
                // 火警触发
                print('火警触发')
                driver.gpio.open()
                // 上报火警状态
                bus.fire(driver.gpiokey.RECEIVE_MSG, { code: 1, value: 1 })
            } else {
                // 火警解除
                print('火警解除')
                // 从配置上关闭火警时，也需要把火警状态重置
                config.setAndSave("access.fireStatus", 0)
                // 关闭继电器
                driver.gpio.close()
            }
        }
    }
}

driver.finger = {
    RECEIVE_MSG: "__FINGER_RECEIVE_MSG__",
    flag: true,
    // 指纹模块类型：根据设备型号选择（vf114 -> MZ，其它 -> ZAZ）
    // 说明：driver.finger 对外统一为“0表示成功、非0表示失败；索引统一使用0-based”
    _type: null,     // 'mz' | 'zaz'
    _impl: null,     // fingerMz | fingerZaz
    _total: 1024,    // 统一对外的最大指纹数量
    _isZaz: function () {
        return (dxDriver.DRIVER.MODEL !== "vf114")
    },
    _ensureImpl: function () {
        if (this._impl) return
        if (this._isZaz()) {
            this._type = "zaz"
            this._impl = fingerZaz
            this._total = 1024
        } else {
            this._type = "mz"
            this._impl = fingerMz
            this._total = 1024
        }
    },
    _ok: function (bool) {
        return bool ? 0 : -1
    },
    /** MZ：不少命令成功时返回整块 resp.data(Uint8Array)。对外统一为首字节确认码，便于与 sync/数字判断一致。*/
    _ackBuf: function (res) {
        if (typeof res === "number") {
            return res
        }
        if (res != null && typeof res === "object") {
            let b = res[0]
            if (typeof b === "number") {
                return b & 0xff
            }
        }
        return res
    },
    init: function () {
        this._ensureImpl()
        let options
        if (this._type === "zaz") {
            options = {
                type: 3,
                path: '/dev/ttySLB1',
                baudrate: '115200-8-N-1'
            }
        } else {
            options = {
                id: 'fingerUart',
                total: this._total,
                timeout: 500,
                type: '3',
                path: '/dev/ttySLB0',      //测试时是ttySLB0 生产时是ttySLB3替换的扫码模组
                baudrate: '57600-8-N-2'
            }
        }
        this._impl.init(options)
        this.start()
        this.controlLed("BLUE")
    },
    loop: function () {
        const statusMap = dxMap.get("FINGER_STATUS")
        if(statusMap && statusMap.get("status") == "start"){
            try {
                let index = driver.finger.compare(0, 1024)
                if(typeof index === 'number' && index != -1 && index != -2){
                    bus.fire(driver.finger.RECEIVE_MSG, {type: 500, index: index})
                }
            } catch (error) {
                logger.error("finger.loop compare fail: " + error.message)
            }
        }
    },
    getIndex: function() {
        try {
            this._ensureImpl()
            if (this._type === "zaz") {
                const ret = this._impl.getEmptyId(1, this._total)
                return ret
            }
            return this._impl.getIndex()
        } catch (error) {
            logger.error("finger.getIndex fail: " + error.message)
            return -1
        }
    },
    getEnrollImage: function() {
        try {
            this._ensureImpl()
            if (this._type === "zaz") {
                // ZAZ 无 enroll/verify 区分，复用 getImage
                return this.getImage()
            }
            return this._ackBuf(this._impl.getEnrollImage())
        } catch (error) {
            logger.error("finger.getEnrollImage fail: " + error.message)
        }
    },
    getImage: function () {
        try {
            this._ensureImpl()
            if (this._type === "zaz") {
                return this._ok(this._impl.getImage())
            }
            return this._ackBuf(this._impl.getImage())
        } catch (error) {
            logger.error("finger.getImage fail: " + error.message)
        }
    },
    start: function () {
        const statusMap = dxMap.get("FINGER_STATUS")
        if (statusMap.get("status") != "start") {
            statusMap.put("status", "start")
        }
    },
    stop: function () {
        const statusMap = dxMap.get("FINGER_STATUS")
        if (statusMap.get("status") != "stop") {
            statusMap.put("status", "stop")
            std.sleep(200)
        }
    },
    delete: function(fingerId) {
        return this.deleteChar(fingerId, 1)
    },
    genChar: function(bufferId) {
        try {
            this._ensureImpl()
            if (this._type === "zaz") {
                print("finger.genChar bufferId: ", bufferId)
                return this._ok(this._impl.generate(bufferId - 1))
            }
            return this._ackBuf(this._impl.genChar(bufferId))
        } catch (error) {
            logger.error("finger.genChar fail: " + error.message)
            return -1
        }
    },
    regModel: function() {
        try {
            this._ensureImpl()
            if (this._type === "zaz") {
                // 这里写死 (3, 0)，合并3个特征，并存储到索引0
                return this._ok(this._impl.merge(3, 0))
            }
            return this._ackBuf(this._impl.regModel())
        } catch (error) {
            logger.error("finger.regModel fail: " + error.message)
        }
    },
    deleteChar: function(fingerId, num) {
        try {
            this.stop()
            this._ensureImpl()
            if (this._type === "zaz") {
                let res = this._ok(this._impl.delChar(fingerId, fingerId))
                return res
            }
            return this._ackBuf(this._impl.deletChar(fingerId, num))
        } catch (error) {
            logger.info("finger.delete error:" + error.message)
            return -1
        } finally {
            this.start()
        }
    },
    upChar: function(bufferId = 1) {
        try {
            this._ensureImpl()
            if (this._type === "zaz") {
                const hex = this._impl.upChar(bufferId - 1)
                if (!hex) return null
                // 统一返回 Uint8Array/ArrayBuffer 语义，供 common.arrayBufferToHexString 处理
                return common.hexStringToArrayBuffer(hex)
            }
            return this._impl.upChar(bufferId)
        } catch (error) {
            logger.error("finger.upChar fail: " + error.message)
        }
    },
    loadChar: function(index, bufferId = 1) {
        try {
            this._ensureImpl()
            if (this._type === "zaz") {
                return this._ok(this._impl.loadChar(index, bufferId - 1))
            }
            return this._ackBuf(this._impl.loadChar(bufferId, index))
        } catch (error) {
            logger.error("finger.loadChar fail: " + error.message)
        }
    },
    downChar: function(char, bufferId = 1) {
        try {
            this._ensureImpl()
            if (this._type === "zaz") {
                // ZAZ 接收 hex string
                let hex
                if (typeof char === "string") {
                    hex = char
                } else if (char instanceof ArrayBuffer) {
                    hex = common.arrayBufferToHexString(char)
                } else {
                    // Uint8Array / 其它 array-like
                    hex = common.uint8ArrayToHexString(new Uint8Array(char))
                }
                return this._ok(this._impl.downChar(bufferId - 1, hex))
            }
            // MZ 接收 ArrayBuffer/Uint8Array：如果传入的是 hex string，这里转成 Uint8Array
            let payload = char
            if (typeof char === "string") {
                payload = common.hexStringToUint8Array(char)
            }
            return this._ackBuf(this._impl.downChar(bufferId, payload))
        } catch (error) {
            logger.error("finger.downChar fail: " + error.message)
        }
    },
    search: function(bufferId, index, num) {
        try {
            this._ensureImpl()
            if (this._type === "zaz") {
                const found = this._impl.search(bufferId - 1, 1, 1024)
                if (found === false || found === null || found === undefined) {
                    return { code: 1, pageIndex: -1, score: 0 }
                }
                return { code: 0, pageIndex: found, score: 100 }
            }
            return this._impl.search(bufferId, index, num)
        } catch (error) {
            logger.error("finger.search fail: " + error.message)
        }
    },
    storeChar: function(index, bufferId = 1) {
        try {
            this._ensureImpl()
            if (this._type === "zaz") {
                // 参数顺序相反：keyId(index) + bufferNum(bufferId)
                return this._ok(this._impl.storeChar(index, bufferId - 1))
            }
            return this._ackBuf(this._impl.storeChar(bufferId, index))
        } catch (error) {
            logger.error("finger.storeChar fail: " + error.message)
        }
    },
    insert: function(char) {
        try {
            this.stop()
            let res = this.downChar(char, 1)
            if (res != 0) {
                return -1
            }
            let index = this.getIndex()
            if (typeof index !== "number" || index < 0) {
                return -1
            }
            res = this.storeChar(index, 1)
            if (res != 0) {
                return -1
            }
            return index
        } catch (error) {
            logger.info("finger.insert error:" + error.message)
            return -1
        } finally {
            this.start()
        }
        
    },
    clear: function() {
        try {
            this.stop()
            this._ensureImpl()
            if (this._type === "zaz") {
                logger.info("enrollCount:" + this._impl.getEnrollCount(1, this._total))
                if (!this._impl.getEnrollCount(1, this._total)) {
                    return 0
                }
                return this._ok(this._impl.delChar(1, this._total))
            }
            return this._ackBuf(this._impl.clearChar())
        } catch (error) {
            logger.info("finger.compare fail: " + error.message)
            return -1
        } finally {
            this.start()
        }
    },
    // 指纹对比，返回对比到的索引和得分
    compare: function(index = 0, num = 0){
        // 1，发送获取图像指令
        // 2，生成特征(bufferId默认为1)
        // 3，指纹搜索(bufferId默认为1)
        try {
            let res = this.getImage()
            if(res != 0){
                return -1
            }
            res = this.genChar(1)
            if(res != 0){
                logger.info("finger.search 生成特征失败!")
                return -2
            }
            res = this.search(1, index, num)
            if(res != null && res.code != null && res.code == 0){
                logger.info("搜索到指纹、指纹验证成功、指纹索引：" + res.pageIndex + "，指纹得分: " + res.score)
                logger.info("finger.search: ", JSON.stringify(res))
                return res.pageIndex
            }
            return -3
        } catch (error) {
            logger.error("finger.compare fail: " + error.message)
        }
    },
    controlLed: function (color) {
        if (driver.device.finger && this._type === "mz") {
            try {
                std.sleep(500)
                fingerMz.controlLed(fingerMz.LED_COLOR[color])
            } catch (error) {
                logger.info(error)
            }
        }
    },
    getEnrollCount: function() {
        try {
            this._ensureImpl()
            if (this._type === "zaz") {
                const count = this._impl.getEnrollCount(1, this._total)
                if (count !== false) {
                    return count
                } else {
                    console.log("获取失败");
                }
            } else if (this._type === "mz") {
                const result = this._impl.getFingerNum();
                if (result && result.code === 0) {
                    return result.validNum
                } else {
                    console.log("读取失败");
                }
            }
        } catch (error) {
            logger.error("finger.search fail: " + error.message)
        }
    }
}

driver.device = {
    model: dxDriver.DRIVER.MODEL,
    // 是否支持指纹（通过 /app/finger 标志文件判断；仅检测一次）
    finger: (() => {
        try {
            return std.exist("/etc/app/finger.conf") || std.exist("/etc/app/.finger")
        } catch (e) {
            logger.error("检测指纹能力失败: ", e)
            return false
        }
    })(),
    // 是否已激活
    initial: (() => {
        try {
            return std.exist("/etc/app/.initial") || dxDriver.DRIVER.MODEL !== "vf105"
        } catch (e) {
            logger.error("获取initial失败: ", e)
            return false
        }
    })(),
}

driver.watchdog = {
    MAIN_WORKER: 1,
    CONTROLLER_WORKER: 2,
    init: function () {
        watchdog.init()
        this.enable(this.MAIN_WORKER, true)
        this.start(30000)
    },
    enable: function (channel, enable) {
        watchdog.enable(channel, enable)
    },
    start: function (timeout) {
        watchdog.start(timeout)
    },
    stop: function () {
        watchdog.stop()
    },
    restart: function (channel) {
        watchdog.restart(channel)
    },
}

export default driver
