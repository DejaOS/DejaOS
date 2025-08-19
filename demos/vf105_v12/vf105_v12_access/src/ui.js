import ui from "../dxmodules/dxUi.js";
import std from "../dxmodules/dxStd.js"

// ui上下文
let context = {}

// ui初始化
ui.init({ orientation: 0 }, context);

const screenMain = ui.View.build('mainView', ui.Utils.LAYER.MAIN)

const bottomSnBtn = ui.Button.build('bottomSnBtn', screenMain)
bottomSnBtn.bgColor(0xff0000)
bottomSnBtn.bgOpa(20)
bottomSnBtn.setSize(200, 100)
bottomSnBtn.setPos(100, 700)


bottomSnBtn.on(ui.Utils.EVENT.CLICK, () => {
    print("passwordView")
})

// 加载屏幕
ui.loadMain(screenMain)

// 刷新ui
let timer = std.setInterval(() => {
    if (ui.handler() < 0) {
        std.clearInterval(timer)
    }
}, 1)

