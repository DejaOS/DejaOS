import dxui from "../../../dxmodules/dxUi.js";
import log from "../../../dxmodules/dxLogger.js";
import std from "../../../dxmodules/dxStd.js";
import dxDriver from "../../../dxmodules/dxDriver.js";
import UIManager from "../UIManager.js";
import LockerService from "../../lock/LockerService.js";
import LockerDB from "../../lock/LockerDB.js";
import TipView from "../TipView.js";

// User: confirm cabinet before setting password
const StoreConfirmPage = {
  id: "userStoreConfirm",

  init: function () {
    const parent = UIManager.getRoot();

    this.root = dxui.View.build(this.id, parent);
    this.root.setSize(dxDriver.DISPLAY.WIDTH, dxDriver.DISPLAY.HEIGHT);
    this.root.radius(0);
    this.root.borderWidth(0);
    this.root.padAll(0);
    this.root.bgColor(0xf5f7fa);

    this._cabinetNo = 0; // selected cabinet number (decided at runtime)
    this._countdown = 3;
    this._timer = null;

    this._initView();
    this._bindEvents();

    return this.root;
  },

  _initView: function () {
    // Top tip
    this.tipLabel = dxui.Label.build(this.id + "_tip", this.root);
    this.tipLabel.text("Selected cabinet:");
    this.tipLabel.textFont(UIManager.font(20, dxui.Utils.FONT_STYLE.NORMAL));
    this.tipLabel.align(dxui.Utils.ALIGN.TOP_MID, 0, 60);

    // Big cabinet number in center
    this.cabLabel = dxui.Label.build(this.id + "_cab", this.root);
    this.cabLabel.text(String(this._cabinetNo));
    this.cabLabel.textFont(UIManager.font(80, dxui.Utils.FONT_STYLE.BOLD));
    this.cabLabel.align(dxui.Utils.ALIGN.CENTER, 0, -10);

    // Bottom button - Confirm
    this.btnConfirm = dxui.Button.build(this.id + "_confirm", this.root);
    this.btnConfirm.setSize(200, 56);
    this.btnConfirm.radius(28);
    this.btnConfirm.bgColor(0x1abc9c);
    this.btnConfirm.align(dxui.Utils.ALIGN.BOTTOM_LEFT, 40, -40);

    this.btnConfirmLabel = dxui.Label.build(
      this.id + "_confirm_label",
      this.btnConfirm
    );
    this.btnConfirmLabel.textFont(UIManager.font(22, dxui.Utils.FONT_STYLE.BOLD));
    this.btnConfirmLabel.textColor(0xffffff);
    this.btnConfirmLabel.align(dxui.Utils.ALIGN.CENTER, 0, 0);

    // Bottom button - Cancel
    this.btnCancel = dxui.Button.build(this.id + "_cancel", this.root);
    this.btnCancel.setSize(200, 56);
    this.btnCancel.radius(28);
    this.btnCancel.bgColor(0xcccccc);
    this.btnCancel.align(dxui.Utils.ALIGN.BOTTOM_RIGHT, -40, -40);

    this.btnCancelLabel = dxui.Label.build(
      this.id + "_cancel_label",
      this.btnCancel
    );
    this.btnCancelLabel.text("Cancel");
    this.btnCancelLabel.textFont(UIManager.font(22, dxui.Utils.FONT_STYLE.NORMAL));
    this.btnCancelLabel.textColor(0x333333);
    this.btnCancelLabel.align(dxui.Utils.ALIGN.CENTER, 0, 0);

    this._updateConfirmText();
  },

  _bindEvents: function () {
    // Confirm button
    this.btnConfirm.on(dxui.Utils.EVENT.CLICK, () => {
      this._handleConfirm(false);
    });

    // Cancel button: back to home
    this.btnCancel.on(dxui.Utils.EVENT.CLICK, () => {
      this._clearCountdown();
      this.close();
    });
  },

  _updateConfirmText: function () {
    this.btnConfirmLabel.text(`OK(${this._countdown})`);
  },

  _startCountdown: function () {
    this._clearCountdown();
    this._updateConfirmText();

    this._timer = std.setInterval(() => {
      this._countdown -= 1;
      if (this._countdown <= 0) {
        this._handleConfirm(true);
      } else {
        this._updateConfirmText();
      }
    }, 1000);
  },

  _clearCountdown: function () {
    if (this._timer) {
      std.clearInterval(this._timer);
      this._timer = null;
    }
  },

  _handleConfirm: function (isAuto) {
    this._clearCountdown();
    log.info(
      `StoreConfirmPage: confirm cabinet ${this._cabinetNo}, isAuto=${isAuto}`
    );
    // Go to set-password page
    this.open("userSetPassword", { cabinetNo: this._cabinetNo });
  },

  /**
   * Select cabinet number for this store:
   * - If previous page passed cabinetNo, use it.
   * - Otherwise: compute total from config and find first free cabinet in 1..total.
   * - If no config or no free cabinet, show tip and go back home.
   *
   * @param {object} data Data from previous page
   * @returns {boolean} Whether a cabinet was selected
   */
  _selectCabinetNo: function (data) {
    // 1. If previous page specified cabinetNo, use it
    if (data && typeof data.cabinetNo === "number") {
      this._cabinetNo = data.cabinetNo;
      this.cabLabel.text(String(this._cabinetNo));
      return true;
    }

    try {
      const total = LockerService.getTotalCabinetCount();
      if (total <= 0) {
        TipView.showError("No groups configured, contact admin", {
          duration: 3000,
          countdown: false,
          onFinish: () => {
            this.backTo("home");
          },
        });
        return false;
      }

      const freeNo = LockerDB.findFirstFreeCabinet(total);
      if (!freeNo) {
        TipView.showError("No free cabinet available", {
          duration: 3000,
          countdown: false,
          onFinish: () => {
            this.backTo("home");
          },
        });
        return false;
      }

      this._cabinetNo = freeNo;
      this.cabLabel.text(String(this._cabinetNo));
      return true;
    } catch (e) {
      log.error("StoreConfirmPage: failed to choose free cabinet", e);
      TipView.showError("System error, try again", {
        duration: 3000,
        countdown: false,
        onFinish: () => {
          this.backTo("home");
        },
      });
      return false;
    }
  },

  onShow: function (data) {
    // First select cabinet using data or DB; if fails, back to home
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


