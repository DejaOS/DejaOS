import log from '../../dxmodules/dxLogger.js'
import driver from '../driver.js'
import accessService from './accessService.js'
const gpioKeyService = {}

gpioKeyService.receiveMsg = function (data) {
    log.info('[gpioKeyService] receiveMsg :' + JSON.stringify(data))
    this["key" + data.code](data)
}

// 出门开关30
gpioKeyService.key30 = function (data) {
    log.info('[gpioKeyService] key30 :' + JSON.stringify(data))
    if (data.value == 0) {
        accessService.access({ type: 800 })
    }
}
// 门磁48
gpioKeyService.key48 = function (data) {
    log.info('[gpioKeyService] key48 :' + JSON.stringify(data))
    driver.gpiokey.sensorChanged(data.value == 1 ? 0 : 1)
}

export default gpioKeyService
