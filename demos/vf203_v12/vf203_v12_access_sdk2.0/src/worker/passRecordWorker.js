import std from '../../dxmodules/dxStd.js'
import config from '../../dxmodules/dxConfig.js'
import logger from '../../dxmodules/dxLogger.js'
import dxCommonUtils from '../../dxmodules/dxCommonUtils.js'
import dxMap from '../../dxmodules/dxMap.js'
import sqliteService from '../service/sqliteService.js'
import driver from '../driver.js'
import mqttService from '../service/mqttService.js'

/**
 * 通行记录上报工作线程 (通道2 - 兜底全量上报)
 *
 * 职责：
 * - 常驻运行，只要 MQTT 连接就持续上报
 * - 每次加载所有未删除的通行记录（d1_pass_record）
 * - 每隔 5 秒上报一条
 * - 发完当前批次后，自动重新加载最新记录
 */

const mqtt_map = dxMap.get("MQTT")

const UPLOAD_INTERVAL_MS = 5000 // 每5秒1条

let sendTimer = null
let currentBatch = [] // 当前待发批次
let currentIndex = 0   // 当前发送到第几条

function isMqttConnected() {
    return mqtt_map.get("MQTT_STATUS") === "connected"
}

// 加载新批次：查询所有未删除的记录（按时间升序）
function loadNewBatch() {
    try {
        currentBatch = sqliteService.d1_pass_record.findAllOrderByTimeStampAsc() 
        currentIndex = 0
    } catch (err) {
        logger.error("[passRecordWorker] Failed to load batch:", err)
        currentBatch = []
        currentIndex = 0
    }
}

// 发送下一条
function sendNext() {
    if (!isMqttConnected()) return

    // 如果当前批次发完了，加载新批次
    if (currentIndex >= currentBatch.length) {
        loadNewBatch()
        if (currentBatch.length === 0) {
            return // 无记录可发
        }
    }

    const record = currentBatch[currentIndex]
    if (!record || !record.id) {
        currentIndex++
        return
    }
    let extra = record.extra ? JSON.parse(record.extra) : ""
    let accessRecord = {
        userId: record.userId,
        type: record.type,
        result: record.result,
        code: record.code,
        name: extra && extra.name ? extra.name : "",
        timeStamp: record.timeStamp,
        extra: {},
        error: record.message
    }
    if (record.type == 300) {
        if (std.exist(record.code) && config.get("access.uploadToCloud")) {
            accessRecord.code = dxCommonUtils.fs.fileToBase64(record.code)
            if (currentIndex > 0) {
                currentBatch[currentIndex - 1].code = ""
            }
        } else {
            accessRecord.code = ""
        }
    }
    // 发送
    try {
        driver.mqtt.send(
            config.get("mqtt.prefix") + "access_device/v2/event/access",
            JSON.stringify(
                mqttService.mqttReply(
                    record.id,
                    [accessRecord],
                    mqttService.CODE.S_000
                )
            )
        )
    } catch (e) {
        logger.error("[passRecordWorker] Send failed for record", record.id, e)
    }

    currentIndex++
}

// 启动常驻上报循环
function startWorker() {
    if (sendTimer) return
    loadNewBatch() // 启动时先加载第一批
    sendTimer = std.setInterval(sendNext, UPLOAD_INTERVAL_MS)
}

// 启动
try {
    startWorker()
} catch (error) {
    logger.error("[passRecordWorker] init error:", error)
}