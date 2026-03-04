import dxui from "../dxmodules/dxUi.js";
import log from "../dxmodules/dxLogger.js";
import std from "../dxmodules/dxStd.js";
import UIManager from "./pages/UIManager.js";
import HomePage from "./pages/HomePage.js";
import StoreConfirmPage from "./pages/user/StoreConfirmPage.js";
import PickCabinetPage from "./pages/user/PickCabinetPage.js";
import AdminLoginPage from "./pages/admin/AdminLoginPage.js";
import AdminHomePage from "./pages/admin/AdminHomePage.js";
import GroupConfigPage from "./pages/admin/GroupConfigPage.js";
import RecordsPage from "./pages/admin/RecordsPage.js";
import AdminPasswordPage from "./pages/admin/AdminPasswordPage.js";
import AdminOpenCabinetPage from "./pages/admin/OpenCabinetPage.js";
import FaceMaskView from './pages/FaceMaskView.js';
import PickChooseView from './pages/PickChooseView.js';

try {
  // UI init; adjust orientation for device
  dxui.init({ orientation: 1 });

  // 1. Init UIManager (single screen, page stack)
  UIManager.init();
  FaceMaskView.init();
  PickChooseView.init();
  // 2. Register pages
  UIManager.register("home", HomePage);
  UIManager.register("userStoreConfirm", StoreConfirmPage);
  UIManager.register("userPickCabinet", PickCabinetPage);
  UIManager.register("adminLogin", AdminLoginPage);
  UIManager.register("adminHome", AdminHomePage);
  UIManager.register("adminGroupConfig", GroupConfigPage);
  UIManager.register("adminOpenCabinet", AdminOpenCabinetPage);
  UIManager.register("adminRecords", RecordsPage);
  UIManager.register("adminPasswordSettings", AdminPasswordPage);

  // 3. Open home (smart locker main screen)
  UIManager.open("home");

  // 4. UI event loop
  std.setInterval(() => {
    dxui.handler();
  }, 20);
} catch (error) {
  log.error(error);
}



