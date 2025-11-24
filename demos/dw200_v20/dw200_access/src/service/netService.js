import log from '../../dxmodules/dxLogger.js'
import dxNet from '../../dxmodules/dxNet.js'
import config from '../../dxmodules/dxConfig.js'
import map from '../../dxmodules/dxMap.js'
import driver from '../driver.js'

const net_map = map.get("NET")
const netService = {}
netService.netStatusChanged = function (data) {
    log.info('[netService] netStatusChanged :' + JSON.stringify(data))
    
    driver.screen.netStatusChange(data)
    let param = dxNet.getModeByCard(config.get("netInfo.type")).param
    if (data.connected) {
        net_map.put("NET_STATUS", "connected")
        config.set('netInfo.ip', param.ip)
        config.set('netInfo.gateway', param.gateway)
        config.set('netInfo.subnetMask', param.netmask)
        config.set('netInfo.dns', param.dns0)
        if (param.dns1) {
            config.set('dns', param.dns0 + "," + param.dns1)
        }
        let mac = dxNet.getMacaddr(config.get("netInfo.type"))
        if(mac && config.get("netInfo.fixed_macaddr_enable") == 0) {
            config.set('netInfo.netMac',mac)
        }
        config.save()
        driver.ntp.syncNow()
    } else{
        net_map.put("NET_STATUS", "disconnected")
    }
}
export default netService