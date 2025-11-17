import dxCommonUtils from "../../dxmodules/dxCommonUtils.js";
import dxos from "../../dxmodules/dxOs.js";
import config from "../../dxmodules/dxConfig.js";
import dxMap from "../../dxmodules/dxMap.js";
import logger from "../../dxmodules/dxLogger.js";
import ota from "../../dxmodules/dxOta.js";
import std from "../../dxmodules/dxStd.js";
import driver from "../driver.js";
import configService from "./configService.js";
import sqliteService from "./sqliteService.js";
import utils from '../common/utils/utils.js'
import bus from '../../dxmodules/dxEventBus.js'
import faceService from "./faceService.js";
const api = {}


//远程控制
api.control = function (payload) {
    let data = payload.data
    switch (data.command) {
        case 0:
            //重启
            dxos.asyncReboot(2)
            break
        case 1:
            //远程开门
            driver.gpio.open()
            break
        case 4:
            //重置
            dxos.systemBrief("rm -rf /app/data/config/*")
            dxos.systemBrief("rm -rf /app/data/db/*")
            dxos.systemBrief("rm -rf /data/*")
            dxos.asyncReboot(2)
            return
        case 5:
            //播放语音
            // if (!isEmpty(payload.extra.wav) && typeof payload.extra.wav == 'string') {
            //     vf203.alsa.play("/app/code/resource/wav/" + payload.extra.wav)
            // }
            break
        case 6:
            // 6：屏幕展示图片
            // TODO
            break
        case 7:
            // 7：屏幕展示文字
            // TODO
            break
        case 8:
            // 8：抓拍人脸
            bus.fire("weComTackFace", payload)
            break
        case 10:
            if (!isEmpty(data.extra.qrCodeBase64) && typeof data.extra.qrCodeBase64 == 'string') {
                //base64转图片保存                
                let src = `/app/code/resource/image/app_qrcode.png`
                std.ensurePathExists(src)
                dxCommonUtils.fs.base64ToFile(src, data.extra.qrCodeBase64)
            }
            break
        case 11:
            // 企业微信绑定状态通知
            bus.fire("weComIsBind", payload)
            break
    }
    return true
}


//查询配置
api.getConfig = function (data) {
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
        totalmem: dxos.getTotalmem(),
        freemem: dxos.getFreemem(),
        totaldisk: dxos.getTotaldisk(),
        freedisk: dxos.getFreedisk(),
        freecpu: dxos.getFreecpu()
    };
    if (isEmpty(data) || typeof data != "string" || data == "") {
        if (res.mqtt && res.mqtt.clientId) {
            res.mqtt.clientId = dxMap.get("CLIENT").get("CLIENT_ID")
        }
        // 查询全部
        return res
    }
    // 单条件查询"data": "mqttInfo.clientId"
    let keys = data.split(".")
    let search = {}
    if (keys.length == 2) {
        const [group, field] = keys
        if (res[group] && res[group][field] !== undefined) {
            search[group] = {}
            search[group][field] = res[group][field]
        }
    } else {
        const group = keys[0]
        if (res[group]) {
            search[group] = res[group]
        }
    }
    if (search.mqtt && search.mqtt.clientId) {
        search.mqtt.clientId = dxMap.get("CLIENT").get("CLIENT_ID")
    }
    return search
}

//修改配置
api.setConfig = function (data) {
    if (!data || typeof data != 'object') {
        return "data should not be empty"
    }
    let res = configService.configVerifyAndSave(data)
    if (typeof res != 'boolean') {
        // 返回错误信息
        return res
    }
    if (res) {
        return res
    } else {
        return "unknown failure"
    }
}

//升级固件
api.upgradeFirmware = function (data) {
    if (!data || typeof data != 'object' || typeof data.type != 'number' || typeof data.url != 'string' || typeof data.md5 != 'string') {
        return "data's params error"
    }
    if (data.type == 0) {
        try {
            driver.screen.upgrade({ title: "confirm.upgrade", content: "confirm.upgrading" })
            ota.updateHttp(data.url, data.md5, 60)
            driver.screen.upgrade({ title: "confirm.upgrade", content: "confirm.upgradeSuccess" })
        } catch (error) {
            driver.screen.upgrade({ title: "confirm.upgrade", content: "confirm.upgradeFail" })
            return "upgrade failure"
        }
        dxos.asyncReboot(3)
        return
    }
}

//查询识别记录
api.getRecords = function (data, flag) {
    if (typeof data.page !== 'number' || data.page < 0) {
        return "Invalid parameter: 'page' must be a number >= 0"
    }
    if (typeof data.size !== 'number' || data.size <= 0 || data.size > 1000) {
        return "Invalid parameter: 'size' must be a number between 1 and 1000";
    }
    if (data.startTime && typeof data.startTime != 'number') {
        return "Invalid parameter: 'startTime' must be a number"
    }
    if (data.endTime && typeof data.endTime != 'number') {
        return "Invalid parameter: 'endTime' must be a number"
    }
    if (data.userId && !Array.isArray(data.userId)) {
        return "Invalid parameter: 'userId' must be an array"
    }
    if (data.recordId && !Array.isArray(data.recordId)) {
        return "Invalid parameter: 'recordId' must be an array"
    }
    // 处理人员姓名查询条件
    let userIds = [];
    if (data.name) {
        let persons = sqliteService.d1_person.findAll({ name: data.name.trim() })
        if (persons && persons.length) {
            userIds = persons.map(person => person.userId)
        } else {
            // 找不到人员直接返回空
            return {
                page: data.page,
                size: data.size,
                total: 0,
                totalPage: 0,
                count: 0,
                content: []
            }
        }
    }
    // 处理人员ID查询条件
    if (data.userId && data.userId.length > 0) {
        if (data.userId[0] !== -1) {
            // 如果已经通过姓名查询得到了userIds，则取交集；否则使用传入的userIds
            if (userIds.length > 0) {
                userIds = userIds.filter(id => data.userId.includes(id));
            } else {
                userIds = data.userId;
            }
        }
        // 如果传入的是[-1]，表示查询所有，userIds保持为空数组，表示不按userId过滤
    }

    // 构建WHERE条件数组
    let whereConditions = [];

    // 处理人员ID条件
    if (userIds.length > 0) {
        let userIdsStr = userIds.map(id => `'${id}'`).join(',');
        whereConditions.push(`userId IN (${userIdsStr})`);
    }

    // 处理识别记录ID条件
    if (data.recordId && data.recordId.length > 0) {
        let recordIdsStr = data.recordId.map(id => `'${id}'`).join(',');
        whereConditions.push(`id IN (${recordIdsStr})`);
    }

    // 处理时间区间查询条件
    if (data.startTime && data.endTime) {
        whereConditions.push(`timeStamp >= ${data.startTime} AND timeStamp <= ${data.endTime}`);
    } else if (data.startTime) {
        whereConditions.push(`timeStamp >= ${data.startTime}`);
    } else if (data.endTime) {
        whereConditions.push(`timeStamp <= ${data.endTime}`);
    }
    // 构建WHERE子句
    let whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    // 计算分页
    let offset = data.page * data.size;

    // 查询总数
    let countSql = `SELECT COUNT(*) as total FROM d1_pass_record ${whereClause}`;
    let countResult = sqliteService.select(countSql);
    let totalCount = countResult && countResult[0] ? countResult[0].total : 0;

    // 查询记录
    let recordsSql = `SELECT * FROM d1_pass_record ${whereClause} ORDER BY timeStamp DESC LIMIT ${data.size} OFFSET ${offset}`;
    let records = sqliteService.select(recordsSql);
    if (records && records.length > 0) {
        records.forEach(record => {
            if (flag) {
                if (record.type == 300 && std.exist(record.code)) {
                    if (data.size <= 50) {
                        record.code = dxCommonUtils.fs.fileToBase64(record.code)
                    }
                }
            }
            // 关联人员信息
            if (record.userId) {
                let person = sqliteService.d1_person.findByUserId(record.userId)
                if (person.length) {
                    record.name = person[0].name
                    record.extra = person[0].extra
                }
            }
        })
    } else {
        records = []
    }
    return {
        page: data.page,
        size: data.size,
        total: totalCount,
        totalPage: Math.ceil(totalCount / data.size),
        count: records.length,
        content: records
    }
}

//删除识别记录
api.delRecords = function (data) {
    if (data.startTime && typeof data.startTime != 'number') {
        return "Invalid parameter: 'startTime' must be a number"
    }
    if (data.endTime && typeof data.endTime != 'number') {
        return "Invalid parameter: 'endTime' must be a number"
    }
    if (data.userId && !Array.isArray(data.userId)) {
        return "Invalid parameter: 'userId' must be an array"
    }
    if (data.recordId && !Array.isArray(data.recordId)) {
        return "Invalid parameter: 'recordId' must be an array"
    }
    // 构建删除条件
    let whereConditions = [];
    if (data.recordId && data.recordId.length > 0) {
        let recordIdsStr = data.recordId.map(id => `'${id}'`).join(',');
        whereConditions.push(`id IN (${recordIdsStr})`);
    }
    if (data.userId && data.userId.length > 0) {
        let userIdsStr = data.userId.map(id => `'${id}'`).join(',');
        whereConditions.push(`userId IN (${userIdsStr})`);
    }
    if (data.startTime && data.startTime > 0) {
        whereConditions.push(`timeStamp >= ${data.startTime}`);
    }
    if (data.endTime && data.endTime > 0) {
        whereConditions.push(`timeStamp <= ${data.endTime}`);
    }
    let whereClause = `WHERE ${whereConditions.join(' AND ')}`;
    let deleteSql = `DELETE FROM d1_pass_record ${whereClause}`;
    let ret = sqliteService.exec(deleteSql);
    if (ret != 0) {
        return "SQL error ret: " + ret;
    }
    return true
}

//添加人员
api.insertUser = function (data) {
    let errors = []
    for (let i = 0; i < data.length; i++) {
        const person = data[i];
        let errorItem = {
            userId: person.userId || 'unknown',
            errmsg: ''
        }
        if (!person.userId || !person.name) {
            errorItem.errmsg = "userId or name cannot be empty"
            errors.push(errorItem)
            continue
        }
        if (person.permissionIds && !Array.isArray(person.permissionIds)) {
            errorItem.errmsg = "permissionIds should be an array"
            errors.push(errorItem)
            continue
        }
        let record = {}
        record.userId = person.userId
        record.name = person.name
        record.extra = isEmpty(person.extra) ? JSON.stringify({}) : JSON.stringify(person.extra)
        record.permissionIds = person.permissionIds ? person.permissionIds.join(",") : ""
        let ret = sqliteService.d1_person.save(record)
        if (ret != 0) {
            sqliteService.d1_person.deleteByUserId(record.userId)
            ret = sqliteService.d1_person.save(record)
            if (ret != 0) {
                errorItem.errmsg = "sql error ret:" + ret
                errors.push(errorItem)
                continue
            }
        }
    }
    if (errors.length > 0) {
        return errors
    }
    return true
}

//删除人员
api.delUser = function (data) {
    let errors = []
    if (data && data.length > 0) {
        for (let i = 0; i < data.length; i++) {
            const userId = data[i]
            let errorItem = {
                userId: userId || 'unknown',
                errmsg: ''
            }
            let ret1 = sqliteService.d1_person.deleteByUserId(userId)
            let ret3 = sqliteService.d1_voucher.deleteByUserId(userId)
            if (ret1 != 0 || ret3 != 0) {
                errorItem.errmsg = `sql error: person(${ret1}), voucher(${ret3})`
                errors.push(errorItem)
                continue
            }
            try {
                driver.face.deleteFea(userId)
            } catch (error) {
                logger.error(`Failed to delete face feature for user ${userId}:`, error)
            }
        }
    }
    if (errors.length > 0) {
        return errors
    }
    return true
}

//查询人员
api.getUser = function (data) {
    if (typeof data.page !== 'number' || data.page < 0) {
        return "Invalid parameter: 'page' must be a number >= 0"
    }
    if (typeof data.size !== 'number' || data.size <= 0 || data.size > 100) {
        return "Invalid parameter: 'size' must be a number between 1 and 100";
    }
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

//清空人员
api.clearUser = function () {
    let ret1 = sqliteService.d1_person.deleteAll()
    let ret2 = sqliteService.d1_permission.deleteAll()
    let ret3 = sqliteService.d1_voucher.deleteAll()
    try {
        driver.face.clean()
    } catch (error) {
        return error.message
    }
    if (ret1 == 0 && ret2 == 0 && ret3 == 0) {
        return true
    } else {
        return "sql error"
    }
}

//修改人员
api.modifyUser = function (data) {

    let errors = []
    for (let i = 0; i < data.length; i++) {
        const person = data[i];
        let errorItem = {
            userId: person.userId || 'unknown',
            errmsg: ''
        }
        if (!person.userId || !person.name) {
            errorItem.errmsg = "userId or name cannot be empty"
            errors.push(errorItem)
            continue
        }
        if (person.permissionIds && !Array.isArray(person.permissionIds)) {
            errorItem.errmsg = "permissionIds should be an array"
            errors.push(errorItem)
            continue
        }
        let record = {}
        record.userId = person.userId
        record.name = person.name
        record.extra = isEmpty(person.extra) ? JSON.stringify({}) : JSON.stringify(person.extra)
        record.permissionIds = person.permissionIds ? person.permissionIds.join(",") : ''
        let ret = sqliteService.d1_person.updateAllByUserId(record, record.userId)
        if (ret != 0) {
            errorItem.errmsg = "sql error ret:" + ret
            errors.push(errorItem)
            continue
        }
    }
    if (errors.length > 0) {
        return errors
    }
    return true
}

//添加凭证
api.insertKey = function (data) {
    let errors = []
    for (let i = 0; i < data.length; i++) {
        const voucher = data[i];
        let errorItem = {
            keyId: voucher.keyId || 'unknown',
            errmsg: ''
        }
        if (!voucher.keyId || !voucher.type || !voucher.code || !voucher.userId) {
            errorItem.errmsg = "keyId or type or code or userId cannot be empty"
            errors.push(errorItem)
            continue
        }
        // 凭证重复
        let ret = sqliteService.d1_voucher.findByCodeAndType(voucher.code, voucher.type)
        if (ret.length > 0 && ret[0].userId != voucher.userId) {
            errorItem.errmsg = "Duplicate vouchers"
            errors.push(errorItem)
            continue
        }
        if (voucher.type == "200" || voucher.type == "201" || voucher.type == "202") {
            voucher.code = voucher.code.toUpperCase()
        }
        if (voucher.type == "300" && voucher.extra.faceType != 0 && voucher.extra.faceType != 1) {
            errorItem.errmsg = "faceType Incorrect format"
            errors.push(errorItem)
            continue
        }
        if (voucher.type == "400") {
            if (voucher.code.length != 6) {
                errorItem.errmsg = "Password length must be 6 digits"
                errors.push(errorItem)
                continue
            }
        }
        let record = {}
        record.keyId = voucher.keyId
        record.type = voucher.type
        if (voucher.type == "300") {
            if (voucher.extra.faceType == 0) {
                try {
                    record.code = `/data/user/${voucher.userId}/register.jpg`
                    try {
                        // 保存base64图片
                        std.ensurePathExists(record.code)
                        dxCommonUtils.fs.base64ToFile(record.code, voucher.code)
                    } catch (error) {
                        errorItem.errmsg = "文件保存失败"
                        errors.push(errorItem)
                        continue
                    }
                    try {
                        // 提取特征值
                        let featureFile = driver.face.getFeaByFile(record.code)
                        let addFeaRes = driver.face.addFea(voucher.userId, featureFile.feature)
                        if (addFeaRes != 0) {
                            logger.info("第一次人脸注册失败")
                            // 删除重新注册
                            driver.face.deleteFea(voucher.userId)
                            let addFeaResAgain = driver.face.addFea(voucher.userId, featureFile.feature)
                            if (addFeaResAgain == 0) {
                                logger.info("第二次注册人脸成功")
                            } else {
                                errorItem.errmsg = addFeaResAgain
                                errors.push(errorItem)
                                continue
                            }
                        }
                    } catch (error) {
                        logger.info(error.message)
                        errorItem.errmsg = error.message
                        errors.push(errorItem)
                        continue
                    }
                } catch (unexpectedError) {
                    errorItem.errmsg = unexpectedError.message
                    errors.push(errorItem)
                    continue
                }
            } else {
                record.code = voucher.code
                //特征值注册
                try {
                    let addFeaRes = driver.face.addFea(voucher.userId, voucher.code)
                    if (addFeaRes != 0) {
                        logger.info("第一次人脸注册失败")
                        // 删除重新注册
                        driver.face.deleteFea(voucher.userId)
                        let addFeaResAgain = driver.face.addFea(voucher.userId, voucher.code)
                        if (addFeaResAgain == 0) {
                            logger.info("第二次注册人脸成功")
                        } else {
                            errorItem.errmsg = addFeaResAgain
                            errors.push(errorItem)
                            continue
                        }
                    }
                } catch (error) {
                    errorItem.errmsg = error.message
                    errors.push(errorItem)
                    continue
                }
            }
        } else {
            record.code = voucher.code
            let ret = sqliteService.d1_voucher.findAllByCodeAndType(voucher.code, voucher.type)
            if (ret.length != 0) {
                errorItem.errmsg = "Duplicate vouchers"
                errors.push(errorItem)
                continue
            }
        }
        record.userId = voucher.userId
        record.extra = isEmpty(voucher.extra) ? JSON.stringify({ type: 0 }) : JSON.stringify(voucher.extra)
        let ret2 = sqliteService.d1_voucher.save(record)
        if (ret2 != 0) {
            sqliteService.d1_voucher.deleteByKeyId(record.keyId)
            ret2 = sqliteService.d1_voucher.save(record)
            if (ret2 != 0) {
                errorItem.errmsg = "sql error ret:" + ret2
                errors.push(errorItem)
                continue
            }
        }
    }
    if (errors.length > 0) {
        return errors
    }
    return true
}

//查询凭证
api.getKey = function (data) {
    if (typeof data.page !== 'number' || data.page < 0) {
        return "Invalid parameter: 'page' must be a number >= 0"
    }
    if (typeof data.size !== 'number' || data.size <= 0 || data.size > 100) {
        return "Invalid parameter: 'size' must be a number between 1 and 100";
    }
    let totalCount = sqliteService.d1_voucher.count(data)
    let vouchers = sqliteService.d1_voucher.findAll(data)
    vouchers.forEach(element => {
        if (element.type == 300 && element.extra && JSON.parse(element.extra).faceType == 0) {
            //人脸特殊处理一下
            element.code = dxCommonUtils.fs.fileToBase64(element.code)
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

//删除凭证
api.delKey = function (data) {
    let errors = []
    if (data.keyIds && data.keyIds.length > 0) {
        for (let i = 0; i < data.keyIds.length; i++) {
            const keyId = data.keyIds[i];
            let errorItem = {
                keyId: keyId || 'unknown',
                errmsg: ''
            }
            let res = sqliteService.d1_voucher.findAllByKeyId(keyId)
            if (res.length <= 0) {
                errorItem.errmsg = "voucher not found"
                errors.push(errorItem)
                continue
            }
            if (res[0].type == 300) {
                try {
                    driver.face.deleteFea(res[0].userId)
                } catch (error) {
                    logger.error(`Failed to delete face feature for user ${res[0].userId}:`, error)
                }
            }
            let ret = sqliteService.d1_voucher.deleteByKeyId(keyId)
            if (ret != 0) {
                errorItem.errmsg = "sql error ret:" + ret
                errors.push(errorItem)
                continue
            }
        }

    }
    if (data.userIds && data.userIds.length > 0) {
        for (let i = 0; i < data.userIds.length; i++) {
            const userId = data.userIds[i];
            let errorItem = {
                userId: userId || 'unknown',
                errmsg: ''
            }
            if (sqliteService.d1_voucher.countByUserId(userId) == 0) {
                errorItem.errmsg = "user has no vouchers"
                errors.push(errorItem)
                continue
            }
            let ret = sqliteService.d1_voucher.deleteByUserId(userId)
            if (ret != 0) {
                errorItem.errmsg = "sql error ret:" + ret
                errors.push(errorItem)
                continue
            }
            try {
                driver.face.deleteFea(userId)
            } catch (error) {
                logger.error(`Failed to delete face feature for user ${res[0].userId}:`, error)
            }
        }

    }
    return true
}

//清空凭证
api.clearKey = function (data) {
    let ret = sqliteService.d1_voucher.deleteAll()
    try {
        driver.face.clean()
    } catch (error) {
        return error.message
    }
    if (ret == 0) {
        return true
    } else {
        return "sql error "
    }
}

//修改凭证
api.modifyKey = function (data) {
    let errors = []
    for (let i = 0; i < data.length; i++) {
        const voucher = data[i];
        let errorItem = {
            keyId: voucher.keyId || 'unknown',
            errmsg: ''
        }
        if (!voucher.keyId || !voucher.type || !voucher.code || !voucher.userId) {
            errorItem.errmsg = "keyId or type or code or userId cannot be empty"
            errors.push(errorItem)
            continue
        }
        let existingVouchers = sqliteService.d1_voucher.findAll({ keyId: voucher.keyId })
        if (existingVouchers.length == 0) {
            errorItem.errmsg = "voucher not found"
            errors.push(errorItem)
            continue
        }
        if (!voucher.keyId || !voucher.type || !voucher.code || !voucher.userId) {
            errorItem.errmsg = "keyId or type or code or userId cannot be empty"
            errors.push(errorItem)
            continue
        }
        if (voucher.type == "200" || voucher.type == "201" || voucher.type == "202") {
            voucher.code = voucher.code.toUpperCase()
        }
        if (voucher.type == "300" && voucher.extra.faceType != 0 && voucher.extra.faceType != 1) {
            errorItem.errmsg = "faceType Incorrect format"
            errors.push(errorItem)
            continue
        }
        if (voucher.type == "400") {
            if (voucher.code.length != 6) {
                errorItem.errmsg = "Password length must be 6 digits"
                errors.push(errorItem)
                continue
            }
        }
        let record = {}
        record.keyId = voucher.keyId
        record.type = voucher.type
        if (voucher.type == "300") {
            if (voucher.extra.faceType == 0) {
                try {
                    record.code = `/data/user/${voucher.userId}/register.jpg`
                    try {
                        // 保存base64图片
                        std.ensurePathExists(record.code)
                        dxCommonUtils.fs.base64ToFile(record.code, voucher.code)
                    } catch (error) {
                        errorItem.errmsg = "文件保存失败"
                        errors.push(errorItem)
                        continue
                    }
                    try {
                        // 提取特征值
                        let featureFile = driver.face.getFeaByFile(record.code)
                        let updateFeaRes = driver.face.updateFea(voucher.userId, featureFile.feature)
                        if (updateFeaRes != 0) {
                            logger.info("第一次人脸修改失败")
                            let updateFeaResAgain = driver.face.updateFea(voucher.userId, featureFile.feature)
                            if (updateFeaResAgain == 0) {
                                logger.info("第二次人脸修改成功")
                            } else {
                                errorItem.errmsg = updateFeaResAgain
                                errors.push(errorItem)
                                continue
                            }
                        }
                    } catch (error) {
                        logger.info(error.message)
                        errorItem.errmsg = error.message
                        errors.push(errorItem)
                        continue
                    }
                } catch (unexpectedError) {
                    errorItem.errmsg = unexpectedError.message
                    errors.push(errorItem)
                    continue
                }
            } else {
                record.code = voucher.code
                //特征值注册
                try {
                    let updateFeaRes = driver.face.updateFea(voucher.userId, voucher.code)
                    if (updateFeaRes != 0) {
                        logger.info("第一次人脸修改失败")
                        let updateFeaResAgain = driver.face.updateFea(voucher.userId, voucher.code)
                        if (updateFeaResAgain == 0) {
                            logger.info("第二次人脸修改成功")
                        } else {
                            errorItem.errmsg = updateFeaResAgain
                            errors.push(errorItem)
                            continue
                        }
                    }
                } catch (error) {
                    errorItem.errmsg = error.message
                    errors.push(errorItem)
                    continue
                }
            }
        } else {
            record.code = voucher.code
            let ret = sqliteService.d1_voucher.findAllByCodeAndType(voucher.code, voucher.type)
            if (ret.length > 0 && ret[0].userId != voucher.userId) {
                errorItem.errmsg = "Duplicate vouchers"
                errors.push(errorItem)
                continue
            }
        }
        record.userId = voucher.userId
        record.extra = isEmpty(voucher.extra) ? JSON.stringify({ type: 0 }) : JSON.stringify(voucher.extra)
        let ret2 = sqliteService.d1_voucher.updateAllByKeyId(record, record.keyId)
        if (ret2 != 0) {
            errorItem.errmsg = "sql error ret:" + ret2
            errors.push(errorItem)
            continue
        }
    }
    if (errors.length > 0) {
        return errors
    }
    return true
}

//添加权限
api.insertPermission = function (data) {
    let errors = []
    for (let i = 0; i < data.length; i++) {
        const permission = data[i];
        let errorItem = {
            permissionId: permission.permissionId || 'unknown',
            errmsg: ''
        }
        if (!permission.permissionId) {
            errorItem.errmsg = "permissionId cannot be empty"
            errors.push(errorItem)
            continue
        }
        if (!permission.extra) {
            permission.extra = ""
        }
        if (!permission.time) {
            errorItem.errmsg = "time and type cannot be empty"
            errors.push(errorItem)
            continue
        }
        if (permission.time.type != 0 && permission.time.type != 1 && permission.time.type != 2 && permission.time.type != 3) {
            errorItem.errmsg = "time type is not supported"
            errors.push(errorItem)
            continue
        }
        let record = {}
        record.permissionId = permission.permissionId
        record.door = isEmpty(permission.index) ? 0 : permission.index
        record.extra = isEmpty(permission.extra) ? JSON.stringify({}) : JSON.stringify(permission.extra)
        record.timeType = permission.time.type
        record.beginTime = permission.time.type == 0 ? 0 : permission.time.range.beginTime
        record.endTime = permission.time.type == 0 ? 0 : permission.time.range.endTime
        if (permission.time.type != 2 && permission.time.type != 3) {
            record.period = 0
        } else if (permission.time.type == 2) {
            record.period = permission.time.dayPeriodTime
        } else if (permission.time.type == 3) {
            record.period = JSON.stringify(permission.time.weekPeriodTime)
        }
        let ret = sqliteService.d1_permission.save(record)
        if (ret != 0) {
            sqliteService.d1_permission.deleteByPermissionId(record.permissionId)
            ret = sqliteService.d1_permission.save(record)
            if (ret != 0) {
                errorItem.errmsg = "sql error ret:" + ret
                errors.push(errorItem)
                continue
            }
        }
    }
    if (errors.length > 0) {
        return errors
    }
    return true
}

//查询权限
api.getPermission = function (data) {
    if (typeof data.page !== 'number' || data.page < 0) {
        return "Invalid parameter: 'page' must be a number >= 0"
    }
    if (typeof data.size !== 'number' || data.size <= 0 || data.size > 100) {
        return "Invalid parameter: 'size' must be a number between 1 and 100";
    }
    let totalCount = sqliteService.d1_permission.count(data)
    let permissions = sqliteService.d1_permission.findAll(data)
    // 构建返回结果
    let content = permissions.map(permission => ({
        permissionId: permission.permissionId,
        extra: JSON.parse(permission.extra ? permission.extra : "{}"),
        time: {
            type: permission.timeType,
            range: permission.timeType === 0 ? undefined : { beginTime: permission.beginTime, endTime: permission.endTime },
            dayPeriodTime: permission.timeType != 2 ? undefined : permission.period,
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

//删除权限
api.delPermission = function (data) {
    let errors = []
    if (data.permissionIds && data.permissionIds.length > 0) {
        for (let i = 0; i < data.permissionIds.length; i++) {
            const permissionId = data.permissionIds[i];
            let errorItem = {
                permissionId: permissionId || 'unknown',
                errmsg: ''
            }
            let ret = sqliteService.d1_permission.deleteByPermissionId(permissionId)
            if (ret != 0) {
                errorItem.errmsg = "sql error ret:" + ret
                errors.push(errorItem)
                continue
            }
        }
    }
    if (errors.length > 0) {
        return errors
    }
    return true
}

//修改权限
api.modifyPermission = function (data) {
    let errors = []
    for (let i = 0; i < data.length; i++) {
        const permission = data[i];
        let errorItem = {
            permissionId: permission.permissionId || 'unknown',
            errmsg: ''
        }
        let permissions = sqliteService.d1_permission.findAll({ permissionId: permission.permissionId })
        if (permissions.length == 0) {
            errorItem.errmsg = "permission not found"
            errors.push(errorItem)
            continue
        }
        // 验证时间参数
        if (!permission.time) {
            errorItem.errmsg = "time and type cannot be empty"
            errors.push(errorItem)
            continue
        }
        if (permission.time.type != 0 && permission.time.type != 1 && permission.time.type != 2 && permission.time.type != 3) {
            errorItem.errmsg = "time type is not supported"
            errors.push(errorItem)
            continue
        }
        let record = {}
        record.permissionId = permission.permissionId
        record.door = isEmpty(permission.index) ? 0 : permission.index
        record.extra = isEmpty(permission.extra) ? JSON.stringify({}) : JSON.stringify(permission.extra)
        record.timeType = permission.time.type
        record.beginTime = permission.time.type == 0 ? 0 : permission.time.range.beginTime
        record.endTime = permission.time.type == 0 ? 0 : permission.time.range.endTime
        if (permission.time.type != 2 && permission.time.type != 3) {
            record.period = 0
        } else if (permission.time.type == 2) {
            record.period = permission.time.dayPeriodTime
        } else if (permission.time.type == 3) {
            record.period = JSON.stringify(permission.time.weekPeriodTime)
        }
        let ret = sqliteService.d1_permission.updateAllByPermissionId(record, record.permissionId)
        if (ret != 0) {
            errorItem.errmsg = "sql error ret:" + ret
            errors.push(errorItem)
            continue
        }
    }
    if (errors.length > 0) {
        return errors
    }
    return true
}

//清空权限
api.clearPermission = function () {
    let ret = sqliteService.d1_permission.deleteAll()
    if (ret == 0) {
        return true
    } else {
        return "sql error "
    }
}

// 判空
function isEmpty(value) {
    return value === undefined || value === null || value === ""
}

// 激活云证
api.eidActive = function (data) {
    if (data.code && data.code.startsWith("___VBAR_ID_ACTIVE_V")) {
        try {
            let activeResute = driver.nfc.eidActive(data.code);
            if (activeResute != 0) {
                return 'Activation failed'
            }
        } catch (error) {
            return error.message
        }
    } else {
        return 'The key format is incorrect'
    }
    return true
}

export default api