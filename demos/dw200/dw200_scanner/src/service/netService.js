import log from '../../dxmodules/dxLogger.js'
import dxNet from '../../dxmodules/dxNet.js'
import config from '../../dxmodules/dxConfig.js'
import driver from '../driver.js'

const netService = {}
netService.netStatusChanged = function (data) {
    log.info('[netService] netStatusChanged :' + JSON.stringify(data))
    driver.screen.netStatusChange(data)
    let param = dxNet.getModeByCard(config.get("sysInfo.net_type")).param
    if (data.connected) {
        config.set('sysInfo.ip', param.ip)
        config.set('sysInfo.gateway', param.gateway)
        config.set('sysInfo.mask', param.netmask)
        config.set('sysInfo.dns', param.dns0)
        if (param.dns1) {
            config.set('sysInfo.dns', param.dns0 + "," + param.dns1)
        }
        config.save()
    }
}
export default netService