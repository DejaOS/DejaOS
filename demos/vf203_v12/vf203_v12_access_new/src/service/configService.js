import config from '../../dxmodules/dxConfig.js'
import std from '../../dxmodules/dxStd.js'
import ntp from '../../dxmodules/dxNtp.js'
import dxos from '../../dxmodules/dxOs.js'
import driver from '../driver.js'
import bus from '../../dxmodules/dxEventBus.js'
import dxCamera from '../../dxmodules/dxCamera.js'

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
    mqttProtocol: v => ['tcp://', 'ssl://', 'mqtt://', 'mqtts://'].some(protocol => v.startsWith(protocol)),
    password: v => typeof v === 'string' && v.length >= 8,
    language: v => ['EN', 'CN'].includes(v),
    percentage: v => validators.nonNegativeInt(v) && v >= 0 && v <= 100
}

// 配置回调处理器
const callbacks = {
    face: {
        similarity: v => driver.face.setConfig({ com_threshold: v }),
        livenessOff: v => driver.face.setConfig({ liv_enable: v }),
        livenessVal: v => driver.face.setConfig({ liv_threshold: v }),
        showNir: v => dxCamera.capPreviewEnable(1, v)
    },
    ntp: {
        gmt: v => ntp.updateGmt(v)
    },
    net: {
        ip: v => driver.screen.reload()
    },
    sys: {
        mode: v => setMode(v),
        heart_en: () => bus.fire(driver.mqtt.RESTART_HEARTBEAT),
        heart_time: () => bus.fire(driver.mqtt.RESTART_HEARTBEAT),
        pwd: v => driver.screen.reload()
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
        similarity: validators.range(0, 1),
        livenessOff: validators.switch,
        livenessVal: validators.range(0, 100),
        showNir: validators.switch,
        stranger: validators.includes(0, 1, 2),
        voiceMode: validators.includes(0, 1, 2),
        voiceModeDate: validators.string
    },
    mqtt: {
        addr: validators.mqttProtocol,
        clientId: validators.string,
        username: validators.string,
        password: validators.string,
        qos: validators.includes(0, 1, 2),
        prefix: validators.string,
        willtopic: validators.string,
        onlinecheck: validators.includes(0, 1, 2),
        timeout: validators.positiveInt,
        clientIdSuffix: validators.includes(0, 1),
    },
    net: {
        type: validators.includes(0, 1, 2, 4),
        dhcp: validators.includes(1, 2, 3),
        ip: validators.ip,
        gateway: validators.ip,
        dns: validators.ip,
        mask: validators.ip,
        mac: validators.string,
        ssid: validators.string,
        psk: validators.string
    },
    ntp: {
        ntp: validators.switch,
        server: validators.ip,
        hour: validators.range(0, 23),
        gmt: validators.range(0, 24)
    },
    sys: {
        mode: validators.string,
        nfc: validators.switch,
        nfcIdentityCardEnable: validators.includes(1, 3),
        pwd: validators.switch,
        strangerImage: validators.switch,
        accessImageType: validators.switch,
        devType: validators.includes(0, 1, 2),
        restartCount: validators.nonNegativeInt,
        heart_en: validators.switch,
        heart_time: v => validators.positiveInt(v) && v >= 1,
        weComStatus: validators.switch,
    },
    access: {
        relayTime: validators.positiveInt,
        offlineAccessNum: validators.positiveInt,
        fire: validators.switch,
        fireStatus: validators.switch,
        tamper: validators.switch,
    },
    base: {
        firstLogin: validators.switch,
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
        showProgramCode: validators.switch,
        showIdentityCard: validators.switch
    },
    passwordAccess: {
        passwordAccess: validators.switch
    }
}

// 需要重启的配置项
const rebootRequiredConfigs = new Set([
    'sys.nfcIdentityCardEnable',
    'ntp.ntp',
    'ntp.server',
    'ntp.gmt'
])

// 工具函数
function setMode(params) {
    dxos.systemWithRes(`echo 'app' > /etc/.app_v1`, 2)
    dxos.setMode(params)
}

function validateConfig(section, key, value) {
    const sectionSchema = configSchema[section]
    if (!sectionSchema) {
        throw new Error(`不支持的配置分组: ${section}`)
    }

    const validator = sectionSchema[key]
    if (!validator) {
        throw new Error(`不支持的配置项: ${section}.${key}`)
    }

    if (!validator(value)) {
        throw new Error(`配置项 ${section}.${key} 的值无效: ${value}`)
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
        std.setTimeout(() => driver.net.reconnect(), 1000)
    }

    // MQTT重新初始化处理
    if (hasMqttConfig) {
        driver.mqtt.reinit()
    }
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
                return '配置数据格式无效'
            }

            const configsToSave = []
            const callbacksToExecute = []

            // 验证并收集配置项
            for (const [section, sectionData] of Object.entries(data)) {
                for (const [key, value] of Object.entries(sectionData)) {
                    // 验证配置项
                    validateConfig(section, key, value)

                    // 收集要保存的配置
                    configsToSave.push({ section, key, value })

                    // 收集要执行的回调
                    const sectionCallbacks = callbacks[section]
                    if (sectionCallbacks && sectionCallbacks[key]) {
                        callbacksToExecute.push({
                            callback: sectionCallbacks[key],
                            value
                        })
                    }
                }
            }

            // 批量保存配置
            configsToSave.forEach(({ section, key, value }) => {
                config.set(`${section}.${key}`, value)
            })
            config.save()

            // 执行回调
            callbacksToExecute.forEach(({ callback, value }) => {
                callback(value)
            })

            // 处理后置动作（重启、网络重连、MQTT重初始化）
            handlePostConfigActions(data)

            return true

        } catch (error) {
            return error.message
        }
    }
}

export default configService