import bus from "../dxmodules/dxEventBus.js";

// Initialize network worker (for WiFi connection)
bus.newWorker('networkworker', '/app/code/src/networkworker.js')

// Initialize web worker (HTTP server)
bus.newWorker('webworker', '/app/code/src/webworker.js') 