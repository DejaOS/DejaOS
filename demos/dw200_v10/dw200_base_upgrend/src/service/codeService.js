import common from '../../dxmodules/dxCommon.js';
import log from '../../dxmodules/dxLogger.js'
import std from '../../dxmodules/dxStd.js';
const codeService = {}

codeService.receiveMsg = function (data) {
    let str = common.utf8HexToStr(common.arrayBufferToHexString(data))
    log.info('[codeService] receiveMsg :' + str)
    this.code(str)
}

codeService.code = function (data) {
    // log.info('[codeService] code :' + data)
    // Check if data is in JSON format
    let json = parseString(data)
    if (Object.keys(json).length <= 0) {
        log.error("[codeService] code: Not JSON format")
        return
    }
    configCode(data)
}

// Configuration code processing
function configCode(code) {
    if (Object.keys(code).length <= 0) {
        try {
            code = JSON.parse(code.slice(code.indexOf("{"), code.lastIndexOf("}") + 1))
        } catch (error) {
            log.error(error)
        }
    }
    log.info("[codeService] configCode: Parse configuration code ", JSON.stringify(code))

    // Save configuration to file
    if (Object.keys(code).length > 0) {
        try {
            // Build complete configuration data structure
            let configData = buildConfigData(code)
            log.info("[codeService] configCode: Build configuration data ", JSON.stringify(configData))

            // Save configuration using update method
            const success = updateConfigFile(configData)

            if (success) {
                log.info("[codeService] configCode: Configuration saved successfully")
            } else {
                log.error("[codeService] configCode: Configuration save failed")
            }

            common.asyncReboot(2)

        } catch (error) {
            log.error("[codeService] configCode: Configuration save failed", error)
        }
    }
}

// Build complete configuration data structure
function buildConfigData(json) {
    // Dynamically generate configuration data, only including passed fields
    let configData = {}

    // Dynamically add fields based on passed JSON data
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
    // Get {} and content between them
    inputString = inputString.slice(inputString.indexOf("{"), inputString.lastIndexOf("}") + 1)
    // key=value regex, key is \w+ (alphanumeric underscore, case sensitive), spaces allowed around =, value is \w+ or content between two adjacent " (including ")
    const keyValueRegex = /(\w+)\s*=\s*("[^"]*"|\w+)/g;
    let jsonObject = {};
    let match;
    while ((match = keyValueRegex.exec(inputString)) !== null) {
        let key = match[1];
        let value = match[2]

        if (/^\d+$/.test(value)) {
            // Number
            value = parseInt(value)
        } else if (/^\d+\.\d+$/.test(value)) {
            // Decimal
            value = parseFloat(value)
        } else if (value == 'true') {
            value = true
        } else if (value == 'false') {
            value = false
        } else {
            // String
            value = value.replace(/"/g, '').trim()
        }
        jsonObject[key] = value;
    }
    return jsonObject;
}

// Update specific fields in configuration file
function updateConfigFile(configData) {
    try {
        let existingConfig = {}

        // Try to read existing configuration file
        if (std.exist("/app/code/src/config.json")) {
            try {
                existingConfig = JSON.parse(std.loadFile("/app/code/src/config.json"))
            } catch (error) {
                log.error("[codeService] updateConfigFile: Failed to parse existing config file", error)
            }
        }

        // Merge configuration: keep original configuration, only update passed fields
        const mergedConfig = { ...existingConfig, ...configData }

        // Save merged configuration
        std.saveFile("/app/code/src/config.json", JSON.stringify(mergedConfig))

        log.info("[codeService] updateConfigFile: Configuration updated successfully", JSON.stringify(mergedConfig))
        return true

    } catch (error) {
        log.error("[codeService] updateConfigFile: Configuration update failed", error)
        return false
    }
}


export default codeService
