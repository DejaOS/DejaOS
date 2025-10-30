import face from '../../dxmodules/dxFacial.js'
import log from '../../dxmodules/dxLogger.js'
import std from '../../dxmodules/dxStd.js'
import bus from '../../dxmodules/dxEventBus.js'
try {
    face.init()
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
        log.info("recognition success", event.userId)
    }
})
bus.on('register_facial_recognition', () => {
    log.info('Register facial recognition')
    try {
        let userId = 'testuser'
        let timeout = 5000
        face.deleteFea(userId)
        let res = face.getFeaByCap(timeout)
        if (res) {
            //{"quality_score":33,"picPath":"/data/user/temp//1761815859308.jpg","rect":[78,211,456,593],"feature":"IegcIOXnUAtG4ksc4d76Ig+1BUM..."}
            log.info('Register facial recognition success', res)
            let feature = res.feature
            face.addFea(userId, feature)
            log.info("feature added to face database")
        }
    } catch (ex) {
        log.error('Register facial recognition failed', ex)
    }
});