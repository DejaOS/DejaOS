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
        config.set('sys.model', dxDriver.DRIVER.MODEL)

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
        driver.audio.play(`/app/code/resource/${config.get("base.language") == "CN" ? "CN" : "EN"}/wav/read.wav`)
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
    }
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
        if (config.get("sys.nfcIdentityCardEnable") == 3) {
            const configOptions = {
                appid: '1111111',//test appid
                sn: config.get("sys.sn"),
                device_model: "VF203"
            };
            let appVersion = config.get("sys.appVersion").split("_")[0];
            if (appVersion && appVersion !== "") {
                configOptions.device_model = appVersion;
            }
            dxNfcCard.eidInit({ config: configOptions })
        }
    },
    eidActive: function (code) {
        const options = {
            codeMsg: "",
            sn: config.get("sys.sn"),
            version: config.get("sys.appVersion"),
            macAddr: config.get("sys.mac")
        };
        options.codeMsg = code;
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
        // if (config.get('sys.nfc')) {
        dxNfcCard.loop();
        // }
    },
}

driver.face = {
    options: {
        detection_max_num: 1,
        liv_threshold: 5,
        detection_repeat_ms: 5000
    },
    init: function () {
        this.options.com_threshold = config.get("face.similarity")
        this.options.liv_enable = config.get("face.livenessOff")
        this.options.liv_threshold = config.get("face.livenessVal")
        dxFacial.init(this.options);
        // 默认关闭红外摄像头预览
        dxCamera.capPreviewEnable(1, config.get("face.showNir"));
    },
    getTrackingBox: function () {
        let data = dxFacial.getDetectionData();
        // data.push({ "id": 100, "status": 0, "rect": [20, 232, 110, 353], "qualityScore": 30, "livingScore": 0 })
        // data.push({ "id": 99, "status": 0, "rect": [81, 519, 180, 649], "qualityScore": 30, "livingScore": 0 })
        // data.push({ "id": 98, "status": 0, "rect": [110, 369, 207, 498], "qualityScore": 30, "livingScore": 0 })
        // data.push({ "id": 97, "status": 0, "rect": [159, 249, 257, 377], "qualityScore": 30, "livingScore": 0 })
        // data.push({ "id": 96, "status": 0, "rect": [196, 215, 296, 345], "qualityScore": 30, "livingScore": 0 })
        // data.push({ "id": 95, "status": 0, "rect": [240, 208, 340, 341], "qualityScore": 30, "livingScore": 0 })
        // data.push({ "id": 94, "status": 0, "rect": [303, 242, 403, 372], "qualityScore": 30, "livingScore": 0 })
        // data.push({ "id": 93, "status": 0, "rect": [354, 317, 456, 446], "qualityScore": 30, "livingScore": 0 })
        // data.push({ "id": 92, "status": 0, "rect": [306, 603, 376, 710], "qualityScore": 30, "livingScore": 0 })
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
    // 屏幕管理
    screenStatus: function (status) {

    },
    testRegister: function () {
        return dxFacial.testRegister()
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
        // TODO 待补充NTP配置,联动config.json
        ntp.startSync()
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
    init: () => {
        bus.newWorker('netWorker', '/app/code/src/worker/netWorker.js')
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

        let relayTime = config.get("access.relayTime")

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
        let prefix = config.get("mqttInfo.prefix") || ''
        driver.mqtt.send(prefix + "access_device/v2/event/alarm", JSON.stringify(mqttService.mqttReply(std.genRandomStr(10), { type: type, value: value }, mqttService.CODE.S_000)))
    },
    loop: function () {
        dxGpioKey.loop()
    },
    setCallbacks: function (callbacks) {
        dxGpioKey.setCallbacks(callbacks);
    },
}

driver.watchdog = {
    init: function () {
        // watchdog.open(1)
        // watchdog.enable(1)
        // watchdog.start(20000)
    },
    loop: function () {
        // watchdog.loop(1)
    },
    feed: function (flag, timeout) {
        // if (utils.isEmpty(this["feedTime" + flag]) || new Date().getTime() - this["feedTime" + flag] > 2000) {
        //     // 降低喂狗频率，间隔2秒喂一次
        //     this["feedTime" + flag] = new Date().getTime()
        //     watchdog.feed(flag, timeout)
        // }
    }
}

driver.autoRestart = {
    lastRestartCheck: new Date().getHours(),  // 初始化为当前小时数，而不是0
    init: function () {
        //     std.setInterval(() => {        // 检查是否需要整点重启
        //         const now = new Date()
        //         const currentHour = now.getHours()
        //         // 只有当小时数等于设定值，且不是上次检查过的小时时才执行
        //         if (currentHour === 3 && currentHour !== this.lastRestartCheck && now.getMinutes() === 0) {
        //             dxos.systemBrief('reboot')
        //         }
        //         // 更新上次检查的小时数
        //         this.lastRestartCheck = currentHour
        //     }, 60000)
    }
}

export default driver
