import bus from '../dxmodules/dxEventBus.js'
import logger from '../dxmodules/dxLogger.js'
import dxui from '../dxmodules/dxUi.js'
import mainView from './view/mainView.js'
const screen = {}


let context = {}

screen.init = function () {
    dxui.init({ orientation: 0 }, context);
    mainView.init()
    dxui.loadMain(mainView.main)

    subscribe()
}

function subscribe(){
    bus.on('face', face)
}


function face(data) {
    switch (data.status) {
        case "track":
            if (data.action == "create") {
                mainView.faceLine.show()
            } 
            if (data.rect_smooth) {
                logger.info(data.rect_smooth)
                data.rect_smooth = data.rect_smooth.map(v => parseInt(v))
                let x1 = data.rect_smooth[0]
                let y1 = data.rect_smooth[1]
                let x2 = data.rect_smooth[2]
                let y2 = data.rect_smooth[3]
                let points = [[x1, y1], [x2, y1], [x2, y2], [x1, y2], [x1, y1]]
                mainView.faceLine.setPoints(points, points.length)
            }
            break;
    }
}

screen.loop = function () {
    return dxui.handler()
}

export default screen
