import logger from "../../dxmodules/dxLogger.js"
import std from "../../dxmodules/dxStd.js"
import config from "../../dxmodules/dxConfig.js"
import dxCommonUtils from "../../dxmodules/dxCommonUtils.js"
import dxos from "../../dxmodules/dxOs.js"
import map from "../../dxmodules/dxMap.js"
import driver from "../driver.js"
import mqttService from "./mqttService.js"
import sqliteService from "./sqliteService.js"
import utils from '../common/utils/utils.js'
const accessService = {}
const mqtt_map = map.get("MQTT")


/**
 * 人脸/密码白名单校验
 * @param {object} data {type:码制(string),code:码内容(string)}
 * @returns number:-1（参数错误），0（通行成功），1（在线验证），string:校验失败的原因
 */
accessService.access = function (data, fileName, similarity) {
    // 通行加锁
    let lockMap = map.get("access_lock")
    if (lockMap.get("access_lock")) {
        logger.error("[access]: 通行加锁，请稍后再试")
        return false
    }
    lockMap.put("access_lock", true)

    try {
        data.timeStamp = Math.floor(Date.parse(new Date()) / 1000)
        data.message = ""
        // 先根据code查询凭证
        let res
        if (data.type == "300") {
            res = sqliteService.d1_voucher.findByUserIdAndType(data.code, data.type)
        } else {
            res = sqliteService.d1_voucher.findByCodeAndType(data.code, data.type)
        }
        // 认证结果
        let ret = true
        // 是否是陌生人
        let isStranger = false
        if (similarity === false) {
            // 如果相似度验证失败，则不进行认证
            ret = false
            isStranger = true
        } else {

            if (res.length == 0) {
                logger.error("[access]: 通行失败，没查询到凭证！")
                ret = false
                isStranger = true
                data.message = "Voucher verification failed"
            } else {
                data.userId = res[0].userId
                data.keyId = res[0].keyId
                // 根据userId查人员
                res = sqliteService.d1_person.findByUserId(data.userId)
                if (res.length == 0) {
                    logger.error("[access]: 通行失败，没查询到人员！")
                    ret = false
                    isStranger = true
                    data.message = "Personnel verification failed"
                } else {
                    let idCard
                    try {
                        idCard = JSON.parse(res[0].extra).idCard
                    } catch (error) {
                        logger.error("无身份证号")
                    }
                    data.extra = { name: res[0].name, idCard: idCard }
                    data.permissionIds = res[0].permissionIds

                }
            }

            if (ret) {
                // 根据userId查询权限
                let permissionIds = data.permissionIds.split(",")
                let permissions = []
                for (let i = 0; i < permissionIds.length; i++) {
                    const element = permissionIds[i];
                    let res = sqliteService.d1_permission.findByPermissionId(element)
                    permissions.push(...res)
                } 
                let permissionId = judgmentPermission(permissions)
                if (permissions && permissions.length > 0 && permissionId) {
                    data.permissionId = permissionId
                    ret = true
                } else {
                    logger.info("[access]: 无权限")
                    ret = false
                    data.message = "Permission verification failed"
                }
            }

            if (!ret && config.get('mqtt.onlinecheck') == 1 && mqtt_map.get("MQTT_STATUS") == "connected") {
                logger.info("[access]: 无权限，走在线验证")
                let serialNo = std.genRandomStr(10)
                driver.mqtt.send("access_device/v2/event/access_online", JSON.stringify(mqttService.mqttReply(serialNo, data, mqttService.CODE.S_000)))
                driver.audio.play(`/app/code/resource/${config.get("base.language") == "CN" ? "CN" : "EN"}/wav/verify.wav`)
                // 等待在线验证结果
                let payload = getOnlinecheck()
                if (payload && payload.serialNo == serialNo && payload.code == '000000') {
                    ret = true
                } else {
                    logger.info("[access]: 在线验证失败")
                    ret = false
                }
            }
        }

        if (ret == true) {
            driver.screen.accessSuccess()
            logger.info("[access]: 通行成功")
            driver.audio.play(`/app/code/resource/${config.get("base.language") == "CN" ? "CN" : "EN"}/wav/verify_${data.type}_s.wav`)
            driver.gpio.open()
            savePassPic(data, fileName)
            reply(data, true)
        } else {
            driver.screen.accessFail()

            logger.error("[access]: 通行失败")
            if (utils.isEmpty(similarity)) {
                driver.audio.play(`/app/code/resource/${config.get("base.language") == "CN" ? "CN" : "EN"}/wav/verify_${data.type}_f.wav`)
            }
            if (isStranger && !config.get("sys.strangerImage")) {
                // 陌生人不保存照片
            } else {
                savePassPic(data, fileName)
            }
            reply(data, false)
        }

    } catch (error) {
        logger.error(error)
    }
    // 语音播报需要时间，所以延迟1秒解锁
    // std.sleep(1000)
    lockMap.put("access_lock", false)
}

// 保存通行图片
function savePassPic(data, fileName) {
    if (data.type == "300") {
        let src = `/data/passRecord/${data.userId}_${data.timeStamp}.jpg`
        std.ensurePathExists(src)
        if (std.exist(fileName)) {
            dxos.systemBrief(`mv ${fileName} ${src}`)
            dxos.systemBrief(`rm -rf /data/user/temp/*`)
            data.code = src
        } else {
            logger.error("[access]: 通行失败，图片不存在！！！！！！！！！！！！！！！" + fileName)
        }
    }
}

function getOnlinecheck() {
    let timeout = config.get("mqtt.timeout")
    timeout = utils.isEmpty(timeout) ? 2000 : timeout
    return driver.sync.request("mqtt.getOnlinecheck", timeout)
}

/**
 * 校验权限时间是否可以通行
 * @param {array} permissions 权限记录数组
 * @returns permissionId成功，false失败
 */
function judgmentPermission(permissions) {
    let currentTime = Math.floor(Date.now() / 1000)
    for (let permission of permissions) {
        if (permission.timeType == 0) {
            // 永久权限
            return permission.permissionId
        } else if (permission.beginTime <= currentTime && currentTime <= permission.endTime) {
            if (permission.timeType == 1) {
                // 时间段权限
                return permission.permissionId
            }
            if (permission.timeType == 2 && permission.period) {
                // 每日权限
                let dayTimes = permission.period
                if (dayTimes && dayTimes.split("|").some((dayTime) => isCurrentTimeInTimeRange(dayTime))) {
                    return permission.permissionId
                }
            }
            if (permission.timeType == 3 && permission.period) {
                // 周重复权限
                let dayTimes = JSON.parse(permission.period)[new Date().getDay() + 1]
                if (dayTimes && dayTimes.split("|").some((dayTime) => isCurrentTimeInTimeRange(dayTime))) {
                    return permission.permissionId
                }
            }
        }
    }
    return false
}

/**
 * 判断当前时间是否在时间段内
 * @param {string} time eg:15:00-19:00
 * @returns 
 */
function isCurrentTimeInTimeRange(time) {
    // 分割开始时间和结束时间
    let [startTime, endTime] = time.split('-');
    // 解析开始时间的小时和分钟
    let [startHour, startMinute] = startTime.split(':');
    // 解析结束时间的小时和分钟
    let [endHour, endMinute] = endTime.split(':');

    // 获取当前时间
    let currentTime = new Date();

    // 创建开始时间的日期对象
    let startDate = new Date();
    startDate.setHours(parseInt(startHour, 10));
    startDate.setMinutes(parseInt(startMinute, 10));
    // 创建结束时间的日期对象
    let endDate = new Date();
    endDate.setHours(parseInt(endHour, 10));
    endDate.setMinutes(parseInt(endMinute, 10));

    // 检查当前时间是否在时间范围内
    return currentTime >= startDate && currentTime < endDate;
}

// access通行上报
function reply(data, result) {
    delete data.permissionIds
    let record = {
        id: std.genRandomStr(10),
        result: result ? 0 : 1,
        extra: JSON.stringify(data.extra),
    }
    for (const key in data) {
        if (!(key in record)) {
            record[key] = data[key]
        }
    }
    // 存储通行记录，判断上限
    let count = sqliteService.d1_pass_record.count()
    let configNum = config.get("access.offlineAccessNum");
    configNum = configNum ? configNum : 2000;
    if (configNum > 0) {
        if (count >= configNum) {
            // 达到最大存储数量
            // 删除最远的那条
            let lastRecord = sqliteService.d1_pass_record.findAllOrderBytimeStampAsc({ page: 0, size: 1 })
            if (lastRecord && lastRecord.length == 1) {
                //判断下如果是人脸 去删除一下人脸照片
                if (lastRecord[0].type == 300) {
                    dxos.systemBrief(`rm -rf ${lastRecord[0].code}`)
                }
                sqliteService.d1_pass_record.deleteByid(lastRecord[0].id)
            }
        }
        sqliteService.d1_pass_record.save(record)
    }
    let serialNo = record.id
    if (record.type == 300) {
        record.code = dxCommonUtils.fs.fileToBase64(record.code)
    }
    record.error = record.message
    let payload = mqttService.mqttReply(serialNo, [record], mqttService.CODE.S_000)
    driver.mqtt.send("access_device/v2/event/access", JSON.stringify(payload))
}

export default accessService