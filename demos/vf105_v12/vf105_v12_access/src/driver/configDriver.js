import config from '../../dxmodules/dxConfig.js'
import common from '../../dxmodules/dxCommon.js'

const configDriver = {
    init: function () {
        config.init()
        let mac = common.getUuid2mac(19)
        let uuid = common.getSn(19)
        if (!config.get('sys.mac') && mac) {
            config.set('sys.mac', mac)
        }
        if (!config.get('sys.uuid') && uuid) {
            config.set('sys.uuid', uuid)
        }
        // If SN is empty, use device UUID
        if (!config.get('sys.sn') && uuid) {
            config.set('sys.sn', uuid)
        }
        if (!config.get('mqtt.clientId') && uuid) {
            config.set('mqtt.clientId', uuid)
        }
        config.save()
    }
}

export default configDriver

