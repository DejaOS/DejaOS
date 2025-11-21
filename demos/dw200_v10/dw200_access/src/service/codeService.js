import common from '../../dxmodules/dxCommon.js';
import log from '../../dxmodules/dxLogger.js'
import qrRule from '../../dxmodules/dxQrRule.js'
import std from '../../dxmodules/dxStd.js'
import config from '../../dxmodules/dxConfig.js'
import base64 from '../../dxmodules/dxBase64.js'
import dxMap from '../../dxmodules/dxMap.js'
import ota from "../../dxmodules/dxOta.js";
import sqliteService from "./sqliteService.js";
import driver from '../driver.js';
import utils from '../common/utils/utils.js';
import configConst from '../common/consts/configConst.js';
import configService from './configService.js';
import accessService from './accessService.js';
import * as os from 'os';
import bus from '../../dxmodules/dxEventBus.js';
let sqliteFuncs = sqliteService.getFunction()
const codeService = {}

codeService.receiveMsg = function (data) {
    log.info('[codeService] receiveMsg :' + JSON.stringify(data))
    let str = common.utf8HexToStr(common.arrayBufferToHexString(data))
    this.code(str)
}

codeService.code = function (data) {
    log.info('[codeService] code :' + data)
    data = qrRule.formatCode(data, sqliteFuncs)
    if (data.type == 'config' || (data.type == '100' && comparePrefix(data.code, "__VGS__0", "__VGS__0".length))) {
        // Configuration code
        configCode(data.code)
    } else if (data.type == 'eid') {
        // Cloud certificate activation
        driver.pwm.warning()
        let activeResute = driver.eid.active(config.get("sysInfo.sn"), config.get("sysInfo.appVersion"), config.get("sysInfo.mac"), data.code);
        log.info("activeResute:" + activeResute)
        if (activeResute === 0) {
            log.info("Cloud certificate activation successful")
            driver.screen.warning({ msg: '云证激活成功' })
            driver.audio.doPlay("yz_s")
        } else {
            log.info("Cloud certificate activation failed")
            driver.screen.warning({ msg: '云证激活失败' })
            driver.audio.doPlay("yz_f")
        }
    } else {
        // Access code
        log.info("Parse access code: ", JSON.stringify(data))
        accessService.access(data)
    }
}

// Configuration code processing
function configCode(code) {
    if (!checkConfigCode(code)) {
        driver.pwm.fail()
        log.error("Configuration code verification failed")
        return
    }
    let json = utils.parseString(code)
    if (Object.keys(json).length <= 0) {
        try {
            json = JSON.parse(code.slice(code.indexOf("{"), code.lastIndexOf("}") + 1))
        } catch (error) {
            log.error(error)
        }
    }
    log.info("Parse configuration code: ", JSON.stringify(json))
    // Switch mode
    if (!utils.isEmpty(json.w_model)) {
        try {
            common.setMode(json.w_model)
            driver.pwm.success()
            common.asyncReboot(1)
        } catch (error) {
            log.error(error, error.stack)
            log.info('Mode switch failed, no action taken');
            driver.pwm.fail()
        }
        return
    }
    let map = dxMap.get("UPDATE")
    // QR code upgrade related
    if (json.update_flag === 1) {
        if (!driver.net.getStatus()) {
            codeService.updateFailed("Please check the network")
            driver.pwm.fail()
            return
        }
        if (map.get("updateFlag")) {
            return
        }

        map.put("updateFlag", true)
        driver.pwm.warning()
        try {
            codeService.updateBegin()
            ota.updateHttp(json.update_addr, json.update_md5, 300)
            codeService.updateEnd()
            driver.pwm.success()
            common.asyncReboot(1)
        } catch (error) {
            codeService.updateFailed(error.message)
            driver.pwm.fail()
        }
        map.del("updateFlag")
        return

    } else if ([2, 3].includes(json.update_flag)) {
        if (utils.isEmpty(json.update_name) || utils.isEmpty(json.update_path)) {
            driver.pwm.fail()
            return
        }
        let downloadPath = "/app/data/upgrades/" + json.update_name
        if (json.update_flag === 2) {
            // Download images, SO files, etc.
            return resourceDownload(json.update_addr, json.update_md5, downloadPath, () => {
                common.systemBrief(`mv "${downloadPath}" "${json.update_path}"`)
            })
        } else if (json.update_flag === 3) {
            // Download compressed package
            return resourceDownload(json.update_addr, json.update_md5, downloadPath, () => {
                common.systemBrief(`unzip -o "${downloadPath}" -d "${json.update_path}"`)
            })
        }
    }
    if (!utils.isEmpty(json.update_flg)) {
        if (map.get("updateFlag")) {
            return
        }
        if (!driver.net.getStatus()) {
            codeService.updateFailed("Please check the network")
            driver.pwm.fail()
            return
        }
        map.put("updateFlag", true)
        // Compatible with old upgrade format
        if (utils.isEmpty(json.update_haddr) || utils.isEmpty(json.update_md5)) {
            driver.pwm.fail()
            map.del("updateFlag")
            return
        }
        try {
            driver.pwm.warning()
            codeService.updateBegin()
            const temp = ota.OTA_ROOT + '/temp'
            ota.updateResource(json.update_haddr, json.update_md5, utils.getUrlFileSize(json.update_haddr) / 1024, `
                source=${temp}/vgapp/res/image/*
                target=/app/code/resource/image/
                cp "\\$source" "\\$target"
                source=${temp}/vgapp/res/font/*
                target=/app/code/resource/font/
                cp "\\$source" "\\$target"
                source=${temp}/vgapp/wav/*
                target=/app/code/resource/wav/
                cp "\\$source" "\\$target"
                rm -rf ${ota.OTA_ROOT}
                `)
            codeService.updateEnd()
            driver.pwm.success()
            common.asyncReboot(3)
        } catch (error) {
            codeService.updateFailed(error.message)
            driver.pwm.fail()
        }
        map.del("updateFlag")
        return

    }
    // Device configuration related
    let configData = {}
    for (let key in json) {
        let transKey = key.indexOf(".") >= 0 ? key : configConst.getValueByKey(key)
        if (transKey == 'netInfo.dhcp') {
            json[key] = json[key] == 1 ? 0 : 1
        }
        if (transKey == 'sysInfo.setSn') {
            configService.setSn(json[key])
            common.asyncReboot(1)
            continue
        }
        if (transKey) {
            let keys = transKey.split(".")
            if (utils.isEmpty(configData[keys[0]])) {
                configData[keys[0]] = {}
            }
            configData[keys[0]][keys[1]] = json[key]
        }
    }
    let res = false
    if (Object.keys(configData).length > 0) {
        res = configService.configVerifyAndSave(configData)
    }
    log.info("Configuration completed, res: " + res)
    if (typeof res != 'boolean') {
        log.error(res)
        driver.pwm.fail()
        return
    }
    if (res) {
        driver.pwm.success()
        log.info("Configuration successful")
    } else {
        driver.pwm.fail()
        log.error("Configuration failed")
    }
    if (json.reboot === 1) {
        driver.screen.warning({ msg: config.get("sysInfo.language") == "EN" ? "Rebooting" : "重启中", beep: false })
        common.asyncReboot(1)
    }
}

// General download method
function resourceDownload(url, md5, path, cb) {
    // Local upgrade
    if (utils.isEmpty(url) || utils.isEmpty(md5)) {
        driver.pwm.fail()
        return false
    }

    codeService.updateBegin()
    driver.pwm.warning()

    let ret = utils.waitDownload(url, path, 60 * 1000, md5, utils.getUrlFileSize(url))
    if (!ret) {
        codeService.updateFailed()
        driver.pwm.fail()
        return false
    } else {
        codeService.updateEnd()
        driver.pwm.success()
    }
    if (cb) {
        cb()
    }
    // Download completed, restart after 1 second
    common.asyncReboot(0)
    std.sleep(2000)
    return true
}

// Verify configuration code
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
        log.error(error, error.stack)
        return false
    }
    return res == secondPart;
}

codeService.updateBegin = function () {
    if (config.get("sysInfo.language") == "EN") {
        driver.screen.warning({ msg: "Start Upgrading", beep: false })
    } else {
        driver.screen.warning({ msg: "开始升级", beep: false })
    }
}

codeService.updateEnd = function () {
    if (config.get("sysInfo.language") == "EN") {
        driver.screen.warning({ msg: "Upgrade Successfully", beep: false })
    } else {
        driver.screen.warning({ msg: "升级成功", beep: false })
    }
}

codeService.errorMsgMap = {
    "The 'url' and 'md5' param should not be null": "“url”和“md5”参数不能为空",
    "The 'size' param should be a number": "“size” 参数应该是一个数字",
    "The upgrade package is too large, and not be enough space on the disk to download it": "升级包过大，磁盘空间不足，无法下载",
    "Download failed, please check the url:": "下载失败，请检查网址",
    "Download failed with wrong md5 value": "下载失败，md5 值错误",
    "Build shell file failed": "构建 shell 文件失败",
    "Upgrade package download failed": "升级包下载失败",
    "Please check the network": "请检查网络"
}

codeService.updateFailed = function (errorMsg) {
    if (!errorMsg || errorMsg.includes("Download failed, please check the url")) {
        errorMsg = 'Upgrade package download failed'
    }
    if (config.get("sysInfo.language") == "EN") {
        driver.screen.warning({ msg: "Upgrade Failed: " + (errorMsg ? errorMsg : "Upgrade package download failed"), beep: false })
    } else {
        driver.screen.warning({ msg: "升级失败: " + (codeService.errorMsgMap[errorMsg] ? codeService.errorMsgMap[errorMsg] : "下载失败，请检查网址"), beep: false })
    }
}

// Compare whether the first N characters of two strings are equal
function comparePrefix(str1, str2, N) {
    let substring1 = str1.substring(0, N);
    let substring2 = str2.substring(0, N);
    return substring1 === substring2;
}

export default codeService
