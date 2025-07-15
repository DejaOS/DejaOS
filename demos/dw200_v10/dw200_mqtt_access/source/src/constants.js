

import dxNet from '../dxmodules/dxNet.js'
import config from '../dxmodules/dxConfig.js'
import common from '../dxmodules/dxCommon.js'
const constant = {}
constant.netoption = function () {
    let dhcp = config.get('net.ip_mode') || dxNet.DHCP.DYNAMIC
    return {
        type: config.get('net.net_type') || dxNet.TYPE.ETHERNET,
        dhcp: dhcp === 0 ? dxNet.DHCP.DYNAMIC : dhcp,
        macaddr: config.get('net.macaddr') || common.getUuid2mac(),
        ip: config.get('net.ip') || '',
        netmask: config.get('net.mask') || '',
        gateway: config.get('net.gateway') || '',
        dns0: config.get('net.dns') || ''
    }
}
constant.mqttoption = function () {
    const addr = config.get('mqtt.mqttaddr') || 'tcp://101.200.139.97:51883'
    const username = config.get('mqtt.mqttusername') || 'admin'
    const pwd = config.get('mqtt.mqttpassword') || 'password'
    let uuid = common.getSn()
    const subs = [`access_device/v1/cmd/${uuid}/getConfig`, `access_device/v1/cmd/${uuid}/setConfig`,
    `access_device/v1/cmd/${uuid}/control`, `access_device/v1/cmd/${uuid}/upgradeFirmware`,
    `access_device/v1/event/${uuid}/access_online_reply`]
    return {
        mqttAddr: addr, clientId: uuid, subs: subs, username: username,
        password: pwd, willTopic: 'access_device/v1/event/offline', willMessage: JSON.stringify({ uuid: uuid })
    }
}
constant.codeoption = function () {
    return {
        mode: config.get('sys.s_mode') || 0,
        interval: config.get('sys.interval') || 1000
    }
}
constant.audiooption = function(){
    return{
        volumn:config.get('sys.volume'),
        boot:(config.get('sys.boot_music') === 1)
    }
}
export default constant