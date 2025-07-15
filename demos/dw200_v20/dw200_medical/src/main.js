import ui from "../dxmodules/dxUi.js";
import std from "../dxmodules/dxStd.js";
import main from './page.js'

// UI context
let context = {}

// UI initialization
ui.init({ orientation: 1 }, context);

main.init()
main.load()

// Refresh UI
let timer = std.setInterval(() => {
    if (ui.handler() < 0) {
        std.clearInterval(timer)
    }
}, 1)

