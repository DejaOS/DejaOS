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
import { getCurrentLanguage } from '../common/utils/i18n.js'

const codeService = {}

codeService.receiveMsg = function (data) {
    log.info('[codeService] receiveMsg :' + JSON.stringify(data))
    let str = common.utf8HexToStr(common.arrayBufferToHexString(data))
    this.code(str)
}
// Compare if first N characters of two strings are equal
function comparePrefix(str1, str2, N) {
    let substring1 = str1.substring(0, N);
    let substring2 = str2.substring(0, N);
    return substring1 === substring2;
}
codeService.code = function (data) {
    log.info('[codeService] code :' + data)
    data = qrRule.formatCode(data, sqliteService)
    if (data.type == 'config' || comparePrefix(data.code, "___VF102_CONFIG_V1.1.0___", "___VF102_CONFIG_V1.1.0___".length)) {
        // Config code
        configCode(data.code)
    } else if (comparePrefix(data.code, "___VBAR_ID_ACTIVE_V", "___VBAR_ID_ACTIVE_V".length)) {
        // Cloud certificate activation
        let activeResute = driver.eid.active(config.get("sys.sn"), config.get("sys.appVersion"), config.get("sys.mac"), data.code);
        log.info("[codeService] code: activeResute " + activeResute)
        if (activeResute === 0) {
            log.info("[codeService] code: Cloud certificate activation successful")
            driver.screen.upgrade({ title: "confirm.cloudCertActive", content: "confirm.cloudCertActiveSuccess" })
        } else {
            log.info("[codeService] code: Cloud certificate activation failed")
            driver.screen.upgrade({ title: "confirm.cloudCertActive", content: "confirm.cloudCertActiveFail" })
        }
    } else {
        // Access code
        log.info("Parse access code:", JSON.stringify(data))
        bus.fire("access", { data })
    }
}

// Config code processing
function configCode(code, configType) {
    // if (!checkConfigCode(code)) {
    //     log.error("Config code validation failed")
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
    log.info("Parse config code:", JSON.stringify(json))
    // Switch mode
    if (!utils.isEmpty(json.w_model)) {
        try {
            common.setMode(json.w_model)
            common.asyncReboot(1)
        } catch (error) {
            log.error(error, error.stack)
            log.info('Switch failed, no action taken');
        }
        return
    }
    let map = dxMap.get("UPDATE")
    // Scan code upgrade related
    if (json.update_flag === 1) {
        if (!driver.net.getStatus()) {
            driver.alsa.play(`/app/code/resource/${getCurrentLanguage()}/wav/network.wav`)
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
    // Device configuration related
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
        log.info("Configuration successful")
    } else {
        log.error("Configuration failed")
    }
    if (json.reboot === 1) {
        driver.screen.warning({ msg: config.get("sysInfo.language") == 1 ? "Rebooting" : "Rebooting", beep: false })
        common.asyncReboot(1)
    }
}

// Validate config code
function checkConfigCode(code) {
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
