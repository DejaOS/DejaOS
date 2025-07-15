import log from '../../dxmodules/dxLogger.js'
import dxNet from '../../dxmodules/dxNet.js'
import config from '../../dxmodules/dxConfig.js'
import driver from '../driver.js'

const netService = {}
netService.netStatusChanged = function (data) {
    log.info('[netService] netStatusChanged :' + JSON.stringify(data))
    driver.screen.netStatusChange(data)
    let param = dxNet.getModeByCard(config.get("netInfo.type")).param
    if (data.connected) {
        config.set('netInfo.ip', param.ip)
        config.set('netInfo.gateway', param.gateway)
        config.set('netInfo.subnetMask', param.netmask)
        config.set('netInfo.dns', param.dns0)
        if (param.dns1) {
            config.set('dns', param.dns0 + "," + param.dns1)
        }
        let mac = dxNet.getMacaddr(config.get("netInfo.type"))
        if(mac) {
            config.set('netInfo.netMac',mac)
        }
        config.save()
    }
}
export default netService