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
        // 注册相似度和识别相似度用的一个
        similarity: { rule: v => typeof v == 'number' && v >= 0 && v <= 1, callback: v => driver.face.faceUpdateConfig({ score: v }) },
        livenessOff: { rule: v => [0, 1].includes(v), callback: v => driver.face.faceUpdateConfig({ livingCheckEnable: v }) },
        livenessVal: { rule: v => typeof v == 'number' && v >= 0 && v <= 100, callback: v => driver.face.faceUpdateConfig({ livingScore: v }) },
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
        hour: { rule: v => typeof v == 'number' && v >= 0 && v <= 23 },
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
        devType: { rule: v => [0, 1, 2].includes(v) },
    },
    access: {
        relayTime: { rule: regpCheck },
        offlineAccessNum: { rule: regpCheck },
        tamperAlarm: { rule: v => [0, 1].includes(v) },
    },

    base: {
        firstLogin: { rule: v => [0, 1].includes(v) },
        brightness: { rule: (v) => { return regnCheck(v) && v >= 0 && v <= 100 }, callback: v => driver.face.setDisplayBacklight(v) },
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
    },
    passwordAccess: {
        passwordAccess: { rule: v => [0, 1].includes(v) },
    }
}
// 需要重启的配置
const needReboot = ["sys.nfc", "sys.nfcIdentityCardEnable", "ntp.npt", "ntp.server", "ntp.gmt"]
configService.needReboot = needReboot

//修改模式
function setMode (params) {
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
    // 验证数据格式
    if (!data || typeof data !== 'object') {
        return 'Invalid configuration data format';
    }
    // 存储所有需要保存的配置
    const configsToSave = [];
    const callbacksToExecute = [];
    // 遍历配置数据进行验证
    for (const [section, sectionData] of Object.entries(data)) {
        // 检查配置部分是否支持
        if (!supported[section]) {
            return `Unsupported configuration section: ${section}`;
        }
        if(section == 'net') {
            netFlag = true
        }
        if(section == 'mqtt') {
            mqttFlag = true
        }
        // 验证该部分的每个配置项
        for (const [key, value] of Object.entries(sectionData)) {
            // 检查配置项是否支持
            if (!supported[section][key]) {
                return `Unsupported configuration key: ${section}.${key}`;
            }
            // 使用对应的规则验证值
            const { rule, callback } = supported[section][key];
            if (!rule(value)) {
                return `Invalid value for ${section}.${key}: ${value}`;
            }
            // 存储配置和回调
            configsToSave.push({ section, key, value });
            if (callback && typeof callback === 'function') {
                callbacksToExecute.push({ callback, value });
            }
        }
    }
    // 所有验证通过后，统一保存配置
    for (const { section, key, value } of configsToSave) {
        config.set(section + "." + key, value);
    }
    config.save();
    // 执行所有回调
    for (const { callback, value } of callbacksToExecute) {
        callback(value);
    }
    // 检查是否需要重启
    const isReboot = Object.entries(data).some(([section, sectionData]) => {
        return needReboot.includes(section) ||
            Object.keys(sectionData).some(key => needReboot.includes(`${section}.${key}`))
    })
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
function isEmpty (value) {
    return value === undefined || value === null
}
export default configService