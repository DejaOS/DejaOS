import common from '../../dxmodules/dxCommon.js';
import log from '../../dxmodules/dxLogger.js'
import std from '../../dxmodules/dxStd.js';
import dxbarcode from '../../dxmodules/dxBarcode.js';
const codeService = {}


initCode();

function initCode(){
    dxbarcode.init();
}

dxbarcode.setCallbacks({
    onBarcodeDetected: function (data, type, quality, timestamp) {
      // data is ArrayBuffer containing the barcode data
      let str = common.utf8HexToStr(common.arrayBufferToHexString(data));
      //处理二维码
      codeService.code(str)
    },
  });
  


codeService.receiveMsg = function (data) {
    let str = common.utf8HexToStr(common.arrayBufferToHexString(data))
    log.info('[codeService] receiveMsg :' + str)
    this.code(str)
}

codeService.code = function (data) {
     log.info('[codeService] code :' + data)
    //判断data是否为json格式
    let json = parseString(data)
    if (Object.keys(json).length <= 0) {
        log.error("[codeService] code: 非json格式")
        return
    }
    configCode(data)
}

// 配置码处理
function configCode(code) {
    if (Object.keys(code).length <= 0) {
        try {
            code = JSON.parse(code.slice(code.indexOf("{"), code.lastIndexOf("}") + 1))
        } catch (error) {
            log.error(error)
        }
    }
    log.info("[codeService] configCode: 解析配置码 ", JSON.stringify(code))

    // 保存配置到文件
    if (Object.keys(code).length > 0) {
        try {
            // 构建完整的配置数据结构
            let configData = buildConfigData(code)
            log.info("[codeService] configCode: 构建配置数据 ", JSON.stringify(configData))

            // 使用更新方法保存配置
            const success = updateConfigFile(configData)

            if (success) {
                log.info("[codeService] configCode: 配置保存成功")
            } else {
                log.error("[codeService] configCode: 配置保存失败")
            }

            common.asyncReboot(2)

        } catch (error) {
            log.error("[codeService] configCode: 配置保存失败", error)
        }
    }
}

// 构建完整的配置数据结构
function buildConfigData(json) {
    // 动态生成配置数据，只包含传入的字段
    let configData = {}

    // 根据传入的JSON数据动态添加字段
    if (json.net_type !== undefined) {
        configData.type = json.net_type
    }
    if (json.ssid !== undefined) {
        configData.ssid = json.ssid
    }
    if (json.psk !== undefined) {
        configData.psk = json.psk
    }
    if (json.ip_mode !== undefined) {
        configData.dhcp = json.dhcp == 0 ? 2 : 1
    }
    if (json.mqttAddr !== undefined) {
        configData.mqttAddr = json.mqttAddr
    }
    if (json.username !== undefined) {
        configData.username = json.username
    }
    if (json.password !== undefined) {
        configData.password = json.password
    }
    if (json.ip !== undefined) {
        configData.ip = json.ip
    }
    if (json.mask !== undefined) {
        configData.mask = json.mask
    }
    if (json.gateway !== undefined) {
        configData.gateway = json.gateway
    }
    if (json.dns !== undefined) {
        configData.dns = json.dns
    }

    return configData
}


function parseString(inputString) {
    // 获取{}及其之间的内容
    inputString = inputString.slice(inputString.indexOf("{"), inputString.lastIndexOf("}") + 1)
    // key=value正则，key是\w+（字母数字下划线，区别大小写），=两边可有空格，value是\w+或相邻两个"之间的内容（包含"）
    const keyValueRegex = /(\w+)\s*=\s*("[^"]*"|\w+)/g;
    let jsonObject = {};
    let match;
    while ((match = keyValueRegex.exec(inputString)) !== null) {
        let key = match[1];
        let value = match[2]

        if (/^\d+$/.test(value)) {
            // 数字
            value = parseInt(value)
        } else if (/^\d+\.\d+$/.test(value)) {
            // 小数
            value = parseFloat(value)
        } else if (value == 'true') {
            value = true
        } else if (value == 'false') {
            value = false
        } else {
            // 字符串
            value = value.replace(/"/g, '').trim()
        }
        jsonObject[key] = value;
    }
    return jsonObject;
}

// 更新配置文件中的特定字段
function updateConfigFile(configData) {
    try {
        let existingConfig = {}

        // 尝试读取现有配置文件
        if (std.exist("/app/code/src/config.json")) {
            try {
                existingConfig = JSON.parse(std.loadFile("/app/code/src/config.json"))
            } catch (error) {
                log.error("[codeService] updateConfigFile: 解析现有配置文件失败", error)
            }
        }

        // 合并配置：保留原有配置，只更新传入的字段
        const mergedConfig = { ...existingConfig, ...configData }

        // 保存合并后的配置
        std.saveFile("/app/code/src/config.json", JSON.stringify(mergedConfig))

        log.info("[codeService] updateConfigFile: 配置更新成功", JSON.stringify(mergedConfig))
        return true

    } catch (error) {
        log.error("[codeService] updateConfigFile: 配置更新失败", error)
        return false
    }
}



  std.setInterval(() => {
    try {
        dxbarcode.loop();
    } catch (e) {
        logger.error(`net loop error: ${e}`)
    }
}, 100)

export default codeService
