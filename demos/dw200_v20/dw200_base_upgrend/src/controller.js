import log from '../dxmodules/dxLogger.js'
import common from '../dxmodules/dxCommon.js'
import std from '../dxmodules/dxStd.js'
import driver from './driver.js'


function run() {
    std.setInterval(() => {
        try {
            loop()
        } catch (error) {
            log.error(error)
        }
    }, 200)

    std.setInterval(() => {
        try {
            mqttHeartBeat()
        } catch (error) {
            log.error(error)
        }
    }, 10000)
}

try {
    run()
} catch (error) {
    log.error(error)
}

function loop() {
    driver.net.loop()
}


function mqttHeartBeat() {
    if(driver.mqtt.getStatus()){
        let msg = { uuid: common.getSn(), timestamp: Math.floor(new Date().getTime() / 1000) }
        log.info('send heart beat:', msg)
        driver.mqtt.send('base_upgrade/v1/event/heart', JSON.stringify(msg))
    }
}