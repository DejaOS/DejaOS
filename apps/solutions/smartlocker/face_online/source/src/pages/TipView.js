import dxui from "../../dxmodules/dxUi.js";
import dxDriver from "../../dxmodules/dxDriver.js";
import std from "../../dxmodules/dxStd.js";
import UIManager from "../UIManager.js";

const TipView = {
  _inited: false,
  _root: null,
  _card: null,
  _icon: null,
  _label: null,
  _btnRow: null,
  _cancelBtn: null,
  _confirmBtn: null,
  _onConfirm: null,
  _onCancel: null,
  _hideTimer: null,
  _countdownTimer: null,
  _baseMessage: "",

  _themes: {
    success: {
      bg: 0xffffff,
      text: 0x1a1a1a,
      icon: "/app/code/resource/image/icon_success.png",
    },
    error: {
      bg: 0xffffff,
      text: 0x1a1a1a,
      icon: "/app/code/resource/image/icon_error.png",
    },
    warn: {
      bg: 0xffffff,
      text: 0x1a1a1a,
      icon: "/app/code/resource/image/icon_warn.png",
    },
  },

  init: function () {
    if (this._inited) return;

    const screenW = dxDriver.DISPLAY.WIDTH;
    const screenH = dxDriver.DISPLAY.HEIGHT;

    this._root = dxui.View.build("tip_root", dxui.Utils.LAYER.TOP);
    this._root.setSize(screenW, screenH);
    this._root.bgColor(0x000000);
    this._root.bgOpa(150);
    this._root.radius(0);
    this._root.borderWidth(0);
    this._root.padAll(0);
    this._root.scroll(false);

    this._card = dxui.View.build("tip_card", this._root);
    this._card.setSize(520, 380);
    this._card.radius(24);
    this._card.borderWidth(0);
    this._card.bgColor(0xffffff);
    this._card.align(dxui.Utils.ALIGN.CENTER, 0, 0);
    this._card.scroll(false);

    this._icon = dxui.Image.build("tip_icon", this._card);
    this._icon.setSize(64, 64);
    this._icon.align(dxui.Utils.ALIGN.TOP_MID, 0, 10);

    this._label = dxui.Label.build("tip_label", this._card);
    this._label.text(" ");
    this._label.textFont(UIManager.font(28, dxui.Utils.FONT_STYLE.BOLD));
    this._label.textColor(0x1a1a1a);
    this._label.setSize(460, 160);
    this._label.longMode(dxui.Utils.LABEL_LONG_MODE.WRAP);
    this._label.align(dxui.Utils.ALIGN.BOTTOM_MID, 0, -82);

    this._btnRow = dxui.View.build("tip_btn_row", this._card);
    this._btnRow.setSize(420, 60);
    this._btnRow.align(dxui.Utils.ALIGN.BOTTOM_MID, 0, -28);
    this._btnRow.bgOpa(0);
    this._btnRow.borderWidth(0);
    this._btnRow.padAll(0);
    this._btnRow.scroll(false);
    this._btnRow.hide();

    this._cancelBtn = dxui.Button.build("tip_cancel_btn", this._btnRow);
    this._cancelBtn.setSize(180, 60);
    this._cancelBtn.setPos(0, 0);
    this._cancelBtn.bgColor(0x444444);
    this._cancelBtn.radius(12);
    this._cancelBtn.borderWidth(0);
    const cancelLbl = dxui.Label.build("tip_cancel_lbl", this._cancelBtn);
    cancelLbl.text("取消");
    cancelLbl.textFont(UIManager.font(22, dxui.Utils.FONT_STYLE.BOLD));
    cancelLbl.textColor(0xffffff);
    cancelLbl.align(dxui.Utils.ALIGN.CENTER, 0, 0);
    this._cancelBtn.on(dxui.Utils.EVENT.CLICK, () => {
      const cb = this._onCancel;
      this.hide();
      if (typeof cb === "function") cb();
    });

    this._confirmBtn = dxui.Button.build("tip_confirm_btn", this._btnRow);
    this._confirmBtn.setSize(180, 60);
    this._confirmBtn.setPos(220, 0);
    this._confirmBtn.bgColor(0xf44336);
    this._confirmBtn.radius(12);
    this._confirmBtn.borderWidth(0);
    const confirmLbl = dxui.Label.build("tip_confirm_lbl", this._confirmBtn);
    confirmLbl.text("确认");
    confirmLbl.textFont(UIManager.font(22, dxui.Utils.FONT_STYLE.BOLD));
    confirmLbl.textColor(0xffffff);
    confirmLbl.align(dxui.Utils.ALIGN.CENTER, 0, 0);
    this._confirmBtn.on(dxui.Utils.EVENT.CLICK, () => {
      const cb = this._onConfirm;
      this.hide();
      if (typeof cb === "function") cb();
    });

    this._root.hide();

    this._inited = true;
  },

  _applyTheme: function (type) {
    const theme = this._themes[type] || this._themes.success;
    if (!theme) return;

    if (theme.icon) {
      this._icon.source(theme.icon);
    }
    return theme;
  },

  _applyLayout: function (confirmMode) {
    if (confirmMode) {
      this._card.setSize(520, 460);
      this._card.align(dxui.Utils.ALIGN.CENTER, 0, 0);
      this._label.setSize(460, 230);
      this._label.align(dxui.Utils.ALIGN.TOP_MID, 0, 90);
      this._btnRow.align(dxui.Utils.ALIGN.BOTTOM_MID, 0, -28);
      return;
    }

    this._card.setSize(520, 380);
    this._card.align(dxui.Utils.ALIGN.CENTER, 0, 0);
    this._label.setSize(460, 160);
    this._label.align(dxui.Utils.ALIGN.BOTTOM_MID, 0, -50);
  },

  _clearTimer: function () {
    if (this._hideTimer) {
      std.clearTimeout(this._hideTimer);
      this._hideTimer = null;
    }
    if (this._countdownTimer) {
      std.clearInterval(this._countdownTimer);
      this._countdownTimer = null;
    }
  },

  _show: function (type, message, options = {}) {
    if (!this._inited) {
      this.init();
    }

    this._applyTheme(type);
    this._applyLayout(false);
    this._baseMessage = message || "";
    this._label.text(this._baseMessage);
    if (this._btnRow) this._btnRow.hide();
    this._onConfirm = null;
    this._onCancel = null;

    this._root.show();
    this._card.show();

    this._clearTimer();
    const duration =
      options.duration !== undefined ? Number(options.duration) : 2500;
    if (!Number.isFinite(duration) || duration <= 0) {
      return;
    }
    const useCountdown = !!options.countdown && duration >= 1000;

    if (useCountdown) {
      let remainMs = duration;
      const updateText = () => {
        const sec = Math.ceil(remainMs / 1000);
        this._label.text(`${this._baseMessage} (${sec})`);
      };
      updateText();

      this._countdownTimer = std.setInterval(() => {
        remainMs -= 1000;
        if (remainMs <= 0) {
          this.hide();
          if (typeof options.onFinish === "function") {
            options.onFinish();
          }
        } else {
          updateText();
        }
      }, 1000);
    } else {
      this._hideTimer = std.setTimeout(() => {
        this.hide();
        if (typeof options.onFinish === "function") {
          options.onFinish();
        }
      }, duration);
    }
  },

  showSuccess: function (message, durationOrOptions, showCountdown) {
    let options = {};
    if (typeof durationOrOptions === "number") {
      options.duration = durationOrOptions * 1000;
      if (showCountdown) options.countdown = true;
    } else if (durationOrOptions && typeof durationOrOptions === "object") {
      options = durationOrOptions;
    }
    this._show("success", message || "操作成功", options);
  },

  showError: function (message, durationOrOptions, showCountdown) {
    let options = {};
    if (typeof durationOrOptions === "number") {
      options.duration = durationOrOptions * 1000;
      if (showCountdown) options.countdown = true;
    } else if (durationOrOptions && typeof durationOrOptions === "object") {
      options = durationOrOptions;
    }
    this._show("error", message || "操作失败", options);
  },

  showWarning: function (message, durationOrOptions, showCountdown) {
    let options = {};
    if (typeof durationOrOptions === "number") {
      options.duration = durationOrOptions * 1000;
      if (showCountdown) options.countdown = true;
    } else if (durationOrOptions && typeof durationOrOptions === "object") {
      options = durationOrOptions;
    }
    this._show("warn", message || "请稍候", options);
  },

  showConfirm: function (message, options = {}) {
    if (!this._inited) {
      this.init();
    }
    this._applyTheme(options.type || "warn");
    this._applyLayout(true);
    this._clearTimer();
    this._baseMessage = message || "";
    this._label.text(this._baseMessage);
    if (this._btnRow) this._btnRow.show();
    this._onConfirm = typeof options.onConfirm === "function" ? options.onConfirm : null;
    this._onCancel = typeof options.onCancel === "function" ? options.onCancel : null;
    this._root.show();
    this._card.show();
  },

  hide: function () {
    this._clearTimer();
    if (!this._inited) return;
    if (this._btnRow) this._btnRow.hide();
    this._onConfirm = null;
    this._onCancel = null;
    this._root.hide();
  },
};

export default TipView;
