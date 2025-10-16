import common from "../../dxmodules/dxCommon.js";
import config from "../../dxmodules/dxConfig.js";
import logger from "../../dxmodules/dxLogger.js";
import ota from "../../dxmodules/dxOta.js";
import std from "../../dxmodules/dxStd.js";
import dxMap from '../../dxmodules/dxMap.js'
import driver from "../driver.js";
import configService from "./configService.js";
import sqliteService from "./sqliteService.js";
import utils from '../common/utils/utils.js'
const mqttService = {}
let map = dxMap.get("faceAccesss")

mqttService.receiveMsg = function (data) {
    // {"topic":"ddddd","payload":"{\n  \"msg\": \"world\"\n}"}
    logger.info('[mqttService] receiveMsg :' + JSON.stringify(data.topic))
    if (typeof mqttService[data.topic.match(/[^/]+$/)[0]] == 'function') {
        mqttService[data.topic.match(/[^/]+$/)[0]](data)
    } else {
        logger.error("Unimplemented topic", data.topic)
    }
}

// =================================Permission CRUD=================================
/**
 * Add permission
 */
mqttService.insertPermission = function (event) {
    let payload = JSON.parse(event.payload)
    let data = payload.data
    let res = this.insertPermissionAgreement(data)
    if (typeof res == 'string') {
        return reply(event, res, CODE.E_100)
    }
    return reply(event)
}

// Add permission universal protocol format
mqttService.insertPermissionAgreement = function (data) {
    let permissions = []
    for (let i = 0; i < data.length; i++) {
        const permission = data[i];
        if (!permission.permissionId || !permission.userId) {
            return "id or userId cannot be empty"
        }
        if (!permission.extra) {
            permission.extra = ""
        }
        if (!permission.time) {
            return "time and type cannot be empty"
        }
        if (permission.time.type != 0 && permission.time.type != 1 && permission.time.type != 2 && permission.time.type != 3) {
            return "time type is not supported"
        }
        let record = {}
        record.permissionId = permission.permissionId
        record.userId = permission.userId
        record.door = isEmpty(permission.index) ? 0 : permission.index
        record.extra = isEmpty(permission.extra) ? JSON.stringify({}) : JSON.stringify(permission.extra)
        record.timeType = permission.time.type
        record.beginTime = permission.time.type == 0 ? 0 : permission.time.range.beginTime
        record.endTime = permission.time.type == 0 ? 0 : permission.time.range.endTime
        record.repeatBeginTime = permission.time.type != 2 ? 0 : permission.time.beginTime
        record.repeatEndTime = permission.time.type != 2 ? 0 : permission.time.endTime
        record.period = permission.time.type != 3 ? 0 : JSON.stringify(permission.time.weekPeriodTime)
        let ret = sqliteService.d1_permission.save(record)
        if (ret != 0) {
            sqliteService.d1_permission.deleteByPermissionId(record.permissionId)
            ret = sqliteService.d1_permission.save(record)
            if (ret != 0) {
                return "sql error ret:" + ret
            } else {
                continue
            }
        }
    }
    return true
}

/**
 * Query permission
 */
mqttService.getPermission = function (event) {
    let payload = JSON.parse(event.payload)
    let data = payload.data
    let res = this.getPermissionAgreement(data)
    return reply(event, res)
}

// Query permission universal protocol format
mqttService.getPermissionAgreement = function (data) {
    data.page = isEmpty(data.page) ? 0 : data.page
    data.size = isEmpty(data.size) ? 10 : data.size
    let totalCount = sqliteService.d1_permission.count(data)
    let permissions = sqliteService.d1_permission.findAll(data)
    // Build return result
    let content = permissions.map(permission => ({
        permissionId: permission.permissionId,
        userId: permission.userId,
        extra: JSON.parse(permission.extra ? permission.extra : "{}"),
        time: {
            type: permission.timeType,
            beginTime: permission.timeType != 2 ? undefined : permission.repeatBeginTime,
            endTime: permission.timeType != 2 ? undefined : permission.repeatEndTime,
            range: permission.timeType === 0 ? undefined : { beginTime: permission.beginTime, endTime: permission.endTime },
            weekPeriodTime: permission.timeType != 3 ? undefined : JSON.parse(permission.period)
        }
    }))
    return {
        content: content,
        page: data.page,
        size: data.size,
        total: totalCount,
        totalPage: Math.ceil(totalCount / data.size),
        count: content.length
    }
}

/**
 * Delete permission
 */
mqttService.delPermission = function (event) {
    let payload = JSON.parse(event.payload)
    let data = payload.data
    let res = this.delPermissionAgreement(data)
    if (typeof res == 'string') {
        return reply(event, res, CODE.E_100)
    }
    return reply(event)
}

// Delete permission universal protocol format
mqttService.delPermissionAgreement = function (data) {
    if (data.permissionIds && data.permissionIds.length > 0) {
        let ret = sqliteService.d1_permission.deleteByPermissionIdInBatch(data.permissionIds)
        if (ret != 0) {
            return "sql error ret:" + ret
        }
    }
    if (data.userIds && data.userIds.length > 0) {
        let ret = sqliteService.d1_permission.deleteByUserIdInBatch(data.userIds)
        if (ret != 0) {
            return "sql error ret:" + ret
        }
    }
    return true
}

/**
 * Clear permissions
 */
mqttService.clearPermission = function (event) {
    let ret = sqliteService.d1_permission.deleteAll()
    if (ret == 0) {
        return reply(event)
    } else {
        return reply(event, "sql error ret:" + ret, CODE.E_100)
    }
}


// =================================Person CRUD=================================
/**
 * Add person
 */
mqttService.insertUser = function (event) {
    let payload = JSON.parse(event.payload)
    let data = payload.data
    let res = this.insertUserAgreement(data)
    if (typeof res == 'string') {
        return reply(event, res, CODE.E_100)
    }
    return reply(event)
}

// Add person universal protocol format
mqttService.insertUserAgreement = function (data) {
    let persons = []
    for (let i = 0; i < data.length; i++) {
        const person = data[i];
        if (!person.userId || !person.name) {
            return "userId or name cannot be empty"
        }
        let record = {}
        record.userId = person.userId
        record.name = person.name
        record.extra = isEmpty(person.extra) ? JSON.stringify({}) : JSON.stringify(person.extra)
        persons.push(record)
    }
    let ret = sqliteService.d1_person.saveAll(persons)
    if (ret != 0) {
        // Failed, delete all these people and add them again
        let userIds = persons.map(obj => obj.userId);
        sqliteService.d1_person.deleteByUserIdInBatch(userIds)
        // Re-add
        let ret = sqliteService.d1_person.saveAll(persons)
        if (ret != 0) {
            return "sql error ret:" + ret
        }
    }
    return true

}

/**
 * Query person
 */
mqttService.getUser = function (event) {
    let payload = JSON.parse(event.payload)
    let data = payload.data
    let res = this.getUserAgreement(data)
    return reply(event, res)
}

// Query person universal protocol format
mqttService.getUserAgreement = function (data) {
    data.page = isEmpty(data.page) ? 0 : data.page
    data.size = isEmpty(data.size) ? 10 : data.size
    let totalCount = sqliteService.d1_person.count(data)
    let persons = sqliteService.d1_person.findAll(data)
    return {
        content: persons,
        page: data.page,
        size: data.size,
        total: totalCount,
        totalPage: Math.ceil(totalCount / data.size),
        count: persons.length
    }
}

/**
 * Delete person
 */
mqttService.delUser = function (event) {
    let payload = JSON.parse(event.payload)
    let data = payload.data
    let res = this.delUserAgreement(data)
    if (typeof res == 'string') {
        return reply(event, res, CODE.E_100)
    }
    return reply(event)
}

// Delete person universal protocol format
mqttService.delUserAgreement = function (data) {
    if (data && data.length > 0) {
        sqliteService.transaction()
        let ret1 = sqliteService.d1_person.deleteByUserIdInBatch(data)
        let ret2 = sqliteService.d1_permission.deleteByUserIdInBatch(data)
        let ret3 = sqliteService.d1_voucher.deleteByUserIdInBatch(data)
        if (ret1 != 0 || ret2 != 0 || ret3 != 0) {
            sqliteService.rollback()
            return "sql error"
        }
        sqliteService.commit()
        data.forEach(element => {
            driver.face.delete(element)
        });
    }
    return true
}


/**
 * Clear persons
 */
mqttService.clearUser = function (event) {
    let persons = sqliteService.d1_person.findAll()
    persons.forEach(element => {
        driver.face.delete(element.userId)
    });
    let ret1 = sqliteService.d1_person.deleteAll()
    let ret2 = sqliteService.d1_permission.deleteAll()
    let ret3 = sqliteService.d1_voucher.deleteAll()
    if (ret1 == 0 && ret2 == 0 && ret3 == 0) {
        return reply(event)
    } else {
        return reply(event, "sql error ret:", CODE.E_100)
    }
}

// =================================Voucher CRUD=================================
/**
 * Add voucher
 */
mqttService.insertKey = function (event) {
    let payload = JSON.parse(event.payload)
    let data = payload.data
    let res = this.insertKeyAgreement(data)
    if (typeof res == 'string') {
        return reply(event, res, CODE.E_100)
    }
    return reply(event)
}

// Add voucher universal protocol format
mqttService.insertKeyAgreement = function (data) {
    let vouchers = []
    for (let i = 0; i < data.length; i++) {
        const voucher = data[i];
        if (!voucher.keyId || !voucher.type || !voucher.code || !voucher.userId) {
            return "keyId or type or code  or userId cannot be empty"
        }

        // Duplicate voucher
        let ret = sqliteService.d1_voucher.findAllBycode(voucher.code)
        if (ret.length != 0) {
            return "Duplicate vouchers"
        }

        if (voucher.type == 300) {
            if (voucher.extra) {
                if (voucher.extra.faceType != 0 && voucher.extra.faceType != 1) {
                    return "faceType Incorrect format"
                }
            } else {
                return "faceType is required"
            }
        }
        let record = {}
        record.keyId = voucher.keyId
        record.type = voucher.type
        if (voucher.type == "400") {
            if (voucher.code.length > 6) {
                return "Password length cannot exceed 6 digits"
            }
        }
        if (voucher.type == "300") {
            if (voucher.extra.faceType == 0) {
                record.code = `/app/data/user/${voucher.userId}/register.jpg`
                // Save base64 image
                std.ensurePathExists(record.code)
                common.base64_2binfile(record.code, voucher.code)
                // Register face
                let weq = driver.face.registerFaceByPicFile(voucher.userId, record.code)
                if (weq == 0) {
                    logger.info("Face registration successful")
                } else {
                    logger.info("First face registration failed")
                    // Delete and re-register
                    driver.face.delete(voucher.userId)
                    let res = driver.face.registerFaceByPicFile(voucher.userId, record.code)
                    if (res == 0) {
                        logger.info("Second face registration successful")
                        sqliteService.d1_voucher.deleteByKeyId(record.keyId)
                    } else {
                        return "Face registration failed"
                    }
                }
            } else {
                record.code = voucher.code
                // Feature value registration
                let res = driver.face.reg(voucher.userId, voucher.code)
                if (res != 0) {
                    return "Face registration failed"
                }
            }
        } else {
            record.code = voucher.code
            let ret = sqliteService.d1_voucher.findAllByCodeAndType(voucher.code, voucher.type)
            if (ret.length != 0) {
                return "Duplicate vouchers"
            }
        }

        record.userId = voucher.userId
        record.extra = isEmpty(voucher.extra) ? JSON.stringify({ type: 0 }) : JSON.stringify(voucher.extra)
        vouchers.push(record)
    }
    let ret = sqliteService.d1_voucher.saveAll(vouchers)
    if (ret == 0) {
        return true
    } else {
        return "sql error ret:" + ret
    }
}

/**
 * Query voucher
 */
mqttService.getKey = function (event) {
    let payload = JSON.parse(event.payload)
    let data = payload.data
    let res = this.getKeyAgreement(data)
    if (typeof res == 'string') {
        return reply(event, res, CODE.E_100)
    }
    return reply(event, res)
}

// Query voucher universal protocol format
mqttService.getKeyAgreement = function (data) {
    if (!data.type) {
        return "type is required"
    }
    if (data.type == 300) {
        data.size = 1
    } else {
        data.page = isEmpty(data.page) ? 0 : data.page
        data.size = isEmpty(data.size) ? 10 : data.size
    }
    let totalCount = sqliteService.d1_voucher.count(data)
    let vouchers = sqliteService.d1_voucher.findAll(data)
    vouchers.forEach(element => {
        if (element.type == 300 && element.extra && JSON.parse(element.extra).faceType == 0) {
            // Special handling for face 
            element.code = driver.face.fileToBase64(element.code)
        }
    });
    return {
        content: vouchers,
        page: data.page,
        size: data.size,
        total: totalCount,
        totalPage: Math.ceil(totalCount / data.size),
        count: vouchers.length
    }
}

/**
 * Delete voucher
 */
mqttService.delKey = function (event) {
    let payload = JSON.parse(event.payload)
    let data = payload.data
    let res = this.delKeyAgreement(data)
    if (typeof res == 'string') {
        return reply(event, res, CODE.E_100)
    }
    return reply(event)
}

// Delete voucher universal protocol format
mqttService.delKeyAgreement = function (data) {
    if (data.keyIds && data.keyIds.length > 0) {
        let userIds = []
        for (let i = 0; i < data.keyIds.length; i++) {
            const element = data.keyIds[i];
            let res = sqliteService.d1_voucher.findAllByKeyId(element)
            if (res.length <= 0) {
                continue
            }
            if (res[0].type == 300) {
                userIds.push(res[0].userId)
            }
        }
        let ret = sqliteService.d1_voucher.deleteByKeyIdInBatch(data.keyIds)
        if (ret != 0) {
            return "sql error ret:" + ret
        }
        userIds.forEach(element => {
            driver.face.delete(element)
        });
    }
    if (data.userIds && data.userIds.length > 0) {
        let ret = sqliteService.d1_voucher.deleteByUserIdInBatch(data.userIds)
        if (ret != 0) {
            return "sql error ret:" + ret
        }
        data.userIds.forEach(element => {
            driver.face.delete(element)
        });
    }
    return true
}

/**
 * Clear vouchers
 */
mqttService.clearKey = function (event) {
    let res = sqliteService.d1_voucher.findAll()
    let userIds = []
    res.forEach(element => {
        if (element.type == 300) {
            userIds.push(element.userId)
        }
    });
    let ret = sqliteService.d1_voucher.deleteAll()
    if (ret == 0) {
        userIds.forEach((element, index) => {
            driver.face.delete(element)
        });
        reply(event)
    } else {
        reply(event, "sql error ret:" + ret, CODE.E_100)
    }
}

// =================================Secret CRUD=================================
/**
 * Add secret
 */
mqttService.insertSecurity = function (event) {
    let payload = JSON.parse(event.payload)
    let data = payload.data
    let res = this.insertSecurityAgreement(data)
    if (typeof res == 'string') {
        return reply(event, res, CODE.E_100)
    }
    return reply(event)
}

// Add secret universal protocol format
mqttService.insertSecurityAgreement = function (data) {
    let securities = []
    for (let i = 0; i < data.length; i++) {
        const security = data[i];
        let record = []
        record.securityId = security.securityId
        record.type = security.type
        record.key = security.key
        record.value = security.value
        record.startTime = security.startTime
        record.endTime = security.endTime
        securities.push(record)
    }
    let ret = sqliteService.d1_security.saveAll(securities)
    if (ret == 0) {
        return true
    } else {
        return "sql error ret:" + ret
    }
}

/**
 * Query secret
 */
mqttService.getSecurity = function (event) {
    let payload = JSON.parse(event.payload)
    let data = payload.data
    let res = this.getSecurityAgreement(data)
    return reply(event, res)
}

// Query secret universal protocol format
mqttService.getSecurityAgreement = function (data) {
    data.page = isEmpty(data.page) ? 0 : data.page
    data.size = isEmpty(data.size) ? 10 : data.size
    let totalCount = sqliteService.d1_security.count(data)
    let securities = sqliteService.d1_security.findAll(data)
    return {
        content: securities,
        page: data.page,
        size: data.size,
        total: totalCount,
        totalPage: Math.ceil(totalCount / data.size),
        count: securities.length
    }
}

/**
 * Delete secret
 */
mqttService.delSecurity = function (event) {
    let payload = JSON.parse(event.payload)
    let data = payload.data
    let res = this.delSecurityAgreement(data)
    if (typeof res == 'string') {
        return reply(event, res, CODE.E_100)
    }
    return reply(event)
}

// Delete secret universal protocol format
mqttService.delSecurityAgreement = function (data) {
    if (data.length > 0) {
        let ret = sqliteService.d1_security.deleteBySecurityIdInBatch(data)
        if (ret != 0) {
            return "sql error ret:" + ret
        }
    }
    return true
}

/**
 * Clear secrets
 */
mqttService.clearSecurity = function (event) {
    let ret = sqliteService.d1_security.deleteAll()
    if (ret == 0) {
        return reply(event)
    } else {
        return reply(event, "sql error ret:" + ret, CODE.E_100)
    }
}

/**
 * Remote control
 */
mqttService.control = function (event) {
    let payload = JSON.parse(event.payload)
    let data = payload.data
    switch (data.command) {
        case 0:
            // Reboot
            reply(event)
            common.asyncReboot(2)
            return
        case 1:
            // Remote open door
            driver.gpio.open()
            break
        case 4:
            // Reset
            common.systemBrief("rm -rf /app/data/config/*")
            common.systemBrief("rm -rf /app/data/db/*")
            common.systemBrief("rm -rf /app/data/user/*")
            common.systemBrief("rm -rf /app/data/user/*")
            common.systemBrief("rm -rf /vgmj.db")
            reply(event)
            common.asyncReboot(2)
            return
        case 5:
            // Play audio
            if (data.extra) {
                let res = common.systemWithRes(`test -e "/app/code/resource/wav/${data.extra.wav}.wav" && echo "OK" || echo "NO"`, 2)
                if (res.includes('OK')) {
                    driver.alsa.play(`/app/code/resource/wav/${data.extra.wav}.wav`)
                }
            }
            break
        case 6:
            // 6: Display image on screen
            // TODO
            break
        case 7:
            // 7: Display text on screen
            // TODO
            break
        case 10:
            if (!isEmpty(data.extra.qrCodeBase64) && typeof data.extra.qrCodeBase64 == 'string') {
                // Convert base64 to image and save
                let src = `/app/code/resource/image/app_qrcode.png`
                std.ensurePathExists(src)
                common.base64_2binfile(src, data.extra.qrCodeBase64)
                return reply(event)
            }
            break
        default:
            break
    }
    return reply(event)
}

// Query configuration
mqttService.getConfig = function (event) {
    let payload = JSON.parse(event.payload)
    let data = payload.data
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
    res.sys = {
        // Keep other values in original sysInfo
        ...res.sys,
        totalmem: common.getTotalmem(),
        freemem: common.getFreemem(),
        totaldisk: common.getTotaldisk(),
        freedisk: common.getFreedisk(),
        freecpu: common.getFreecpu()
    };
    if (isEmpty(data) || typeof data != "string" || data == "") {
        // Query all
        return reply(event, res)
    }
    // Single condition query "data": "mqttInfo.clientId"
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
    return reply(event, search)
}

// Modify configuration
mqttService.setConfig = function (event) {
    let payload = JSON.parse(event.payload)
    let data = payload.data
    if (!data || typeof data != 'object') {
        return reply(event, "data should not be empty", CODE.E_100)
    }
    let res = configService.configVerifyAndSave(data)
    if (typeof res != 'boolean') {
        // Return error message
        return reply(event, res, CODE.E_100)
    }
    if (res) {
        return reply(event)
    } else {
        return reply(event, "unknown failure", CODE.E_100)
    }
}

/**
 * Upgrade firmware
 */
mqttService.upgradeFirmware = function (event) {
    let payload = JSON.parse(event.payload)
    let data = payload.data
    if (!data || typeof data != 'object' || typeof data.type != 'number' || typeof data.url != 'string' || typeof data.md5 != 'string') {
        return reply(event, "data's params error", CODE.E_100)
    }

    if (data.type == 0) {
        try {
            driver.screen.upgrade({ title: "confirm.upgrade", content: "confirm.upgrading" })
            ota.updateHttp(data.url, data.md5, 300)
            driver.screen.upgrade({ title: "confirm.upgrade", content: "confirm.upgradeSuccess" })
        } catch (error) {
            driver.screen.upgrade({ title: "confirm.upgrade", content: "confirm.upgradeFail" })
            return reply(event, "upgrade failure", CODE.E_100)
        }
        reply(event)
        common.asyncReboot(3)
        return
    }

    return reply(event, "upgrade failure", CODE.E_100)
}
// Query recognition records
mqttService.getRecords = function (event) {
    let payload = JSON.parse(event.payload)
    let data = payload.data
    let res = this.getRecordsAgreement(data)
    return reply(event, res)
}
// Query secret universal protocol format
mqttService.getRecordsAgreement = function (data) {
    data.page = isEmpty(data.page) ? 0 : data.page
    data.size = isEmpty(data.size) ? 10 : data.size
    let totalCount = sqliteService.d1_pass_record.count(data)
    let securities = sqliteService.d1_pass_record.findAll(data)
    return {
        content: securities,
        page: data.page,
        size: data.size,
        total: totalCount,
        totalPage: Math.ceil(totalCount / data.size),
        count: securities.length
    }
}
/**
 * Delete records
 */
mqttService.delRecords = function (event) {
    let payload = JSON.parse(event.payload)
    let data = payload.data
    let res = this.deldelRecordsAgreement(data)
    if (typeof res == 'string') {
        return reply(event, res, CODE.E_100)
    }
    return reply(event)
}

// Delete records universal protocol format
mqttService.deldelRecordsAgreement = function (data) {
    if (data.ids && data.ids.length > 0) {
        let ret = sqliteService.d1_pass_record.deleteByIdInBatch(data.ids)
        if (ret != 0) {
            return "sql error ret:" + ret
        }
    }
    if (data.userIds && data.userIds.length > 0) {
        let ret = sqliteService.d1_pass_record.deleteByUserIdInBatch(data.userIds)
        if (ret != 0) {
            return "sql error ret:" + ret
        }
    }
    return true
}
// Access report reply
mqttService.access_reply = function (event) {
    let payload = JSON.parse(event.payload)
    let serialNo = map.get(payload.serialNo)
    if (serialNo) {
        common.systemBrief(`rm -rf ${serialNo}`)
        map.del(payload.serialNo)
    }
    sqliteService.d1_pass_record.deleteAll()
}

// Online verification reply
mqttService.access_online_reply = function (raw) {
    let payload = JSON.parse(raw.payload)
    let map = dxMap.get("VERIFY")
    let data = map.get(payload.serialNo)
    if (data) {
        map.del(payload.serialNo)
        driver.mqtt.getOnlinecheckReply(payload)
    }
}

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

mqttService.report = function () {
    // Online report
    let payloadReply = mqttReply(std.genRandomStr(10), {
        mac: config.get("sys.mac") || '',
        version: config.get("sys.version"),
        appVersion: config.get("sys.version"),
        releaseTime: config.get("sys.createTime"),
        type: config.get("net.type"),
    }, CODE.S_000)
    driver.mqtt.send("access_device/v2/event/connect", JSON.stringify(payloadReply))

    // Access record report
    let res = sqliteService.d1_pass_record.findAll()
    if (res.length <= 0) {
        return
    }
    // Filter objects where type === 300
    let faceArray = res.filter(item => item.type == 300);
    // Filter objects where type !== 300
    let recordArray = res.filter(item => item.type != 300);
    if (recordArray.length > 0) {
        driver.mqtt.send("access_device/v2/event/access", JSON.stringify(mqttReply(std.genRandomStr(10), recordArray, CODE.S_000)))
    }
    if (faceArray.length > 0) {
        let index = 0
        let timer = std.setInterval(() => {
            let serialNo = std.genRandomStr(10)
            // Cache the face photo src to delete
            map.del(serialNo)
            map.put(serialNo, faceArray[index].code)
            faceArray[index].code = driver.face.fileToBase64(faceArray[index].code)
            driver.mqtt.send("access_device/v2/event/access", JSON.stringify(mqttReply(serialNo, [faceArray[index]], CODE.S_000)))
            index++
            if (!faceArray[index]) {
                std.clearInterval(saveTimer)
                std.clearInterval(timer)
            }
        }, 1000)
        // Check MQTT connection status every 500ms, stop reporting if disconnected
        let saveTimer = std.setInterval(() => {
            if (!driver.mqtt.getStatus()) {
                std.clearInterval(saveTimer)
                std.clearInterval(timer)
            }
        }, 500)
    }



}

// MQTT request unified reply
function reply(event, data, code) {
    let topic = getReplyTopic(event)
    let reply = JSON.stringify(mqttReply(JSON.parse(event.payload).serialNo, data, isEmpty(code) ? CODE.S_000 : code))
    driver.mqtt.send(topic, reply)
}

/**
 * Get reply topic
 */
function getReplyTopic(data) {
    return data.topic.replace("/" + config.get("sys.sn"), '') + "_reply";
}

// MQTT reply format construction
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

mqttService.getTopics = function () {
    // Get all subscribed topics
    let sn = config.get("mqtt.clientId")
    const topics = [
        "control", "getConfig", "setConfig", "upgradeFirmware", "test",
        "getPermission", "insertPermission", "delPermission", "clearPermission",
        "getKey", "insertKey", "delKey", "clearKey",
        "getUser", "insertUser", "delUser", "clearUser",
        "getSecurity", "insertSecurity", "delSecurity", "clearSecurity", "getRecords", "delRecords"
    ]
    const eventReplies = ["connect_reply", "alarm_reply", "access_reply", "access_online_reply"]

    let flag = 'access_device/v2/cmd/' + sn + "/"
    let eventFlag = 'access_device/v2/event/' + sn + "/"
    return topics.map(item => flag + item).concat(eventReplies.map(item => eventFlag + item));
}

// Check if empty
function isEmpty(value) {
    return value === undefined || value === null || value === ""
}

export default mqttService