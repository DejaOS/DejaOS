import dxui from "../../dxmodules/dxUi.js";
import log from "../../dxmodules/dxLogger.js";
import utils from "../../dxmodules/dxCommonUtils.js";
import UIManager from "./UIManager.js";
import dxDriver from "../../dxmodules/dxDriver.js";
import std from "../../dxmodules/dxStd.js";
import LockerService from "../lock/LockerService.js";

// Smart Locker home page
const HomePage = {
  id: "home",

  // Page initialization, runs only once
  init: function () {
    const parent = UIManager.getRoot();

    // Full‑screen root view
    this.root = dxui.View.build(this.id, parent);
    this.root.setSize(dxDriver.DISPLAY.WIDTH, dxDriver.DISPLAY.HEIGHT);
    this.root.radius(0);
    this.root.borderWidth(0);
    this.root.padAll(0);
    // Light background
    this.root.bgColor(0xf5f7fa);

    this.initView();

    return this.root;
  },

  initView: function () {
    // Top title
    this.title = dxui.Label.build(this.id + "_title", this.root);
    this.title.text("Smart Locker");
    this.title.textFont(UIManager.font(26, dxui.Utils.FONT_STYLE.BOLD));
    this.title.align(dxui.Utils.ALIGN.TOP_MID, 0, 16);

    // Top‑right admin entry area (use View to enlarge touch area)
    this.adminArea = dxui.View.build(this.id + "_admin_area", this.root);
    this.adminArea.setSize(48, 48);
    this.adminArea.bgOpa(0);
    this.adminArea.radius(0);
    this.adminArea.borderWidth(0);
    this.adminArea.padAll(0);
    this.adminArea.align(dxui.Utils.ALIGN.TOP_RIGHT, -16, 16);

    // Admin icon inside adminArea
    this.adminIcon = dxui.Image.build(this.id + "_admin_icon", this.adminArea);
    this.adminIcon.source("/app/code/resource/image/icon_admin.png");
    this.adminIcon.align(dxui.Utils.ALIGN.CENTER, 0, 0);

    // Admin entry is hidden by default
    this.adminArea.hide();
    this._adminHideTimer = null;

    // Center hint: free cabinets x / y
    this.remainLabel = dxui.Label.build(this.id + "_remain", this.root);
    this.remainLabel.text("Free: --/--");
    this.remainLabel.textFont(UIManager.font(22, dxui.Utils.FONT_STYLE.NORMAL));
    this.remainLabel.align(dxui.Utils.ALIGN.TOP_MID, 0, 70);

    // Main action buttons
    this._createMainButtons();

    // 统一绑定所有事件
    this._bindEvents();
  },

  _createMainButtons: function () {
    // Store
    this.btnStore = dxui.Button.build(this.id + "_store", this.root);
    this.btnStore.setSize(120, 120); // Large round button, same width/height
    this.btnStore.align(dxui.Utils.ALIGN.CENTER, -120, 10);
    this.btnStore.radius(60);
    this.btnStore.bgColor(0x5bcaff); // light blue

    this.btnStoreLabel = dxui.Label.build(this.id + "_store_label", this.btnStore);
    this.btnStoreLabel.text("Store");
    this.btnStoreLabel.textFont(UIManager.font(28, dxui.Utils.FONT_STYLE.BOLD));
    this.btnStoreLabel.textColor(0xffffff);
    this.btnStoreLabel.align(dxui.Utils.ALIGN.CENTER, 0, 0);

    // Pickup
    this.btnPickup = dxui.Button.build(this.id + "_pickup", this.root);
    this.btnPickup.setSize(120, 120); // Large round button
    this.btnPickup.align(dxui.Utils.ALIGN.CENTER, 120, 10);
    this.btnPickup.radius(60);
    this.btnPickup.bgColor(0x1abc9c); // green

    this.btnPickupLabel = dxui.Label.build(this.id + "_pickup_label", this.btnPickup);
    this.btnPickupLabel.text("Pick");
    this.btnPickupLabel.textFont(UIManager.font(28, dxui.Utils.FONT_STYLE.BOLD));
    this.btnPickupLabel.textColor(0xffffff);
    this.btnPickupLabel.align(dxui.Utils.ALIGN.CENTER, 0, 0);
  },

  // Centralize all event bindings to keep logic separated from view
  _bindEvents: function () {
    // Admin entry click → go to admin login page
    this.adminArea.on(dxui.Utils.EVENT.CLICK, () => {
      log.info("HomePage: go admin entry -> open adminLogin page");
      this.open("adminLogin");
    });

    // Long press blank area to show admin entry for 5 seconds
    this.root.on(dxui.Utils.EVENT.LONG_PRESSED, () => {
      // Show first
      this.adminArea.show();
      // Clear previous hide timer
      if (this._adminHideTimer) {
        std.clearTimeout(this._adminHideTimer);
        this._adminHideTimer = null;
      }
      // Auto hide after 5 seconds
      this._adminHideTimer = std.setTimeout(() => {
        this.adminArea.hide();
        this._adminHideTimer = null;
      }, 5000);
    });

    // Store button click → go to user store confirm page
    this.btnStore.on(dxui.Utils.EVENT.CLICK, () => {
      log.info("HomePage: enter store flow -> open userStoreConfirm page");
      // Cabinet number is not hard‑coded here; StoreConfirmPage will choose from DB
      this.open("userStoreConfirm");
    });

    // Pickup button click
    this.btnPickup.on(dxui.Utils.EVENT.CLICK, () => {
      log.info("HomePage: enter pickup flow");
      UIManager.open("userPickCabinet");
    });
  },

  // Triggered when page is shown
  onShow: function (data) {
    if (data) {
      log.info("HomePage onShow, data:", utils.jsonStringify(data));
    } else {
      log.info("HomePage onShow");
    }

    // When first entering or explicitly opening home, refresh free cabinet count
    this._refreshRemainLabel();
  },

  _refreshRemainLabel: function () {
    try {
      const total = LockerService.getTotalCabinetCount();
      const free = LockerService.getFreeCabinetCount();
      this.remainLabel.text(`Free: ${free}/${total}`);
    } catch (e) {
      log.error("HomePage: failed to refresh free cabinet count", e);
      // Keep previous text on error so UI is not broken
    }
  },

  // Triggered when page is hidden
  onHide: function () {
    log.info("HomePage onHide");
  },

  /**
   * Callback when previous page closes via UIManager.close/backTo.
   * If resultData.refreshRemain is true, config changed and we should refresh free‑cabinet display.
   */
  onClose: function (sourceId, resultData) {
    if (resultData && resultData.refreshRemain) {
      this._refreshRemainLabel();
    }
  },
};

export default HomePage;



