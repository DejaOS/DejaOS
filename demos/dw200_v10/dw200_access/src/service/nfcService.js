import log from '../../dxmodules/dxLogger.js'
import accessService from '../service/accessService.js'
import config from '../../dxmodules/dxConfig.js'
import driver from '../driver.js';
const nfcService = {}

nfcService.receiveMsg = function (data) {
    log.info('[nfcService] receiveMsg :' + JSON.stringify(data))

    // 首先判断是否是身份证卡
    if (data.card_type && data.id) {
        // 身份证物理卡号/普通卡
        accessService.access({ type: 200, code: data.id })
    } else if (data.name && data.sex && data.idCardNo) {
        // 云证
        accessService.access({ type: 203, code: data.idCardNo });
    } else {
        driver.pwm.fail()
    }

}
export default nfcService
