import dxui from "../dxmodules/dxUi.js";
import log from "./mylogger.js";
import std from "../dxmodules/dxStd.js";
import bus from "../dxmodules/dxEventBus.js";
import UIManager from "./UIManager.js";
import { BUS } from "./constants.js";
import HomePage from "./pages/HomePage.js";
import FaceMaskView from "./pages/FaceMaskView.js";
import PinEntryView from "./pages/PinEntryView.js";
import TipView from "./pages/TipView.js";
import AdminLoginPage from "./pages/admin/AdminLoginPage.js";
import AdminHomePage from "./pages/admin/AdminHomePage.js";
import OpenSpecificCabinetPage from "./pages/admin/OpenSpecificCabinetPage.js";
import OpenAllCabinetPage from "./pages/admin/OpenAllCabinetPage.js";
import SystemInfoPage from "./pages/admin/SystemInfoPage.js";
import NetworkConfigPage from "./pages/admin/NetworkConfigPage.js";
import ChangeAdminPasswordPage from "./pages/admin/ChangeAdminPasswordPage.js";
import DebugLogPage from "./pages/admin/DebugLogPage.js";

try {
  dxui.init({ orientation: 0});

  UIManager.init();
  FaceMaskView.init();
  PinEntryView.init();
  UIManager.register("home", HomePage);
  UIManager.register("adminLogin", AdminLoginPage);
  UIManager.register("adminHome", AdminHomePage);
  UIManager.register("adminOpenSpecificCabinet", OpenSpecificCabinetPage);
  UIManager.register("adminOpenAllCabinet", OpenAllCabinetPage);
  UIManager.register("adminSystemInfo", SystemInfoPage);
  UIManager.register("adminNetworkConfig", NetworkConfigPage);
  UIManager.register("adminChangePassword", ChangeAdminPasswordPage);
  UIManager.register("adminDebugLog", DebugLogPage);
  UIManager.open("home");

  bus.on(BUS.OTA_STATUS, (event) => {
    const status = String(event && event.status || "");
    const message = String(event && event.message || "");
    if (status === "progress") {
      TipView.showWarning(message || "正在下载并校验升级包，请勿断电", { duration: 0 });
      return;
    }
    if (status === "success") {
      TipView.showSuccess(message || "升级包校验成功，设备即将重启", { duration: 5000 });
      return;
    }
    TipView.showError(message || "应用升级失败", { duration: 5000 });
  });

  std.setInterval(() => {
    dxui.handler();
  }, 20);

  log.info("fitlock: uiWorker ready");
} catch (e) {
  log.error("fitlock: uiWorker init failed", e);
}
