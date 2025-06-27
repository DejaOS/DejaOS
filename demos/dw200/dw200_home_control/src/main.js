import ui from "../dxmodules/dxUi.js";
import std from "../dxmodules/dxStd.js";
import page1 from './page1.js'
import page2 from './page2.js'
import page3 from './page3.js'
import page4 from './page4.js'
import page5 from './page5.js'
import page6 from './page6.js'

// UI context for framework initialization
let context = {}

// Initialize UI framework with portrait orientation
ui.init({ orientation: 1 }, context);

// Initialize all pages
page1.init()  // Weather display
page2.init()  // Clock display  
page3.init()  // Scene controls
page4.init()  // Device controls
page5.init()  // AC detailed control
page6.init()  // AC mode selection

// Start with weather page
page1.load()

// Main UI event loop - handles UI updates and events
let timer = std.setInterval(() => {
    if (ui.handler() < 0) {
        std.clearInterval(timer)
    }
}, 1)

