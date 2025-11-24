import log from '../../dxmodules/dxLogger.js'
import config from '../../dxmodules/dxConfig.js'
import driver from '../driver.js'
import utils from '../common/utils/utils.js'
import common from '../../dxmodules/dxCommon.js'
import dxNtp from '../../dxmodules/dxNtp.js'
import base64 from '../../dxmodules/dxBase64.js'
import bus from '../../dxmodules/dxEventBus.js'
import std from '../../dxmodules/dxStd.js'
import * as os from "os";

const configService = {}

// Match IP addresses in dotted decimal format, e.g.: 192.168.0.1.
const ipCheck = v => /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?).){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/.test(v)
// Match www.baidu.com or www.baidu.com:1883 or 192.168.0.1:8080
const ipOrDomainCheckWithPort = v => /^(?:(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)|(?:[a-zA-Z0-9-]+\.)+[a-zA-Z]{2,})(:\d{1,5})?$/.test(v);

// Positive integer
const regpCheck = v => /^[1-9]\d*$/.test(v)
// Non-negative integer
const regnCheck = v => /^([1-9]\d*|0{1})$/.test(v)
// Base64 format
const base64Check = v => /^data:image\/(png|jpg|jpeg|bmp);base64,[A-Za-z0-9+/]+={0,2}$/.test(v)
// All supported configuration items' validation rules and callbacks after successful setting

const supported = {
    netInfo: {
        type: { rule: v => [1, 2].includes(v) },
        // 1:dynamic, 0:static
        dhcp: { rule: v => [0, 1].includes(v) },
        ip: { rule: ipCheck },
        gateway: { rule: ipCheck },
        dns: { rule: v => !v.split(",").some(ip => !ipCheck(ip)) },
        subnetMask: { rule: ipCheck },
        netMac: { rule: v => typeof v == 'string' },
        fixed_macaddr_enable: { rule: v => [0, 2].includes(v) },
        // 0: off 2: timed synchronization
        ntp: { rule: v => [0, 2].includes(v) },
        ntpAddr: { rule: v => typeof v == 'string', callback: v => bus.fire("ntpUpdate") },
        ntpHour: { rule: v => typeof v == 'number' && /^([0-9]|1[0-9]|2[0-3])$/.test(v.toString()) },
        ntpLocaltime: { rule: regnCheck, callback: v => dxNtp.updateGmt(v) },
        // WiFi username
        ssid: { rule: v => typeof v == 'string' },
        // WiFi password
        psk: { rule: v => typeof v == 'string' },
    },
    mqttInfo: {
        mqttAddr: {
            rule: (v) => {
                if (typeof v !== 'string') return false;
                let hostPart;
                if (/^mqtt:\/\//i.test(v)) {
                    // Extract part after protocol
                    hostPart = v.substring(7);
                } else {
                    // Case 2: No protocol header, entire string as host:port
                    hostPart = v;
                }
                if (!hostPart) return false;
                // Use original rule to validate host:port
                if (!ipOrDomainCheckWithPort(hostPart)) return false;
                const portMatch = hostPart.match(/:(\d+)$/);
                if (portMatch) {
                    const port = parseInt(portMatch[1], 10);
                    if (port < 1 || port > 65535) return false;
                }
                return true
            }
        },
        clientId: { rule: v => typeof v == 'string' },
        mqttName: { rule: v => typeof v == 'string' },
        password: { rule: v => typeof v == 'string' },
        qos: { rule: v => [0, 1, 2].includes(v) },
        prefix: { rule: v => typeof v == 'string' },
        cleanSession: { rule: v => [0, 1].includes(v) },
        clientIdSuffix: { rule: v => [0, 1].includes(v) },
    },
    bleInfo: {
        mac: { rule: v => /^[0-9|a-f|A-F]{12}$/.test(v), callback: v => driver.uartBle.setConfig({ mac: v }) },
        name: { rule: v => typeof v == 'string', callback: v => driver.uartBle.setConfig({ name: v }) },
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
                config.setAndSave("uiInfo.rotation", v)
                driver.screen.reload()
            }
        },
        statusBar: { rule: v => [0, 1].includes(v), callback: v => driver.screen.reload() },
        horBgImage: {
            rule: base64Check, callback: v => {
                let suffix = ""
                try {
                    suffix = base64ImageSave(v, true)
                } catch (error) {
                    log.error("解码失败", error)
                    config.set("uiInfo.horBgImage", "")
                    return
                }
                // Since base64 is too large, querying configuration will be slow, so clear this item after setting
                config.set("uiInfo.horBgImage", "")
                if (!suffix) {
                    return
                }
                config.set("uiInfo.rotation1BgImage", "/app/code/resource/image/horBgImage" + suffix)
                config.set("uiInfo.rotation3BgImage", "/app/code/resource/image/horBgImage" + suffix)
                config.save()
                driver.screen.reload()
            }
        },
        verBgImage: {
            rule: base64Check, callback: v => {
                let suffix = ""
                try {
                    suffix = base64ImageSave(v, false)
                } catch (error) {
                    log.error("解码失败", error)
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
                config.save()
                driver.screen.reload()
            }
        },
        // Whether to hide SN 1 show 0 hide
        sn_show: { rule: v => [0, 1].includes(v), callback: v => driver.screen.reload() },
        // Whether to hide IP 1 show 0 hide
        ip_show: { rule: v => [0, 1].includes(v), callback: v => driver.screen.reload() },
        buttonText: { rule: v => typeof v == 'string' && v.length <= 6, callback: v => driver.screen.reload() },
        show_unlocking: { rule: v => [0, 1].includes(v), callback: v => driver.screen.reload() },
    },
    doorInfo: {
        openMode: { rule: v => [0, 1, 2].includes(v), callback: openModeCb },
        openTime: { rule: regpCheck },
        openTimeout: { rule: regpCheck },
        onlinecheck: { rule: v => [0, 1].includes(v) },
        timeout: { rule: regpCheck },
        offlineAccessNum: { rule: v => typeof v == 'number' && /^(2000|1[0-9]{3}|[1-9][0-9]{1,2}|[1-9])$/.test(v.toString()) },
    },
    sysInfo: {
        // Voice volume
        volume: { rule: regnCheck },
        // Key volume
        volume2: { rule: regnCheck },
        // Buzzer volume
        volume3: { rule: regnCheck },
        heart_time: { rule: v => /^(3[0-9]{1,}|[4-9]\d*)$/.test(v), callback: v => bus.fire(driver.mqtt.RESTART_HEARTBEAT) },
        heart_en: { rule: v => [0, 1].includes(v), callback: v => bus.fire(driver.mqtt.RESTART_HEARTBEAT) },
        heart_data: { rule: v => typeof v == 'string', callback: v => bus.fire(driver.mqtt.RESTART_HEARTBEAT) },
        // Device number
        deviceNum: { rule: regnCheck },
        // Device name
        deviceName: { rule: v => typeof v == 'string', callback: v => driver.screen.reload() },
        com_passwd: { rule: v => v.length == 16 },
        // Language 0 Chinese 1 English
        language: { rule: v => [0, 1].includes(v), callback: v => driver.screen.reload() },
        // Set system time, in seconds
        time: { rule: v => /^([1-9]\d{0,9}|0)$/.test(v), callback: v => common.systemBrief(`date -s "@${v}"`) },
        dateFormat: { rule: v => [1, 2].includes(v), callback: v => driver.screen.timeFormat() },
        timeFormat: { rule: v => [1, 2].includes(v), callback: v => driver.screen.timeFormat() },
        reportCount: { rule: v => typeof v == 'number' && /^([1-9]|[1-4][0-9]|50)$/.test(v.toString()) },
        reportInterval: { rule: regnCheck },
        // -1 disable auto restart 0-23 restart at specified hour
        autoRestart: { rule: v => typeof v == 'number' && /^(-1|[0-9]|1[0-9]|2[0-3])$/.test(v.toString()) },
    },
    scanInfo: {
        // Code system selection based on bit position, select all 64511
        de_type: { rule: regnCheck },
        // Scan mode 0 is interval 1 is single
        sMode: { rule: v => [0, 1].includes(v) },
        // Interval effective, interval time
        interval: { rule: regnCheck },
    },
    nfcInfo: {
        // 1 enable 0 disable
        nfc: { rule: v => [0, 1].includes(v) },
        nfc_identity_card_enable: { rule: v => [1, 3].includes(v) },
        nfcType: { rule: v => [1, 2, 3].includes(v) },
        sectorNumber: { rule: v => typeof v == 'number' && /^([0-9]|1[0-5])$/.test(v.toString()) },
        blockNumber: { rule: v => [0, 1, 2].includes(v) },
        secretkeyType: { rule: v => [1, 2].includes(v) },
        secretkey: { rule: v => /^[0-9a-fA-F]{12}$/.test(v) }
    }
}
// Configurations that require restart
const needReboot = ["netInfo", "mqttInfo", "sysInfo.volume", "sysInfo.volume2", "sysInfo.volume3", "sysInfo.heart_time", "sysInfo.heart_en", "sysInfo.heart_data", "nfcInfo.nfc_identity_card_enable",
    'scanInfo.de_type', 'nfcInfo.nfc', 'sysInfo.autoRestart']

// Unified user configuration validation method
configService.configVerifyAndSave = function (data) {
    // Verify data format
    if (!data || typeof data !== 'object') {
        throw new Error('Invalid configuration data format');
    }

    // Store all configurations that need to be saved
    const configsToSave = [];
    const callbacksToExecute = [];

    // Traverse configuration data for validation
    for (const [section, sectionData] of Object.entries(data)) {
        // Check if configuration section is supported
        if (!supported[section]) {
            return `Unsupported configuration section: ${section}`;
        }

        // Validate each configuration item in this section
        for (const [key, value] of Object.entries(sectionData)) {
            // Check if configuration item is supported
            if (!supported[section][key]) {
                return `Unsupported configuration key: ${section}.${key}`;
            }

            // Use corresponding rule to validate value
            const { rule, callback } = supported[section][key];
            if (!rule(value)) {
                return `Invalid value for ${section}.${key}: ${value}`;
            }

            // Store configuration and callback
            configsToSave.push({ section, key, value });
            if (callback && typeof callback === 'function') {
                callbacksToExecute.push({ callback, value });
            }
        }
    }

    // After all validations pass, save configurations uniformly
    for (const { section, key, value } of configsToSave) {
        if (section == "mqttInfo" && key == "prefix") {
            bus.fire(driver.mqtt.UNSUBSCRIBE)
            std.sleep(10)
        }
        config.set(section + "." + key, value);
    }
    config.save();

    // Execute all callbacks
    for (const { callback, value } of callbacksToExecute) {
        callback(value);
    }

    // Check if restart is needed
    const isReboot = Object.entries(data).some(([section, sectionData]) => {
        return needReboot.includes(section) ||
            Object.keys(sectionData).some(key => needReboot.includes(`${section}.${key}`))
    })

    if (isReboot) {
        common.asyncReboot(3)
    }

    return true;
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
    // Base64 to image save
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
        log.error("base64前缀错误")
        return false
    }

    let buf = base64.toUint8Array(value)
    let fd = os.open("/app/code/resource/image/" + (isHor ? "horBgImage" : "verBgImage") + suffix, os.O_RDWR | os.O_CREAT | os.O_TRUNC);
    let len = os.write(fd, buf.buffer, 0, buf.length)

    if (len != buf.length) {
        log.error("base64转图片失败")
        return false
    }
    if (os.close(fd) != 0) {
        log.error("存储文件失败")
        return false
    }
    return suffix
}

export default configService