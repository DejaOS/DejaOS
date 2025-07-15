/**
 * Test HTTP Server Demo
 */
import log from '../dxmodules/dxLogger.js'
import server from '../dxmodules/dxHttpServer.js'
import std from '../dxmodules/dxStd.js'
import dxQueue from '../dxmodules/dxQueue.js'

const queue = dxQueue.get("log_pipe")

try {
    // Configure static resource service
    server.serveStatic("/", "/app/code/src/web/");//only index.html

    // Configure routes and their corresponding handlers
    server.route("/fetchLog", function (req, res) {
        let size = queue.size()
        let max = 100
        let msg = ''
        if (size > 0) {
            size = size > max ? max : size
            for (let i = 0; i < size; i++) {
                if(i == size - 1){
                    msg += queue.pop()
                }else{
                    msg += queue.pop() + '\n'
                }
            }
        }
        res.send(msg, { "Content-Type": "text/html" });
    });

    // Start server and listen on port
    server.listen(8080);
} catch (e) {
    log.error(e);
}
log.info("=== END ===");

// Set server event loop
std.setInterval(() => {
    server.loop();
}, 10);
