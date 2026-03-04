import dxui from "../../dxmodules/dxUi.js";
import log from "../../dxmodules/dxLogger.js";
import utils from "../../dxmodules/dxCommonUtils.js";
import UIManager from "./UIManager.js";
import dxDriver from "../../dxmodules/dxDriver.js";
import std from "../../dxmodules/dxStd.js";
import LockerService from "../lock/LockerService.js";
import LockerDB from "../lock/LockerDB.js";
import TipView from "./TipView.js";
import FaceMaskView from "./FaceMaskView.js";
import PickChooseView from "./PickChooseView.js";
import bus from '../../dxmodules/dxEventBus.js';

// Smart locker home page
const HomePage = {
  id: "home",

  // Page init, run once
  init: function () {
    const parent = UIManager.getRoot();

    // Full-screen root view
    this.root = dxui.View.build(this.id, parent);
    this.root.setSize(dxDriver.DISPLAY.WIDTH, dxDriver.DISPLAY.HEIGHT);
    this.root.radius(0);
    this.root.borderWidth(0);
    this.root.padAll(0);
    this.root.bgColor(0xffffff);

    this.initView();

    return this.root;
  },

  initView: function () {
    const W = dxDriver.DISPLAY.WIDTH;
    const H = dxDriver.DISPLAY.HEIGHT;

    // Top logo
    const logoSize = Math.round(W * 0.43);
    this.logo = dxui.Image.build(this.id + "_logo", this.root);
    this.logo.source("/app/code/resource/image/logo.png");
    this.logo.setSize(logoSize, logoSize);
    this.logo.align(dxui.Utils.ALIGN.TOP_MID, 0, Math.round(H * 0.10));

    // Title
    this.titleLabel = dxui.Label.build(this.id + "_title", this.root);
    this.titleLabel.text("Face Recognition Locker");
    this.titleLabel.textFont(UIManager.font(Math.round(H * 0.041), dxui.Utils.FONT_STYLE.BOLD));
    this.titleLabel.textColor(0x333333);
    this.titleLabel.align(dxui.Utils.ALIGN.TOP_MID, 0, Math.round(H * 0.39));

    // Hint text
    this.hintLabel = dxui.Label.build(this.id + "_hint", this.root);
    this.hintLabel.text("Store or Pick");
    this.hintLabel.textFont(UIManager.font(Math.round(H * 0.027), dxui.Utils.FONT_STYLE.NORMAL));
    this.hintLabel.textColor(0x888888);
    this.hintLabel.align(dxui.Utils.ALIGN.TOP_MID, 0, Math.round(H * 0.47));

    // Main action buttons
    this._createMainButtons();

    // Admin entry (bottom right)
    const adminW = Math.round(W * 0.105);
    const adminH = Math.round(H * 0.067);
    this.adminArea = dxui.View.build(this.id + "_admin_area", this.root);
    this.adminArea.setSize(adminW, adminH);
    this.adminArea.setPos(W - adminW, H - adminH);
    this.adminArea.bgOpa(0);
    this.adminArea.radius(0);
    this.adminArea.borderWidth(0);
    this.adminArea.padAll(0);

    this.adminIcon = dxui.Image.build(this.id + "_admin_icon", this.adminArea);
    this.adminIcon.source("/app/code/resource/image/icon_admin.png");
    this.adminIcon.align(dxui.Utils.ALIGN.CENTER, 0, 0);

    this.adminArea.hide();
    this._adminHideTimer = null;

    // Bottom status: free cabinets
    this.remainLabel = dxui.Label.build(this.id + "_remain", this.root);
    this.remainLabel.text("Free: --/--");
    this.remainLabel.textFont(UIManager.font(Math.round(H * 0.021), dxui.Utils.FONT_STYLE.NORMAL));
    this.remainLabel.textColor(0x616161);
    this.remainLabel.align(dxui.Utils.ALIGN.BOTTOM_MID, 0, -Math.round(H * 0.012));

    this._bindEvents();
  },

  _createMainButtons: function () {
    const W = dxDriver.DISPLAY.WIDTH;
    const H = dxDriver.DISPLAY.HEIGHT;
    const btnW = Math.round(W * 0.357);
    const btnH = Math.round(H * 0.238);
    const gap = Math.round(W * 0.067);
    const btnY = Math.round(H * 0.547);
    const startX = Math.round((W - btnW * 2 - gap) / 2);
    const btnRadius = Math.round(W * 0.025);

    this.btnStore = dxui.View.build(this.id + "_store", this.root);
    this.btnStore.setSize(btnW, btnH);
    this.btnStore.setPos(startX, btnY);
    this.btnStore.bgOpa(0);
    this.btnStore.radius(btnRadius);
    this.btnStore.borderWidth(0);
    this.btnStore.scroll(false);

    this.btnStoreImg = dxui.Image.build(this.id + "_store_img", this.btnStore);
    this.btnStoreImg.source("/app/code/resource/image/store.png");
    this.btnStoreImg.setSize(btnW, btnH);
    this.btnStoreImg.align(dxui.Utils.ALIGN.CENTER, 0, 0);

    this.btnPickup = dxui.View.build(this.id + "_pickup", this.root);
    this.btnPickup.setSize(btnW, btnH);
    this.btnPickup.setPos(startX + btnW + gap, btnY);
    this.btnPickup.bgOpa(0);
    this.btnPickup.radius(btnRadius);
    this.btnPickup.borderWidth(0);
    this.btnPickup.scroll(false);

    this.btnPickupImg = dxui.Image.build(this.id + "_pickup_img", this.btnPickup);
    this.btnPickupImg.source("/app/code/resource/image/pick.png");
    this.btnPickupImg.setSize(btnW, btnH);
    this.btnPickupImg.align(dxui.Utils.ALIGN.CENTER, 0, 0);
  },

  // All event bindings
  _bindEvents: function () {
    // Admin entry click -> admin login page
    this.adminArea.on(dxui.Utils.EVENT.CLICK, () => {
      log.info("HomePage: Admin entry -> open adminLogin");
      UIManager.open("adminLogin");
    });

    // Long-press blank area to show admin entry for 5s
    this.root.on(dxui.Utils.EVENT.LONG_PRESSED, () => {
      this.adminArea.show();
      if (this._adminHideTimer) {
        std.clearTimeout(this._adminHideTimer);
        this._adminHideTimer = null;
      }
      this._adminHideTimer = std.setTimeout(() => {
        this.adminArea.hide();
        this._adminHideTimer = null;
      }, 5000);
    });

    // Store button -> user store confirm page
    this.btnStore.on(dxui.Utils.EVENT.CLICK, () => {
      log.info("HomePage: Store flow -> userStoreConfirm");

      try {
        const total = LockerService.getTotalCabinetCount();
        if (total <= 0) {
          TipView.showError("Cabinet groups not configured. Contact admin.", 3);
          return;
        }

        const freeNo = LockerDB.findFirstFreeCabinet(total);
        if (!freeNo) {
          TipView.showError("No free cabinet available", 3);
          return;
        }
        FaceMaskView.start((isCancel) => this.exitStoreFaceMode(isCancel));
        FaceMaskView.setHint('info', 'Starting face recognition...');
        try { UIManager.getRoot().hide(); } catch (e) { }
        try { this.root.hide(); } catch (e) { }
        bus.fire('FACE_START');
        bus.on('FACE_RECOGNIZED', (event) => {
          log.info("HomePage: Face result", event.isRec + "," + event.userId + "," + event.picPath);
          if (event.isRec) {
            FaceMaskView.setHint('success', 'Face OK, starting store...');
            std.setTimeout(() => {
              this.exitStoreFaceMode(true)
              UIManager.open("userStoreConfirm", { cabinetNo: freeNo, userId: event.userId, picPath: event.picPath });
            }, 1000);
          } else {
            FaceMaskView.setHint('warn', 'Face failed, auto register...');
            let userId = new Date().getTime().toString();
            bus.fire('REGISTER_FACE', userId);
          }
        });
        bus.on('REGISTER_FACE_SUCCESS', (event) => {
          log.info("HomePage: Face register success", event);
          FaceMaskView.setHint('success', 'Face registered, starting store...');
          std.setTimeout(() => {
            this.exitStoreFaceMode(true)
            UIManager.open("userStoreConfirm", { cabinetNo: freeNo, userId: event.userId, picPath: event.picPath });
          }, 1000);
        });
        bus.on('REGISTER_FACE_FAILED', (event) => {
          log.info("HomePage: Face register failed", event);
          FaceMaskView.setHint('error', 'Face register failed, exiting...');
          std.setTimeout(() => {
            this.exitStoreFaceMode(false)
          }, 1000);
        });

      } catch (e) {
        log.error("HomePage: Store flow check failed", e);
        TipView.showError("System error, please try again later", 3);
      }
    });

    // Pickup button
    this.btnPickup.on(dxui.Utils.EVENT.CLICK, () => {
      log.info("HomePage: Pickup flow");
      PickChooseView.show({
        onTemp: () => this.onPickChoose(true),
        onClear: () => this.onPickChoose(false),
        onCancel: () => { PickChooseView.hide(); }
      });
    });
  },
  onPickChoose: function (isTemp) {
    try {
      const total = LockerService.getTotalCabinetCount();
      if (total <= 0) {
        TipView.showError("Cabinet groups not configured. Contact admin.", 3);
        return;
      }
      FaceMaskView.start((isCancel) => this.exitPickFaceMode(isCancel));
      FaceMaskView.setHint('info', 'Starting face recognition...');
      try { UIManager.getRoot().hide(); } catch (e) { }
      try { this.root.hide(); } catch (e) { }
      bus.fire('FACE_START');
      bus.on('FACE_RECOGNIZED', (event) => {
        log.info("HomePage: Face result", event.isRec + "," + event.userId + "," + event.picPath);
        if (event.isRec) {
          FaceMaskView.setHint('success', 'Face OK, starting pickup...');
          std.setTimeout(() => {
            this.exitPickFaceMode(true)
            UIManager.open("userPickCabinet", { userId: event.userId, picPath: event.picPath, isTemp: isTemp });
          }, 1000);
        } else {
          FaceMaskView.setHint('error', 'Face failed. You may have no stored item.');
        }
      });
    } catch (e) {
      log.error("HomePage: Pickup flow check failed", e);
      TipView.showError("System error, please try again later", 3);
    }
  },
  exitStoreFaceMode: function (isCancel) {
    if (isCancel) {
      bus.off('FACE_RECOGNIZED');
      bus.off('REGISTER_FACE_SUCCESS');
      bus.off('REGISTER_FACE_FAILED');
      bus.fire('FACE_STOP');
      FaceMaskView.clearHint();
      FaceMaskView.hide();
      try { UIManager.getRoot().show(); } catch (e) { }
      try { this.root.show(); } catch (e) { }
      return;
    }
  },
  exitPickFaceMode: function (isCancel) {
    if (isCancel) {
      bus.off('FACE_RECOGNIZED');
      bus.fire('FACE_STOP');
      FaceMaskView.clearHint();
      FaceMaskView.hide();
      try { UIManager.getRoot().show(); } catch (e) { }
      try { this.root.show(); } catch (e) { }
      return;
    }
  },
  // On page show
  onShow: function (data) {
    if (data) {
      log.info("HomePage onShow, data:", utils.jsonStringify(data));
    } else {
      log.info("HomePage onShow");
    }

    // Refresh free cabinet count on first enter or explicit open
    this._refreshRemainLabel();
  },

  _refreshRemainLabel: function () {
    try {
      const total = LockerService.getTotalCabinetCount();
      const free = LockerService.getFreeCabinetCount();
      this.remainLabel.text(`Free: ${free}/${total}`);
    } catch (e) {
      log.error("HomePage: Refresh free count failed", e);
    }
  },

  // On page hide
  onHide: function () {
    log.info("HomePage onHide");
  },

  /**
   * Called when previous page closes via UIManager.close/backTo.
   * If resultData.refreshRemain is true, refresh free cabinet display.
   */
  onClose: function (sourceId, resultData) {
    if (resultData && resultData.refreshRemain) {
      this._refreshRemainLabel();
    }
  },
};

export default HomePage;



