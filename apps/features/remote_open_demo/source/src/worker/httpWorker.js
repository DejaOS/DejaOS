/**
 * httpWorker.js - HTTP Server Worker for Remote Open Demo
 *
 * Responsibilities:
 * 1. Run HTTP server on port 8080
 * 2. Serve static web files
 * 3. Handle API: login, open door (EventBus to doorWorker)
 */

import std from "../../dxmodules/dxStd.js";
import log from "../../dxmodules/dxLogger.js";
import bus from "../../dxmodules/dxEventBus.js";
import server from "../../dxmodules/dxHttpServer.js";

// HTTP server port
const HTTP_PORT = 8080;

// Store for web users (simple in-memory authentication for demo)
const webUsers = {
    admin: "admin123"  // username: password (in plain text for demo)
};

/**
 * Initialize HTTP server with routes and static file serving
 */
function initHttpServer() {
    try {
        // Serve static files from /app/code/src/web directory
        server.serveStatic("/", "/app/code/src/web/");

        // Login API
        server.route("/api/login", function (req, res) {
            handleLogin(req, res);
        });

        // Open door API
        server.route("/api/open-door", function (req, res) {
            handleOpenDoor(req, res);
        });

        // Start server
        server.listen(HTTP_PORT);
        log.info(`[httpWorker] HTTP server started on port ${HTTP_PORT}`);

    } catch (e) {
        log.error("[httpWorker] HTTP server initialization failed:", e);
    }
}

/**
 * Handle login request
 */
function handleLogin(req, res) {
    let result = {
        success: false,
        message: "Login failed",
        token: null
    };

    try {
        const body = req.body ? JSON.parse(req.body) : null;
        if (body && body.username && body.password) {
            if (webUsers[body.username] === body.password) {
                result.success = true;
                result.message = "Login successful";
                result.token = "demo-token-" + std.genRandomStr(10);
                log.info(`[httpWorker] User ${body.username} logged in via web`);
            }
        }
    } catch (e) {
        log.error("[httpWorker] Login handler error:", e);
        result.message = "Invalid request";
    }

    res.send(JSON.stringify(result), { "Content-Type": "application/json" });
}

/**
 * Handle open door request
 */
function handleOpenDoor(req, res) {
    let result = {
        success: false,
        message: "Door open failed"
    };

    try {
        // Verify token (simplified for demo)
        const body = req.body ? JSON.parse(req.body) : null;

        // Simple token check - in production use proper authentication
        if (body && body.token && body.token.startsWith("demo-token-")) {
            // Send door open command via EventBus
            bus.fire("DOOR_OPEN_REQUEST", { source: "web" });

            result.success = true;
            result.message = "Door open command sent";
            log.info("[httpWorker] Door open requested via web API");
        } else {
            result.message = "Unauthorized";
        }
    } catch (e) {
        log.error("[httpWorker] Open door handler error:", e);
        result.message = "Internal error";
    }

    res.send(JSON.stringify(result), { "Content-Type": "application/json" });
}


// Start the HTTP server worker
try {
    // Initialize HTTP server
    initHttpServer();

    // Start server loop
    std.setInterval(() => {
        server.loop();
    }, 50);
} catch (e) {
    log.error("[httpWorker] Initialization failed:", e);
}