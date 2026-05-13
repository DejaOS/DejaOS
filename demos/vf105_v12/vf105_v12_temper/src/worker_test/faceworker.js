import face from '../../dxmodules/dxFacial.js'
import log from '../../dxmodules/dxLogger.js'
import std from '../../dxmodules/dxStd.js'
import bus from '../../dxmodules/dxEventBus.js'
import temper from '../../dxmodules/dxTemp.js'
import commonUtils from '../../dxmodules/dxCommonUtils.js'

try {
    face.init({liv_enable: 0})
    temper.init()
    std.sleep(2000)
} catch (error) {
    log.error(error)
}
std.setInterval(() => {
    try {
        face.loop()
    } catch (error) {
        log.error(error)
    }
}, 20)
face.setCallbacks({
    onRecognition: (event) => {
        /**
         {
            "id":4,                                         // Face ID
            "rect":[255,436,298,378],                       // Coordinates of the drawing frame
            "is_rec":true,                                  // Whether recognized
            "picPath":"/data/user/temp/22541180370.jpg",    // Image path
            "isCompare":true,                               // Whether compared
            "compareScore":0,                               // Comparison score
            "userId":"1",                                   // User ID
            "feature":"base64",                             // Feature value
        }
         */
        log.info("recognition event", JSON.stringify(event))
        log.info("recognition success", event.userId)

        const singleTemp = temper.getTemp()
        log.info("Temperature (single-frame peak): " + JSON.stringify(singleTemp) + "°C")

        const stats = temper.measure(8)
        if (stats) {
            log.info(
                "Multi-frame measure(8): max=" + stats.max +
                " min=" + stats.min +
                " avg=" + stats.avg +
                " valid_samples=" + stats.samples.length
            )
            log.info("Per-frame peak samples: " + JSON.stringify(stats.samples))
        } else {
            log.warn("Multi-frame measure(8) failed")
        }

        const thermalMap = temper.getThermalMap()
        if (thermalMap) {
            log.info("Thermal map byte length: " + thermalMap.map.length)
            log.info("Thermal map (hex): " + commonUtils.codec.arrayBufferToHex(thermalMap.map))
        } else {
            log.warn("Failed to get thermal map")
        }

        const rectTemp = temper.getRectTemp(event.rect)
        log.info("Face ROI temperature: " + JSON.stringify(rectTemp))
    }
})

// face.setStatus(false)

bus.on('register_facial_recognition', () => {
    log.info('Register facial recognition')
    try {
        let userId = 'testuser'
        let timeout = 5000
        face.deleteFea(userId)
        let res = face.getFeaByCap(timeout)
        if (res) {
            log.info('Register facial recognition success', res)
            let feature = res.feature
            let result = face.addFea(userId, feature)
            log.info("add feature to face database", result)
        }
    } catch (ex) {
        log.error('Register facial recognition failed', ex)
    }
});
