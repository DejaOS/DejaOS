import log from '../../dxmodules/dxLogger.js'
import config from '../../dxmodules/dxConfig.js'
import dxMap from '../../dxmodules/dxMap.js'
import std from '../../dxmodules/dxStd.js'
import driver from '../driver.js'
import utils from '../common/utils/utils.js'
import mqttService from "./mqttService.js";
import sqliteService from "./sqliteService.js";
let sqliteFuncs = sqliteService.getFunction()

const accessService = {}

// Access authentication logic
accessService.access = function (data) {
    // Device disabled, no access allowed
    log.info('[accessService] access :' + JSON.stringify(data))
    if (config.get('sysInfo.status') == 2) {
        log.info('Device disabled, no access allowed')
        driver.screen.accessFail("disable")
        driver.audio.doPlay(config.get("sysInfo.language") == "EN" ? "f_eng" : "f")
        return
    }
    driver.pwm.press()
    // Authentication result
    let res = false
    // Whether to report access record
    let isReport = true
    // Access verification
    let type = data.type
    let code = data.code
    // Assemble MQTT access record message
    let record = {
        id: "-1",
        type: parseInt(type),
        code: code,
        time: Math.floor(Date.parse(new Date()) / 1000),
        result: 0,
        extra: { "srcData": code },
        error: ""
    }
    if (type == 900) {
        // Remote open
        res = true
        isReport = false
    } else if (type == 800) {
        // Button press open
        res = true
        // Do not report access record
        isReport = false
    } else if (type == 600 && code == null) {
        // type == 600 && overseas Bluetooth
        res = true
    } else {
        // Query if there is permission for this credential value
        res = sqliteFuncs.permissionVerifyByCodeAndType(code, type)
        if (res) {
            let permissions = sqliteFuncs.permissionFindAllByCodeAndType(code)
            let permission = permissions.filter(obj => obj.type == type)[0]
            record.id = permission.id
            record.extra = JSON.parse(permission.extra)
        }
    }
    let onlinecheck
    if (res) {
        record.result = 1
    } else if (config.get("doorInfo.onlinecheck") === 1 && driver.mqtt.getStatus()) {
        // Online verification: directly report content and feedback according to reply result
        let map = dxMap.get("VERIFY")
        let serialNo = utils.genRandomStr(10)
        map.put(serialNo, { time: new Date().getTime() })

        driver.mqtt.send({
            topic: "access_device/v1/event/access_online", payload: JSON.stringify(mqttService.mqttReply(serialNo, record, undefined))
        })
        // Wait for online verification result
        let payload = driver.mqtt.getOnlinecheck()
        if (payload && payload.serialNo == serialNo && payload.code == '000000') {
            res = true
        } else {
            onlinecheck = "验证拒绝"
            map.del(serialNo)
        }
        isReport = false
    }
    // UI popup, beep and voice broadcast success or failure
    log.info(data)
    if (res) {
        driver.audio.success()
        driver.screen.accessSuccess(type)
        // Relay opens door
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
        driver.screen.accessFail(type, config.get("sysInfo.onlinecheckErrorMsg") || 0 == 1 ? onlinecheck : undefined)
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
        // Report access record
        accessReport(record);
    }
}

// Report real-time access record
function accessReport(record) {
    // Store access record, check upper limit
    let count = sqliteFuncs.passRecordFindAllCount()
    let configNum = config.get("doorInfo.offlineAccessNum");
    configNum = utils.isEmpty(configNum) ? 2000 : configNum;
    if (configNum > 0) {
        if (parseInt(count[1]) >= configNum) {
            // Reached maximum storage capacity
            // Delete the oldest record
            sqliteFuncs.passRecordDelLast()
        }
        let data = JSON.parse(JSON.stringify(record))
        data.extra = JSON.stringify(data.extra)
        sqliteFuncs.passRecordInsert(data)
    }
    let map = dxMap.get("REPORT")
    let serialNo = utils.genRandomStr(10)
    map.del(serialNo)
    map.put(serialNo, { time: new Date().getTime(), list: [record.time] })
    driver.mqtt.send({
        topic: "access_device/v1/event/access", payload: JSON.stringify(mqttService.mqttReply(serialNo, [record], mqttService.CODE.S_000))
    })
}

export default accessService
