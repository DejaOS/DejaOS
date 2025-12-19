import dxui from "../../../dxmodules/dxUi.js";
import log from "../../../dxmodules/dxLogger.js";
import dxDriver from "../../../dxmodules/dxDriver.js";
import UIManager from "../UIManager.js";
import PasswordView from "../PasswordView.js";
import TipView from "../TipView.js";
import LockerService from "../../lock/LockerService.js";

// User: set store password page
const StoreSetPasswordPage = {
  id: "userSetPassword",

  init: function () {
    const parent = UIManager.getRoot();

    this.root = dxui.View.build(this.id, parent);
    this.root.setSize(dxDriver.DISPLAY.WIDTH, dxDriver.DISPLAY.HEIGHT);
    this.root.radius(0);
    this.root.borderWidth(0);
    this.root.padAll(0);
    this.root.bgColor(0xf5f7fa);

    // Page state kept in data object
    this.data = {
      cabinetNo: 16, // default cabinet number (passed from previous page)
      pwd1: "",
      pwd2: "",
      step: 1, // 1: first input, 2: second input
    };

    this._initView();

    return this.root;
  },

  _initView: function () {
    // Top tip: "Set 6-digit password for cabinet X"
    this.tipLabel = dxui.Label.build(this.id + "_tip", this.root);
    this.tipLabel.text(this._buildTipText());
    this.tipLabel.textFont(UIManager.font(20, dxui.Utils.FONT_STYLE.NORMAL));
    // Place tip near top using absolute position
    this.tipLabel.setPos(12, 8);

    // Top-right "Cancel" button: back to home
    this.topCancelBtn = dxui.Button.build(this.id + "_top_cancel", this.root);
    this.topCancelBtn.setSize(80, 32);
    this.topCancelBtn.radius(8);
    this.topCancelBtn.borderWidth(0);
    this.topCancelBtn.bgColor(0xcccccc);
    this.topCancelBtn.scroll(false);
    this.topCancelBtn.setPos(dxDriver.DISPLAY.WIDTH - 80 - 16, 8);

    this.topCancelLabel = dxui.Label.build(
      this.id + "_top_cancel_label",
      this.topCancelBtn
    );
    this.topCancelLabel.text("Cancel");
    this.topCancelLabel.textFont(UIManager.font(16, dxui.Utils.FONT_STYLE.NORMAL));
    this.topCancelLabel.textColor(0x333333);
    this.topCancelLabel.align(dxui.Utils.ALIGN.CENTER, 0, 0);

    // Middle: single password field (shared for both inputs)
    this.pwdField = dxui.View.build(this.id + "_pwd_field", this.root);
    this.pwdField.setSize(260, 40);
    this.pwdField.radius(8);
    this.pwdField.borderWidth(2);
    this.pwdField.setPos((dxDriver.DISPLAY.WIDTH - 260) / 2, 40);
    this.pwdField.scroll(false);

    this.pwdFieldLabel = dxui.Label.build(
      this.id + "_pwd_field_label",
      this.pwdField
    );
    this.pwdFieldLabel.text("Enter password");
    this.pwdFieldLabel.textFont(
      UIManager.font(20, dxui.Utils.FONT_STYLE.NORMAL)
    );
    this.pwdFieldLabel.align(dxui.Utils.ALIGN.CENTER, 0, 0);

    // Bottom: common numeric keypad (fixed at bottom)
    this.pwdView = PasswordView.build(this.id + "_pwd", this.root, {
      onDigit: (d) => {
        this._onDigit(d);
      },
      onDelete: () => {
        this._onDelete();
      },
      onConfirm: () => {
        this._handlePasswordConfirm();
      },
    });

    // Top Cancel button: back to home
    this.topCancelBtn.on(dxui.Utils.EVENT.CLICK, () => {
      this.backTo("home");
    });
  },

  _buildTipText: function () {
    return `Set 6-digit password for cabinet ${this.data.cabinetNo}:`;
  },

  _refreshFieldText: function () {
    if (this.data.step === 1) {
      const len = this.data.pwd1.length;
      this.pwdFieldLabel.text(
        len > 0 ? "*".repeat(len) : "Enter password"
      );
    } else {
      const len = this.data.pwd2.length;
      this.pwdFieldLabel.text(
        len > 0 ? "*".repeat(len) : "Confirm password"
      );
    }
  },

  _onDigit: function (d) {
    if (this.data.step === 1) {
      if (this.data.pwd1.length >= 6) return;
      this.data.pwd1 += d;
    } else {
      if (this.data.pwd2.length >= 6) return;
      this.data.pwd2 += d;
    }
    this._refreshFieldText();
  },

  _onDelete: function () {
    if (this.data.step === 1) {
      if (this.data.pwd1.length > 0) {
        this.data.pwd1 = this.data.pwd1.slice(0, -1);
      }
    } else {
      if (this.data.pwd2.length > 0) {
        this.data.pwd2 = this.data.pwd2.slice(0, -1);
      }
    }
    this._refreshFieldText();
  },

  _handlePasswordConfirm: function () {
    if (this.data.step === 1) {
      // First input: only check length
      if (this.data.pwd1.length !== 6) {
        TipView.showError("Password must be 6 digits");
        return;
      }
      // Go to second input
      this.data.step = 2;
      this.data.pwd2 = "";
      this._refreshFieldText();
      TipView.showSuccess("First OK, please enter again", 1, false);
      return;
    }

    // Second input: length + equality check
    const pwd1 = this.data.pwd1;
    const pwd2 = this.data.pwd2;

    if (pwd2.length !== 6) {
      TipView.showError("Password must be 6 digits");
      return;
    }

    if (pwd1 !== pwd2) {
      TipView.showError("Passwords do not match");
      return;
    }

    log.info(
      `StoreSetPasswordPage: password set, cabinetNo=${this.data.cabinetNo}`
    );

    // Trigger post-store handling (open lock + update DB)
    try {
      LockerService.handleStoreSuccess(this.data.cabinetNo, pwd1);
    } catch (e) {
      log.error("StoreSetPasswordPage: LockerService.handleStoreSuccess failed", e);
      // Even if this fails we still treat password as set; DB state may be incomplete
    }

    // Show "door opened", 5s countdown then back to home
    TipView.showSuccess(
      `Cabinet ${this.data.cabinetNo} opened, please put items in and close door`,
      {
        duration: 5000,
        countdown: true,
        onFinish: () => {
          // Store success changes free-cabinet count; request home to refresh
          this.backTo("home", { refreshRemain: true });
        },
      }
    );
  },

  onShow: function (data) {
    if (data && data.cabinetNo) {
      this.data.cabinetNo = data.cabinetNo;
      this.tipLabel.text(this._buildTipText());
    }
    // Reset password input state
    this.data.pwd1 = "";
    this.data.pwd2 = "";
    this.data.step = 1;
    this._refreshFieldText();
  },

  onHide: function () { },
};

export default StoreSetPasswordPage;


