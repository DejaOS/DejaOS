import logger from '../dxmodules/dxLogger.js'
import code from '../dxmodules/dxCode.js'
import center from '../dxmodules/dxEventBus.js'
import common from '../dxmodules/dxCommon.js'
import std from '../dxmodules/dxStd.js'
import dxui from '../dxmodules/dxUi.js'
import label from '../dxmodules/uiLabel.js'
logger.info("start...")
center.newWorker('code', '/app/code/src/codeservice.js')
center.on(code.RECEIVE_MSG, function (data) {
    logger.info('receive msg from code service', data)
    let str = common.utf8HexToStr(common.arrayBufferToHexString(data.data))
    logger.info(str)
    if (str == 'prod') {
        logger.info('switch app mode')
        common.setMode("prod")
    } else if (str == 'dev') {
        logger.info('switch debug mode')
        common.setMode("dev")
    }
})
dxui.init({ orientation: 1 }, {});
let main = dxui.View.build('root', dxui.Utils.LAYER.MAIN)
main.scroll(false)
main.scrollbarMode(false)
main.setPos(0, 0)
main.setSize(480, 320)
let label = dxui.Label.build('label', main)
label.setPos(5,120)
label.setSize(300, 30)
label.text('hello,test switch mode')

dxui.loadMain(main)
std.setInterval(() => {
    dxui.handler()
}, 5)


