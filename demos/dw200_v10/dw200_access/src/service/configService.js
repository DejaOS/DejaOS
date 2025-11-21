import log from '../../dxmodules/dxLogger.js'
import config from '../../dxmodules/dxConfig.js'
import driver from '../driver.js'
import utils from '../common/utils/utils.js'
import common from '../../dxmodules/dxCommon.js'
import dxNtp from '../../dxmodules/dxNtp.js'
import base64 from '../../dxmodules/dxBase64.js'
import std from '../../dxmodules/dxStd.js'
import * as os from "os";

const configService = {}

// Match IP address in dotted decimal notation, e.g.: 192.168.0.1
const ipCheck = v => /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?).){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/.test(v)
// Match www.baidu.com or www.baidu.com:1883 or 192.168.0.1:8080
const ipOrDomainCheckWithPort = v => /^(?:(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)|(?:[a-zA-Z0-9-]+\.)+[a-zA-Z]{2,})(:\d{1,5})?$/.test(v);

// Positive integer
const regpCheck = v => /^[1-9]\d*$/.test(v)
// Non-negative integer
const regnCheck = v => /^([1-9]\d*|0{1})$/.test(v)
// Validation rules for all supported configuration items and callbacks after successful setting

const supported = {
    netInfo: {
        type: { rule: v => [0, 1, 2, 4].includes(v) },
        // 1: dynamic, 0: static
        dhcp: { rule: v => [0, 1].includes(v) },
        ip: { rule: ipCheck },
        gateway: { rule: ipCheck },
        dns: { rule: v => !v.split(",").some(ip => !ipCheck(ip)) },
        subnetMask: { rule: ipCheck },
        netMac: { rule: v => typeof v == 'string' },
        fixed_macaddr_enable: { rule: v => [0, 2].includes(v) },
        // 0: disabled 1: interval sync
        ntp: { rule: v => [0, 1].includes(v) },
        ntpAddr: { rule: v => typeof v == 'string' },
        ntpInterval: { rule: regpCheck },
        ntpLocaltime: { rule: regnCheck, callback: v => dxNtp.updateGmt(v) },
    },
    mqttInfo: {
        mqttAddr: { rule: ipOrDomainCheckWithPort },
        clientId: { rule: v => typeof v == 'string' },
        mqttName: { rule: v => typeof v == 'string' },
        password: { rule: v => typeof v == 'string' },
        qos: { rule: v => [0, 1, 2].includes(v) },
        prefix: { rule: v => typeof v == 'string' },
    },
    bleInfo: {
        mac: { rule: v => /^[0-9|a-f|A-F]{12}$/.test(v), callback: v => driver.uartBle.setConfig({ mac: v }) },
        name: { rule: v => typeof v == 'string', callback: v => driver.uartBle.setConfig({ name: v }) },
        secretKey: { rule: v => Array.isArray(v) }
    },
    uiInfo: {
        rotation: {
            rule: v => [0, 1, 2, 3].includes(v), callback: v => {
                switch (v) {
                    case 0:
                        v = 1
                        break;
                    case 1:
                        v = 0
                        break;
                    case 2:
                        v = 3
                        break;
                    case 3:
                        v = 2
                        break;
                }
                config.set("uiInfo.rotation", v)
                driver.screen.reload()
            }
        },
        statusBar: { rule: v => [0, 1].includes(v), callback: v => driver.screen.reload() },
        rotation0BgImage: { rule: v => typeof v == 'string', callback: v => driver.screen.reload() },
        rotation1BgImage: { rule: v => typeof v == 'string', callback: v => driver.screen.reload() },
        rotation2BgImage: { rule: v => typeof v == 'string', callback: v => driver.screen.reload() },
        rotation3BgImage: { rule: v => typeof v == 'string', callback: v => driver.screen.reload() },
        horBgImage: {
            rule: v => typeof v == 'string', callback: v => {
                let suffix = ""
                try {
                    suffix = base64ImageSave(v, true)
                } catch (error) {
                    log.error("Decode failed", error)
                    config.set("uiInfo.horBgImage", "")
                    return
                }
                // Since base64 is too large, querying config will be slow, so clear this item after setting
                config.set("uiInfo.horBgImage", "")
                if (!suffix) {
                    return
                }
                config.set("uiInfo.rotation1BgImage", "/app/code/resource/image/horBgImage" + suffix)
                config.set("uiInfo.rotation3BgImage", "/app/code/resource/image/horBgImage" + suffix)
                driver.screen.reload()
            }
        },
        verBgImage: {
            rule: v => typeof v == 'string', callback: v => {
                let suffix = ""
                try {
                    suffix = base64ImageSave(v, false)
                } catch (error) {
                    log.error("Decode failed", error)
                    config.set("uiInfo.verBgImage", "")
                    return
                }
                // Since base64 is too large, clear this item after setting
                config.set("uiInfo.verBgImage", "")
                if (!suffix) {
                    return
                }
                config.set("uiInfo.rotation0BgImage", "/app/code/resource/image/verBgImage" + suffix)
                config.set("uiInfo.rotation2BgImage", "/app/code/resource/image/verBgImage" + suffix)
                driver.screen.reload()
            }
        },
        // Date display visibility 1: show 0: hide
        show_date: { rule: v => [0, 1].includes(v), callback: v => driver.screen.reload() },
        // Device name display visibility 1: show 0: hide
        show_devname: { rule: v => [0, 1].includes(v), callback: v => driver.screen.reload() },
        // SN visibility 1: show 0: hide
        sn_show: { rule: v => [0, 1].includes(v), callback: v => driver.screen.reload() },
        // IP visibility 1: show 0: hide
        ip_show: { rule: v => [0, 1].includes(v), callback: v => driver.screen.reload() },
        // buttonText: { rule: v => typeof v == 'string' && v.length <= 6, callback: v => driver.screen.reload() },
        fontPath: { rule: v => typeof v == 'string', callback: v => driver.screen.reload() },
        show_unlocking: { rule: v => [0, 1].includes(v), callback: v => driver.screen.reload() },
    },
    doorInfo: {
        openMode: { rule: v => [0, 1, 2].includes(v), callback: openModeCb },
        openTime: { rule: regpCheck },
        openTimeout: { rule: regpCheck },
        onlinecheck: { rule: v => [0, 1].includes(v) },
        timeout: { rule: regpCheck },
        offlineAccessNum: { rule: regpCheck },
    },
    sysInfo: {
        // Voice volume
        volume: { rule: regnCheck },
        // Key press volume
        volume2: { rule: regnCheck },
        // Buzzer volume
        volume3: { rule: regnCheck },
        // Version number display visibility
        version_show: { rule: v => [0, 1].includes(v), callback: v => driver.screen.reload() },
        heart_time: { rule: regpCheck },
        heart_en: { rule: v => [0, 1].includes(v) },
        heart_data: { rule: v => typeof v == 'string' },
        // Device number
        deviceNum: { rule: regnCheck },
        // Device name
        deviceName: { rule: v => typeof v == 'string', callback: v => driver.screen.reload() },
        com_passwd: { rule: v => v.length == 16 },
        // 0: Chinese, 1: English
        language: {
            rule: v => [0, 1].includes(v), callback: v => {
                config.set("sysInfo.language", v == 1 ? "EN" : "CN")
                driver.screen.reload()
            }
        },
        status: { rule: v => [1, 2].includes(v) },
        nfc_identity_card_enable: { rule: v => [1, 3].includes(v) },
        // 1: enable 0: disable
        nfc: { rule: v => [0, 1].includes(v) },
        // Set system time, in seconds
        time: { rule: regnCheck, callback: v => common.systemBrief(`date -s "@${v}"`) },
        // Online verification error message switch 0: off 1: on
        onlinecheckErrorMsg: { rule: v => [0, 1].includes(v) },
        // -1: disable auto restart, 0-23: restart at the hour
        autoRestart: { rule: v => typeof v == 'number' && /^(-1|[0-9]|1[0-9]|2[0-3])$/.test(v.toString()) },
    },
    scanInfo: {
        // Code type selection based on bit position, select all: 64511
        deType: { rule: regnCheck },
        // Scan mode 0: interval 1: single
        sMode: { rule: v => [0, 1].includes(v) },
        // Interval effective, interval time
        interval: { rule: regnCheck },
    }
}
configService.setSn = function (params) {
    // Write to local file
    std.saveFile('/etc/.sn', params)
    config.setAndSave('sysInfo.uuid', params)
    config.setAndSave('sysInfo.sn', params)
    config.setAndSave('mqttInfo.clientId', params)
}
// Configurations that require reboot
const needReboot = ["sysInfo.autoRestart", "netInfo", "mqttInfo", "sysInfo.volume", "sysInfo.volume2", "sysInfo.volume3", "sysInfo.heart_time", "sysInfo.heart_en", "sysInfo.nfc_identity_card_enable", 'sysInfo.language',
    'scanInfo.deType', 'sysInfo.nfc']

// Unified user configuration validation method
configService.configVerifyAndSave = function (data) {
    let isReboot = false
    for (const key in data) {
        if (!supported[key]) {
            return key + " not supported"
        }
        const item = data[key];
        if (typeof item != 'object') {
            // Must be a group
            continue
        }
        if (needReboot.includes(key)) {
            isReboot = true
        }
        for (const subKey in item) {
            let option = supported[key][subKey]
            if (utils.isEmpty(option)) {
                return subKey + " not supported"
            }
            const value = item[subKey];
            if (needReboot.includes(key + "." + subKey)) {
                isReboot = true
            }

            if (!option.rule || option.rule(value)) {
                // No validation rule, or validation passed
                config.set(key + "." + subKey, value)
                if (option.callback) {
                    log.info("Execute configuration setting callback")
                    // Execute configuration setting callback
                    option.callback(value)
                }
            } else {
                return value + " check failure"
            }
        }
    }
    config.save()
    // Check configurations that require reboot, restart after 3 seconds
    if (isReboot) {
        common.asyncReboot(3)
    }
    return true
}

// Door opening mode modification callback
function openModeCb(value) {
    if (value == 1) {
        driver.gpio.open()
    } else {
        driver.gpio.close()
    }
}

// Base64 image save
// data:image/jpg;base64,/data:image/jpeg;base64,
// data:image/png;base64,
// data:image/bmp;base64,
function base64ImageSave(value, isHor) {
    if (value == "") {
        return false
    }
    let suffix = ".png"
    // Convert base64 to image and save
    let jpg_prefix1 = "data:image/jpg;base64,"
    let jpg_prefix2 = "data:image/jpeg;base64,"
    let png_prefix = "data:image/png;base64,"
    let bmp_prefix = "data:image/bmp;base64,"
    if (value.startsWith(jpg_prefix1)) {
        value = value.slice(jpg_prefix1.length)
        suffix = ".jpg"
    } else if (value.startsWith(jpg_prefix2)) {
        value = value.slice(jpg_prefix2.length)
        suffix = ".jpg"
    } else if (value.startsWith(png_prefix)) {
        value = value.slice(png_prefix.length)
        suffix = ".png"
    } else if (value.startsWith(bmp_prefix)) {
        value = value.slice(bmp_prefix.length)
        suffix = ".bmp"
    } else {
        log.error("Base64 prefix error")
        return false
    }

    let buf = base64.toUint8Array(value)
    let fd = os.open("/app/code/resource/image/" + (isHor ? "horBgImage" : "verBgImage") + suffix, os.O_RDWR | os.O_CREAT | os.O_TRUNC);
    let len = os.write(fd, buf.buffer, 0, buf.length)
    console.log("=======================", len);

    if (len != buf.length) {
        log.error("Base64 to image conversion failed")
        return false
    }
    if (os.close(fd) != 0) {
        log.error("File storage failed")
        return false
    }
    return suffix
}

export default configService