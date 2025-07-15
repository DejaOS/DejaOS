import dxui from '../../dxmodules/dxUi.js'
import std from '../../dxmodules/dxStd.js'
import dxCommon from '../../dxmodules/dxCommon.js'
import driver from '../driver.js'

const mainView = {}

mainView.init = function () {
    let main = dxui.View.build('root', dxui.Utils.LAYER.MAIN)
    mainView.main = main
    main.scroll(false)
    main.setPos(0, 0)
    main.setSize(480, 320)
    
    let b1 = buildButton('b1', main, 80, 220, 100, 50)
    mainView.b1 = b1
    buildLabel('b1txt', b1, 13, 8, "Play")
    
    
    let b2 = buildButton('b2', main, 300, 220, 100, 50)
    mainView.b2 = b2
    buildLabel('b2txt', b2, 13, 8, "Relay")
    
    let codeLabel = buildLabel('code', main, 100, 70, "Code : ")
    mainView.codeLabel = codeLabel

    let cardLabel = buildLabel('card', main, 100, 115, "Card : ")
    mainView.cardLabel = cardLabel
    
    let snLabel = buildLabel('sn', main, 100, 160, "Sn : " + dxCommon.getSn())
    mainView.snLabel = snLabel

    b1.on(dxui.Utils.EVENT.CLICK, play)
    b2.on(dxui.Utils.EVENT.CLICK, open)
}

function play() {
    driver.alsa.play('/app/code/resource/wav/welcome.wav')
}

function open() {
    driver.gpio.open()
    std.sleep(1000)
    driver.gpio.close()
}

function buildLabel(id, parent, x, y, text) {
    let l = dxui.Label.build(id, parent)
    l.longMode(dxui.Utils.LABEL_LONG_MODE.SCROLL_CIRCULAR)
    l.setPos(x, y)
    l.width(480 - x - 50)
    l.text(text)
    return l
}

function buildButton(id, parent, x, y, w, h) {
    let b = dxui.Button.build(id, parent)
    b.setPos(x, y)
    b.setSize(w, h)
    return b
}


export default mainView