import dxMap from '../../dxmodules/dxMap.js'
import dxComm from '../../dxmodules/dxCommon.js'
import log from '../../dxmodules/dxLogger.js'
import api from './api.js'
import driver from '../driver.js'
import logger from '../../dxmodules/dxLogger.js'
import accessService from '../service/accessService.js'

const uartBleService = {}
let map = dxMap.get("subcontracting")
uartBleService.receiveMsg = function (hexData) {
    // 解析头部
    let totalHex = parseInt(hexData.substring(0, 2), 16)
    let indexHex = parseInt(hexData.substring(2, 4), 16)
    let payloadHex = hexData.substring(4)
    
    if (totalHex == 1) {
        //就一个包直接处理
        processPayload(payloadHex)
    } else {
        //多个包需要组包
        if (indexHex == 1) {
            //第一个包，初始化缓存
            map.put("subcontracting", payloadHex)
        } else if (indexHex > 1 && indexHex < totalHex) {
            //中间包，累积到缓存
            let cachedPayload = map.get("subcontracting") || ""
            map.put("subcontracting", cachedPayload + payloadHex)
        } else if (indexHex == totalHex) {
            //最后一个包，合并缓存并处理
            let cachedPayload = map.get("subcontracting") || ""
            let fullPayload = cachedPayload + payloadHex
            processPayload(fullPayload)
            //清除缓存
            map.del("subcontracting")
        } else {
            //包序号异常
            log.info("分包序号异常: indexHex=" + indexHex + ", totalHex=" + totalHex)
            map.del("subcontracting")
        }
    }
}

// 处理完整payload的函数
function processPayload(payloadHex) {
    // try {
        let payloadData = JSON.parse(dxComm.utf8HexToStr(payloadHex))
        logger.info("blePayloadData",JSON.stringify(payloadData))
        switch (payloadData.cmd) {
            case "control":
                control(payloadData.data)
                break;
            case "getConfig":
                getConfig(payloadData.data)
                break;
            case "setConfig":
                setConfig(payloadData.data)
                break;
            case "upgradeFirmware":
                upgradeFirmware(payloadData.data)
                break;
            case "access":
                accessService.access({ type: 600, code: payloadData.data.data, serialNo: payloadData.data.serialNo});
                break;
            default:
                log.info("未定义此接口: " + payloadData.cmd)
                break;
        }
    // } catch (error) {
    //     log.info("解析payload失败: " + error.message)
    // }
}

function control(data) {
    let res = api.control(data)
    if (typeof res == 'string') {
        //错了
        driver.uartBle.send("0101" + dxComm.strToUtf8Hex(reply(data.serialNo, res, "100000")))
    } else {
        driver.uartBle.send("0101" + dxComm.strToUtf8Hex(reply(data.serialNo, undefined, "000000")))
    }

}

function getConfig(data) {
    let res = api.getConfig(data)
    if (typeof res == 'string') {
        //错了
        driver.uartBle.send("0101" + dxComm.strToUtf8Hex(reply(data.serialNo, res, "100000")))
    } else {
        // 成功时 data 可能很大，需要分包发送，每包<=180字节(360 hex)
        let payloadHex = dxComm.strToUtf8Hex(reply(data.serialNo, res, "000000"))
        sendInPackets(payloadHex)
    }
}

function setConfig(data) {
    let res = api.setConfig(data.data)
    if (typeof res == 'string') {
        //错了
        driver.uartBle.send("0101" + dxComm.strToUtf8Hex(reply(data.serialNo, res, "100000")))
    } else {
        driver.uartBle.send("0101" + dxComm.strToUtf8Hex(reply(data.serialNo, undefined, "000000")))
    }
}

function upgradeFirmware(data) {
    let res = api.upgradeFirmware(data.data)
    if (typeof res == 'string') {
        //错了
        driver.uartBle.send("0101" + dxComm.strToUtf8Hex(reply(data.serialNo, res, "100000")))
    } else {
        driver.uartBle.send("0101" + dxComm.strToUtf8Hex(reply(data.serialNo, undefined, "000000")))
    }
}


// 回复格式构建
function reply(serialNo, data, code) {
    return JSON.stringify({
        serialNo: serialNo,
        code: code,
        data: data,
        time: Math.floor(Date.parse(new Date()) / 1000)
    })
}

// 按 180 字节（360 hex）拆分发送
function sendInPackets(payloadHex) {
    if (!payloadHex) return
    const MAX_HEX_PER_PACKET = 360
    const total = Math.max(1, Math.ceil(payloadHex.length / MAX_HEX_PER_PACKET))
    for (let i = 0; i < total; i++) {
        const start = i * MAX_HEX_PER_PACKET
        const end = start + MAX_HEX_PER_PACKET
        const chunk = payloadHex.substring(start, end)
        const totalHex = total.toString(16).padStart(2, '0')
        const indexHex = (i + 1).toString(16).padStart(2, '0')
        driver.uartBle.send(totalHex + indexHex + chunk)
    }
}
export default uartBleService