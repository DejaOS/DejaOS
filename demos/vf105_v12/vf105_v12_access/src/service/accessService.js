import logger from "../../dxmodules/dxLogger.js"
import std from "../../dxmodules/dxStd.js"
import config from "../../dxmodules/dxConfig.js"
import common from "../../dxmodules/dxCommon.js"
import map from '../../dxmodules/dxMap.js'
import driver from "../driver.js"
import mqttService from "./mqttService.js"
import sqliteService from "./sqliteService.js"
import utils from '../common/utils/utils.js'
import { getCurrentLanguage } from '../common/utils/i18n.js'

const accessService = {}


function decimalToLittleEndianHex(decimalNumber, byteSize) {
    const littleEndianBytes = [];
    for (let i = 0; i < byteSize; i++) {
        littleEndianBytes.push(decimalNumber & 0xFF);
        decimalNumber >>= 8; // Equivalent to dividing by 256
    }
    const littleEndianHex = littleEndianBytes
        .map((byte) => byte.toString(16).padStart(2, '0'))
        .join('');
    return littleEndianHex;
}
function pack2str(pack) {
    pack.data = (!pack.data) ? [] : pack.data.match(/.{2}/g)
    let len = decimalToLittleEndianHex(pack.data.length, 2)
    let str = "55aa" + pack.cmd + pack.result + len + pack.data.join('')
    let crc = common.calculateBcc([0x55, 0xaa, parseInt(pack.cmd, 16), parseInt(pack.result, 16), pack.data.length % 256, pack.data.length / 256].concat(pack.data.map(v => parseInt(v, 16))))
    return str + crc.toString(16).padStart(2, '0')
}
/**
 * Face/password whitelist verification
 * @param {object} data {type:code type(string),code:code content(string)}
 * @returns number:-1(parameter error), 0(access successful), 1(online verification), string:reason for verification failure
 */
accessService.access = function (data, fileName, similarity) {
    // logger.info('[accessService] access :' + JSON.stringify(data))
    // Access lock
    let lockMap = map.get("access_lock")
    if (lockMap.get("access_lock")) {
        logger.error("[access]: Access locked, please try again later")
        return false
    }
    lockMap.put("access_lock", true)

    try {
        data.time = Math.floor(Date.parse(new Date()) / 1000)
        // First query credentials by code
        let res
        if (data.type == "300") {
            res = sqliteService.d1_voucher.findByUserIdAndType(data.code, data.type)
        } else {
            res = sqliteService.d1_voucher.findByCodeAndType(data.code, data.type)
        }
        // Authentication result
        let ret = true
        // Is stranger
        let isStranger = false

        if (similarity === false) {
            // If similarity verification fails, do not authenticate
            ret = false
            isStranger = true
        } else {

            if (res.length == 0) {
                logger.error("[access]: Access failed, no credentials found!")
                ret = false
                isStranger = true
            } else {
                data.userId = res[0].userId
                data.keyId = res[0].id
                // Query person by userId
                res = sqliteService.d1_person.findByUserId(data.userId)
                if (res.length == 0) {
                    logger.error("[access]: Access failed, no person found!")
                    ret = false
                    isStranger = true
                } else {
                    let idCard
                    try {
                        idCard = JSON.parse(res[0].extra).idCard
                    } catch (error) {
                        log.error("No ID card number")
                    }
                    data.extra = { name: res[0].name, idCard: idCard }

                }
            }

            if (ret) {
                // Query permissions by userId
                res = sqliteService.d1_permission.findByUserId(data.userId)
                if (res && res.length > 0 && judgmentPermission(res)) {
                    logger.info("[access]: Access successful")
                    ret = true
                } else {
                    logger.info("[access]: No permission")
                    ret = false
                }
            }

            if (!ret && config.get('mqtt.onlinecheck') == 1 && driver.mqtt.getStatus()) {
                logger.info("[access]: No permission, use online verification")
                let serialNo = std.genRandomStr(10)
                driver.mqtt.send("access_device/v2/event/access_online", JSON.stringify(mqttService.mqttReply(serialNo, data, mqttService.CODE.S_000)))
                driver.alsa.play(`/app/code/resource/${getCurrentLanguage()}/wav/verify.wav`)
                // Wait for online verification result
                let payload = driver.mqtt.getOnlinecheck()
                if (payload && payload.serialNo == serialNo && payload.code == '000000') {
                    ret = true
                } else {
                    logger.info("[access]: Online verification failed")
                    ret = false
                }
            }
        }
        let alsaFile = (data.type).toString().startsWith("10") ? '10x' : data.type
        if (ret == true) {
            driver.screen.accessSuccess()
            logger.info("[access]: Access successful")
            driver.alsa.play(`/app/code/resource/${getCurrentLanguage()}/wav/verify_${alsaFile}_s.wav`)
            driver.gpio.open()
            savePassPic(data, fileName)
            reply(data, true)
        } else {
            driver.screen.accessFail()
            logger.error("[access]: Access failed")
            if (utils.isEmpty(similarity)) {
                driver.alsa.play(`/app/code/resource/${getCurrentLanguage()}/wav/verify_${alsaFile}_f.wav`)
            }
            if (isStranger && !config.get("sys.strangerImage")) {
                // Strangers do not save photos
            } else {
                savePassPic(data, fileName)
            }
            reply(data, false)
        }
    } catch (error) {
        logger.error(error)
    }
    // Voice broadcast needs time, so delay 1 second to unlock
    std.sleep(1000)
    lockMap.put("access_lock", false)

}

// Save access image
function savePassPic(data, fileName) {
    if (data.type == "300") {
        let src = `/app/data/passRecord/${data.userId}_${data.time}.jpg`
        std.ensurePathExists(src)
        if (std.exist(fileName)) {
            common.systemBrief(`mv ${fileName} ${src}`)
            common.systemBrief(`rm -rf /app/data/user/temp/*`)
            data.code = src
        } else {
            logger.error("[access]: Access failed, image does not exist!" + fileName)
        }
    }
}


/**
 * Verify if permission time allows access
 * @param {array} permissions Permission records array
 * @returns true for success, false for failure
 */
function judgmentPermission(permissions) {
    let currentTime = Math.floor(Date.now() / 1000)
    for (let permission of permissions) {
        if (permission.timeType == 0) {
            // Permanent permission
            return true
        } else if (permission.beginTime <= currentTime && currentTime <= permission.endTime) {
            if (permission.timeType == 1) {
                // Time period permission
                return true
            }
            if (permission.timeType == 2) {
                // Daily permission
                let seconds = Math.floor((new Date() - new Date().setHours(0, 0, 0, 0)) / 1000);
                if (permission.repeatBeginTime <= seconds && seconds <= permission.repeatEndTime) {
                    return true
                }
            }
            if (permission.timeType == 3 && permission.period) {
                // Weekly repeat permission
                let dayTimes = JSON.parse(permission.period)[new Date().getDay() + 1]
                if (dayTimes && dayTimes.split("|").some((dayTime) => isCurrentTimeInTimeRange(dayTime))) {
                    return true
                }
            }
        }
    }
    return false
}

/**
 * Determine if current time is within time range
 * @param {string} time eg:15:00-19:00
 * @returns 
 */
function isCurrentTimeInTimeRange(time) {
    // Split start time and end time
    let [startTime, endTime] = time.split('-');
    // Parse start time hours and minutes
    let [startHour, startMinute] = startTime.split(':');
    // Parse end time hours and minutes
    let [endHour, endMinute] = endTime.split(':');

    // Get current time
    let currentTime = new Date();

    // Create start time date object
    let startDate = new Date();
    startDate.setHours(parseInt(startHour, 10));
    startDate.setMinutes(parseInt(startMinute, 10));
    // Create end time date object
    let endDate = new Date();
    endDate.setHours(parseInt(endHour, 10));
    endDate.setMinutes(parseInt(endMinute, 10));

    // Check if current time is within time range
    return currentTime >= startDate && currentTime <= endDate;
}

// Access report
function reply(data, result) {
    let record = {
        id: std.genRandomStr(16),
        result: result ? 0 : 1,
        extra: JSON.stringify(data.extra)
    }
    for (const key in data) {
        if (!(key in record)) {
            record[key] = data[key]
        }
    }
    // Store access record, check upper limit
    let count = sqliteService.d1_pass_record.count()
    let configNum = config.get("access.offlineAccessNum");
    configNum = configNum ? configNum : 2000;
    if (configNum > 0) {
        if (count >= configNum) {
            // Reached maximum storage count
            // Delete the oldest record
            let lastRecord = sqliteService.d1_pass_record.findAllOrderBytimeDesc({ page: 0, size: 1 })
            if (lastRecord && lastRecord.length == 1) {
                // Check if it's a face, delete the face photo
                if (lastRecord[0].type == 300) {
                    common.systemBrief(`rm -rf ${lastRecord[0].code}`)
                }
                sqliteService.d1_pass_record.deleteByid(lastRecord[0].id)
            }
        }
        sqliteService.d1_pass_record.save(record)
    }
    let serialNo = std.genRandomStr(10)
    if (record.type == 300) {
        let m = map.get("faceAccesss")
        m.del(serialNo)
        m.put(serialNo, record.code ? record.code : "")
        record.code = driver.face.fileToBase64(record.code)
    }
    let payload = mqttService.mqttReply(serialNo, [record], mqttService.CODE.S_000)
    driver.mqtt.send("access_device/v2/event/access", JSON.stringify(payload))
}

export default accessService