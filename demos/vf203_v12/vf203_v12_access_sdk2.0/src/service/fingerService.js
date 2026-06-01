import log from '../../dxmodules/dxLogger.js'
import dxMap from '../../dxmodules/dxMap.js'
import accessService from '../service/accessService.js'
import driver from '../driver.js';
const fingerService = {}

fingerService.finger = {}

fingerService.receiveMsg = function (data) {
    log.info("指纹通行指令: ", JSON.stringify(data));
    if (data && data.index != null) {
        // 指纹通行
        accessService.access({ type: 500, code: data.index })
    }
}

fingerService.getFingerChar = function (userId) {
    log.info("获取指纹特征: ", userId);
    if(dxMap.get("FINGER_CHAR") == null || dxMap.get("FINGER_CHAR").get("fingerService.finger") == null){
        return 0
    }
    fingerService.finger = JSON.parse(dxMap.get("FINGER_CHAR").get("fingerService.finger"));
    if(fingerService.finger.userId && fingerService.finger.userId == userId){
        // 指纹采集是一次性的，因此要清空指纹特征
        dxMap.get("FINGER_CHAR").put("fingerService.finger", null);
        if(fingerService.finger.fingerChar){
            return fingerService.finger.fingerChar;
        }else{
            return -1
        }
    } else {
        return 0
    }
}

fingerService.setFingerChar = function (data) {
    log.info("设置指纹特征: ", JSON.stringify(data));
    if(data == null){
        fingerService.finger = {}
        return
    }
    fingerService.finger.userId = data.userId;
    fingerService.finger.fingerChar = data.fingerChar;
    dxMap.get("FINGER_CHAR").put("fingerService.finger", JSON.stringify(fingerService.finger));
}

export default fingerService
