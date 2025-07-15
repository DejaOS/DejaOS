import common from '../../dxmodules/dxCommon.js';
import log from '../../dxmodules/dxLogger.js'
import config from '../../dxmodules/dxConfig.js'
import base64 from '../../dxmodules/dxBase64.js'
import dxMap from '../../dxmodules/dxMap.js'
import ota from "../../dxmodules/dxOta.js";
import driver from '../driver.js';
import utils from '../common/utils/utils.js';
import configService from '../service/configService.js'
import safeService from '../service/safeService.js'
import vgProService from './vgProService.js';
import configConst from '../common/consts/configConst.js';

const codeService = {}

codeService.receiveMsg = function (data) {
    // log.info('[codeService] receiveMsg :' + JSON.stringify(data))
    let str = common.utf8HexToStr(common.arrayBufferToHexString(data.data))
    this.code({ source: 'code', code: str })
}

//密码上报和扫码走的一套
codeService.code = function (data) {
    // log.info('[codeService]  code:' + JSON.stringify(data))
    let code = data.code
    if (comparePrefix(code, "___VBAR_CONFIG_V1.1.0___", "___VBAR_CONFIG_V1.1.0___".length)) {
        //配置码
        configCode(code, "old")
    } else if (comparePrefix(code, "__VGS__0", "__VGS__0".length)) {
        //配置码
        configCode(code, "new")
    } else if (config.get('sysInfo.w_mode') == 2 || (config.get('sysInfo.w_mode') == 1 && (config.get('sysInfo.de_type') & 1)) || data.source == "password") {
        // 协议模式下，QR/配置码一直开启，透传模式下，配置码一直开启，qr码根据配置来，密码不拦截
        formatCode(code, data.source)
    }
}

//码数据输出处理，键盘和扫码走同一套逻辑，用source区分
function formatCode(msg, source) {
    if (config.get('sysInfo.codeSwitch') == 0 && source == 'code') {
        return
    }
    // 处理编码格式
    let encodedMsg = msg;
    // 透传标记
    let flag = false
    switch (config.get('sysInfo.ft')) {
        case 1:
            // char(数字字符)转hex
            encodedMsg = /^\d+(\.\d+)?$/.test(msg) ? utils.decimalToLittleEndian(parseInt(msg)) : '00'
            break;
        case 2:
            // char(数字字符)转hex反序
            encodedMsg = /^\d+(\.\d+)?$/.test(msg) ? utils.decimalToLittleEndian(parseInt(msg)).match(/.{1,2}/g).reverse().join('') : '00'
            break;
        case 4:
            if (!isHexadecimal(msg) && msg.length % 2 === 0) {
                return
            }
            encodedMsg = msg
            break;
        case 8:
            if (!isHexadecimal(msg) && msg.length % 2 != 0) {
                return
            }
            // char(16进制字符)转hex反序
            encodedMsg = msg.match(/.{1,2}/g).reverse().join('')
            break;
        default:
            // 原始消息不动
            encodedMsg = common.strToUtf8Hex(msg)
            flag = true
            break
    }
    let prefix = config.get('sysInfo.prefix')
    let postfix = config.get('sysInfo.postfix')
    //增加前后缀
    if (config.get('sysInfo.chorc') == 2) {
        //前后缀转 16 进制转化为16进制
        if (isHexadecimal(prefix) && prefix.length % 2 === 0) {
            encodedMsg = (/\s/.test(prefix) ? '' : prefix) + encodedMsg
        }
        if (isHexadecimal(postfix) && postfix.length % 2 === 0) {

            encodedMsg += (/\s/.test(postfix) ? '' : postfix)
        }
    } else if (config.get('sysInfo.chorc') == 1) {
        //字符形式
        encodedMsg = common.stringToHex(prefix) + encodedMsg
        encodedMsg += common.stringToHex(postfix)
    }
    //增加回车空格
    // if (config.get('sysInfo.nl') == 1 && !flag) {
    if (config.get('sysInfo.nl') == 1) {
        //添加回车
        encodedMsg += "0d";
    }
    if (config.get('sysInfo.cr') == 1) {
        //添加换行
        encodedMsg += "0a";
    }

    if ((config.get('sysInfo.ascan') & 1) == 1) {
        driver.pwm.beep(config.get('sysInfo.beepd'), null, 1)
    }
    // log.info('最终扫码/密码输出数据为', encodedMsg);

    driver.passage.beforeReport({ source: source, data: encodedMsg })

}
// 配置码处理
function configCode(code, type) {
    if (!checkConfigCode(code, type)) {
        driver.pwm.fail()
        log.error("配置码校验失败")
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
    log.info("解析配置码：", JSON.stringify(json))

    //切换模式
    if (!utils.isEmpty(json.w_model)) {
        try {
            common.setMode(json.w_model)
            driver.pwm.success()
            common.asyncReboot(1)
        } catch (error) {
            log.error(error)
            log.info('切换失败不做任何处理');
            driver.pwm.fail()
        }
        return
    }
    let map = dxMap.get("UPDATE")
    // 扫码升级相关
    if (json.update_flag === 1) {
        if (!driver.net.getStatus()) {
            updateFailed("Please check the network")
            driver.pwm.fail()
            return
        }
        if (map.get("updateFlag")) {
            return
        }

        map.put("updateFlag", true)
        driver.pwm.warning()
        try {
            updateBegin()
            ota.updateHttp(json.update_addr, json.update_md5, 60)
            updateEnd()
            driver.pwm.success()
            common.asyncReboot(1)
        } catch (error) {
            updateFailed(error.message)
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
            // 下载图片、SO等
            return resourceDownload(json.update_addr, json.update_md5, downloadPath, () => {
                common.systemBrief(`mv "${downloadPath}" "${json.update_path}"`)
            })
        } else if (json.update_flag === 3) {
            // 下载压缩包
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
            updateFailed("Please check the network")
            driver.pwm.fail()
            return
        }
        map.put("updateFlag", true)
        // 兼容旧的升级格式
        if (utils.isEmpty(json.update_haddr) || utils.isEmpty(json.update_md5)) {
            driver.pwm.fail()
            map.del("updateFlag")
            return
        }
        try {
            driver.pwm.warning()
            updateBegin()
            ota.updateResource(json.update_haddr, json.update_md5, utils.getUrlFileSize(json.update_haddr) / 1024, codeService.updateResourceShell)
            updateEnd()
            common.asyncReboot(3)
        } catch (error) {
            updateFailed(error.message)
            driver.pwm.fail()
        }
        map.del("updateFlag")
        return
    }
    // 设备配置相关
    let configData = {}
    for (let key in json) {
        let transKey
        if (type == "new") {
            transKey = key.indexOf(".") >= 0 ? key.split(".")[0] + "Info." + key.split(".")[1] : configConst.getValueByKey(key)
        } else {
            transKey = key.indexOf(".") >= 0 ? key : configConst.getValueByKey(key)
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
    if (Object.keys(json).length > 0) {
        console.log("configData", JSON.stringify(configData));

        res = configService.configVerifyAndSave(configData)
    }
    log.info("配置完成res：" + res)
    if (typeof res != 'boolean') {
        log.error(res)
        driver.pwm.fail()
        return
    }
    if (res) {
        driver.pwm.success()
        log.info("配置成功")
    } else {
        driver.pwm.fail()
        log.error("配置失败")
    }
    if (json.reboot === 1) {
        driver.screen.customPopWin(config.get("sysInfo.language") == 1 ? "Rebooting" : "重启中", 3000, true, "warning")
        common.asyncReboot(1)
    }
}

function updateBegin() {
    if (config.get("sysInfo.language") == 1) {
        driver.screen.customPopWin("Start Upgrading", 600000, true, "waring", false)
    } else {
        driver.screen.customPopWin("开始升级", 600000, true, "waring", false)
    }
}

function updateEnd() {
    if (config.get("sysInfo.language") == 1) {
        driver.screen.customPopWin("Upgrade Successfully", 2000, true, "waring", false)
    } else {
        driver.screen.customPopWin("升级成功", 2000, true, "waring", false)
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

function updateFailed(errorMsg) {
    if (errorMsg.includes("Download failed, please check the url")) {
        errorMsg = 'Upgrade package download failed'
    }
    if (config.get("sysInfo.language") == 1) {
        driver.screen.customPopWin("Upgrade Failed: " + (errorMsg ? errorMsg : "Upgrade package download failed"), 600000, true, "waring", false)
    } else {
        driver.screen.customPopWin("升级失败: " + (codeService.errorMsgMap[errorMsg] ? codeService.errorMsgMap[errorMsg] : "下载失败，请检查网址"), 600000, true, "waring", false)
    }
}

// 下载通用方法
function resourceDownload(url, md5, path, cb) {
    // 本机升级
    if (utils.isEmpty(url) || utils.isEmpty(md5)) {
        driver.pwm.fail()
        return false
    }
    driver.pwm.warning()
    let ret = utils.waitDownload(url, path, 60 * 1000, md5, utils.getUrlFileSize(url))
    if (!ret) {
        driver.pwm.fail()
        return false
    } else {
        driver.pwm.success()
    }
    if (cb) {
        cb()
    }
    // 下载完成，1秒后重启
    common.asyncReboot(1)
    return true
}
codeService.resourceDownload = resourceDownload

//校验配置码
function checkConfigCode(code, type) {
    let password = config.get('sysInfo.com_passwd') || '1234567887654321'
    let firstPart
    let secondPart
    if (type == "new") {
        let lastIndex = code.lastIndexOf("__");
        firstPart = code.substring(0, lastIndex);
        secondPart = code.substring(lastIndex + 2);
    } else {
        let lastIndex = code.lastIndexOf("--");
        firstPart = code.substring(0, lastIndex);
        secondPart = code.substring(lastIndex + 2);
    }
    let res
    try {
        res = base64.fromHexString(common.arrayBufferToHexString(common.hmac(firstPart, password)))
    } catch (error) {
        log.error(error)
        return false
    }

    return res == secondPart;
}

// 兼容旧的升级格式
codeService.updateResourceShell = `
        source=${ota.OTA_ROOT + '/temp'}/vgapp/res/image/bk.png
        target=/app/code/resource/image/background.png
        if test -e "\\$source"; then
            cp "\\$source" "\\$target"
        fi
        source=${ota.OTA_ROOT + '/temp'}/vgapp/res/image/bk_90.png
        target=/app/code/resource/image/background_90.png
        if test -e "\\$source"; then
            cp "\\$source" "\\$target"
        fi
        source=${ota.OTA_ROOT + '/temp'}/vgapp/res/font/PangMenZhengDaoBiaoTiTi-1.ttf
        target=/app/code/resource/font.ttf
        if test -e "\\$source"; then
            cp "\\$source" "\\$target"
        fi
        source=${ota.OTA_ROOT + '/temp'}/vgapp/wav/0.wav
        target=/app/code/resource/wav/0.wav
        if test -e "\\$source"; then
            cp "\\$source" "\\$target"
        fi
        source=${ota.OTA_ROOT + '/temp'}/vgapp/wav/1.wav
        target=/app/code/resource/wav/1.wav
        if test -e "\\$source"; then
            cp "\\$source" "\\$target"
        fi
        source=${ota.OTA_ROOT + '/temp'}/vgapp/wav/2.wav
        target=/app/code/resource/wav/2.wav
        if test -e "\\$source"; then
            cp "\\$source" "\\$target"
        fi
        source=${ota.OTA_ROOT + '/temp'}/vgapp/wav/3.wav
        target=/app/code/resource/wav/3.wav
        if test -e "\\$source"; then
            cp "\\$source" "\\$target"
        fi
        source=${ota.OTA_ROOT + '/temp'}/vgapp/wav/4.wav
        target=/app/code/resource/wav/4.wav
        if test -e "\\$source"; then
            cp "\\$source" "\\$target"
        fi
        source=${ota.OTA_ROOT + '/temp'}/vgapp/wav/5.wav
        target=/app/code/resource/wav/5.wav
        if test -e "\\$source"; then
            cp "\\$source" "\\$target"
        fi
        source=${ota.OTA_ROOT + '/temp'}/vgapp/res/image/*
        target=/app/code/resource/image/
        cp "\\$source" "\\$target"
        source=${ota.OTA_ROOT + '/temp'}/vgapp/wav/*
        target=/app/code/resource/wav/
        cp "\\$source" "\\$target"
        `
//rm -rf ${ota.OTA_ROOT}
//判断是否是 16 进制字符串不是跳过
function isHexadecimal(str) {
    // 使用正则表达式匹配十六进制字符串的格式，即由0-9、a-f、A-F组成的字符串
    const hexRegex = /^[0-9a-fA-F]+$/;
    return hexRegex.test(str);
}

// 比较两个字符串的前N个字符是否相等
function comparePrefix(str1, str2, N) {
    let substring1 = str1.substring(0, N);
    let substring2 = str2.substring(0, N);
    return substring1 === substring2;
}
export default codeService
