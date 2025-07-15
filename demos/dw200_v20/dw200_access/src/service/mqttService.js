import log from '../../dxmodules/dxLogger.js'
import config from '../../dxmodules/dxConfig.js'
import dxNet from '../../dxmodules/dxNet.js'
import driver from '../driver.js'
import utils from '../common/utils/utils.js'
import common from '../../dxmodules/dxCommon.js'
import sqliteService from "./sqliteService.js";
import accessService from "./accessService.js";
import dxMap from '../../dxmodules/dxMap.js'
import ota from '../../dxmodules/dxOta.js'
import bus from '../../dxmodules/dxEventBus.js'
import codeService from './codeService.js'
import configService from './configService.js'
import * as os from "os"

let sqliteFuncs = sqliteService.getFunction()

const mqttService = {}

// mqtt连接状态变化
mqttService.connectedChanged = function (data) {
    log.info('[mqttService] connectedChanged :' + JSON.stringify(data))
    driver.screen.mqttConnectedChange(data)
    if (data == "connected") {
        this.report()
    }
}

// mqtt接收消息
mqttService.receiveMsg = function (data) {
    let payload = JSON.parse(data.payload)
    if (payload.uuid != config.get('sysInfo.sn')) {
        log.error('uuid校验失败')
        return
    }
    log.debug("[mqtt receive:]" + data.topic, data.payload.length > 500 ? "数据内容过长，暂不显示" : data.payload)
    this[data.topic.match(/[^/]+$/)[0]](data)
}

// 配置查询
mqttService.getConfig = function (raw) {
    //  log.info("{mqttService} [getConfig] req:" + JSON.stringify(raw))
    config.set('sysInfo.time', Math.floor(new Date().getTime() / 1000))
    let data = JSON.parse(raw.payload).data
    let configAll = config.getAll()
    let res = {}
    // 配置分组
    for (const key in configAll) {
        const value = configAll[key];
        const keys = key.split(".")
        if (keys.length == 2) {
            if (!res[keys[0]]) {
                res[keys[0]] = {}
            }
            res[keys[0]][keys[1]] = value
        } else {
            res[keys[0]] = value
        }
    }
    // 查询蓝牙配置
    let bleInfo = driver.uartBle.getConfig()
    res["bleInfo"] = bleInfo
    res["sysInfo"] = {
        ...res["sysInfo"],
        freeSpace: Math.floor(common.getFreedisk() / 1024 / 1024)
    }
    if (utils.isEmpty(data) || typeof data != "string") {
        // 查询全部
        reply(raw, res)
        return
    }
    let keys = data.split(".")
    let search = {}
    if (keys.length == 2) {
        if (res[keys[0]]) {
            search[keys[0]] = {}
            search[keys[0]][keys[1]] = res[keys[0]][keys[1]]
        }
    } else {
        search[keys[0]] = res[keys[0]]
    }
    reply(raw, search)
}

// 配置修改
mqttService.setConfig = function (raw) {
    let oldPrefix = config.get("mqttInfo.prefix")
    let data = JSON.parse(raw.payload).data
    if (!data || typeof data != 'object') {
        reply(raw, "data should not be empty", CODE.E_100)
        return
    }
    let res = configService.configVerifyAndSave(data)
    if (typeof res != 'boolean') {
        log.error(res)
        reply(raw, res, CODE.E_100)
        return
    }
    if (res) {
        // 如果有旧的mqtt前缀，需要先把topic中旧的前缀去掉，因为mqtt默认会在旧的前缀上再拼接上前缀：如 /prefix/topic ---> /prefix/prefix/topic
        if (oldPrefix) {
            let topic = raw.topic
            raw.topic = topic.startsWith(oldPrefix) ? topic.replace(oldPrefix, '') : topic
        }
        reply(raw)
    } else {
        log.error(res)
        reply(raw, "unknown failure:" + res, CODE.E_100)
        return
    }
}

// 查询权限
mqttService.getPermission = function (raw) {
    //  log.info("{mqttService} [getPermission] req:" + JSON.stringify(raw))
    let data = JSON.parse(raw.payload).data
    if (!data || typeof data != 'object') {
        reply(raw, "data should not be empty", CODE.E_100)
        return
    }
    if (typeof data.page != 'number') {
        data.page = 0
    }
    if (typeof data.size != 'number' || data.size > 200) {
        data.size = 10
    }
    try {
        let res = sqliteFuncs.permissionFindAll(data.page, data.size, data.code, data.type, data.id);
        reply(raw, res)
    } catch (error) {
        log.error(error, error.stack)
        reply(raw, error, CODE.E_100)
        return
    }
}

// 添加权限
mqttService.insertPermission = function (raw) {
    //  log.info("{mqttService} [insertPermission] req:" + JSON.stringify(raw))
    let data = JSON.parse(raw.payload).data
    if (!Array.isArray(data)) {
        reply(raw, "data shoulde be an array", CODE.E_100)
        return
    }
    // 校验
    for (let i = 0; i < data.length; i++) {
        let record = data[i];
        if (utils.isEmpty(record.id) || utils.isEmpty(record.type) || utils.isEmpty(record.code) || typeof record.time != 'object') {
            reply(raw, "id,type,code,time shoulde not be empty", CODE.E_100)
            return
        }
        if (![0, 1, 2, 3].includes(record.time.type)) {
            reply(raw, "time's type is not supported", CODE.E_100)
            return
        }
        if (record.time.type != 0 && (typeof record.time.range != 'object' || typeof record.time.range.beginTime != 'number' || typeof record.time.range.endTime != 'number')) {
            reply(raw, "time's range format error", CODE.E_100)
            return
        }
        if (record.time.type == 2 && (typeof record.time.beginTime != 'number' || typeof record.time.endTime != 'number')) {
            reply(raw, "time format error", CODE.E_100)
            return
        }
        if (record.time.type == 3 && typeof record.time.weekPeriodTime != 'object') {
            reply(raw, "time format error", CODE.E_100)
            return
        }
        if (record.type == 200) {
            // 卡类型
            record.code = record.code.toLowerCase()
        }
        if (record.type == 400 && record.code.length > 20) {
            // 卡类型
            reply(raw, "password length error", CODE.E_100)
            return
        }
        data[i] = {
            id: record.id,
            type: record.type,
            code: record.code,
            index: record.index,
            extra: utils.isEmpty(record.extra) ? JSON.stringify({}) : JSON.stringify(record.extra),
            timeType: record.time.type,
            beginTime: record.time.type == 0 ? 0 : record.time.range.beginTime,
            endTime: record.time.type == 0 ? 0 : record.time.range.endTime,
            repeatBeginTime: record.time.type != 2 ? 0 : record.time.beginTime,
            repeatEndTime: record.time.type != 2 ? 0 : record.time.endTime,
            period: record.time.type != 3 ? 0 : JSON.stringify(record.time.weekPeriodTime)
        }
    }
    // 入库
    try {
        let res = sqliteFuncs.permisisonInsert(data)
        if (res == 0) {
            reply(raw, data.map(data => data.id))
        } else {
            reply(raw, "insert fail", CODE.E_100)
            return
        }
    } catch (error) {
        log.error(error, error.stack)
        reply(raw, error, CODE.E_100)
        return
    }
}

// 删除权限
mqttService.delPermission = function (raw) {
    //  log.info("{mqttService} [delPermission] req:" + JSON.stringify(raw))
    let data = JSON.parse(raw.payload).data
    if (!Array.isArray(data)) {
        reply(raw, "data shoulde be an array", CODE.E_100)
        return
    }
    try {
        let res = sqliteFuncs.permisisonDeleteByIdIn(data)
        if (res == 0) {
            reply(raw)
        } else {
            reply(raw, "delete fail", CODE.E_100)
            return
        }
    } catch (error) {
        log.error(error, error.stack)
        reply(raw, error, CODE.E_100)
        return
    }
}

// 清空权限
mqttService.clearPermission = function (raw) {
    //  log.info("{mqttService} [clearPermission] req:" + JSON.stringify(raw))
    try {
        let res = sqliteFuncs.permissionClear()
        if (res == 0) {
            reply(raw)
        } else {
            reply(raw, "clear fail", CODE.E_100)
            return
        }
    } catch (error) {
        log.error(error, error.stack)
        reply(raw, error, CODE.E_100)
        return
    }
}

// 查询密钥
mqttService.getSecurity = function (raw) {
    //  log.info("{mqttService} [getSecurity] req:" + JSON.stringify(raw))
    let data = JSON.parse(raw.payload).data
    if (!data || typeof data != 'object') {
        reply(raw, "data should not be empty", CODE.E_100)
        return
    }
    if (typeof data.page != 'number') {
        data.page = 0
    }
    if (typeof data.size != 'number' || data.size > 200) {
        data.size = 10
    }
    try {
        let res = sqliteFuncs.securityFindAll(data.page, data.size, data.key, data.type, data.id)
        reply(raw, res)
    } catch (error) {
        log.error(error, error.stack)
        reply(raw, error, CODE.E_100)
        return
    }
}

// 添加密钥
mqttService.insertSecurity = function (raw) {
    //  log.info("{mqttService} [insertSecurity] req:" + JSON.stringify(raw))
    let data = JSON.parse(raw.payload).data
    if (!Array.isArray(data)) {
        reply(raw, "data shoulde be an array", CODE.E_100)
        return
    }
    // 校验
    for (let i = 0; i < data.length; i++) {
        let secret = data[i];
        if (utils.isEmpty(secret.id) || utils.isEmpty(secret.type) || utils.isEmpty(secret.key) || utils.isEmpty(secret.value) || typeof secret.startTime != 'number' || typeof secret.endTime != 'number') {
            reply(raw, "id,type,key,value,startTime,endTime shoulde not be empty", CODE.E_100)
            return
        }
    }
    try {
        let res = sqliteFuncs.securityInsert(data)
        if (res == 0) {
            reply(raw)
        } else {
            reply(raw, "clear fail", CODE.E_100)
            return
        }
    } catch (error) {
        log.error(error, error.stack)
        reply(raw, error, CODE.E_100)
        return
    }
}

// 删除密钥
mqttService.delSecurity = function (raw) {
    //  log.info("{mqttService} [delSecurity] req:" + JSON.stringify(raw))
    let data = JSON.parse(raw.payload).data
    if (!Array.isArray(data)) {
        reply(raw, "data shoulde be an array", CODE.E_100)
        return
    }
    try {
        let res = sqliteFuncs.securityDeleteByIdIn(data)
        if (res == 0) {
            reply(raw)
        } else {
            reply(raw, "delete fail", CODE.E_100)
            return
        }
    } catch (error) {
        log.error(error, error.stack)
        reply(raw, error, CODE.E_100)
        return
    }
}

// 清空密钥
mqttService.clearSecurity = function (raw) {
    //  log.info("{mqttService} [clearSecurity] req:" + JSON.stringify(raw))
    try {
        let res = sqliteFuncs.securityClear()
        if (res == 0) {
            reply(raw)
        } else {
            reply(raw, "clear fail", CODE.E_100)
            return
        }
    } catch (error) {
        log.error(error, error.stack)
        reply(raw, error, CODE.E_100)
        return
    }
}

// 远程控制
mqttService.control = function (raw) {
    //  log.info("{mqttService} [control] req:" + JSON.stringify(raw))
    let data = JSON.parse(raw.payload).data
    if (!data || typeof data != 'object' || typeof data.command != 'number') {
        reply(raw, "data.command should not be empty", CODE.E_100)
        return
    }
    switch (data.command) {
        case 0:
            // 重启
            driver.screen.warning({ msg: config.get("sysInfo.language") == 1 ? "Rebooting" : "重启中", beep: false })
            driver.pwm.success()
            common.asyncReboot(2)
            break
        case 1:
            // 远程开门
            accessService.access({ type: 900 })
            break
        case 2:
            // 启用
            config.setAndSave("sysInfo.status", "1")
            break
        case 3:
            // 禁用
            config.setAndSave("sysInfo.status", "2")
            break
        case 4:
            // 重置
            // 删除配置文件和数据库
            common.systemBrief("rm -rf /app/data/config/* && rm -rf /app/data/db/app.db")
            common.asyncReboot(2)
            break
        case 5:
            // 远程控制展示弹窗
            if (data.extra) {
                driver.audio.doPlay(data.extra.wavFileName)
                driver.screen.showMsg({ msg: data.extra.msg, time: data.extra.msgTimeout })
            } else {
                reply(raw, "data.extra should not be empty", CODE.E_100)
                return
            }
            break
        default:
            reply(raw, "Illegal instruction", CODE.E_100)
            return;
    }
    reply(raw)
}

// 升级固件
mqttService.upgradeFirmware = function (raw) {
    //  log.info("{mqttService} [upgradeFirmware] req:" + JSON.stringify(raw))
    let data = JSON.parse(raw.payload).data
    if (!data || typeof data != 'object' || typeof data.type != 'number' || typeof data.url != 'string' || (data.type == 0 && typeof data.md5 != 'string')) {
        reply(raw, "data's params error", CODE.E_100)
        return
    }
    if (data.type == 0) {
        try {
            driver.pwm.warning()
            codeService.updateBegin()
            ota.updateHttp(data.url, data.md5, 300)
            codeService.updateEnd()
            driver.pwm.success()
        } catch (error) {
            reply(raw, "upgrade failure", CODE.E_100)
            codeService.updateFailed(error.message)
            driver.pwm.fail()
            return
        }
        common.asyncReboot(3)
    } else if (data.type == 1) {
        try {
            let lockMap = dxMap.get("ble_lock")
            if (lockMap.get("ble_lock")) {
                driver.screen.warning({ msg: "正在处理，请勿重复操作", beep: false })
                reply(raw, "Upgrading in progress", CODE.E_100)
                return 
            }
            driver.pwm.warning()
            bus.fire("bleupgrade", { "url": data.url })
            lockMap.put("ble_lock", true)
        } catch (error) {
            reply(raw, "upgrade failure", CODE.E_100);
            driver.pwm.fail();
            return
        }
    }
}

// 通行记录回复
mqttService.access_reply = function (raw) {
    // log.info("{mqttService} [access_reply] req:" + JSON.stringify(raw))
    let payload = JSON.parse(raw.payload)
    let map = dxMap.get("REPORT")
    let data = map.get(payload.serialNo).list
    if (data && payload.code == "000000") {
        sqliteFuncs.passRecordDeleteByTimeIn(data)
        map.del(payload.serialNo)
    }
}

/**
 * 在线验证结果
 */
mqttService.access_online_reply = function (raw) {
    // log.info("{mqttService} [access_online_reply] req:" + JSON.stringify(raw))
    let payload = JSON.parse(raw.payload)
    let map = dxMap.get("VERIFY")
    let data = map.get(payload.serialNo)
    if (data) {
        driver.mqtt.getOnlinecheckReply(payload)
        map.del(payload.serialNo)
    }
}

//-----------------------private-------------------------
// mqtt请求统一回复
function reply(raw, data, code) {
    let topicReply = raw.topic.replace("/" + config.get("sysInfo.sn"), '') + "_reply"
    let payloadReply = JSON.stringify(mqttReply(JSON.parse(raw.payload).serialNo, data, (code == null || code == undefined) ? CODE.S_000 : code))
    let prefix = config.get("mqttInfo.prefix")
    if (prefix) {
        topicReply = topicReply.startsWith(prefix) ? topicReply.replace(prefix, '') : topicReply
    }
    driver.mqtt.send({ topic: topicReply, payload: payloadReply })
}

// mqtt回复格式构建
function mqttReply(serialNo, data, code) {
    return {
        serialNo: serialNo,
        uuid: config.get("sysInfo.sn"),
        sign: '',
        code: code,
        data: data,
        time: Math.floor(Date.parse(new Date()) / 1000)
    }
}
mqttService.mqttReply = mqttReply

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

// 获取所有订阅的topic
function getTopics() {
    let sn = config.get("sysInfo.sn")
    const topics = [
        "control", "getConfig", "setConfig", "upgradeFirmware", "test",
        "getPermission", "insertPermission", "delPermission", "clearPermission",
        "getUser", "insertUser", "delUser", "clearUser",
        "getKey", "insertKey", "delKey", "clearKey",
        "getSecurity", "insertSecurity", "delSecurity", "clearSecurity"
    ]
    const eventReplies = ["connect_reply", "alarm_reply", "access_reply", "access_online_reply"]

    let flag = 'access_device/v1/cmd/' + sn + "/"
    let eventFlag = 'access_device/v1/event/' + sn + "/"
    return topics.map(item => flag + item).concat(eventReplies.map(item => eventFlag + item));
}

// 获取net连接配置
mqttService.getNetOptions = function () {
    let dhcp = config.get("netInfo.dhcp")
    dhcp = utils.isEmpty(dhcp) ? dxNet.DHCP.DYNAMIC : (dhcp + 1)
    let dns = config.get("netInfo.dns")
    dns = utils.isEmpty(dns) ? [null, null] : dns.split(",")
    let ip = config.get("netInfo.ip")
    let type = config.get("netInfo.type")
    if (utils.isEmpty(ip)) {
        // 如果ip未设置，则使用动态ip
        dhcp = dxNet.DHCP.DYNAMIC
    }
    let options = {
        type: type,
        dhcp: dhcp,
        ip: ip,
        gateway: config.get("netInfo.gateway"),
        netmask: config.get("netInfo.subnetMask"),
        dns0: dns[0],
        dns1: dns[1],
        macAddr: config.get("netInfo.fixed_macaddr_enable") == 2 ? config.get("netInfo.netMac") : common.getUuid2mac(),
    }
    return options
}

// 获取mqtt连接配置freeSpace
mqttService.getOptions = function () {
    let qos = config.get("mqttInfo.qos")
    qos = utils.isEmpty(qos) ? 1 : qos
    let options = {
        mqttAddr: "tcp://" + config.get("mqttInfo.mqttAddr"),
        clientId: config.get("mqttInfo.clientId"),
        username: config.get("mqttInfo.mqttName") || 'admin',
        password: config.get("mqttInfo.password") || 'password',
        prefix: config.get("mqttInfo.prefix"),
        qos: qos,
        // 订阅
        subs: getTopics(),
        // 遗嘱
        willTopic: 'access_device/v1/event/offline',
        willMessage: JSON.stringify({
            serialNo: utils.genRandomStr(10),
            uuid: config.get("sysInfo.sn"),
            sign: "",
            time: Math.floor(new Date().getTime() / 1000)
        })
    }
    return options
}

/**
 * 连接上报(在线上报/在线后的通行记录上报)
 */
mqttService.report = function () {
    let bleInfo = driver.uartBle.getConfig()
    // 在线上报
    let payloadReply = JSON.stringify(mqttReply(utils.genRandomStr(10), {
        sysVersion: config.get("sysInfo.appVersion") || '',
        appVersion: config.get("sysInfo.appVersion") || '',
        createTime: config.get("sysInfo.createTime") || '',
        btMac: bleInfo.mac || '',
        mac: config.get("sysInfo.mac") || '',
        clientId: config.get("mqttInfo.clientId") || '',
        name: config.get("sysInfo.deviceName") || '',
        type: config.get("netInfo.type") || 1,
        dhcp: config.get("netInfo.dhcp") || 1,
        ip: config.get("netInfo.ip") || '',
        gateway: config.get("netInfo.gateway") || '',
        dns: config.get("netInfo.dns") || '',
        subnetMask: config.get("netInfo.subnetMask") || '',
        netMac: config.get("netInfo.netMac") || '',
    }, CODE.S_000))

    driver.mqtt.send({ topic: "access_device/v1/event/connect", payload: payloadReply })

    //通行记录上报
    let res = sqliteFuncs.passRecordFindAll()
    if (res && res.length != 0) {
        let reportCount = config.get('sysInfo.reportCount') || 50; // 定义每批处理的大小
        let reportInterval = config.get('sysInfo.reportInterval') || 5000; // 定义每次上报的间隔时间（毫秒）
        for (let i = 0; i < res.length; i += reportCount) {
            let batch = res.slice(i, i + reportCount);
            let serialNo = utils.genRandomStr(10)
            let map = dxMap.get("REPORT")
            let list = batch.map(obj => obj.time);
            batch = batch.map(obj => {
                obj.error = obj.result === 0 ? "无权限" : ""
                let formattedExtra = JSON.parse(obj.extra)
                return { ...obj, extra: formattedExtra };
            });
            map.put(serialNo, { list: list, time: new Date().getTime() })
            driver.mqtt.send({ topic: "access_device/v1/event/access", payload: JSON.stringify(mqttReply(serialNo, batch, CODE.S_000)) })
            os.sleep(reportInterval)
        }

    }

}

export default mqttService
