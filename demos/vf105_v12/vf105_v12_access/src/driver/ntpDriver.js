import ntp from '../../dxmodules/dxNtp.js'
import config from '../../dxmodules/dxConfig.js'
import std from '../../dxmodules/dxStd.js'
import dxMap from '../../dxmodules/dxMap.js'

const ntpDriver = {
    loop: function () {
        // Check every second; if drift > 2s then a sync occurred
        let last = new Date().getTime()
        dxMap.get("NTP_SYNC").put("syncTime", last)
        std.setInterval(() => {
            let now = new Date().getTime()
            let diff = now - last
            if (diff > 2000) {
                dxMap.get("NTP_SYNC").put("syncTime", now)
                last = now
            }
        }, 1000)

        ntp.beforeLoop(config.get("ntp.server"), 9999999999999)
        this.ntpHour = config.get('ntp.hour')
        this.flag = true
        ntpDriver.loop = () => {
            if (config.get("ntp.ntp")) {
                ntp.loop()
                if (new Date().getHours() == this.ntpHour && this.flag) {
                    // Scheduled sync: perform an immediate sync
                    ntp.syncnow = true
                    this.flag = false
                }
                if (new Date().getHours() != this.ntpHour) {
                    // Allow sync again after leaving this hour
                    this.flag = true
                }
            }
        }
    }
}

export default ntpDriver

