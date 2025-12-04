import bus from '../dxmodules/dxEventBus.js'
import dxui from '../dxmodules/dxUi.js'
import mainView from './view/page/mainView.js'
import popWin from './view/util/popWin.js'
const screen = {}


let context = {}

screen.fontPath = '/app/code/resource/font/AlibabaPuHuiTi-2-65-Medium.ttf'

screen.init = function () {
    dxui.init({ orientation: 0 }, context);
    mainView.init()
    popWin.init()
    dxui.loadMain(mainView.main)
    subscribe()
}

function subscribe() {
    bus.on('popWin', screen.popWin)
}
screen.popWin = function (data) {
    popWin.show(data)
}

screen.loop = function () {
    return dxui.handler()
}

export default screen
