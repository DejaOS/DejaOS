import common from '../dxmodules/dxCommon.js'
import net from '../dxmodules/dxNet.js'
import logger from '../dxmodules/dxLogger.js'
import std from '../dxmodules/dxStd.js'
import mqtt from '../dxmodules/dxMqtt.js'
import dxCode from '../dxmodules/dxCode.js'

const driver = {}

driver.config = {
    options : {
        type: net.TYPE.ETHERNET,
        dhcp: net.DHCP.DYNAMIC,
        ssid: "vguangYPT",
        psk: "vguangypt_o0",
        mqttAddr: "mqtt://123.57.175.193:61613",
        username: "",
        password: ""
    },
    init: function () {
        let config = std.loadFile('/app/code/src/config.json')
        if(config){
            // driver.config.options = JSON.parse(config)
            logger.info("[driver.init] init with options:", this.options)
        }
    }
}

driver.net = {
    init: function () {
        let type = ""
        let dhcp = ""
        let ssid = ""
        let psk = ""
        
        // 从JSON配置文件读取网络配置
        try {
            if (std.exist('/app/code/src/config.json')) {
                logger.info("[driver.net] 从配置文件读取网络配置"+std.loadFile('/app/code/src/config.json'))
                const configData = JSON.parse(std.loadFile('/app/code/src/config.json'))
                type = configData.type || net.TYPE.ETHERNET
                dhcp = configData.dhcp || net.DHCP.DYNAMIC
                ssid = configData.ssid || ""
                psk = configData.psk || ""
                logger.info("[driver.net] 从配置文件读取网络配置:", { type, dhcp, ssid, psk })
            }
        } catch (error) {
            logger.error("[driver.net] 读取配置文件失败:", error)
        }
        
        let options = {
            type: type,
            dhcp: dhcp,
            ssid: ssid,
            psk: psk
        }
        logger.info("[driver.net] init with options:", options)
        net.worker.beforeLoop(options)
        net.netConnectWifiSsid(options.ssid, options.psk,"")        
    },
    getStatus: function () {
        let status = net.getStatus()
        if (status.connected == true && status.status == 4) {
            return true
        } else {
            return false
        }

    },
    loop: function () {
        net.worker.loop()
    }
}


driver.mqtt = {
    init: function () {
        //判断是否配置了mqtt地址
        let mqttAddr = ""
        let username = ""
        let password = ""
        
        // 从JSON配置文件读取MQTT配置
        try {
            if (std.exist('/app/code/src/config.json')) {
                const configData = JSON.parse(std.loadFile('/app/code/src/config.json'))
                mqttAddr = configData.mqttAddr || ""
                username = configData.username || ""
                password = configData.password || ""
                logger.info("[driver.mqtt] 从配置文件读取MQTT配置:", { mqttAddr, username, password })
            }
        } catch (error) {
            logger.error("[driver.mqtt] 读取配置文件失败:", error)
        }
        
        // 如果mqttAddr为空，使用默认地址
        if (!mqttAddr || mqttAddr.trim() === "") {
            mqttAddr = "mqtt://123.57.175.193:61613"
            logger.info("[driver.mqtt] 使用默认MQTT地址:", mqttAddr)
        }
        
        let options = {
            mqttAddr: mqttAddr,
            clientId: common.getSn(),
            subs: [`base_upgrade/v1/cmd/${common.getSn()}/#`],
            username: username,
            password: password,
            qos: 1,
            willTopic: "base_upgrade/v1/event/offline",
            willMessage: JSON.stringify({ uuid: common.getSn(), timestamp: Math.floor(new Date().getTime() / 1000) }),
        }
        mqtt.run(options)
    },
    getStatus: function () {
        return mqtt.isConnected()
    },
    send: function (topic, payload) {
        logger.info("[driver.mqtt] send :", topic)
        mqtt.send(topic, payload)
    }
    
}

driver.code = {
    options1: { id: 'capturer1', path: '/dev/video11', capturerDogId: "watchdog" },
    options2: { id: 'decoder1', name: "decoder v4", width: 800, height: 600 },
    init: function () {
        dxCode.worker.beforeLoop(this.options1, this.options2)
        dxCode.decoderUpdateConfig({ de_type: 64511 })
    },
    loop: function () {
        dxCode.worker.loop(0, 1000)
    }
}



export default driver
