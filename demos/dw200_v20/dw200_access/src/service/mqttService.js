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
import dxStd from '../../dxmodules/dxStd.js'
import codeService from './codeService.js'
import configService from './configService.js'
import * as os from "os"

let sqliteFuncs = sqliteService.getFunction()

const mqttService = {}

// MQTT receive message
mqttService.receiveMsg = function (data) {
    let payload = JSON.parse(data.payload)
    if (payload.uuid != config.get('sysInfo.sn')) {
        log.error('uuid校验失败')
        return
    }
    log.debug("[mqtt receive:]" + data.topic, data.payload.length > 500 ? "数据内容过长，暂不显示" : data.payload)
    this[data.topic.match(/[^/]+$/)[0]](data)
}

// Configuration query
mqttService.getConfig = function (raw) {
    //  log.info("{mqttService} [getConfig] req:" + JSON.stringify(raw))
    config.set('sysInfo.time', Math.floor(new Date().getTime() / 1000))
    let data = JSON.parse(raw.payload).data
    let configAll = config.getAll()
    let code = CODE.S_000
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
    filterSpecificProperties(res)
    if (utils.isEmpty(data) || typeof data != "string") {
        if (res.mqttInfo && res.mqttInfo.clientId) {
            res.mqttInfo.clientId = dxMap.get("CLIENT").get("CLIENT_ID")
        }
        // Query all
        reply(raw, res)
        return
    }
    let keys = data.split(".")
    let search = {}
    if (keys.length == 2) {
        const [group, field] = keys
        if (res[group] && res[group][field] !== undefined) {
            search[group] = {}
            search[group][field] = res[group][field]
        } else {
            code = CODE.E_200
        }
    } else {
        const group = keys[0]
        if(res[group]) {
            search[group] = res[group]
        } else {
            code = CODE.E_200
        }
    }
    filterSpecificProperties(search)
    if (search.mqttInfo && search.mqttInfo.clientId) {
        search.mqttInfo.clientId = dxMap.get("CLIENT").get("CLIENT_ID")
    }
    reply(raw, search, code)
}

// Configuration item filtering function
function filterSpecificProperties(configObj) {
    if (!configObj || typeof configObj !== 'object') return;
    // Precisely specify 5 property paths to delete
    const propertiesToRemove = [
        'uiInfo.rotation0BgImage',
        'uiInfo.rotation1BgImage', 
        'uiInfo.rotation2BgImage',
        'uiInfo.rotation3BgImage',
        'uiInfo.fontPath'
    ];
    propertiesToRemove.forEach(propPath => {
        const [group, field] = propPath.split('.');
        if (configObj[group] && configObj[group][field] !== undefined) {
            delete configObj[group][field];
        }
    });
}

// Configuration modification
mqttService.setConfig = function (raw) {
    let oldPrefix = config.get("mqttInfo.prefix")
    let data = JSON.parse(raw.payload).data
    if (!data || typeof data != 'object') {
        reply(raw, "data should not be empty or in an incorrect format", CODE.E_200)
        return
    }
    let res = configService.configVerifyAndSave(data)
    if (typeof res != 'boolean') {
        log.error(res)
        reply(raw, res, CODE.E_201)
        return
    }
    if (res) {
        reply(raw)
    } else {
        log.error(res)
        reply(raw, "unknown failure:" + res, CODE.E_100)
        return
    }
}

// Query permissions
mqttService.getPermission = function (raw) {
    //  log.info("{mqttService} [getPermission] req:" + JSON.stringify(raw))
    let data = JSON.parse(raw.payload).data
    if (!data || typeof data != 'object') {
        reply(raw, "data should not be empty", CODE.E_200)
        return
    }
    if (typeof data.page !== 'number' || data.page < 1) {
        reply(raw, "Invalid parameter: 'page' must be a number >= 1", CODE.E_200);
        return;
    }
    if (typeof data.size !== 'number' || data.size <= 0 || data.size > 200) {
        reply(raw, "Invalid parameter: 'size' must be a number between 1 and 200", CODE.E_200);
        return;
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

// Add permissions
mqttService.insertPermission = function (raw) {
    //  log.info("{mqttService} [insertPermission] req:" + JSON.stringify(raw))
    let data = JSON.parse(raw.payload).data
    if (!Array.isArray(data)) {
        reply(raw, "data shoulde be an array", CODE.E_200)
        return
    }
    // Validation
    for (let i = 0; i < data.length; i++) {
        let record = data[i];
        if (utils.isEmpty(record.id) || utils.isEmpty(record.type) || utils.isEmpty(record.code) || typeof record.time != 'object') {
            reply(raw, "id,type,code,time shoulde not be empty", CODE.E_200)
            return
        }
        if (![0, 1, 2, 3].includes(record.time.type)) {
            reply(raw, "time's type is not supported", CODE.E_200)
            return
        }
        if (record.time.type != 0 && (typeof record.time.range != 'object' || typeof record.time.range.beginTime != 'number' || typeof record.time.range.endTime != 'number')) {
            reply(raw, "time's range format error", CODE.E_200)
            return
        }
        if (record.time.type == 2 && (typeof record.time.beginTime != 'number' || typeof record.time.endTime != 'number')) {
            reply(raw, "time format error", CODE.E_200)
            return
        }
        if (record.time.type == 3 && typeof record.time.weekPeriodTime != 'object') {
            reply(raw, "time format error", CODE.E_200)
            return
        }
        if (record.type == 200) {
            // Card type
            record.code = record.code.toLowerCase()
        }
        if (record.type == 400 && record.code.length > 20) {
            // Card type
            reply(raw, "password length error", CODE.E_200)
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
    // Store to database
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

// Delete permissions
mqttService.delPermission = function (raw) {
    //  log.info("{mqttService} [delPermission] req:" + JSON.stringify(raw))
    let data = JSON.parse(raw.payload).data
    if (!Array.isArray(data)) {
        reply(raw, "data shoulde be an array", CODE.E_200)
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

// Clear permissions
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

// Query security keys
mqttService.getSecurity = function (raw) {
    //  log.info("{mqttService} [getSecurity] req:" + JSON.stringify(raw))
    let data = JSON.parse(raw.payload).data
    if (!data || typeof data != 'object') {
        reply(raw, "data should not be empty", CODE.E_200)
        return
    }
    if (typeof data.page !== 'number' || data.page < 1) {
        reply(raw, "Invalid parameter: 'page' must be a number >= 1", CODE.E_200);
        return;
    }
    if (typeof data.size !== 'number' || data.size <= 0 || data.size > 20) {
        reply(raw, "Invalid parameter: 'size' must be a number between 1 and 20", CODE.E_200);
        return;
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

// Add security keys
mqttService.insertSecurity = function (raw) {
    //  log.info("{mqttService} [insertSecurity] req:" + JSON.stringify(raw))
    let data = JSON.parse(raw.payload).data
    if (!Array.isArray(data)) {
        reply(raw, "data shoulde be an array", CODE.E_200)
        return
    }
    // Validation
    for (let i = 0; i < data.length; i++) {
        let secret = data[i];
        if (utils.isEmpty(secret.id) || utils.isEmpty(secret.type) || utils.isEmpty(secret.key) || utils.isEmpty(secret.value) || typeof secret.startTime != 'number' || typeof secret.endTime != 'number') {
            reply(raw, "id,type,key,value,startTime,endTime shoulde not be empty", CODE.E_200)
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

// Delete security keys
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

// Clear security keys
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
        reply(raw, "data.command should not be empty", CODE.E_200)
        return
    }
    switch (data.command) {
        case 0:
            // Restart
            driver.screen.warning({ msg: config.get("sysInfo.language") == 1 ? "Rebooting" : "重启中", beep: false })
            driver.pwm.success()
            common.asyncReboot(2)
            break
        case 1:
            // Remote door opening
            accessService.access({ type: 900 })
            break
        case 4:
            // Reset
            // Delete configuration files and database
            common.systemBrief("rm -rf /app/data/config/* && rm -rf /app/data/db/app.db")
            common.asyncReboot(2)
            break
        case 5:
            // Remote control display popup
            if (data.extra) {
                driver.audio.doPlay(data.extra.wavFileName)
                driver.screen.showMsg({ msg: data.extra.msg, time: data.extra.msgTimeout })
            } else {
                reply(raw, "data.extra should not be empty", CODE.E_200)
                return
            }
            break
        default:
            reply(raw, "Illegal instruction", CODE.E_201)
            return;
    }
    reply(raw)
}

// Firmware upgrade
mqttService.upgradeFirmware = function (raw) {
    //  log.info("{mqttService} [upgradeFirmware] req:" + JSON.stringify(raw))
    let data = JSON.parse(raw.payload).data
    if (!data || typeof data != 'object' || typeof data.type != 'number' || typeof data.url != 'string' || (data.type == 0 && typeof data.md5 != 'string')) {
        reply(raw, "data's params error", CODE.E_200)
        return
    }
    if (data.type == 0) {
        try {
            driver.pwm.warning()
            codeService.showUpdateStatus('begin');
            ota.updateHttp(data.url, data.md5, 300)
            codeService.showUpdateStatus('success');
            driver.pwm.success()
        } catch (error) {
            reply(raw, "upgrade failure", CODE.E_201)
            codeService.showUpdateStatus('failed', error.message);
            driver.pwm.fail()
            return
        }
        reply(raw)
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

// Access record reply
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
 * Online verification result
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
// MQTT request unified reply
function reply(raw, data, code) {
    let topicReply = raw.topic.replace("/" + config.get("sysInfo.sn"), '') + "_reply"
    let payloadReply = JSON.stringify(mqttReply(JSON.parse(raw.payload).serialNo, data, (code == null || code == undefined) ? CODE.S_000 : code))
    driver.mqtt.send(topicReply, payloadReply)
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
    // Device disabled	
    E_101: "100001",
    // Device busy, please try again later	
    E_102: "100002",
    // Signature verification failed	
    E_103: "100003",
    // Timeout error
    E_104: "100004",
    // Device offline	
    E_105: "100005",
    // Parameter error
    E_200: "200000",
    // Parameter format error
    E_201: "200001"
}
mqttService.CODE = CODE

// Get network connection configuration
mqttService.getNetOptions = function () {
    let dhcp = config.get("netInfo.dhcp")
    dhcp = utils.isEmpty(dhcp) ? dxNet.DHCP.DYNAMIC : (dhcp + 1)
    let dns = config.get("netInfo.dns")
    dns = utils.isEmpty(dns) ? [null, null] : dns.split(",")
    let ip = config.get("netInfo.ip")
    let type = config.get("netInfo.type")
    if (utils.isEmpty(ip)) {
        // If IP is not set, use dynamic IP
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
        macAddr: config.get("netInfo.netMac")
    }
    return options
}

/**
 * Connection reporting (online reporting/access record reporting after online)
 */
mqttService.report = function () {
    let bleInfo = driver.uartBle.getConfig()
    let prefix = config.get("mqttInfo.prefix") || ''
    // Online reporting
    let payloadReply = JSON.stringify(mqttReply(utils.genRandomStr(10), {
        sysVersion: config.get("sysInfo.appVersion") || '',
        appVersion: config.get("sysInfo.appVersion") || '',
        createTime: config.get("sysInfo.createTime") || '',
        btMac: bleInfo && bleInfo.mac ? bleInfo.mac : '',
        mac: config.get("sysInfo.mac") || '',
        clientId: dxMap.get("CLIENT").get("CLIENT_ID") || '',
        name: config.get("sysInfo.deviceName") || '',
        type: config.get("netInfo.type") || 1,
        ssid:config.get("netInfo.ssid") || '',
        psk:config.get("netInfo.psk") || '',
        dhcp: config.get("netInfo.dhcp") || 1,
        ip: config.get("netInfo.ip") || '',
        gateway: config.get("netInfo.gateway") || '',
        dns: config.get("netInfo.dns") || '',
        subnetMask: config.get("netInfo.subnetMask") || '',
        netMac: config.get("netInfo.netMac") || '',
    }, CODE.S_000))

    driver.mqtt.send(prefix + "access_device/v1/event/connect", payloadReply)

    // Access record reporting
    reportPassRecords()
}

async function reportPassRecords() {
    let page = 1;
    let hasMore = true;
    let reportCount = config.get('sysInfo.reportCount') || 50;
    let reportInterval = config.get('sysInfo.reportInterval') || 5000;
    let prefix = config.get("mqttInfo.prefix") || ''
    let mqtt_map = dxMap.get("MQTT")
    while (hasMore) {
        try {
            if (mqtt_map.get("MQTT_STATUS") == "disconnected") {
                hasMore = false;
                break;
            }
            let batch = await sqliteFuncs.passRecordFindByPage(page, reportCount);
            if (!batch || batch.length === 0) {
                hasMore = false;
                break;
            }
            let serialNo = utils.genRandomStr(10);
            let map = dxMap.get("REPORT");
            let list = batch.map(obj => obj.time);
            let processedBatch = batch.map(obj => {
                let formattedExtra = JSON.parse(obj.extra);
                return {
                    ...obj,
                    error: obj.result === 0 ? "无权限" : "",
                    extra: formattedExtra
                };
            });
            map.put(serialNo, { list: list, time: new Date().getTime() });
            driver.mqtt.send(
                prefix + "access_device/v1/event/access", 
                JSON.stringify(mqttReply(serialNo, processedBatch, CODE.S_000))
            );
            page++;
            await new Promise(resolve => dxStd.setTimeout(resolve, reportInterval));
        } catch (error) {
            hasMore = false;
            break;
        }
    }
}

export default mqttService
