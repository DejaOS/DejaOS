import dxui from "../../../dxmodules/dxUi.js";
import log from "../../../dxmodules/dxLogger.js";
import dxDriver from "../../../dxmodules/dxDriver.js";
import std from "../../../dxmodules/dxStd.js";
import UIManager from "../UIManager.js";
import PasswordView from "../PasswordView.js";
import TipView from "../TipView.js";
import LockerService from "../../lock/LockerService.js";

// User pickup: enter cabinet number
const PickCabinetPage = {
  id: "userPickCabinet",

  init: function () {
    const parent = UIManager.getRoot();

    this.root = dxui.View.build(this.id, parent);
    this.root.setSize(dxDriver.DISPLAY.WIDTH, dxDriver.DISPLAY.HEIGHT);
    this.root.radius(0);
    this.root.borderWidth(0);
    this.root.padAll(0);
    this.root.bgColor(0xf5f7fa);

    this.data = {
      cabinetNo: "", // user-entered cabinet number
      countdown: 60,
      countdownTimer: null,
    };

    this._initView();

    return this.root;
  },

  _initView: function () {
    // Top tip
    this.tipLabel = dxui.Label.build(this.id + "_tip", this.root);
    this.tipLabel.text("Enter cabinet number:");
    this.tipLabel.textFont(UIManager.font(20, dxui.Utils.FONT_STYLE.NORMAL));
    this.tipLabel.setPos(12, 8);

    // Right: Cancel button with countdown (Confirm is keypad OK)
    this.btnCancel = dxui.Button.build(this.id + "_cancel", this.root);
    this.btnCancel.setSize(110, 40);
    this.btnCancel.radius(8);
    this.btnCancel.borderWidth(0);
    this.btnCancel.bgColor(0xcccccc);
    this.btnCancel.scroll(false);
    this.btnCancel.setPos(dxDriver.DISPLAY.WIDTH - 110 - 20, 8);

    this.btnCancelLabel = dxui.Label.build(
      this.id + "_cancel_label",
      this.btnCancel
    );
    this.btnCancelLabel.textFont(UIManager.font(16, dxui.Utils.FONT_STYLE.NORMAL));
    this.btnCancelLabel.textColor(0x333333);
    this._updateCancelText();
    this.btnCancelLabel.align(dxui.Utils.ALIGN.CENTER, 0, 0);

    // Center: display entered cabinet number (only number)
    this.cabLabel = dxui.Label.build(this.id + "_cab", this.root);
    this.cabLabel.text(" ");
    // Bigger font for emphasis
    this.cabLabel.textFont(UIManager.font(64, dxui.Utils.FONT_STYLE.BOLD));
    this.cabLabel.bgColor(0xe0f3ff);
    // Fixed rectangle, slightly higher and right
    const cabWidth = 220;
    const cabHeight = 64;
    this.cabLabel.setSize(cabWidth, cabHeight);
    const cabX = (dxDriver.DISPLAY.WIDTH - cabWidth) / 2 + 80;
    const cabY = 2;
    this.cabLabel.setPos(cabX, cabY);

    // Bottom numeric keypad
    this.keypad = PasswordView.build(this.id + "_keypad", this.root, {
      onDigit: (d) => {
        this._onDigit(d);
      },
      onDelete: () => {
        this._onDelete();
      },
      onConfirm: () => {
        this._handleConfirm();
      },
    });

    // Bind button events
    this._bindEvents();
  },

  _bindEvents: function () {
    // Cancel: immediately back to home
    this.btnCancel.on(dxui.Utils.EVENT.CLICK, () => {
      this._clearCountdown();
      this.backTo("home");
    });
  },

  _updateCancelText: function () {
    this.btnCancelLabel.text(`Cancel(${this.data.countdown})`);
  },

  _startCountdown: function () {
    this._clearCountdown();
    this.data.countdown = 60;
    this._updateCancelText();

    this.data.countdownTimer = std.setInterval(() => {
      this.data.countdown -= 1;
      if (this.data.countdown <= 0) {
        this._clearCountdown();
        this.backTo("home");
      } else {
        this._updateCancelText();
      }
    }, 1000);
  },

  _clearCountdown: function () {
    if (this.data.countdownTimer) {
      std.clearInterval(this.data.countdownTimer);
      this.data.countdownTimer = null;
    }
  },

  _updateCabinetText: function () {
    if (this.data.cabinetNo) {
      this.cabLabel.text(this.data.cabinetNo);
    } else {
      this.cabLabel.text(" ");
    }
  },

  _onDigit: function (d) {
    // Limit cabinet number to at most 3 digits
    if (this.data.cabinetNo.length >= 3) return;
    this.data.cabinetNo += d;
    this._updateCabinetText();
  },

  _onDelete: function () {
    if (this.data.cabinetNo.length > 0) {
      this.data.cabinetNo = this.data.cabinetNo.slice(0, -1);
      this._updateCabinetText();
    }
  },

  _handleConfirm: function () {
    if (!this.data.cabinetNo) {
      TipView.showError("Enter cabinet number");
      return;
    }

    const no = parseInt(this.data.cabinetNo, 10);
    if (isNaN(no)) {
      TipView.showError(`Invalid cabinet: ${this.data.cabinetNo}`);
      return;
    }

    // Use LockerService rules to check if cabinet is valid for pickup
    try {
      const result = LockerService.checkCabinetForPickup(no);
      if (!result.ok) {
        switch (result.reason) {
          case "NO_CONFIG":
            TipView.showError("No groups configured, contact admin", {
              duration: 3000,
              countdown: false,
              onFinish: () => {
                this.backTo("home");
              },
            });
            return;
          case "OUT_OF_RANGE":
            TipView.showError(`Cabinet not found: ${no}`);
            return;
          case "NO_ITEM":
            TipView.showError(`No item in cabinet: ${no}`);
            return;
          case "INVALID_NO":
          default:
            TipView.showError("Invalid cabinet, try again");
            return;
        }
      }
    } catch (e) {
      log.error("PickCabinetPage: cabinet check failed", e);
      TipView.showError("System error, try again", {
        duration: 3000,
        countdown: false,
        onFinish: () => {
          this.backTo("home");
        },
      });
      return;
    }

    log.info(`PickCabinetPage: check OK, go to pickup password page, cabinetNo=${no}`);
    // Open pickup password page
    this.open("userPickPassword", { cabinetNo: no });
  },

  onShow: function () {
    // Reset state
    this.data.cabinetNo = "";
    this._updateCabinetText();
    this._startCountdown();
  },

  onHide: function () {
    this._clearCountdown();
  },
};

export default PickCabinetPage;


