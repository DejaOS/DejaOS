// upgrade demo by mqtt
import net from '../dxmodules/dxNet.js'
import common from '../dxmodules/dxCommon.js'
import bus from '../dxmodules/dxEventBus.js'
import log from '../dxmodules/dxLogger.js'

// Network configuration settings
let type = 1 // Network type
let dhcp = net.DHCP.DYNAMIC // Use dynamic DHCP
let macAddr = common.getUuid2mac() // Generate MAC address from UUID

// Network options object
let options = {
    type: type,
    dhcp: dhcp,
    macAddr: macAddr
}
bus.newWorker('mqtt', '/app/code/src/mqttworker.js')

// Start network with configured options
net.run(options)

// After successful upgrade, the log will change to 'main start,after upgrade'
log.info('main start,before upgrade')







