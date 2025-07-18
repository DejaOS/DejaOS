import dxui from '../../dxmodules/dxUi.js'

const mainView = {}

mainView.init = function () {
    let main = dxui.View.build('root', dxui.Utils.LAYER.MAIN)
    mainView.main = main
    mainView.main.scroll(false)
    mainView.main.bgOpa(0)

    mainView.createFaceLine(mainView.main)
    
}


/**
 * 创建人脸识别框
 * @param {*} parent 
 */
mainView.createFaceLine = function(parent) {
    let faceLine = dxui.Line.build('faceLine', parent)
    faceLine.lineColor(0xff6600)
    faceLine.lineWidth(8)
    mainView.faceLine = faceLine
}


export default mainView