import std from "../dxmodules/dxStd.js";
import bus from '../dxmodules/dxEventBus.js'
import net from '../dxmodules/dxNetwork.js'
import logger from '../dxmodules/dxLogger.js'

net.init()

net.connectEthWithDHCP()

net.setCallbacks({
    /**
     * Network status change callback
     * @param {number} net_type - Network type (1: Ethernet, 2: WiFi)
     * @param {number} net_status - Network status code
     */
    onStatusChange: (net_type, net_status) => {
        logger.info(`Network status changed: type=${net_type}, status=${net_status}`);
        bus.fire('network_status_change', { net_type, net_status })
        if(net_status == 4){
            logger.info('Network connected, starting client and server')
            bus.newWorker('client', '/app/code/src/tcpClient.js')
            bus.newWorker('server', '/app/code/src/tcpServer.js')
        }
    }
});

let timer = std.setInterval(() => {
    net.loop()
}, 50) 