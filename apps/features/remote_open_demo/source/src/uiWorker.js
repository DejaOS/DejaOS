// uiWorker.js - Remote Open Demo UI Worker
import dxui from "../dxmodules/dxUi.js";
import log from "../dxmodules/dxLogger.js";
import std from "../dxmodules/dxStd.js";
import UIManager from "./UIManager.js";
import HomePage from "./pages/HomePage.js";
import NetworkConfigPage from "./pages/NetworkConfigPage.js";
import KeyboardInputPage from "./pages/KeyboardInputPage.js";

/**
 * Main UI initialization
 */
try {
    log.info("Remote Open Demo UI Worker Starting...");

    // Initialize UI framework
    dxui.init({ orientation: 1 });

    // Initialize UI Manager
    UIManager.init();

    // Register pages
    UIManager.register("home", HomePage);
    UIManager.register("networkConfig", NetworkConfigPage);
    UIManager.register("keyboardInput", KeyboardInputPage);

    // Open home page
    UIManager.open("home");

    // Start UI event loop
    std.setInterval(() => {
        dxui.handler();
    }, 20);

    log.info("UI Worker initialized successfully");

} catch (error) {
    log.error("UI Worker initialization failed:", error);
}