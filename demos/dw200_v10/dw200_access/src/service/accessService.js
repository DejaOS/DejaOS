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

// 通行认证逻辑
accessService.access = function (data) {
    // 设备禁用不做任何通行
    log.info('[accessService] access :' + JSON.stringify(data))
    if (config.get('sysInfo.status') == 2) {
        log.info('设备禁用不做任何通行')
        driver.screen.accessFail("disable")
        driver.audio.doPlay(config.get("sysInfo.language") == "EN" ? "f_eng" : "f")
        return
    }
    driver.pwm.press()
    // 认证结果
    let res = false
    // 是否上报通行记录
    let isReport = true
    // 通行验证
    let type = data.type
    let code = data.code
    //组装 mqtt 上报通信记录报文
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
        // 远程开门
        res = true
        isReport = false
    } else if (type == 800) {
        // 按键开门
        res = true
        // 不上报通行记录
        isReport = false
    } else if (type == 600 && code == null) {
        // type == 600 && 海外蓝牙
        res = true
    } else {
        //查询是否有这个凭证值的权限
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
        // 在线验证 直接上报内容 按照回复结果反馈
        let map = dxMap.get("VERIFY")
        let serialNo = utils.genRandomStr(10)
        map.put(serialNo, { time: new Date().getTime() })

        driver.mqtt.send({
            topic: "access_device/v1/event/access_online", payload: JSON.stringify(mqttService.mqttReply(serialNo, record, undefined))
        })
        // 等待在线验证结果
        let payload = driver.mqtt.getOnlinecheck()
        if (payload && payload.serialNo == serialNo && payload.code == '000000') {
            res = true
        } else {
            onlinecheck = "验证拒绝"
            map.del(serialNo)
        }
        isReport = false
    }
    // ui弹窗，蜂鸣且语音播报成功或失败
    log.info(data)
    if (res) {
        driver.audio.success()
        driver.screen.accessSuccess(type)
        // 继电器开门
        driver.gpio.open()
        // 蓝牙回复
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
        // 蓝牙回复
        if (type == 600) {
            if (code == null) {
                driver.uartBle.accessControl(data.index)
            } else {
                driver.uartBle.accessFail(data.index)
            }
        }
    }
    if (isReport) {
        // 通信记录上报
        accessReport(record);
    }
}

// 上报时实通行记录
function accessReport(record) {
    // 存储通行记录，判断上限
    let count = sqliteFuncs.passRecordFindAllCount()
    let configNum = config.get("doorInfo.offlineAccessNum");
    configNum = utils.isEmpty(configNum) ? 2000 : configNum;
    if (configNum > 0) {
        if (parseInt(count[1]) >= configNum) {
            // 达到最大存储数量          
            // 删除最远的那条
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
