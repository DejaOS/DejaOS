import dxnetwork from '../dxmodules/dxNetwork.js'
import common from '../dxmodules/dxCommon.js'
import bus from '../dxmodules/dxEventBus.js'
import logger from '../dxmodules/dxLogger.js'
import std from '../dxmodules/dxStd.js'
dxnetwork.init();
dxnetwork.connectWifiWithDHCP("vguangYPT", "vguangypt_o0");
let isConnected = false;
dxnetwork.setCallbacks({
  onStatusChange: function (netType, status) {
    logger.info("Network status changed:", netType, status);
    if (dxnetwork.isConnected() && !isConnected) {
      logger.info("Network connected", dxnetwork.getNetParam());
      isConnected = true;
      bus.newWorker('worker1', '/app/code/src/httpclient.js')
    }
  },
});

std.setInterval(() => {
  try {
    dxnetwork.loop();
  } catch (e) {
    logger.error("Error in network loop:", e);
  }
}, 50);