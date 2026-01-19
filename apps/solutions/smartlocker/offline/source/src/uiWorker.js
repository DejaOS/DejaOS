import dxui from "../dxmodules/dxUi.js";
import log from "../dxmodules/dxLogger.js";
import std from "../dxmodules/dxStd.js";
import UIManager from "./pages/UIManager.js";
import HomePage from "./pages/HomePage.js";
import StoreConfirmPage from "./pages/user/StoreConfirmPage.js";
import StoreSetPasswordPage from "./pages/user/StoreSetPasswordPage.js";
import PickCabinetPage from "./pages/user/PickCabinetPage.js";
import PickPasswordPage from "./pages/user/PickPasswordPage.js";
import AdminLoginPage from "./pages/admin/AdminLoginPage.js";
import AdminHomePage from "./pages/admin/AdminHomePage.js";
import GroupConfigPage from "./pages/admin/GroupConfigPage.js";
import GroupEditPage from "./pages/admin/GroupEditPage.js";
import OpenAllCabinetsPage from "./pages/admin/OpenAllCabinetsPage.js";
import RecordsPage from "./pages/admin/RecordsPage.js";
import TimeSettingsPage from "./pages/admin/TimeSettingsPage.js";
import AdminPasswordPage from "./pages/admin/AdminPasswordPage.js";
import AdminOpenCabinetPage from "./pages/admin/OpenCabinetPage.js";

try {
  // UI initialization config; adjust orientation according to device layout
  dxui.init({ orientation: 1 });

  // 1. Initialize UIManager (single-screen multi-page stack manager)
  UIManager.init();

  // 2. Register pages
  UIManager.register("home", HomePage);
  UIManager.register("userStoreConfirm", StoreConfirmPage);
  UIManager.register("userSetPassword", StoreSetPasswordPage);
  UIManager.register("userPickCabinet", PickCabinetPage);
  UIManager.register("userPickPassword", PickPasswordPage);
  UIManager.register("adminLogin", AdminLoginPage);
  UIManager.register("adminHome", AdminHomePage);
  UIManager.register("adminGroupConfig", GroupConfigPage);
  UIManager.register("adminGroupEdit", GroupEditPage);
  UIManager.register("adminOpenAll", OpenAllCabinetsPage);
  UIManager.register("adminOpenCabinet", AdminOpenCabinetPage);
  UIManager.register("adminRecords", RecordsPage);
  UIManager.register("adminTimeSettings", TimeSettingsPage);
  UIManager.register("adminPasswordSettings", AdminPasswordPage);

  // 3. Open home page (main Smart Locker UI)
  UIManager.open("home");

  // 4. Start UI event loop
  std.setInterval(() => {
    dxui.handler();
  }, 20);
} catch (error) {
  log.error(error);
}



