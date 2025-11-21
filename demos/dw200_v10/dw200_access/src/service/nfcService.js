import log from '../../dxmodules/dxLogger.js'
import accessService from '../service/accessService.js'
import config from '../../dxmodules/dxConfig.js'
import driver from '../driver.js';
const nfcService = {}

nfcService.receiveMsg = function (data) {
    log.info('[nfcService] receiveMsg :' + JSON.stringify(data))

    // First determine if it is an ID card
    if (data.card_type && data.id) {
        // ID card physical card number / regular card
        accessService.access({ type: 200, code: data.id })
    } else if (data.name && data.sex && data.idCardNo) {
        // Cloud certificate
        accessService.access({ type: 203, code: data.idCardNo });
    } else {
        driver.pwm.fail()
    }

}
export default nfcService
