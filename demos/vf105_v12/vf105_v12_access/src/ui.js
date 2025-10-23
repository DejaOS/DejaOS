import ui from "../dxmodules/dxUi.js";
import std from "../dxmodules/dxStd.js"

// UI context
let context = {}

// UI initialization
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

// Load screen
ui.loadMain(screenMain)

// Refresh UI
let timer = std.setInterval(() => {
    if (ui.handler() < 0) {
        std.clearInterval(timer)
    }
}, 1)

