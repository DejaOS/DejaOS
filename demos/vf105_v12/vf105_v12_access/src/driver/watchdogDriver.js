import watchdog from '../../dxmodules/dxWatchdog.js'
import utils from '../common/utils/utils.js'

const watchdogDriver = {
    init: function () {
        watchdog.open(1)
        watchdog.enable(1)
        watchdog.start(20000)
    },
    loop: function () {
        watchdog.loop(1)
    },
    feed: function (flag, timeout) {
        if (utils.isEmpty(this["feedTime" + flag]) || new Date().getTime() - this["feedTime" + flag] > 2000) {
            // Reduce watchdog feed frequency, feed once every 2 seconds
            this["feedTime" + flag] = new Date().getTime()
            watchdog.feed(flag, timeout)
        }
    }
}

export default watchdogDriver

