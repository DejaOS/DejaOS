import log from '../../dxmodules/dxLogger.js'
import dxMap from '../../dxmodules/dxMap.js'
import accessService from '../service/accessService.js'
import driver from '../driver.js';
import config from '../../dxmodules/dxConfig.js';
const nfcService = {}

nfcService.receiveMsg = function (data) {
    const nfcIdentityCardEnable = config.get("sys.nfcIdentityCardEnable") == 3 ? true : false;
    // 首先判断是否是身份证卡
    if (data.card_type && data.id) {
        if (dxMap.get("UI").get("getCardStart")) {
            driver.screen.getCard(data.id)
            return
        }
        // 身份证物理卡号/普通卡
        accessService.access({ type: 200, code: data.id })
        return
    } 
    // 身份证成功
    if (data.name && data.sex && data.idCardNo) {
        if (dxMap.get("UI").get("getCardStart")) {
            driver.screen.getCard(nfcIdentityCardEnable ? data.idCardNo : data.id)
            return
        }
        // 云证
        accessService.access({ type: 200, code: nfcIdentityCardEnable ? data.idCardNo : data.id });
        return
    } 
    // 身份证失败
    if (data.error && data.id) {
        accessService.access({ type: 200, code: data.id });
    }
}
export default nfcService
