import utils from '../common/utils/utils.js'
import config from '../../dxmodules/dxConfig.js'
import mqtt from '../../dxmodules/dxMqtt.js'
import std from '../../dxmodules/dxStd.js'
import ntp from '../../dxmodules/dxNtp.js'
import common from '../../dxmodules/dxCommon.js'
import driver from '../driver.js'
import bus from '../../dxmodules/dxEventBus.js'
import mqttService from './mqttService.js'
import logger from '../../dxmodules/dxLogger.js'
const configService = {}
// 匹配以点分十进制形式表示的 IP 地址，例如：192.168.0.1。
const ipCheck = v => /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?).){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/.test(v)
const ipOrDomainCheckWithPort = v => /^(?:(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)|(?:[a-zA-Z0-9-]+\.)+[a-zA-Z]{2,})(:\d{1,5})?$/.test(v);

//正整数
const regpCheck = v => /^[1-9]\d*$/.test(v)
//非负整数
const regnCheck = v => /^([1-9]\d*|0{1})$/.test(v)
/**
 * 所有支持的配置项的检验规则以及设置成功后的回调
 * rule：校验规则，返回true校验成功，false校验失败
 * callback：配置修改触发回调
 */
const supported = {

    face: {
        similarity: { rule: v => typeof v == 'number' && v >= 0 && v <= 1, callback: v => driver.face.faceUpdateConfig({ score: v }) },
        livenessOff: { rule: v => [0, 1].includes(v), callback: v => driver.face.faceUpdateConfig({ livingCheckEnable: v }) },
        livenessVal: { rule: v => typeof v == 'number' && v >= 0 && v <= 1, callback: v => driver.face.faceUpdateConfig({ livingScore: v }) },
        showNir: { rule: v => [0, 1].includes(v), callback: v => driver.capturer.showNir(v) },
        detectMask: { rule: v => [0, 1].includes(v), callback: v => driver.face.faceUpdateConfig({ detectMaskEnable: v }) },
        stranger: { rule: v => [0, 1, 2].includes(v) },
        voiceMode: { rule: v => [0, 1, 2].includes(v) },
        voiceModeDate: { rule: v => typeof v == 'string' },
    },
    mqtt: {
        addr: { rule: ipOrDomainCheckWithPort },
        clientId: { rule: v => typeof v == 'string' },
        username: { rule: v => typeof v == 'string' },
        password: { rule: v => typeof v == 'string' },
        qos: { rule: v => [0, 1, 2].includes(v) },
        prefix: { rule: v => typeof v == 'string' },
        willtopic: { rule: v => typeof v == 'string' },
        onlinecheck: { rule: v => [0, 1, 2].includes(v) },
        timeout: { rule: regpCheck },
    },
    net: {
        // 根据组件参数
        type: { rule: v => [0, 1, 2, 4].includes(v) },
        dhcp: { rule: v => [1, 2, 3].includes(v) },
        ip: { rule: ipCheck },
        gateway: { rule: ipCheck },
        dns: { rule: v => !v.split(",").some(ip => !ipCheck(ip)) },
        mask: { rule: ipCheck },
        mac: { rule: v => typeof v == 'string' },
        ssid: { rule: v => typeof v == 'string' },
        psk: { rule: v => typeof v == 'string' },
    },
    ntp: {
        // ntp开关
        ntp: { rule: v => [0, 1].includes(v) },
        server: { rule: ipCheck },
        gmt: { rule: v => typeof v == 'number' && v >= 0 && v <= 24, callback: v => ntp.updateGmt(v) },
    },
    sys: {
        uuid: { rule: v => typeof v == 'string' },
        model: { rule: v => typeof v == 'string' },
        mode: { rule: v => typeof v == 'string', callback: v => setMode(v) },
        sn: { rule: v => typeof v == 'string' },
        version: { rule: v => typeof v == 'string' },
        releaseDate: { rule: v => typeof v == 'string' },
        nfc: { rule: v => [0, 1].includes(v) },
        nfcIdentityCardEnable: { rule: v => [1, 3].includes(v) },
        pwd: { rule: v => [0, 1].includes(v) },
        strangerImage: { rule: v => [0, 1].includes(v) },
        accessImageType: { rule: v => [0, 1].includes(v) },
        interval: { rule: regnCheck },
    },
    access: {
        relayTime: { rule: regpCheck },
        offlineAccessNum: { rule: regpCheck },
        tamperAlarm: { rule: v => [0, 1].includes(v) },
    },
    base: {
        firstLogin: { rule: v => [0, 1].includes(v) },
        brightness: { rule: regnCheck, callback: v => driver.face.setDisplayBacklight(v) },
        brightnessAuto: { rule: v => [0, 1].includes(v) },
        showIp: { rule: v => [0, 1].includes(v), callback: v => driver.screen.hideIp(v) },
        showSn: { rule: v => [0, 1].includes(v), callback: v => driver.screen.hideSn(v) },
        appMode: { rule: v => [0, 1].includes(v), callback: v => driver.screen.appMode(v) },
        screenOff: { rule: regnCheck, callback: v => bus.fire("screenManagerRefresh") },
        screensaver: { rule: regnCheck, callback: v => bus.fire("screenManagerRefresh") },
        volume: { rule: regnCheck, callback: v => driver.alsa.volume(v) },
        password: { rule: v => typeof v == 'string' && v.length >= 8 },
        language: { rule: v => ["EN", "CN"].includes(v), callback: v => driver.screen.changeLanguage() },
        showProgramCode: { rule: v => [0, 1].includes(v) },
        showIdentityCard: { rule: v => [0, 1].includes(v) },
        luminanceWhite: { rule: v => typeof v == 'number' && v >= 0 && v <= 100, callback: v => driver.pwm.luminanceWhite(v) },
        luminanceNir: { rule: v => typeof v == 'number' && v >= 0 && v <= 100, callback: v => driver.pwm.luminanceNir(v) },
    },
    passwordAccess: {
        passwordAccess: { rule: v => [0, 1].includes(v) },
    }
}
// 需要重启的配置
const needReboot = ["sys.nfc", "sys.nfcIdentityCardEnable", "ntp"]
configService.needReboot = needReboot

//修改模式
function setMode(params) {
    common.systemWithRes(`echo 'app' > /etc/.app_v1`, 2)
    common.setMode(params)
}
/**
 * 配置json校验并保存
 * @param {object} data 配置json对象
 * @returns true(校验并保存成功)/string(错误信息)
 */
configService.configVerifyAndSave = function (data) {
    let netFlag = false
    let mqttFlag = false
    let isReboot = false
    for (const key in data) {
        if (key == 'net') {
            netFlag = true
        }
        if (key == 'mqtt') {
            mqttFlag = true
        }
        if (!supported[key]) {
            return key + " not supported"
        }
        const item = data[key];
        if (typeof item != 'object') {
            // 必须是一个组
            continue
        }
        if (needReboot.includes(key)) {
            isReboot = true
        }
        for (const subKey in item) {
            let option = supported[key][subKey]
            if (isEmpty(option)) {
                return subKey + " not supported"
            }
            const value = item[subKey];
            if (needReboot.includes(key + "." + subKey)) {
                isReboot = true
            }
            if (!option.rule || option.rule(value)) {
                // 没有校验规则默认校验通过
                config.set(key + "." + subKey, value)
                if (option.callback) {
                    // 执行配置设置回调
                    option.callback(value)
                }
            } else {
                return value + " check failure"
            }
        }
    }
    config.save()
    // 检查需要重启的配置，3秒后重启
    if (isReboot) {
        driver.screen.upgrade({ title: "confirm.restartDevice", content: "confirm.restartDeviceDis" })
        common.asyncReboot(3)
    }
    if (netFlag) {
        //等待 1 秒 因为需要返回 mqtt
        std.setTimeout(() => {
            bus.fire("switchNetworkType", config.get("net.type"))
        }, 1000);
    }
    if (mqttFlag) {
        let option = { mqttAddr: config.get("mqtt.addr"), clientId: config.get('mqtt.clientId') + std.genRandomStr(3), subs: mqttService.getTopics(), username: config.get("mqtt.username"), password: config.get("mqtt.password"), qos: config.get("mqtt.qos"), willTopic: config.get("mqtt.willTopic"), willMessage: JSON.stringify({ "uuid": config.get("sys.uuid") }) }
        logger.info("重启mqtt", JSON.stringify(option))
        //销毁 mqtt 重新 init
        bus.fire(mqtt.RECONNECT, option)
    }
    return true
}

// 判空
function isEmpty(value) {
    return value === undefined || value === null
}
export default configService