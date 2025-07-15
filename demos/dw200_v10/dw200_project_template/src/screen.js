import bus from '../dxmodules/dxEventBus.js'
import dxui from '../dxmodules/dxUi.js'
import mainView from './view/mainView.js'
const screen = {}


let context = {}

screen.init = function () {
    dxui.init({ orientation: 1 }, context);
    mainView.init()
    dxui.loadMain(mainView.main)

    subscribe()
}

function subscribe(){
    bus.on('code', function (data) {
        mainView.codeLabel.text('Code : ' + data)
    })
    bus.on('nfc', function (data) {
        mainView.cardLabel.text('Card : ' + data.id)
    })
}


screen.loop = function () {
    return dxui.handler()
}

export default screen
