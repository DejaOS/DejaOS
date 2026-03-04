import dxui from "../../../dxmodules/dxUi.js";
import log from "../../../dxmodules/dxLogger.js";
import std from "../../../dxmodules/dxStd.js";
import dxDriver from "../../../dxmodules/dxDriver.js";
import UIManager from "../UIManager.js";
import LockerService from "../../lock/LockerService.js";
import LockerDB from "../../lock/LockerDB.js";
import TipView from "../TipView.js";

// User store confirmation page
const StoreConfirmPage = {
  id: "userStoreConfirm",

  init: function () {
    const parent = UIManager.getRoot();

    this.root = dxui.View.build(this.id, parent);
    this.root.setSize(dxDriver.DISPLAY.WIDTH, dxDriver.DISPLAY.HEIGHT);
    this.root.radius(0);
    this.root.borderWidth(0);
    this.root.padAll(0);
    // Use light gray background #EBEBEB
    this.root.bgColor(0xebebeb);

    this._cabinetNo = 0;
    this._userId = "";
    this._picPath = "";
    this._countdown = 3;
    this._timer = null;

    this._initView();
    this._bindEvents();

    return this.root;
  },

  _initView: function () {
    const W = dxDriver.DISPLAY.WIDTH;
    const H = dxDriver.DISPLAY.HEIGHT;

    const tipFontSize = Math.round(H * 0.032);
    const cabFontSize = Math.round(H * 0.11);
    const btnW = Math.round(W * 0.3);
    const btnH = Math.round(H * 0.08);
    const btnRadius = Math.round(btnH / 2);
    const btnFontSize = Math.round(H * 0.03);

    // 1. Top hint
    this.tipLabel = dxui.Label.build(this.id + "_tip", this.root);
    this.tipLabel.text("Your selected cabinet number is:");
    this.tipLabel.textFont(UIManager.font(tipFontSize, dxui.Utils.FONT_STYLE.NORMAL));
    this.tipLabel.textColor(0x808080);
    this.tipLabel.setSize(Math.round(W * 0.7), Math.round(H * 0.05));
    this.tipLabel.align(dxui.Utils.ALIGN.TOP_MID, 0, Math.round(H * 0.12));

    // 2. Large cabinet number in center
    this.cabLabel = dxui.Label.build(this.id + "_cab", this.root);
    this.cabLabel.text(String(this._cabinetNo));
    this.cabLabel.textFont(UIManager.font(cabFontSize, dxui.Utils.FONT_STYLE.NORMAL));
    this.cabLabel.textColor(0x000000);
    this.cabLabel.setSize(Math.round(W * 0.4), Math.round(H * 0.13));
    this.cabLabel.align(dxui.Utils.ALIGN.CENTER, 0, -Math.round(H * 0.05));

    // 3. Countdown hint
    this.countdownLabel = dxui.Label.build(this.id + "_countdown", this.root);
    this.countdownLabel.textFont(UIManager.font(tipFontSize, dxui.Utils.FONT_STYLE.NORMAL));
    this.countdownLabel.textColor(0x808080);
    this.countdownLabel.setSize(Math.round(W * 0.7), Math.round(H * 0.05));
    this.countdownLabel.align(dxui.Utils.ALIGN.CENTER, 0, Math.round(H * 0.08));

    // 4. Cancel button: centered
    this.btnCancel = dxui.Button.build(this.id + "_cancel", this.root);
    this.btnCancel.setSize(btnW, btnH);
    this.btnCancel.radius(btnRadius);
    this.btnCancel.bgOpa(0);
    this.btnCancel.borderWidth(1);
    this.btnCancel.setBorderColor(0xffa31f);
    this.btnCancel.align(dxui.Utils.ALIGN.BOTTOM_MID, 0, -Math.round(H * 0.06));

    this.btnCancelLabel = dxui.Label.build(
      this.id + "_cancel_label",
      this.btnCancel
    );
    this.btnCancelLabel.text("Cancel");
    this.btnCancelLabel.textFont(UIManager.font(btnFontSize, dxui.Utils.FONT_STYLE.NORMAL));
    this.btnCancelLabel.textColor(0xffa31f);
    this.btnCancelLabel.align(dxui.Utils.ALIGN.CENTER, 0, 0);

    this._updateCountdownText();
  },

  _bindEvents: function () {
    // Cancel button: back to home
    this.btnCancel.on(dxui.Utils.EVENT.CLICK, () => {
      this._clearCountdown();
      this.close();
    });
  },

  _updateCountdownText: function () {
    this.countdownLabel.text(`Cabinet will open in ${this._countdown}s`);
  },

  _startCountdown: function () {
    this._clearCountdown();
    this._updateCountdownText();

    this._timer = std.setInterval(() => {
      this._countdown -= 1;
      if (this._countdown <= 0) {
        this._doStore();
      } else {
        this._updateCountdownText();
      }
    }, 1000);
  },

  _clearCountdown: function () {
    if (this._timer) {
      std.clearInterval(this._timer);
      this._timer = null;
    }
  },

  _doStore: function () {
    this._clearCountdown();
    log.info(
      `StoreConfirmPage: auto store cabinet ${this._cabinetNo}, userId=${this._userId}`
    );

    try {
      LockerService.handleStoreSuccess(this._cabinetNo, this._userId, this._picPath);
    } catch (e) {
      log.error("StoreConfirmPage: handleStoreSuccess failed", e);
    }

    TipView.showSuccess(
      `Cabinet ${this._cabinetNo} is open. Please place your items and close the door firmly.`,
      {
        duration: 5000,
        countdown: true,
        onFinish: () => {
          this.backTo("home", { refreshRemain: true });
        },
      }
    );
  },

  /**
   * Select a cabinet number for this store:
   * - If cabinetNo is passed from previous page, use it first
   * - Otherwise: get total cabinet count from config and find first free in 1..total
   * - If no cabinets configured or no free cabinet, show Tip and return to home
   *
   * @param {object} data Data passed from previous page
   * @returns {boolean} Whether a cabinet was successfully selected
   */
  _selectCabinetNo: function (data) {
    if (data) {
      this._userId = data.userId || "";
      this._picPath = data.picPath || "";
    }

    // Prefer cabinet number passed in (validated and assigned by HomePage)
    if (data && typeof data.cabinetNo === "number") {
      this._cabinetNo = data.cabinetNo;
      this.cabLabel.text(String(this._cabinetNo));
      return true;
    }
  },

  onShow: function (data) {
    const userId = (data && data.userId) ? String(data.userId) : "";
    if (userId) {
      const currentCount = (LockerDB.getCabinetsByUserId(userId) || []).length;
      const maxCount = LockerService.getUserMaxCabinetCount();
      if (currentCount >= maxCount) {
        TipView.showError(`You have reached the max cabinets in use (max ${maxCount})`);
        this.backTo("home");
        return;
      }
    }

    // Select cabinet from passed data or DB first; if failed, return to home
    const ok = this._selectCabinetNo(data);
    if (!ok) {
      return;
    }

    this._countdown = 3;
    this._startCountdown();
  },

  onHide: function () {
    this._clearCountdown();
  },
};

export default StoreConfirmPage;


