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
        logger.error("未实现的topic", data.topic)
    }
}

// =================================权限增删改查=================================
/**
 * 添加权限
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

// 添加权限通用协议格式
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
 * 查询权限
 */
mqttService.getPermission = function (event) {
    let payload = JSON.parse(event.payload)
    let data = payload.data
    let res = this.getPermissionAgreement(data)
    return reply(event, res)
}

// 查询权限通用协议格式
mqttService.getPermissionAgreement = function (data) {
    data.page = isEmpty(data.page) ? 0 : data.page
    data.size = isEmpty(data.size) ? 10 : data.size
    let totalCount = sqliteService.d1_permission.count(data)
    let permissions = sqliteService.d1_permission.findAll(data)
    // 构建返回结果
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
 * 删除权限
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

// 删除权限通用协议格式
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
 * 清空权限
 */
mqttService.clearPermission = function (event) {
    let ret = sqliteService.d1_permission.deleteAll()
    if (ret == 0) {
        return reply(event)
    } else {
        return reply(event, "sql error ret:" + ret, CODE.E_100)
    }
}


// =================================人员增删改查=================================
/**
 * 添加人员
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

// 添加人员通用协议格式
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
        //失败了 把这些人全都删除后在新增一下
        let userIds = persons.map(obj => obj.userId);
        sqliteService.d1_person.deleteByUserIdInBatch(userIds)
        //重新新增
        let ret = sqliteService.d1_person.saveAll(persons)
        if (ret != 0) {
            return "sql error ret:" + ret
        }
    }
    return true

}

/**
 * 查询人员
 */
mqttService.getUser = function (event) {
    let payload = JSON.parse(event.payload)
    let data = payload.data
    let res = this.getUserAgreement(data)
    return reply(event, res)
}

// 查询人员通用协议格式
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
 * 删除人员
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

// 删除人员通用协议格式
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
 * 清空人员
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

// =================================凭证增删改查=================================
/**
 * 添加凭证
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

// 添加凭证通用协议格式
mqttService.insertKeyAgreement = function (data) {
    let vouchers = []
    for (let i = 0; i < data.length; i++) {
        const voucher = data[i];
        if (!voucher.keyId || !voucher.type || !voucher.code || !voucher.userId) {
            return "keyId or type or code  or userId cannot be empty"
        }

        // 凭证重复
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
                // 保存base64图片
                std.ensurePathExists(record.code)
                common.base64_2binfile(record.code, voucher.code)
                // 注册人脸
                let weq = driver.face.registerFaceByPicFile(voucher.userId, record.code)
                if (weq == 0) {
                    logger.info("注册人脸成功")
                } else {
                    logger.info("第一次人脸注册失败")
                    //删除重新注册
                    driver.face.delete(voucher.userId)
                    let res = driver.face.registerFaceByPicFile(voucher.userId, record.code)
                    if (res == 0) {
                        logger.info("第二次注册人脸成功")
                        sqliteService.d1_voucher.deleteByKeyId(record.keyId)
                    } else {
                        return "Face registration failed"
                    }
                }
            } else {
                record.code = voucher.code
                //特征值注册
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
 * 查询凭证
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

// 查询凭证通用协议格式
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
            //人脸特殊处理一下 
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
 * 删除凭证
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

// 删除凭证通用协议格式
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
 * 清空凭证
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

// =================================密钥增删改查=================================
/**
 * 添加密钥
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

// 添加密钥通用协议格式
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
 * 查询密钥
 */
mqttService.getSecurity = function (event) {
    let payload = JSON.parse(event.payload)
    let data = payload.data
    let res = this.getSecurityAgreement(data)
    return reply(event, res)
}

// 查询密钥通用协议格式
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
 * 删除密钥
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

// 删除密钥通用协议格式
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
 * 清空密钥
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
 * 远程控制
 */
mqttService.control = function (event) {
    let payload = JSON.parse(event.payload)
    let data = payload.data
    switch (data.command) {
        case 0:
            //重启
            reply(event)
            common.asyncReboot(2)
            return
        case 1:
            //远程开门
            driver.gpio.open()
            break
        case 4:
            //重置
            common.systemBrief("rm -rf /app/data/config/*")
            common.systemBrief("rm -rf /app/data/db/*")
            common.systemBrief("rm -rf /app/data/user/*")
            common.systemBrief("rm -rf /app/data/user/*")
            common.systemBrief("rm -rf /vgmj.db")
            reply(event)
            common.asyncReboot(2)
            return
        case 5:
            //播放语音
            if (data.extra) {
                let res = common.systemWithRes(`test -e "/app/code/resource/wav/${data.extra.wav}.wav" && echo "OK" || echo "NO"`, 2)
                if (res.includes('OK')) {
                    driver.alsa.play(`/app/code/resource/wav/${data.extra.wav}.wav`)
                }
            }
            break
        case 6:
            // 6：屏幕展示图片
            // TODO
            break
        case 7:
            // 7：屏幕展示文字
            // TODO
            break
        case 10:
            if (!isEmpty(data.extra.qrCodeBase64) && typeof data.extra.qrCodeBase64 == 'string') {
                //base64转图片保存
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

//查询配置
mqttService.getConfig = function (event) {
    let payload = JSON.parse(event.payload)
    let data = payload.data
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
    res.sys = {
        // 保留原有的 sysInfo 中的其他值
        ...res.sys,
        totalmem: common.getTotalmem(),
        freemem: common.getFreemem(),
        totaldisk: common.getTotaldisk(),
        freedisk: common.getFreedisk(),
        freecpu: common.getFreecpu()
    };
    if (isEmpty(data) || typeof data != "string" || data == "") {
        // 查询全部
        return reply(event, res)
    }
    // 单条件查询"data": "mqttInfo.clientId"
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

// 修改配置
mqttService.setConfig = function (event) {
    let payload = JSON.parse(event.payload)
    let data = payload.data
    if (!data || typeof data != 'object') {
        return reply(event, "data should not be empty", CODE.E_100)
    }
    let res = configService.configVerifyAndSave(data)
    if (typeof res != 'boolean') {
        // 返回错误信息
        return reply(event, res, CODE.E_100)
    }
    if (res) {
        return reply(event)
    } else {
        return reply(event, "unknown failure", CODE.E_100)
    }
}

/**
 * 升级固件
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
//查询识别记录
mqttService.getRecords = function (event) {
    let payload = JSON.parse(event.payload)
    let data = payload.data
    let res = this.getRecordsAgreement(data)
    return reply(event, res)
}
// 查询密钥通用协议格式
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
 * 删除记录
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

// 删除记录通用协议格式
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
// 通行上报回复
mqttService.access_reply = function (event) {
    let payload = JSON.parse(event.payload)
    let serialNo = map.get(payload.serialNo)
    if (serialNo) {
        common.systemBrief(`rm -rf ${serialNo}`)
        map.del(payload.serialNo)
    }
    sqliteService.d1_pass_record.deleteAll()
}

// 在线验证回复
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
        mac: config.get("sys.mac") || '',
        version: config.get("sys.version"),
        appVersion: config.get("sys.version"),
        releaseTime: config.get("sys.createTime"),
        type: config.get("net.type"),
    }, CODE.S_000)
    driver.mqtt.send("access_device/v2/event/connect", JSON.stringify(payloadReply))

    //通行记录上报
    let res = sqliteService.d1_pass_record.findAll()
    if (res.length <= 0) {
        return
    }
    // 筛选出 type === 300 的对象
    let faceArray = res.filter(item => item.type == 300);
    // 筛选出 type !== 300 的对象
    let recordArray = res.filter(item => item.type != 300);
    if (recordArray.length > 0) {
        driver.mqtt.send("access_device/v2/event/access", JSON.stringify(mqttReply(std.genRandomStr(10), recordArray, CODE.S_000)))
    }
    if (faceArray.length > 0) {
        let index = 0
        let timer = std.setInterval(() => {
            let serialNo = std.genRandomStr(10)
            //缓存放入要删除的人脸照片 src
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
        // 每隔500ms检查一次mqtt连接状态，如果断开，则停止上报
        let saveTimer = std.setInterval(() => {
            if (!driver.mqtt.getStatus()) {
                std.clearInterval(saveTimer)
                std.clearInterval(timer)
            }
        }, 500)
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

mqttService.getTopics = function () {
    // 获取所有订阅的topic
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

// 判空
function isEmpty(value) {
    return value === undefined || value === null || value === ""
}

export default mqttService