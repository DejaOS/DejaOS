import log from '../dxmodules/dxLogger.js'
import server from '../dxmodules/dxHttpServer.js'
import std from '../dxmodules/dxStd.js'
import tz from '../dxmodules/dxTimeZones.js';

try {
    // Configure static resource service
    server.serveStatic("/", "/app/code/src/web/");

    // Get all timezones
    server.route("/api/timezones", function (req, res) {
        try {
            const lang = req.query && req.query.lang ? req.query.lang : 'en';
            const timezones = tz.getTimeZones(lang);
            res.send(JSON.stringify({ code: 0, data: timezones }), { "Content-Type": "application/json" });
        } catch (error) {
            res.send(JSON.stringify({ code: 500, message: "Error: " + error.message }), { "Content-Type": "application/json" });
        }
    });

    // Get current time
    server.route("/api/current-time", function (req, res) {
        try {
            const now = new Date();
            const timeStr = now.toLocaleString('en-US', {
                timeZone: 'UTC',
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                hour12: false
            });
            res.send(JSON.stringify({ code: 0, data: { time: timeStr } }), { "Content-Type": "application/json" });
        } catch (error) {
            res.send(JSON.stringify({ code: 500, message: "Error: " + error.message }), { "Content-Type": "application/json" });
        }
    });

    // Update timezone
    server.route("/api/update-timezone", function (req, res) {
        try {
            const body = JSON.parse(req.body);
            const timezone = body.timezone;
            if (!timezone) {
                res.send(JSON.stringify({ code: 1, message: "Timezone is required" }), { "Content-Type": "application/json" });
                return;
            }
            tz.updateTimeZone(timezone);
            res.send(JSON.stringify({ code: 0, message: "Timezone updated successfully, rebooting..." }), { "Content-Type": "application/json" });
            // Reboot after a short delay
            std.setTimeout(() => {
                tz.reboot();
            }, 1000);
        } catch (error) {
            res.send(JSON.stringify({ code: 500, message: "Error: " + error.message }), { "Content-Type": "application/json" });
        }
    });

    // Start server and listen on port
    server.listen(8080);
    log.info("Timezone web server started on port 8080");
} catch (e) {
    log.error("Web server error:", e);
}

// Set server event loop
std.setInterval(() => {
    server.loop();
}, 50);
