// uiWorker.js - UI worker thread
import dxui from "../dxmodules/dxUi.js";
import log from "../dxmodules/dxLogger.js";
import std from "../dxmodules/dxStd.js";
import bus from "../dxmodules/dxEventBus.js";
import UIManager from "./UIManager.js";
import TipView from "./components/TipView.js";
import { EVENT_UI_TIP } from "./constants.js";
import HomePage from "./pages/HomePage.js";
import PinUnlockPage from "./pages/PinUnlockPage.js";
import AdminLoginPage from "./pages/AdminLoginPage.js";
import SettingsPage from "./pages/SettingsPage.js";
import NetworkConfigPage from "./pages/NetworkConfigPage.js";
import SystemInfoPage from "./pages/SystemInfoPage.js";

/**
 * Main UI bootstrap
 */
try {
    log.info("UI worker starting...");

    dxui.init({ orientation: 1 });

    UIManager.init();

    UIManager.register("home", HomePage);
    UIManager.register("pinUnlock", PinUnlockPage);
    UIManager.register("adminLogin", AdminLoginPage);
    UIManager.register("settings", SettingsPage);
    UIManager.register("networkConfig", NetworkConfigPage);
    UIManager.register("systemInfo", SystemInfoPage);

    UIManager.open("home");

    bus.on(EVENT_UI_TIP, (data) => {
        if (!data) return;
        const msg = data.message || "";
        if (data.level === "success") TipView.showSuccess(msg);
        else if (data.level === "error") TipView.showError(msg);
        else if (data.level === "warning") TipView.showWarning(msg);
        else TipView.showInfo(msg);
    });

    std.setInterval(() => {
        dxui.handler();
    }, 20);

    log.info("UI worker ready");

} catch (error) {
    log.error("UI worker init failed:", error);
}
