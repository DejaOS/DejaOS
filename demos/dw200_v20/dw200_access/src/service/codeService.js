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
let sqliteFuncs = sqliteService.getFunction()
const codeService = {}

codeService.receiveMsg = function (data) {
    log.info('[codeService] receiveMsg :' + JSON.stringify(data.data))
    let str = common.utf8HexToStr(common.arrayBufferToHexString(data.data))
    this.code(str, data.type)
}

codeService.code = function (data, type) {
    log.info('[codeService] code :' + data)
    data = qrRule.formatCode(data, sqliteFuncs)
    const de_type = config.get('scanInfo.de_type');
    // 1. Process always allowed code types (configuration codes, activation codes)
    if (data.type == 'config' || data.code.startsWith("__VGS__0") || data.code.startsWith("___VBAR_ID_ACTIVE_V")) {
        handleSpecialCodes(data);
        return;
    }
    // 2. Process access codes that need to check code system
    if (shouldProcessCode(de_type, type)) {
        log.info("处理通行码:", JSON.stringify(data));
        accessService.access(data);
    } else {
        log.error(`码制被禁用，类型: ${type}, 配置: ${de_type}`);
    }
}

function handleSpecialCodes (data) {
    if (data.code.startsWith("___VBAR_ID_ACTIVE_V")) {
        // Cloud certificate activation
        driver.pwm.warning()
        let activeResute = driver.eid.active(config.get("sysInfo.sn"), config.get("sysInfo.appVersion"), config.get("sysInfo.mac"), data.code);
        if (activeResute === 0) {
            log.info("[codeService] code: activeResute " + activeResute + " 云证激活成功")
            driver.pwm.success()
        } else {
            log.info("[codeService] code: activeResute " + activeResute + " 云证激活失败")
            driver.pwm.fail()
        }
    } else {
        // Configuration code
        const configType = data.code.startsWith("__VGS__0") ? "new" : "old";
        configCode(data.code, configType);
    }
}

function shouldProcessCode (de_type, type) {
    // Special handling: even if all are disabled or QR is disabled, still allow processing (for configuration codes, but configuration codes are handled separately)
    // Here mainly handles ordinary access codes
    if (type == 1) { // QR code
        return (de_type & 1) !== 0;
    } else { // Other code systems
        const bitPosition = type - 1;
        return (de_type & (1 << bitPosition)) !== 0;
    }
}

// Configuration code processing
function configCode (code, type) {
    // 1. Verify signature
    if (!checkConfigCode(code, type)) {
        driver.pwm.fail()
        log.error("[codeService] configCode: 配置码校验失败")
        return
    }
    // 2. Parse JSON
    let json = utils.parseString(code)
    if (Object.keys(json).length <= 0) {
        try {
            json = JSON.parse(code.slice(code.indexOf("{"), code.lastIndexOf("}") + 1))
        } catch (error) {
            log.error(error)
        }
    }
    log.info("[codeService] configCode: 解析配置码 ", JSON.stringify(json))
    // 3. Execute various operations
    if (!utils.isEmpty(json.w_model)) { // Switch mode
        return handleModeSwitch(json);
    }

    if (json.update_flag === 1) { // OTA update
        return handleOtaUpdate(json);
    }

    if ([2, 3].includes(json.update_flag)) { // Resource download
        return handleResourceDownload(json);
    }

    if (!utils.isEmpty(json.update_flg)) { // Compatible with old update format
        return handleLegacyUpdate(json);
    }
    // 4. Device configuration related
    processDeviceConfig(json, type)
    
}

function processDeviceConfig(json, type) {
    let configData = {}
    for (const [key, value] of Object.entries(json)) {
        let transKey;
        if (type === "new" && key.includes(".")) {
            const parts = key.split(".");
            transKey = `${parts[0]}Info.${parts[1]}`;
        } else {
            transKey = configConst.getValueByKey(key);
        }
        if (!transKey) continue;
        const [parentKey, childKey] = transKey.split('.');
        if (!configData[parentKey]) {
            configData[parentKey] = {};
        }
        configData[parentKey][childKey] = json[key];
    }
    const handleConfigResult = (success) => {
        if (success) {
            driver.pwm.success();
            log.info("[codeService] configCode: 配置成功");
        } else {
            driver.pwm.fail();
            log.error("[codeService] configCode: 配置失败");
        }
        if (json.reboot === 1) {
            const message = config.get("sysInfo.language") === 1 ? "Rebooting" : "重启中";
            driver.screen.warning({ msg: message, beep: false });
            common.asyncReboot(1);
        }
    };
    if (Object.keys(configData).length > 0) {
        const result = configService.configVerifyAndSave(configData)
        if (typeof result != 'boolean') {
            log.error(result)
            driver.pwm.fail()
            return
        }
        handleConfigResult(result);
    } else {
        handleConfigResult(false);
    }
}

// Mode switching
function handleModeSwitch (json) {
    try {
        common.setMode(json.w_model)
        driver.pwm.success()
        common.asyncReboot(1)
    } catch (error) {
        log.error(error, error.stack)
        driver.pwm.fail()
    }
}

// OTA update
function handleOtaUpdate (json) {
    let map = dxMap.get("UPDATE")
    if (!driver.net.getStatus()) {
        codeService.showUpdateStatus('failed', "Please check the network")
        driver.pwm.fail()
        return
    }
    if (map.get("updateFlag")) return
    map.put("updateFlag", true)
    driver.pwm.warning()
    try {
        codeService.showUpdateStatus('begin')
        ota.updateHttp(json.update_addr, json.update_md5, 300)
        codeService.showUpdateStatus('success')
        driver.pwm.success()
        common.asyncReboot(1)
    } catch (error) {
        codeService.showUpdateStatus('failed', error.message);
        driver.pwm.fail()
    } finally {
        map.del("updateFlag")
    }
}

// Resource download (images/SO/compressed packages)
function handleResourceDownload (json) {
    if (utils.isEmpty(json.update_name) || utils.isEmpty(json.update_path)) {
        driver.pwm.fail()
        return
    }
    let downloadPath = "/app/data/upgrades/" + json.update_name
    const isZip = json.update_flag === 3;
    const command = isZip
        ? `unzip -o "${downloadPath}" -d "${json.update_path}"`
        : `mv "${downloadPath}" "${json.update_path}"`;
    return resourceDownload(json.update_addr, json.update_md5, downloadPath, () => {
        common.systemBrief(command)
    })
}

// Compatible with old update format
function handleLegacyUpdate (json) {
    let map = dxMap.get("UPDATE")
    if (map.get("updateFlag")) return
    if (!driver.net.getStatus()) {
        codeService.showUpdateStatus('failed', "Please check the network");
        driver.pwm.fail()
        return
    }
    map.put("updateFlag", true)
    if (utils.isEmpty(json.update_haddr) || utils.isEmpty(json.update_md5)) {
        driver.pwm.fail()
        map.del("updateFlag")
        return
    }
    try {
        driver.pwm.warning()
        codeService.showUpdateStatus('begin');
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
        codeService.showUpdateStatus('success');
        driver.pwm.success()
        common.asyncReboot(3)
    } catch (error) {
        codeService.showUpdateStatus('failed', error.message);
        driver.pwm.fail()
    } finally {
        map.del("updateFlag")
    }
}

// General download method
function resourceDownload (url, md5, path, cb) {
    // Local upgrade
    if (utils.isEmpty(url) || utils.isEmpty(md5)) {
        driver.pwm.fail()
        return false
    }

    codeService.showUpdateStatus('begin');
    driver.pwm.warning()

    let ret = utils.waitDownload(url, path, 60 * 1000, md5, utils.getUrlFileSize(url))
    if (!ret) {
        codeService.showUpdateStatus('failed');
        driver.pwm.fail()
        return false
    } else {
        codeService.showUpdateStatus('success');
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
function checkConfigCode (code, type) {
    let password = config.get('sysInfo.com_passwd') || '1234567887654321'
    const DELIMITER = type === 'new' ? '__' : '--';
    const lastIndex = code.lastIndexOf(DELIMITER);
    // Delimiter not found
    if (lastIndex === -1) {
        log.error(`Delimiter "${DELIMITER}" not found in code: ${code}`);
        return false;
    }
    const dataPart = code.substring(0, lastIndex);
    const signaturePart = code.substring(lastIndex + DELIMITER.length);
    let expectedSignature
    try {
        expectedSignature = base64.fromHexString(common.arrayBufferToHexString(common.hmac(dataPart, password)))
    } catch (error) {
        log.error(error)
        return false
    }
    return expectedSignature == signaturePart;
}

const UPDATE_MESSAGES = {
    begin: {
        en: "Start Upgrading",
        zh: "开始升级"
    },
    success: {
        en: "Upgrade Successfully",
        zh: "升级成功"
    },
    failed: {
        en: (detail) => `Upgrade Failed: ${detail || "Upgrade package download failed"}`,
        zh: (detail) => `升级失败: ${codeService.errorMsgMap[detail] || "下载失败，请检查网址"}`
    }
};

/**
 * Display upgrade status prompt
 * @param {string} status - Status type: 'begin' | 'success' | 'failed'
 * @param {string} [errorMsg] - Error message when failed (only valid when status='failed')
 */
codeService.showUpdateStatus = function (status, errorMsg) {
    let defaultErrorMsg = 'Upgrade package download failed';
    if (status !== 'failed') {
        errorMsg = null;
    }
    // Get current language (0: Chinese, 1: English)
    const isEn = config.get("sysInfo.language") === 1;
    const langKey = isEn ? 'en' : 'zh';
    // Get message template or text for corresponding status
    const msgConfig = UPDATE_MESSAGES[status];
    if (!msgConfig) {
        return;
    }
    let message;
    if (typeof msgConfig[langKey] === 'function') {
        // For failed status, use function to generate dynamic message
        const displayError = errorMsg && errorMsg.includes("Download failed")
            ? defaultErrorMsg
            : errorMsg;
        message = msgConfig[langKey](displayError);
    } else {
        // Other statuses directly get text
        message = msgConfig[langKey];
    }
    driver.screen.warning({ msg: message, beep: false });
};

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

export default codeService
