import nfc from '../../dxmodules/dxNfc.js'
import config from '../../dxmodules/dxConfig.js'
import logger from '../../dxmodules/dxLogger.js'

const nfcDriver = {
    options: { m1: true, psam: false },
    init: function () {
        if (!config.get('sys.nfc')) {
            logger.debug("Card reading is disabled")
            return
        }
        this.options.useEid = config.get("sys.nfcIdentityCardEnable") == 3 ? 1 : 0
        nfc.worker.beforeLoop(this.options)
    },
    eidInit: function () {
        if (!config.get('sys.nfc')) {
            return
        }
        if (config.get("sys.nfcIdentityCardEnable") == 3) {
            nfc.eidUpdateConfig({ appid: "1621503", sn: config.get("sys.sn"), device_model: config.get("sys.appVersion") })
        }
    },
    loop: function () {
        if (!config.get('sys.nfc')) {
            this.loop = () => { }
        } else {
            this.loop = () => nfc.worker.loop(this.options)
        }
    }
}

export default nfcDriver

