import std from '../dxmodules/dxStd.js'
import dxMap from '../dxmodules/dxMap.js'
import pool from '../dxmodules/dxWorkerPool.js'
import codeService from './service/codeService.js'
import vgProService from './service/vgProService.js'
import nfcService from './service/nfcService.js'
import uartBleService from './service/uartBleService.js'
import netProService from './service/netProService.js'
import gpioKeyService from './service/gpioKeyService.js'
import netService from './service/netService.js'
import dxNet from '../dxmodules/dxNet.js'
import dxCode from '../dxmodules/dxCode.js'
import dxNfc from '../dxmodules/dxNfc.js'
import dxTcp from '../dxmodules/dxTcp.js'
import dxGpioKey from '../dxmodules/dxGpioKey.js'
import dxUart from '../dxmodules/dxUart.js'
import driver from './driver.js'
let map = dxMap.get('workerId')
pool.callback((data) => {
    let topic = data.topic
    let msg = data.data
    switch (topic) {
        case 'code':
            codeService.code(msg)
            break;
        case dxNet.STATUS_CHANGE:
            netService.netStatusChanged(msg)
            break;
        case dxGpioKey.RECEIVE_MSG:
            gpioKeyService.receiveMsg(msg)
            break;
        case dxUart.VG.RECEIVE_MSG + driver.uartBle.id:
            uartBleService.receiveMsg(msg)
            break;
        case dxTcp.VG.CONNECTED_CHANGED + driver.tcp.id:
            driver.screen.tcpConnectedChange(msg)
            break;
        case dxTcp.VG.RECEIVE_MSG + driver.tcp.id:
            netProService.receiveMsg(msg)
            break;
        case dxCode.RECEIVE_MSG:
            codeService.receiveMsg(msg)
            break;
        case dxNfc.RECEIVE_MSG:
            nfcService.receiveMsg(msg)
            break;
        case dxUart.VG.RECEIVE_MSG + driver.uart485.id:
            vgProService.receiveMsg(msg)
            break;
        default:
            log.error("No such topic ", topic)
            break;
    }
})
let f = true
std.setTimeout(() => {
    std.setInterval(() => {
        // 线程池每个线程都喂狗
        driver.watchdog.feed(pool.getWorkerId(), 30)
        if (f) {
            let workerIds = map.get('workerId')
            if (workerIds) {
                workerIds.push(pool.getWorkerId())
                map.put('workerId',workerIds)
            } else {
                map.put('workerId',[ pool.getWorkerId()])
            }
    
            f = false
        }
    }, 1000)
}, 1000)