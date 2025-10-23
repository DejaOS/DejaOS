import log from '../../dxmodules/dxLogger.js'
import std from '../../dxmodules/dxStd.js'
import dxui from '../../dxmodules/dxUi.js'
import face from '../../dxmodules/dxFacial.js'

let faceview = null
try {
    dxui.init({ orientation: 1 });
    let mainview = dxui.View.build('mainview', dxui.Utils.LAYER.MAIN)
    mainview.bgOpa(0) // background opacity
    mainview.scroll(false)

    faceview = dxui.View.build('faceview', mainview)
    faceview.bgOpa(0)
    faceview.radius(0)
    faceview.padAll(0)
    faceview.setSize(200, 200)
    faceview.borderWidth(5)
    faceview.setBorderColor(0xff0000)
    faceview.hide()

    dxui.loadMain(mainview)
} catch (error) {
    log.error(error)
}
function showFaceView() {
    // [{"id":4,"status":1,"rect":[8,224,360,668],"qualityScore":26,"livingScore":41}]
    let detectionData = face.getDetectionData()
    if (faceview && detectionData && detectionData.length > 0) {
        faceview.show()
        faceview.setPos(detectionData[0].rect[0], detectionData[0].rect[1])
        faceview.setSize(detectionData[0].rect[2] - detectionData[0].rect[0], detectionData[0].rect[3] - detectionData[0].rect[1])
    } else if (faceview) {
        faceview.hide()
    }
}
std.setInterval(() => {
    try {
        showFaceView()
        dxui.handler()
    } catch (error) {
        log.error(error)
    }
}, 15)