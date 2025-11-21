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
import codeService from './codeService.js'
import configService from './configService.js'
import bus from '../../dxmodules/dxEventBus.js'

let sqliteFuncs = sqliteService.getFunction()

const mqttService = {}

// MQTT connection status change
mqttService.connectedChanged = function (data) {
    log.info('[mqttService] connectedChanged :' + JSON.stringify(data))
    if (data == "connected") {
        this.report()
    }
    driver.screen.mqttConnectedChange(data)
}

// MQTT receive message
mqttService.receiveMsg = function (data) {
    let payload = JSON.parse(data.payload)
    if (payload.uuid != config.get('sysInfo.sn')) {
        log.error('UUID verification failed')
        return
    }
    log.debug("[mqtt receive:]" + data.topic, data.payload.length > 500 ? "Data content too long, not displayed" : data.payload)
    this[data.topic.match(/[^/]+$/)[0]](data)
}

// Configuration query
mqttService.getConfig = function (raw) {
    //  log.info("{mqttService} [getConfig] req:" + JSON.stringify(raw))
    let data = JSON.parse(raw.payload).data
    let configAll = config.getAll()
    let res = {}
    // Configuration grouping
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
    // Query Bluetooth configuration
    let bleInfo = driver.uartBle.getConfig()
    res["bleInfo"] = bleInfo

    if (utils.isEmpty(data) || typeof data != "string") {
        // Query all
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

// Configuration modification
mqttService.setConfig = function (raw) {
    //  log.info("{mqttService} [setConfig] req:" + JSON.stringify(raw))
    let data = JSON.parse(raw.payload).data
    if (!data || typeof data != 'object') {
        reply(raw, "data should not be empty", CODE.E_100)
        return
    }
    let res = configService.configVerifyAndSave(data)
    if (typeof res != 'boolean') {
        // C version validation failure does not reply, aligned with C version
        log.error(res)
        // reply(raw, res, CODE.E_100)
        return
    }
    if (res) {
        reply(raw)
    } else {
        // C version validation failure does not reply, aligned with C version
        log.error(res)
        // reply(raw, "unknown failure", CODE.E_100)
        return
    }
}

// Query permission
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

// Add permission
mqttService.insertPermission = function (raw) {
    //  log.info("{mqttService} [insertPermission] req:" + JSON.stringify(raw))
    let data = JSON.parse(raw.payload).data
    if (!Array.isArray(data)) {
        reply(raw, "data shoulde be an array", CODE.E_100)
        return
    }
    // Validation
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
        if (typeof record.extra != 'object') {
            reply(raw, "extra format error", CODE.E_100)
            return
        }
        if (record.type == 200) {
            // Card type
            record.code = record.code.toLowerCase()
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
    // Insert into database
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

// Delete permission
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

// Clear permission
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

// Query security key
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

// Add security key
mqttService.insertSecurity = function (raw) {
    //  log.info("{mqttService} [insertSecurity] req:" + JSON.stringify(raw))
    let data = JSON.parse(raw.payload).data
    if (!Array.isArray(data)) {
        reply(raw, "data shoulde be an array", CODE.E_100)
        return
    }
    // Validation
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

// Delete security key
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

// Clear security key
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

// Remote control
mqttService.control = function (raw) {
    //  log.info("{mqttService} [control] req:" + JSON.stringify(raw))
    let data = JSON.parse(raw.payload).data
    if (!data || typeof data != 'object' || typeof data.command != 'number') {
        reply(raw, "data.command should not be empty", CODE.E_100)
        return
    }
    switch (data.command) {
        case 0:
            // Reboot
            driver.screen.warning({ msg: config.get("sysInfo.language") == "EN" ? "Rebooting" : "重启中", beep: false })
            driver.pwm.success()
            common.asyncReboot(2)
            break
        case 1:
            // Remote open door
            accessService.access({ type: 900 })
            break
        case 2:
            // Enable
            config.setAndSave("sysInfo.status", "1")
            break
        case 3:
            // Disable
            config.setAndSave("sysInfo.status", "2")
            break
        case 4:
            // Reset
            // Delete configuration files and database
            common.systemBrief("rm -rf /app/data/config/* && rm -rf /app/data/db/app.db")
            common.asyncReboot(2)
            break
        case 5:
            // Remote control display popup
            driver.audio.doPlay(data.extra.wavFileName)
            driver.screen.showMsg({ msg: data.extra.msg, time: data.extra.msgTimeout })

            break
        default:
            reply(raw, "Illegal instruction", CODE.E_100)
            return;
    }
    reply(raw)
}

// Upgrade firmware
mqttService.upgradeFirmware = async function (raw) {
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
    reply(raw)
}

/**
 * Bluetooth upgrade
 * @param {*} pack 
 */
let count = 0
mqttService.bleUpgrade = function bleUpgrade(pack) {
    if (pack.data[0] == 0x03 && pack.data[1] == 0x01 && pack.data[2] == 0x80 && pack.data[3] == 0x01) {
        // pack.data[3] == 0x01 reply to Bluetooth enter upgrade mode command
        if (pack.data[5] == 0x00) {
            driver.screen.warning({ msg: "正在进入升级模式，请等待", beep: false })
            // print("正在进入升级模式，请等待")
        } else if (pack.data[5] == 0x03) {
            driver.screen.warning({ msg: "已进入升级模式", beep: false })
            // print("已经进入升级模式，可以开始进行升级")
        } else {
            driver.screen.warning({ msg: "进入升级模式失败", beep: false })
            // print("进入升级模式失败")
        }
    }

    if (pack.data[0] == 0x03 && pack.data[1] == 0x01 && pack.data[2] == 0x80 && pack.data[3] == 0x02) {
        // pack.data[3] == 0x02 reply to Bluetooth upgrade package description information command
        if (pack.data[5] == 0x00) {
            // print("发送升级包描述信息成功，请发送升级包")
        } else {
            // print("发送升级包描述信息失败，应答码为: ", pack.data[5])
        }
    }

    if (pack.data[0] == 0x03 && pack.data[1] == 0x01 && pack.data[2] == 0x80 && pack.data[3] == 0x03) {
        // pack.data[3] == 0x03 reply to Bluetooth upgrade package
        count++
        if (pack.data[5] == 0x00) {
            console.log("Upgrade package sent successfully, package " + count + " sent successfully")
        } else {
            console.log("Upgrade package send failed, response code: ", pack.data[5])
        }
    }

    if (pack.data[0] == 0x03 && pack.data[1] == 0x01 && pack.data[2] == 0x80 && pack.data[3] == 0x04) {
        // pack.data[3] == 0x04 reply to Bluetooth upgrade finish command
        if (pack.data[5] == 0x00) {
            driver.screen.warning({ msg: "升级结束指令发送成功", beep: false })
            console.log("Upgrade finish command sent successfully")
        } else {
            console.log("Upgrade finish command send failed, response code: ", pack.data[5])
        }
        if (1) {
            // print("升级包发送完毕: ", count)
        } else {
            // print("升级包发送失败，请重新发送升级")
        }
    }

    if (pack.data[0] == 0x03 && pack.data[1] == 0x01 && pack.data[2] == 0x80 && pack.data[3] == 0x05) {
        // pack.data[3] == 0x05 reply to install upgrade package command
        if (pack.data[5] == 0x00) {
            driver.screen.warning({ msg: "蓝牙升级成功", beep: false })
            // print("安装升级包指令发送成功，蓝牙升级成功，流程结束")
        } else {
            driver.screen.warning({ msg: "蓝牙升级失败", beep: false })
            // print("安装升级包指令发送失败，应答码为: ", pack.data[5])
        }
        common.systemBrief("rm -rf /app/data/.temp")
    }
}

// Access record reply
mqttService.access_reply = function (raw) {
    //  log.info("{mqttService} [access_reply] req:" + JSON.stringify(raw))
    let payload = JSON.parse(raw.payload)
    let map = dxMap.get("REPORT")
    let data = map.get(payload.serialNo).list
    if (data) {
        sqliteFuncs.passRecordDeleteByTimeIn(data)
        map.del(payload.serialNo)
    }
}

/**
 * Online verification result
 */
mqttService.access_online_reply = function (raw) {
    //  log.info("{mqttService} [access_online_reply] req:" + JSON.stringify(raw))
    let payload = JSON.parse(raw.payload)
    let map = dxMap.get("VERIFY")
    let data = map.get(payload.serialNo)
    if (data) {
        driver.mqtt.getOnlinecheckReply(payload)
        map.del(payload.serialNo)
    }
}

//-----------------------private-------------------------
// MQTT request unified reply
function reply(raw, data, code) {
    let topicReply = raw.topic.replace("/" + config.get("sysInfo.sn"), '') + "_reply"
    let payloadReply = JSON.stringify(mqttReply(JSON.parse(raw.payload).serialNo, data, (code == null || code == undefined) ? CODE.S_000 : code))
    let prefix = config.get("mqttInfo.prefix")
    if (prefix) {
        topicReply = topicReply.startsWith(prefix) ? topicReply.replace(prefix, '') : topicReply
    }
    driver.mqtt.send({ topic: topicReply, payload: payloadReply })
}

// MQTT reply format construction
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
    // Success
    S_000: "000000",
    // Unknown error
    E_100: "100000",
    // Device has been disabled
    E_101: "100001",
    // Device is busy, please try again later
    E_102: "100002",
    // Signature verification failed
    E_103: "100003",
    // Timeout error
    E_104: "100004",
    // Device offline
    E_105: "100005",
}
mqttService.CODE = CODE

// Get all subscribed topics
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

// Get network connection configuration
mqttService.getNetOptions = function () {
    let dhcp = config.get("netInfo.dhcp")
    dhcp = utils.isEmpty(dhcp) ? dxNet.DHCP.DYNAMIC : (dhcp + 1)
    let dns = config.get("netInfo.dns")
    dns = utils.isEmpty(dns) ? [null, null] : dns.split(",")
    let ip = config.get("netInfo.ip")
    if (utils.isEmpty(ip)) {
        // If IP is not set, use dynamic IP
        dhcp = dxNet.DHCP.DYNAMIC
    }
    let options = {
        type: dxNet.TYPE.ETHERNET,
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

// Get MQTT connection configuration
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
        // Subscribe
        subs: getTopics(),
        // Will
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
 * Connection report (online report / access record report after online)
 */
mqttService.report = function () {
    console.log('---Connection report---', new Date().getTime());

    let bleInfo = driver.uartBle.getConfig()
    // Online report
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
    log.info("------" + payloadReply)
    driver.mqtt.send({ topic: "access_device/v1/event/connect", payload: payloadReply })

    // Access record report
    let res = sqliteFuncs.passRecordFindAll()
    if (res && res.length != 0) {
        let reportCount = config.get('sysInfo.reportCount') || 500; // Define batch processing size
        for (let i = 0; i < res.length; i += reportCount) {
            let batch = res.slice(i, i + reportCount);
            let serialNo = utils.genRandomStr(10)
            let map = dxMap.get("REPORT")
            let list = batch.map(obj => obj.time);
            batch = batch.map(obj => {
                let formattedExtra = JSON.parse(obj.extra)
                return { ...obj, extra: formattedExtra };
            });
            map.put(serialNo, { list: list, time: new Date().getTime() })
            driver.mqtt.send({ topic: "access_device/v1/event/access", payload: JSON.stringify(mqttReply(serialNo, batch, CODE.S_000)) })
        }

    }

}

export default mqttService
