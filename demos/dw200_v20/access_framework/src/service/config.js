// Responsible for reading and writing configuration, including restarting special configurations, etc., for cross-threaded use
// Includes the values of global variables, such as network status, mqtt status, etc. These values are not saved to the configuration file and all start with global.
import config from '../../dxmodules/dxConfiguration.js'
import std from '../../dxmodules/dxStd.js'
import dxMap from '../../dxmodules/dxMap.js'

const configService = {}
let instance = null;

configService.events = {
    mqtt: {
        REINIT: 'mqtt_reinit',
        CONNECTED_CHANGED: 'mqtt_connected_changed',
        SEND_MSG: 'mqtt_send_msg',
        RESTART_HEARTBEAT: 'mqtt_restart_heartbeat',
        RECEIVE_MSG: 'mqtt_receive_msg'
    },
    net: {
        CONNECTED_CHANGED: 'net_connected_changed',
        RECONNECT: 'net_reconnect'
    },
    ui: {
        RELOAD: 'ui_reload',
        TIME_FORMAT: 'ui_time_format',
        SHOW_MSG: 'ui_show_msg',
        SHOW_PIC: 'ui_show_pic',
        WARNING: 'ui_warning',
        CUSTOM_POP_WIN: 'ui_custom_pop_win',
        DISPLAY_RESULTS: 'ui_display_results'
    },
    tcp: {
        CONNECTED_CHANGED: 'tcp_connected_changed'
    },
    barcode: {
        BARCODE_DETECTED: 'barcode_detected'
    },
    access: {
        CARD_PASS: '__nfc__MsgReceive',
        PASSWORD_PASS: 'password_pass',
        BLE_PASS: '__uartvg__MsgReceive'
    }
}
const globalMap = dxMap.get('__global')

configService.init = function () {
    let defaultval = std.loadFile('/app/code/src/default.json')
    defaultval = std.parseExtJSON(defaultval)
    instance = config.init('/app/data/config.json', defaultval)
}
configService.set = function (key, value) {
    if (key.startsWith('global.')) {
        globalMap.set(key, value)
        return
    }
    _instance().set(key, value, true)
}
configService.get = function (key) {
    if (key.startsWith('global.')) {
        return globalMap.get(key)
    }
    return _instance().get(key)
}

function _instance() {
    if (instance == null) {
        instance = config.getInstance('/app/data/config.json')
    }
    return instance
}

export default configService