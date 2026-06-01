import driver from '../driver.js'
import logger from '../../dxmodules/dxLogger.js'
import std from '../../dxmodules/dxStd.js'
import bus from '../../dxmodules/dxEventBus.js'

try {
    run()
} catch (error) {
    logger.error(error)
}

function run() {
    if(driver.device.finger){
        driver.finger.init()
        std.setInterval(() => {
            try {
                driver.finger.loop()
            } catch (error) {
                logger.error('fingerWorker error:', error)
            }
        }, 1000) 
        bus.on("fingerInsert", fingerInsert)
        bus.on("fingerDelete", fingerDelete)
        bus.on("fingerClear", fingerClear)
    }
}

/** 新增、删除、清空指纹
 *
 * 说明：
 * 1. 收到 bus 事件后，调用底层模组 insert、delete、clear。
 * 2. 完成后通过 driver.sync.response 回传结果。
 * 3. api 线程同步等待该结果，只有操作成功后才保存数据库映射。
 */
function fingerInsert(char) {
    let res = driver.finger.insert(char)
    driver.sync.response("fingerInsert", res)
}

function fingerDelete(fingerId) {
    let res = driver.finger.delete(fingerId)
    driver.sync.response("fingerDelete", res)
}

function fingerClear() {
    let res = driver.finger.clear()
    driver.sync.response("fingerClear", res)
}

