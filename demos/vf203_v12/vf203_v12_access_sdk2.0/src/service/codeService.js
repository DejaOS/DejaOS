import dxCommonUtils from '../../dxmodules/dxCommonUtils.js';
import dxOs from "../../dxmodules/dxOs.js";
import log from '../../dxmodules/dxLogger.js'
import qrRule from '../../dxmodules/dxQrRule.js'
import config from '../../dxmodules/dxConfig.js'
import dxMap from '../../dxmodules/dxMap.js'
import ota from "../../dxmodules/dxOta.js";
import sqliteService from "./sqliteService.js";
import driver from '../driver.js';
import utils from '../common/utils/utils.js';
import configConst from '../common/consts/configConst.js';
import configService from './configService.js';
import accessService from './accessService.js';
const codeService = {}

codeService.receiveMsg = function (data) {
    log.info('[codeService] receiveMsg :' + JSON.stringify(data.data))
    let str = dxCommonUtils.codec.utf8HexToStr(dxCommonUtils.codec.arrayBufferToHex(data.data))
    this.code(str)
}

codeService.code = function (data) {
    log.info('[codeService] code :' + data)
    data = qrRule.formatCode(data, sqliteService)
    if (data.type == 'config' || data.code.startsWith("___VF102_CONFIG_V1.1.0___") || data.code.startsWith("___VBAR_ID_ACTIVE_V")) {
        handleSpecialCodes(data);
    } else {
        log.info("access:" + JSON.stringify(data))
        accessService.access(data);
    }
}

function handleSpecialCodes (data) {
    if (data.code.startsWith("___VBAR_ID_ACTIVE_V")) {
        //云证激活
        let activeResute = driver.nfc.eidActive(data.code);
        if (activeResute === 0) {
            log.info("[codeService] code: activeResute " + activeResute + " 云证激活成功")
        } else {
            log.info("[codeService] code: activeResute " + activeResute + " 云证激活失败")
        }
    } else {
        // 配置码
        configCode(data.code);
    }
}

// 配置码处理
function configCode (code) {
    // 1. 校验签名
    if (!checkConfigCode(code)) {
        log.error("[codeService] configCode: 配置码校验失败")
        return
    }
    // 2. 解析JSON
    let json = utils.parseString(code)
    if (Object.keys(json).length <= 0) {
        try {
            json = JSON.parse(code.slice(code.indexOf("{"), code.lastIndexOf("}") + 1))
        } catch (error) {
            log.error(error)
        }
    }
    log.info("[codeService] configCode: 解析配置码 ", JSON.stringify(json))
    // 3. 执行各类操作
    if (json.update_flag === 1) { // ota升级
        return handleOtaUpdate(json);
    }
    // 4. 设备配置相关
    processDeviceConfig(json)
    
}

function processDeviceConfig(json) {
    let configData = {}
    for (const [key, value] of Object.entries(json)) {
        let transKey = configConst.getValueByKey(key);
        if (!transKey) continue;
        const [parentKey, childKey] = transKey.split('.');
        if (!configData[parentKey]) {
            configData[parentKey] = {};
        }
        configData[parentKey][childKey] = json[key];
    }
    const handleConfigResult = (success) => {
        if (success) {
            log.info("[codeService] configCode: 配置成功");
        } else {
            log.error("[codeService] configCode: 配置失败");
        }
    };
    if (Object.keys(configData).length > 0) {
        const result = configService.configVerifyAndSave(configData)
        if (typeof result != 'boolean') {
            log.error(result)
            return
        }
        handleConfigResult(result);
    } else {
        handleConfigResult(false);
    }
}

// ota升级
function handleOtaUpdate (json) {
    const net_map = dxMap.get("NET")
    let map = dxMap.get("UPDATE")
    if (net_map.get("NET_STATUS") != "connected") {
        codeService.showUpdateStatus('failed', "Please check the network")
        return
    }
    if (map.get("updateFlag")) return
    map.put("updateFlag", true)
    try {
        codeService.showUpdateStatus('begin')
        ota.updateHttp(json.update_addr, json.update_md5, 300)
        codeService.showUpdateStatus('success')
        dxOs.asyncReboot(1)
    } catch (error) {
        codeService.showUpdateStatus('failed', error.message);
    } finally {
        map.del("updateFlag")
    }
}

//校验配置码
function checkConfigCode (code) {
    let password = config.get('sysInfo.com_passwd') || '1234567887654321'
    let lastIndex = code.lastIndexOf("--");
    let DELIMITER = "--"
    if (lastIndex < 0) {
        lastIndex = code.lastIndexOf("__");
        DELIMITER = "__"
    }
    // 分隔符未找到
    if (lastIndex === -1) {
        log.error(`Delimiter "${DELIMITER}" not found in code: ${code}`);
        return false;
    }
    const dataPart = code.substring(0, lastIndex);
    const signaturePart = code.substring(lastIndex + DELIMITER.length);
    let expectedSignature
    try {

        expectedSignature = dxCommonUtils.codec.arrayBufferToBase64(dxCommonUtils.codec.hexToArrayBuffer(dxCommonUtils.crypto.hmacMd5(dataPart, password)))
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
 * 显示升级状态提示
 * @param {string} status - 状态类型: 'begin' | 'success' | 'failed'
 * @param {string} [errorMsg] - 失败时的错误信息（仅 status='failed' 时有效）
 */
codeService.showUpdateStatus = function (status, errorMsg) {
    let defaultErrorMsg = 'Upgrade package download failed';
    if (status !== 'failed') {
        errorMsg = null;
    }
    // 获取当前语言
    const isEn = config.get("base.language") === "EN";
    const langKey = isEn ? 'en' : 'zh';
    // 获取对应状态的消息模板或文本
    const msgConfig = UPDATE_MESSAGES[status];
    if (!msgConfig) {
        return;
    }
    let message;
    if (typeof msgConfig[langKey] === 'function') {
        // 对于 failed，使用函数生成动态消息
        const displayError = errorMsg && errorMsg.includes("Download failed")
            ? defaultErrorMsg
            : errorMsg;
        message = msgConfig[langKey](displayError);
    } else {
        // 其他状态直接取文本
        message = msgConfig[langKey];
    }
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
