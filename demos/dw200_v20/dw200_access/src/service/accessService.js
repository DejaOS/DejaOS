import log from '../../dxmodules/dxLogger.js'
import config from '../../dxmodules/dxConfig.js'
import dxMap from '../../dxmodules/dxMap.js'
import driver from '../driver.js'
import utils from '../common/utils/utils.js'
import mqttService from "./mqttService.js";
import sqliteService from "./sqliteService.js";
let sqliteFuncs = sqliteService.getFunction()
const mqtt_map = dxMap.get("MQTT")

const accessService = {}

// Access authentication logic
accessService.access = function (data) {
    // Authentication result
    let res = false
    // Whether to report access record
    let isReport = true
    // Access verification
    let type = data.type
    let code = data.code
    // Assemble MQTT access record report message
    let record = {
        id: "-1",
        type: parseInt(type),
        code: code,
        time: Math.floor(Date.parse(new Date()) / 1000),
        result: 0,
        extra: { "srcData": code },
        error: "无权限"
    }
    if (type == 800 || type == 900) {
       // Button/remote open door
        res = true
        isReport = false
    } else if (type == 103 && code.length > 16) {
        record.error = '解码失败'
    } else if (type == 600 && code == null) {
        // Overseas Bluetooth
        res = true
        isReport = false
    } else {
        // Check if this credential has permission
        res = sqliteFuncs.permissionVerifyByCodeAndType(code, type)
        if (res) {
            let permissions = sqliteFuncs.permissionFindAllByCodeAndType(code)
            let permission = permissions.filter(obj => obj.type == type)[0]
            record.id = permission.id
            try {
                record.extra = JSON.parse(permission.extra);
            } catch (e) {
                log.error('[accessService] JSON parse failed for extra:', permission.extra);
            }
        }
    }
    if (res) {
        record.result = 1
        record.error = ""
    } else if (config.get("doorInfo.onlinecheck") === 1 && mqtt_map.get("MQTT_STATUS") == "connected") {
        // Online verification, directly report content and feedback according to reply result
        let map = dxMap.get("VERIFY")
        let serialNo = utils.genRandomStr(10)
        let prefix = config.get("mqttInfo.prefix") || ''
        map.put(serialNo, { time: new Date().getTime() })
        driver.mqtt.send(prefix + "access_device/v1/event/access_online", JSON.stringify(mqttService.mqttReply(serialNo, record, undefined)))

        // Wait for online verification result
        let payload = driver.mqtt.getOnlinecheck()
        if (payload && payload.serialNo == serialNo && payload.code == '000000') {
            res = true
        } else {
            map.del(serialNo)
        }
        isReport = false
    }
    // UI popup, beep and voice broadcast success or failure
    if (res) {
        driver.audio.success()
        driver.screen.accessSuccess(type)
        // Relay open door
        driver.gpio.open()
        // Bluetooth reply
        if (type == 600) {
            if (code == null) {
                driver.uartBle.accessControl(data.index)
            } else {
                driver.uartBle.accessSuccess(data.index)
            }
        }
    } else {
        driver.audio.fail()
        driver.screen.accessFail(type)
        // Bluetooth reply
        if (type == 600) {
            if (code == null) {
                driver.uartBle.accessControl(data.index)
            } else {
                driver.uartBle.accessFail(data.index)
            }
        }
    }
    if (isReport) {
        // Access record reporting
        accessReport(record);
    }
}

// Report real-time access record
function accessReport(record) {
    // Store access record, check upper limit
    let count = sqliteFuncs.passRecordFindAllCount()
    let configNum = config.get("doorInfo.offlineAccessNum");
    let prefix = config.get("mqttInfo.prefix") || ''
    configNum = utils.isEmpty(configNum) ? 2000 : configNum;
    if (configNum > 0) {
        if (parseInt(count[0]["COUNT(*)"]) >= configNum) {
            // Reached maximum storage capacity, delete the oldest record
            sqliteFuncs.passRecordDelLast()
        }
        let data = {...record, extra: JSON.stringify(record.extra)}
        sqliteFuncs.passRecordInsert(data)
    }
    let map = dxMap.get("REPORT")
    let serialNo = utils.genRandomStr(10)
    map.del(serialNo)
    map.put(serialNo, { time: new Date().getTime(), list: [record.time] })
    if (mqtt_map.get("MQTT_STATUS") == "connected") {
        driver.mqtt.send(prefix + "access_device/v1/event/access", JSON.stringify(mqttService.mqttReply(serialNo, [record], mqttService.CODE.S_000)))
    }
}

export default accessService
