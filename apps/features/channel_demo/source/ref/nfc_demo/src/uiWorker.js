import dxui from "../dxmodules/dxUi.js";
import log from "../dxmodules/dxLogger.js";
import std from "../dxmodules/dxStd.js";
import UIManager from "./UIManager.js";
import HomePage from "./pages/HomePage.js";
import BlockDataPage from "./pages/BlockDataPage.js";

try {
    log.info("UI Worker Initializing...");

    // UI init configuration (orientation: 1 means landscape or default orientation, device dependent)
    dxui.init({ orientation: 1 });

    // 1. Initialize UIManager
    UIManager.init();

    // 2. Register pages
    UIManager.register("home", HomePage);
    UIManager.register("blockData", BlockDataPage);

    // 3. Open home page
    UIManager.open("home");

    // 4. Start UI event loop
    std.setInterval(() => {
        dxui.handler();
    }, 20);

    log.info("UI Worker Event Loop Started");
} catch (error) {
    log.error("UI Worker Init Error:", error);
}
