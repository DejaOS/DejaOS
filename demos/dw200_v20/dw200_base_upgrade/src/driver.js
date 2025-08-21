import logger from '../dxmodules/dxLogger.js'
import std from '../dxmodules/dxStd.js'

const driver = {}


driver.config = {
    options : {
        type: 1,
        dhcp: 2,
        ssid: "vguangYPT",
        psk: "vguangypt_o0",
        mqttAddr: "mqtt://123.57.175.193:61613",
        username: "",
        password: ""
    },
    init: function () {
        let config = std.loadFile('/app/code/src/config.json')
        if(config){
            logger.info("[driver.init] init with options:", this.options)
        }
    }
}

export default driver
