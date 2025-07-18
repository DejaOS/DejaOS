import log from '../../dxmodules/dxLogger.js'
import dxMap from '../../dxmodules/dxMap.js'
import accessService from '../service/accessService.js'
import config from '../../dxmodules/dxConfig.js'
import driver from '../driver.js';
const nfcService = {}

nfcService.receiveMsg = function (data) {
    // log.info('[nfcService] receiveMsg :' + JSON.stringify(data))

    // 首先判断是否是身份证卡
    if (data.card_type && data.id) {
        if (dxMap.get("UI").get("getCardStart")) {
            driver.screen.getCard(data.id)
            return
        }
        // 身份证物理卡号/普通卡
        accessService.access({ type: "200", code: data.id })
    } else if (data.name && data.sex && data.idCardNo) {
        if (dxMap.get("UI").get("getCardStart")) {
            driver.screen.getCard(data.idCardNo)
            return
        }
        // 云证
        accessService.access({ type: "200", code: data.idCardNo });
    }

}
export default nfcService
