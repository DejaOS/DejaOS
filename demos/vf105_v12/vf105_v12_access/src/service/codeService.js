import common from '../../dxmodules/dxCommon.js';
import log from '../../dxmodules/dxLogger.js'
import qrRule from '../../dxmodules/dxQrRule.js'
import std from '../../dxmodules/dxStd.js'
import config from '../../dxmodules/dxConfig.js'
import base64 from '../../dxmodules/dxBase64.js'
import dxMap from '../../dxmodules/dxMap.js'
import ota from "../../dxmodules/dxOta.js";
import bus from "../../dxmodules/dxEventBus.js"
import sqliteService from "./sqliteService.js";
import driver from '../driver.js';
import utils from '../common/utils/utils.js';
import configConst from '../common/consts/configConst.js';
import configService from './configService.js';
import accessService from './accessService.js';
import logger from '../../dxmodules/dxLogger.js';
const codeService = {}

codeService.receiveMsg = function (data) {
    log.info('[codeService] receiveMsg :' + JSON.stringify(data))
    let str = common.utf8HexToStr(common.arrayBufferToHexString(data))
    this.code(str)
}
// 比较两个字符串的前N个字符是否相等
function comparePrefix (str1, str2, N) {
    let substring1 = str1.substring(0, N);
    let substring2 = str2.substring(0, N);
    return substring1 === substring2;
}
codeService.code = function (data) {
    log.info('[codeService] code :' + data)
    data = qrRule.formatCode(data, sqliteService)
    if (data.type == 'config' || comparePrefix(data.code, "___VF102_CONFIG_V1.1.0___", "___VF102_CONFIG_V1.1.0___".length)) {
        // 配置码
        configCode(data.code)
    } else if (comparePrefix(data.code, "___VBAR_ID_ACTIVE_V", "___VBAR_ID_ACTIVE_V".length)) {
        //云证激活
        let activeResute = driver.eid.active(config.get("sys.sn"), config.get("sys.appVersion"), config.get("sys.mac"), data.code);
        log.info("[codeService] code: activeResute " + activeResute)
        if (activeResute === 0) {
            log.info("[codeService] code: 云证激活成功")
            driver.screen.upgrade({ title: "confirm.cloudCertActive", content: "confirm.cloudCertActiveSuccess" })
        } else {
            log.info("[codeService] code: 云证激活失败")
            driver.screen.upgrade({ title: "confirm.cloudCertActive", content: "confirm.cloudCertActiveFail" })
        }
    } else {
        // 通行码
        log.info("解析通行码：", JSON.stringify(data))
        bus.fire("access", { data })
    }
}

// 配置码处理
function configCode (code, configType) {
    // if (!checkConfigCode(code)) {
    //     log.error("配置码校验失败")
    //     return
    // }
    let json = utils.parseString(code)
    if (Object.keys(json).length <= 0) {
        try {
            json = JSON.parse(code.slice(code.indexOf("{"), code.lastIndexOf("}") + 1))
        } catch (error) {
            log.error(error)
        }
    }
    log.info("解析配置码：", JSON.stringify(json))
    //切换模式
    if (!utils.isEmpty(json.w_model)) {
        try {
            common.setMode(json.w_model)
            common.asyncReboot(1)
        } catch (error) {
            log.error(error, error.stack)
            log.info('切换失败不做任何处理');
        }
        return
    }
    let map = dxMap.get("UPDATE")
    // 扫码升级相关
    if (json.update_flag === 1) {
        if (!driver.net.getStatus()) {
            driver.alsa.play(`/app/code/resource/${config.get("base.language") == "CN" ? "CN" : "EN"}/wav/network.wav`)
            return
        }
        if (map.get("updateFlag")) {
            return
        }
        map.put("updateFlag", true)
        try {
            driver.screen.upgrade({ title: "confirm.upgrade", content: "confirm.upgrading" })
            ota.updateHttp(json.update_addr, json.update_md5, 300)
            driver.screen.upgrade({ title: "confirm.upgrade", content: "confirm.upgradeSuccess" })
        } catch (error) {
            logger.info(error.message)
            driver.screen.upgrade({ title: "confirm.upgrade", content: "confirm.upgradeFail" })
        } finally {
            map.del("updateFlag")
        }
        common.asyncReboot(3)
        return
    }
    // 设备配置相关
    let configData = {}
    for (let key in json) {
        let transKey
        if (configType == true) {
            transKey = key
        } else {
            transKey = configConst.getValueByKey(key)
        }
        if (transKey == undefined) {
            continue
        }
        let keys = transKey.split(".")
        if (utils.isEmpty(configData[keys[0]])) {
            configData[keys[0]] = {}
        }
        configData[keys[0]][keys[1]] = json[key]
    }
    let res = false
    if (Object.keys(configData).length > 0) {
        res = configService.configVerifyAndSave(configData)
    }
    if (typeof res != 'boolean') {
        log.error(res)
        return
    }
    if (res) {
        log.info("配置成功")
    } else {
        log.error("配置失败")
    }
    if (json.reboot === 1) {
        driver.screen.warning({ msg: config.get("sysInfo.language") == 1 ? "Rebooting" : "重启中", beep: false })
        common.asyncReboot(1)
    }
}

//校验配置码
function checkConfigCode (code) {
    let password = config.get('sysInfo.com_passwd') || '1234567887654321'
    let lastIndex = code.lastIndexOf("--");
    if (lastIndex < 0) {
        lastIndex = code.lastIndexOf("__");
    }
    let firstPart = code.substring(0, lastIndex);
    let secondPart = code.substring(lastIndex + 2);
    let res
    try {
        res = base64.fromHexString(common.arrayBufferToHexString(common.hmac(firstPart, password)))
    } catch (error) {
        log.error(error)
        return false
    }

    return res == secondPart;
}
export default codeService
