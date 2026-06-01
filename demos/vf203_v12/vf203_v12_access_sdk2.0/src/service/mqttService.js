import dxCommonUtils from "../../dxmodules/dxCommonUtils.js";
import dxos from "../../dxmodules/dxOs.js";
import config from "../../dxmodules/dxConfig.js";
import logger from "../../dxmodules/dxLogger.js";
import ota from "../../dxmodules/dxOta.js";
import std from "../../dxmodules/dxStd.js";
import driver from "../driver.js";
import configService from "./configService.js";
import sqliteService from "./sqliteService.js";
import faceService from "./faceService.js";
import dxMap from '../../dxmodules/dxMap.js'
import bus from "../../dxmodules/dxEventBus.js";
import api from './api.js'
import weComService from "./weComService.js";
const mqttService = {}

mqttService.receiveMsg = function (data) {
    // {"topic":"ddddd","payload":"{\n  \"msg\": \"world\"\n}"}
    logger.info('[mqttService] receiveMsg :' + JSON.stringify(data.topic))
    if (typeof mqttService[data.topic.match(/[^/]+$/)[0]] == 'function') {
        let payload = parsePayloadSafely(data)
        if (typeof payload == 'string') {
            return reply(data, payload, CODE.E_100)
        }
        mqttService[data.topic.match(/[^/]+$/)[0]](data)
    } else {
        logger.error("未实现的topic", data.topic)
    }
}

function parsePayloadSafely(event) {
    try {
        return JSON.parse(event.payload)
    } catch (error) {
        return "Invalid JSON format​​"
    }
}

// =================================权限增删改查=================================
/**
 * 添加权限
 */
mqttService.insertPermission = function (event) {
    let payload = JSON.parse(event.payload)
    let data = payload.data
    if (data.length > 100) {
        return reply(event, "data length should not be greater than 100", CODE.E_100)
    }
    let res = api.insertPermission(data)
    if (Array.isArray(res)) {
        return reply(event, res, CODE.E_100)
    }
    return reply(event)
}

/**
 * 查询权限
 */
mqttService.getPermission = function (event) {
    let payload = JSON.parse(event.payload)
    let data = payload.data
    let res = api.getPermission(data)
    return reply(event, res)
}

/**
 * 删除权限
 */
mqttService.delPermission = function (event) {
    let payload = JSON.parse(event.payload)
    let data = payload.data
    let res = api.delPermission(data)
    if (Array.isArray(res)) {
        return reply(event, res, CODE.E_100)
    }
    return reply(event)
}

/**
 * 修改权限
 */
mqttService.modifyPermission = function (event) {
    let payload = JSON.parse(event.payload)
    let data = payload.data
    if (data.length > 100) {
        return reply(event, "data length should not be greater than 100", CODE.E_100)
    }
    let res = api.modifyPermission(data)
    if (Array.isArray(res)) {
        return reply(event, res, CODE.E_100)
    }
    return reply(event)
}

/**
 * 清空权限
 */
mqttService.clearPermission = function (event) {
    let ret = api.clearPermission()
    if (typeof ret == "string") {
        return reply(event, "sql error ret:" + ret, CODE.E_100)
    } else {
        return reply(event)
    }
}


// =================================人员增删改查=================================
/**
 * 添加人员
 */
mqttService.insertUser = function (event) {
    let payload = JSON.parse(event.payload)
    let data = payload.data
    if (data.length > 100) {
        return reply(event, "data length should not be greater than 100", CODE.E_100)
    }
    let res = api.insertUser(data)
    if (Array.isArray(res)) {
        return reply(event, res, CODE.E_100)
    }
    return reply(event)
}


/**
 * 查询人员
 */
mqttService.getUser = function (event) {
    let payload = JSON.parse(event.payload)
    let data = payload.data
    let res = api.getUser(data)
    return reply(event, res)
}

/**
 * 删除人员
 */
mqttService.delUser = function (event) {
    let payload = JSON.parse(event.payload)
    let data = payload.data
    let res = api.delUser(data)
    if (Array.isArray(res)) {
        return reply(event, res, CODE.E_100)
    }
    return reply(event)
}

/**
 * 清空人员
 */
mqttService.clearUser = function (event) {
    let ret = api.clearUser()
    if (typeof ret == "string") {
        return reply(event, "sql error ret:" + ret, CODE.E_100)
    } else {
        return reply(event)
    }
}

/**
 * 修改人员
 */
mqttService.modifyUser = function (event) {
    let payload = JSON.parse(event.payload)
    let data = payload.data
    if (data.length > 100) {
        return reply(event, "data length should not be greater than 100", CODE.E_100)
    }
    let res = api.modifyUser(data)
    if (Array.isArray(res)) {
        return reply(event, res, CODE.E_100)
    }
    return reply(event, res)
}

// =================================凭证增删改查=================================
/**
 * 添加凭证
 */
mqttService.insertKey = function (event) {
    let payload = JSON.parse(event.payload)
    let data = payload.data
    if (data.length > 100) {
        return reply(event, "data length should not be greater than 100", CODE.E_100)
    }
    let res = api.insertKey(data)
    if (Array.isArray(res)) {
        return reply(event, res, CODE.E_100)
    }
    return reply(event)
}

/**
 * 查询凭证
 */
mqttService.getKey = function (event) {
    let payload = JSON.parse(event.payload)
    let data = payload.data
    let res = api.getKey(data)
    if (typeof res == 'string') {
        return reply(event, res, CODE.E_100)
    }
    return reply(event, res)
}

/**
 * 删除凭证
 */
mqttService.delKey = function (event) {
    let payload = JSON.parse(event.payload)
    let data = payload.data
    let res = api.delKey(data)
    if (Array.isArray(res)) {
        return reply(event, res, CODE.E_100)
    }
    return reply(event)
}


/**
 * 清空凭证
 */
mqttService.clearKey = function (event) {
    let payload = JSON.parse(event.payload)
    let data = payload.data
    let ret = api.clearKey(data)
    if (typeof ret == "string") {
        return reply(event, "sql error ret:" + ret, CODE.E_100)
    } else {
        return reply(event)
    }
}

/**
 * 修改凭证
 */
mqttService.modifyKey = function (event) {
    let payload = JSON.parse(event.payload)
    let data = payload.data
    if (data.length > 100) {
        return reply(event, "data length should not be greater than 100", CODE.E_100)
    }
    let res = api.modifyKey(data)
    if (Array.isArray(res)) {
        return reply(event, res, CODE.E_100)
    }
    return reply(event)
}


// =================================密钥增删改查=================================
/**
 * 添加密钥
 */
mqttService.insertSecurity = function (event) {
    let payload = JSON.parse(event.payload)
    let data = payload.data
    if (data.length > 100) {
        return reply(event, "data length should not be greater than 100", CODE.E_100)
    }
    let res = api.insertSecurity(data)
    if (Array.isArray(res)) {
        return reply(event, res, CODE.E_100)
    }
    return reply(event)
}

/**
 * 查询密钥
 */
mqttService.getSecurity = function (event) {
    let payload = JSON.parse(event.payload)
    let data = payload.data
    let res = api.getSecurity(data)
    if (typeof res == 'string') {
        return reply(event, res, CODE.E_100)
    }
    return reply(event, res)
}

/**
 * 删除密钥
 */
mqttService.delSecurity = function (event) {
    let payload = JSON.parse(event.payload)
    let data = payload.data
    let res = api.delSecurity(data)
    if (Array.isArray(res)) {
        return reply(event, res, CODE.E_100)
    }
    return reply(event)
}

/**
 * 清空密钥
 */
mqttService.clearSecurity = function (event) {
    let ret = api.clearSecurity()
    if (typeof ret == "string") {
        return reply(event, "sql error ret:" + ret, CODE.E_100)
    } else {
        return reply(event)
    }
}

/**
 * 远程控制
 */
mqttService.control = function (event) {
    let payload = JSON.parse(event.payload)
    let ret = api.control(payload)
    // 远程抓拍、企业微信解绑，需要等流程完成后才回复，不能立即回复
    if (payload.data.command != 8 && payload.data.command != 11) {
        // 如果是指纹操作，但是设备不支持指纹的话，就直接返回错误
        if(payload.data.command == 12 && !driver.device.finger){
            return reply(event, "finger not supported", CODE.E_100)
        }
        if (typeof ret == "string") {
            return reply(event, "unknown failure", CODE.E_100)
        } else {
            return reply(event)
        }
    }
}

/**
 * 查询配置
 */
mqttService.getConfig = function (event) {
    let payload = JSON.parse(event.payload)
    let data = payload.data
    let res = api.getConfig(data)
    if (typeof res == "string") {
        return reply(event, res, CODE.E_100)
    } else {
        return reply(event, res)
    }
}

/**
 * 修改配置
 */
mqttService.setConfig = function (event) {
    let payload = JSON.parse(event.payload)
    let data = payload.data
    let res = api.setConfig(data)
    if (typeof res == "string") {
        return reply(event, res, CODE.E_100)
    } else {
        return reply(event)
    }
}

/**
 * 升级固件
 */
mqttService.upgradeFirmware = function (event) {
    let payload = JSON.parse(event.payload)
    let data = payload.data
    let res = api.upgradeFirmware(data)
    if (typeof res == "string") {
        return reply(event, res, CODE.E_100)
    } else {
        return reply(event)
    }
}

/**
 * 查询识别记录
 */
mqttService.getRecords = function (event) {
    let payload = JSON.parse(event.payload)
    let data = payload.data
    let res = api.getRecords(data, true)
    return reply(event, res)
}


/**
 * 删除记录
 */
mqttService.delRecords = function (event) {
    let payload = JSON.parse(event.payload)
    let data = payload.data
    let res = api.delRecords(data)
    if (typeof res == 'string') {
        return reply(event, res, CODE.E_100)
    }
    return reply(event)
}

/**
 * 通行上报回复
 */
mqttService.access_reply = function (event) {
    let payload = JSON.parse(event.payload)
    if (payload.serialNo && payload.code == '000000') {
        let record = sqliteService.d1_pass_record.findAllById(payload.serialNo)
        if (record.length > 0) {
            dxos.systemBrief(`rm -rf ${record[0].code}`)
        }
        sqliteService.d1_pass_record.deleteByid(payload.serialNo)
    }
}

/**
 * 在线验证回复
 */
mqttService.access_online_reply = function (data) {
    driver.sync.response("mqtt.getOnlinecheck", JSON.parse(data.payload))
}

// 设备绑定二维码回复
mqttService.wecom_reply = function (data) {
    let payload = JSON.parse(data.payload)
    data = payload.data
    bus.fire("showQrCode", data)
}

const CODE = {
    // 成功
    S_000: "000000",
    // 未知错误
    E_100: "100000",
    // 设备已被禁用	
    E_101: "100001",
    // 设备正忙，请稍后再试	
    E_102: "100002",
    // 签名检验失败	
    E_103: "100003",
    // 超时错误
    E_104: "100004",
    // 设备离线	
    E_105: "100005",
}
mqttService.CODE = CODE
mqttService.report = function () {
    // 在线上报
    let payloadReply = mqttReply(std.genRandomStr(10), {
        appVersion: config.get("sys.appVersion") || '',
        mac: config.get("sys.mac") || '',
        clientId: dxMap.get("CLIENT").get("CLIENT_ID") || '',
        type: config.get("net.type") || 1,
        ssid: config.get("net.ssid") || '',
        psk: config.get("net.psk") || '',
        dhcp: config.get("net.dhcp") || 2,
        ip: config.get("net.ip") || '',
        gateway: config.get("net.gateway") || '',
        dns: config.get("net.dns") || '',
        subnetMask: config.get("net.mask") || '',
        netMac: config.get("net.mac") || ''
    }, CODE.S_000)
    driver.mqtt.send(config.get("mqtt.prefix") + "access_device/v2/event/connect", JSON.stringify(payloadReply))

    // 企微绑定状态获取
    if (weComService.isWeCom()) {
        driver.mqtt.send(config.get("mqtt.prefix") + "access_device/v2/event/wecom", JSON.stringify(mqttReply(std.genRandomStr(10), { type: 0 }, CODE.S_000)))
    }
}

// mqtt请求统一回复
function reply(event, data, code) {
    let topic = getReplyTopic(event)
    let reply = JSON.stringify(mqttReply(JSON.parse(event.payload).serialNo, data, isEmpty(code) ? CODE.S_000 : code))
    driver.mqtt.send(topic, reply)
}

/**
 * 获取回复主题
 */
function getReplyTopic(data) {
    return data.topic.replace("/" + config.get("sys.sn"), '') + "_reply";
}

// mqtt回复格式构建
function mqttReply(serialNo, data, code) {
    return {
        serialNo: serialNo,
        uuid: config.get("sys.uuid"),
        sign: '',
        code: code,
        data: data,
        time: Math.floor(Date.parse(new Date()) / 1000)
    }
}
mqttService.mqttReply = mqttReply

// 判空
function isEmpty(value) {
    return value === undefined || value === null || value === ""
}

export default mqttService