import config from '../../dxmodules/dxConfig.js'
import std from '../../dxmodules/dxStd.js'
import ntp from '../../dxmodules/dxNtp.js'
import dxos from '../../dxmodules/dxOs.js'
import driver from '../driver.js'
import bus from '../../dxmodules/dxEventBus.js'
import utils from '../common/utils/utils.js'
import tz from "../../dxmodules/dxTimeZones.js";
import logger from '../../dxmodules/dxLogger.js'

/**
 * 判断是否是国际版本
 * @returns {boolean} true表示国际版本，false表示国内版本
 */
function isInternationalVersion() {
    try {
        let savedVersion = std.loadFile('/etc/app/region.conf') || std.loadFile('/etc/app/.region')
        if (savedVersion) {
            savedVersion = savedVersion.trim()
        }
        // 文件有内容代表国际版本，无内容代表国内版本
        return savedVersion && savedVersion=="INTL" 
    } catch (e) {
        // 如果文件不存在或读取失败，默认返回false（国内版本）
        return false
    }
}

// 通用校验规则
const validators = {
    ip: v => /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?).){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/.test(v),
    ipOrDomainWithPort: v => /^(?:(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)|(?:[a-zA-Z0-9-]+\.)+[a-zA-Z]{2,})(:\d{1,5})?$/.test(v),
    positiveInt: v => /^[1-9]\d*$/.test(v),
    nonNegativeInt: v => /^([1-9]\d*|0{1})$/.test(v),
    string: v => typeof v === 'string',
    number: v => typeof v === 'number',
    switch: v => [0, 1].includes(v),
    range: (min, max) => v => typeof v === 'number' && v >= min && v <= max,
    isIntInRange: (min, max) => v => Number.isInteger(v) && v >= min && v <= max,
    includes: (...values) => v => values.includes(v),
    mqttProtocol: v => {
        if (typeof v !== 'string') return false;
        const supportedProtocols = ['tcp://', 'ssl://', 'mqtt://', 'mqtts://'];
        let hostPort = v;
        let hasSupportedProtocol = false;
        // 1. 检查是否以支持的协议开头
        for (const protocol of supportedProtocols) {
            if (v.startsWith(protocol)) {
                hasSupportedProtocol = true;
                hostPort = v.slice(protocol.length); // 去掉协议前缀
                break;
            }
        }
        // 2. 如果包含其他 "://" 协议，拒绝
        if (!hasSupportedProtocol && v.includes('://')) return false;
        if (!hostPort) return false;
        // 3. 校验端口
        if (!validators.ipOrDomainWithPort(hostPort)) return false;
        // 4. 补充端口
        const portMatch = hostPort.match(/:(\d{1,5})$/);
        if (portMatch) {
            const port = parseInt(portMatch[1], 10);
            if (port < 1 || port > 65535) return false;
        }
        return true;
    },
    password: v => typeof v === 'string' && v.length >= 8,
    language: v => {
        // 所有支持的语言列表
        const allLanguages = ['CN', 'EN', 'ES', 'FR', 'DE', 'RU', 'AR', 'PT', 'KO', 'JP']
        
        // 首先检查是否是支持的语言
        if (!allLanguages.includes(v)) {
            return false
        }
        
        // 根据版本判断是否允许该语言
        const isInternational = isInternationalVersion()
        if (isInternational) {
            // 国际版本：不能接受 CN
            return v !== 'CN'
        } else {
            // 国内版本：只能接受 CN
            return v === 'CN'
        }
    },
    percentage: v => validators.nonNegativeInt(v) && v >= 0 && v <= 100,
    time: v => /^([1-9]\d{0,9}|0)$/.test(v),
    weComMqttAddr: v => typeof v === 'string' && v.startsWith('__WECOM_MQTT_ADDR__'),
    ntpServer: v => {
        if(utils.isValidDomain(v)) return true;
        return validators.ip(v)
    }
}

// 配置回调处理器
const callbacks = {
    face: {
        similarity: v => driver.face.setConfig({ com_threshold: v }),
        livenessOff: v => driver.face.setConfig({ liv_enable: v }),
        livenessVal: v => driver.face.setConfig({ liv_threshold: v }),
        recheck: v => driver.face.setConfig({ det_timeout_ms: v === 0 ? 100000 : 8000 }),
        showNir: v => driver.face.capPreviewEnable(v),
    },
    ntp: {
        gmt: v => ntp.updateGmt(v),
        timeZone: v => {
            driver.screen.upgrade({
                title: "confirm.restartDevice",
                content: "confirm.restartDeviceDis"
            })
            tz.updateTimeZone(v)
            tz.reboot()
        },
    },
    net: {
        ip: v => driver.screen.reload()
    },
    sys: {
        mode: v => setMode(v),
        heart_en: () => bus.fire(driver.mqtt.RESTART_HEARTBEAT),
        heart_time: () => bus.fire(driver.mqtt.RESTART_HEARTBEAT),
        pwd: v => driver.screen.reload(),
    },
    access: {
        fire: v => driver.gpiokey.statusConfig(v),
        fireStatus: v => driver.gpiokey.controlFire(v),
        offlineAccessNum: v => bus.fire("verifyPassRecords", v)
    },
    base: {
        backlight: v => driver.display.setBacklight(v),
        brightness: v => driver.pwm.setWhitePower(v),
        nirBrightness: v => driver.pwm.setNirPower(v),
        showIp: v => driver.screen.hideIp(v),
        showSn: v => driver.screen.hideSn(v),
        appMode: v => driver.screen.appMode(v),
        screenOff: () => bus.fire("screenManagerRefresh"),
        screensaver: () => bus.fire("screenManagerRefresh"),
        volume: v => driver.audio.volume(v),
        language: () => driver.screen.changeLanguage()
    }
}

// 配置项定义
const configSchema = {
    face: {
        similarity: v => /^-?\d+(\.\d{1,2})?$/.test(String(v)) && validators.range(0, 1)(v),
        livenessOff: validators.switch,
        livenessVal: validators.isIntInRange(0, 10),
        showNir: validators.switch,
        stranger: validators.includes(0, 1, 2),
        voiceMode: validators.includes(0, 1, 2),
        voiceModeDate: validators.string,
        recheck: validators.includes(0, 1),
    },
    mqtt: {
        addr: validators.mqttProtocol,
        username: validators.string,
        password: validators.string,
        qos: validators.includes(0, 1, 2),
        prefix: validators.string,
        willTopic: validators.string,
        onlinecheck: validators.includes(0, 1, 2),
        timeout: validators.positiveInt,
        clientIdSuffix: validators.includes(0, 1),
        cleanSession: validators.includes(0, 1),
    },
    net: {
        type: validators.includes(1, 2, 4),
        dhcp: validators.includes(1, 2, 3),
        ip: validators.ip,
        gateway: validators.ip,
        dns: v => {
            return validators.ip(v) || utils.isEmpty(v)
        },
        mask: validators.ip,
        mac: validators.string,
        ssid: validators.string,
        psk: validators.string
    },
    ntp: {
        server: validators.ntpServer,
        gmt: v => validators.range(0, 24)(v),
        timeZone: v => {
            if (typeof v !== 'string') return false
            const path = `${tz.root}${v}`
            if (!std.exist(path)) {
                return false
            }
            return true
        }
    },
    sys: {
        mode: validators.string,
        nfc: validators.switch,
        nfcIdentityCardEnable: validators.includes(1, 3),
        pwd: validators.switch,
        strangerImage: validators.switch,
        // accessImageType: validators.switch,
        devType: validators.includes(0, 1, 2),
        restartCount: validators.nonNegativeInt,
        heart_en: validators.switch,
        heart_time: v => validators.positiveInt(v) && v >= 30,
        weComStatus: validators.switch,
        bleKey: validators.string,
        scanInterval: validators.positiveInt,
        weComMqttAddr: validators.weComMqttAddr
    },
    access: {
        relayTime: validators.positiveInt,
        offlineAccessNum: v => validators.positiveInt(v) && v <= 2000,
        fire: validators.switch,
        fireStatus: validators.switch,
        tamper: validators.switch,
        uploadToCloud: validators.switch
    },
    base: {
        backlight: validators.percentage,
        brightness: validators.percentage,
        nirBrightness: validators.percentage,
        showIp: validators.switch,
        showSn: validators.switch,
        appMode: validators.switch,
        screenOff: validators.nonNegativeInt,
        screensaver: validators.nonNegativeInt,
        volume: validators.isIntInRange(0, 10),
        password: v => v.length >= 1,
        language: validators.language,
    },
    passwordAccess: {
        passwordAccess: validators.switch
    }
}

// 需要重启的配置项
const rebootRequiredConfigs = new Set([
    'ntp.server',
    'ntp.gmt',
    'base.language'
])

// 工具函数
function setMode(params) {
    dxos.systemWithRes(`echo 'app' > /etc/.app_v1`, 2)
    dxos.setMode(params)
}

function validateConfig(section, key, value) {
    const sectionSchema = configSchema[section]
    if (!sectionSchema) {
        throw new Error(`Unsupported configuration group: ${section}`)
    }

    const validator = sectionSchema[key]
    if (!validator) {
        throw new Error(`Unsupported configuration item: ${section}.${key}`)
    }

    if (!validator(value)) {
        throw new Error(`The value of configuration item ${section}.${key} is invalid: ${value}`)
    }
}

function shouldReboot(configData) {
    return Object.entries(configData).some(([section, sectionData]) => {
        return rebootRequiredConfigs.has(section) ||
            Object.keys(sectionData).some(key => rebootRequiredConfigs.has(`${section}.${key}`))
    })
}

function handlePostConfigActions(configData) {
    const hasNetConfig = 'net' in configData
    const hasMqttConfig = 'mqtt' in configData
    const needsReboot = shouldReboot(configData)

    // 重启处理
    if (needsReboot) {
        driver.screen.upgrade({
            title: "confirm.restartDevice",
            content: "confirm.restartDeviceDis"
        })
        dxos.asyncReboot(3)
    }

    // 网络重连处理
    if (hasNetConfig) {
        driver.mqtt.reinit()
        std.setTimeout(() => driver.net.reconnect(), 1000)
    }

    // MQTT重新初始化处理
    if (hasMqttConfig) {
        driver.mqtt.reinit()
    }
}

// 辅助提示函数
function showSuccessTip(message) {
    // 根据实际环境替换实现，例如 driver.screen.toast
    console.log('[Success]', message);
    driver.screen.success("systemSettingView.success")
}

function showErrorTip(message) {
    console.error('[Error]', message);
    driver.screen.error("systemSettingView.fail")
}

// 主要服务对象
const configService = {
    needReboot: Array.from(rebootRequiredConfigs),

    /**
     * 配置验证并保存
     * @param {Object} data - 配置数据对象
     * @returns {boolean|string} - 成功返回true，失败返回错误信息
     */
    configVerifyAndSave(data) {
        try {
            // 基础数据格式验证
            if (!data || typeof data !== 'object') {
                return 'Invalid configuration data format'
            }

            // 第一步：纯校验，收集有效配置项（原始值）
            const validEntries = []
            for (const [section, sectionData] of Object.entries(data)) {
                if (!configSchema[section]) {
                    throw new Error(`Unsupported configuration group: ${section}`)
                }
                for (let [key, value] of Object.entries(sectionData)) {
                    validateConfig(section, key, value)
                    validEntries.push({ section, key, value })
                }
            }

            // 第二步：准备保存数据
            const configsToSave = []
            const callbacksToExecute = []
            for (const { section, key, value: originalValue } of validEntries) {
                let finalValue = originalValue
                if (section === 'sys' && key === 'weComMqttAddr') {
                    const PREFIX = '__WECOM_MQTT_ADDR__'
                    finalValue = originalValue.substring(PREFIX.length)
                }
                if (section === 'mqtt' && key === 'addr' && !finalValue.includes('://')) {
                    finalValue = "mqtt://" + finalValue
                }
                configsToSave.push({ section, key, value: finalValue })
                // 收集需要保存后执行的回调
                const sectionCallbacks = callbacks[section]
                if (sectionCallbacks && sectionCallbacks[key]) {
                    callbacksToExecute.push({
                        callback: sectionCallbacks[key],
                        value: finalValue
                    })
                }
            }

            // 第三步：持久化保存
            configsToSave.forEach(({ section, key, value }) => {
                // 收集“必须在保存新配置之前执行”的动作（例如取消旧的 MQTT 订阅）
                if (section === 'mqtt' && key === 'prefix') {
                    bus.fire(driver.mqtt.UNSUBSCRIBE)
                    std.sleep(10)
                } 
                config.set(`${section}.${key}`, value)
            })
            config.save()

            // 第四步：执行回调
            callbacksToExecute.forEach(({ callback, value }) => {
                callback(value)
            })

            // 第五步：后置动作（重启、重连等）
            handlePostConfigActions(data)

            showSuccessTip('配置保存成功');
            return true

        } catch (error) {
            showErrorTip(error.message);
            return error.message
        }
    }
}

export default configService