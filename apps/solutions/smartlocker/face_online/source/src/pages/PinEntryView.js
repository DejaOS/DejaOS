import dxui from "../../dxmodules/dxUi.js";
import dxDriver from "../../dxmodules/dxDriver.js";
import std from "../../dxmodules/dxStd.js";
import UIManager from "../UIManager.js";
import FitLockDB from "../db/FitLockDB.js";
import { ADMIN_LAYOUT, COLORS, UI_FONT_RATIO } from "../constants.js";

/**
 * 密码开柜：11 位手机号 + 6 位密码 + 数字键盘
 */
const PinEntryView = {
  id: "pin_entry_view",
  _visible: false,
  _timer: null,
  _onExit: null,
  _onSuccess: null,
  _onFailure: null,
  _active: "phone",

  init: function () {
    if (this.root) return this.root;

    const W = dxDriver.DISPLAY.WIDTH;
    const H = dxDriver.DISPLAY.HEIGHT;
    const keypadH = Math.round(H * 0.42);

    this.root = dxui.View.build(this.id + "_root", dxui.Utils.LAYER.TOP);
    this.root.setSize(W, H);
    this.root.setPos(0, 0);
    this.root.bgColor(0xffffff);
    this.root.radius(0);
    this.root.borderWidth(0);
    this.root.padAll(0);
    this.root.scroll(false);
    this.root.hide();

    this.btnCancel = dxui.View.build(this.id + "_cancel", this.root);
    this.btnCancel.setSize(Math.round(W * 0.22), Math.round(H * 0.055));
    this.btnCancel.align(dxui.Utils.ALIGN.TOP_RIGHT, -Math.round(W * 0.03), Math.round(H * 0.02));
    this.btnCancel.bgOpa(0);
    this.btnCancel.borderWidth(0);
    this.btnCancel.scroll(false);

    this.cancelLabel = dxui.Label.build(this.id + "_cancel_l", this.btnCancel);
    this.cancelLabel.text("取消");
    this.cancelLabel.textFont(UIManager.font(Math.round(H * 0.028), dxui.Utils.FONT_STYLE.NORMAL));
    this.cancelLabel.textColor(0x888888);
    this.cancelLabel.align(dxui.Utils.ALIGN.CENTER, 0, 0);

    this.title = dxui.Label.build(this.id + "_title", this.root);
    this.title.text("密码开柜");
    this.title.textColor(COLORS.text);
    this.title.textFont(UIManager.font(Math.round(H * UI_FONT_RATIO.adminTitleBold), dxui.Utils.FONT_STYLE.BOLD));
    this.title.align(dxui.Utils.ALIGN.TOP_MID, 0, Math.round(H * ADMIN_LAYOUT.titleYRatio));

    const fieldW = Math.round(W * 0.88);
    const boxW = Math.round(W * 0.80);
    const rowH = Math.round(H * 0.065);
    const fieldFontSize = Math.round(H * 0.032);
    const fieldPadVert = Math.max(0, Math.round((rowH - fieldFontSize * 1.2) / 2));

    this.phoneCaption = dxui.Label.build(this.id + "_phone_cap", this.root);
    this.phoneCaption.text("手机号（11位）");
    this.phoneCaption.textFont(UIManager.font(Math.round(H * 0.024), dxui.Utils.FONT_STYLE.NORMAL));
    this.phoneCaption.textColor(0x666666);
    this.phoneCaption.align(dxui.Utils.ALIGN.TOP_MID, 0, Math.round(H * 0.14));

    this.phoneBox = dxui.View.build(this.id + "_phone_box", this.root);
    this.phoneBox.setSize(boxW, rowH);
    this.phoneBox.align(dxui.Utils.ALIGN.TOP_MID, 0, Math.round(H * 0.18));
    this.phoneBox.bgColor(0xffffff);
    this.phoneBox.radius(Math.round(rowH * 0.2));
    this.phoneBox.borderWidth(2);
    this.phoneBox.setBorderColor(0x1e88e5);
    this.phoneBox.padAll(0);
    this.phoneBox.scroll(false);
    this.phoneBox.on(dxui.Utils.EVENT.CLICK, () => this._setActive("phone"));

    this.phoneTa = dxui.Textarea.build(this.id + "_phone_ta", this.phoneBox);
    this.phoneTa.setSize(boxW, rowH);
    this.phoneTa.align(dxui.Utils.ALIGN.LEFT_MID, 0, 0);
    this.phoneTa.padTop(fieldPadVert);
    this.phoneTa.padBottom(fieldPadVert);
    this.phoneTa.setOneLine(true);
    this.phoneTa.setMaxLength(11);
    this.phoneTa.setCursorClickPos(true);
    this.phoneTa.text("");
    this.phoneTa.textFont(UIManager.font(fieldFontSize, dxui.Utils.FONT_STYLE.NORMAL));
    this.phoneTa.textColor(0x333333);
    this.phoneTa.on(dxui.Utils.EVENT.CLICK, () => this._setActive("phone"));

    this.pinCaption = dxui.Label.build(this.id + "_pin_cap", this.root);
    this.pinCaption.text("密码（6位）");
    this.pinCaption.textFont(UIManager.font(Math.round(H * 0.024), dxui.Utils.FONT_STYLE.NORMAL));
    this.pinCaption.textColor(0x666666);
    this.pinCaption.align(dxui.Utils.ALIGN.TOP_MID, 0, Math.round(H * 0.26));

    this.pinBox = dxui.View.build(this.id + "_pin_box", this.root);
    this.pinBox.setSize(boxW, rowH);
    this.pinBox.align(dxui.Utils.ALIGN.TOP_MID, 0, Math.round(H * 0.30));
    this.pinBox.bgColor(0xffffff);
    this.pinBox.radius(Math.round(rowH * 0.2));
    this.pinBox.borderWidth(2);
    this.pinBox.setBorderColor(0xcccccc);
    this.pinBox.padAll(0);
    this.pinBox.scroll(false);
    this.pinBox.on(dxui.Utils.EVENT.CLICK, () => this._setActive("pin"));

    this.pinTa = dxui.Textarea.build(this.id + "_pin_ta", this.pinBox);
    this.pinTa.setSize(boxW, rowH);
    this.pinTa.align(dxui.Utils.ALIGN.LEFT_MID, 0, 0);
    this.pinTa.padTop(fieldPadVert);
    this.pinTa.padBottom(fieldPadVert);
    this.pinTa.setOneLine(true);
    this.pinTa.setMaxLength(6);
    this.pinTa.setCursorClickPos(true);
    this.pinTa.setPasswordMode(true);
    this.pinTa.text("");
    this.pinTa.textFont(UIManager.font(fieldFontSize, dxui.Utils.FONT_STYLE.NORMAL));
    this.pinTa.textColor(0x333333);
    this.pinTa.on(dxui.Utils.EVENT.CLICK, () => this._setActive("pin"));

    this.hint = dxui.Label.build(this.id + "_hint", this.root);
    this.hint.text("");
    this.hint.textFont(UIManager.font(Math.round(H * 0.022), dxui.Utils.FONT_STYLE.NORMAL));
    this.hint.textColor(0xcc3333);
    this.hint.setSize(fieldW, Math.round(H * 0.05));
    this.hint.longMode(dxui.Utils.LABEL_LONG_MODE.WRAP);
    this.hint.align(dxui.Utils.ALIGN.TOP_MID, 0, Math.round(H * 0.37));

    this.keypadArea = dxui.View.build(this.id + "_keypad", this.root);
    this.keypadArea.setSize(W, keypadH);
    this.keypadArea.setPos(0, H - keypadH);
    this.keypadArea.bgColor(0xf0f0f0);
    this.keypadArea.radius(0);
    this.keypadArea.borderWidth(0);
    this.keypadArea.scroll(false);

    this._buildKeypad(W, keypadH);

    this.btnCancel.on(dxui.Utils.EVENT.CLICK, () => {
      if (this._onExit) this._onExit(true);
    });

    return this.root;
  },

  _buildKeypad: function (areaW, areaH) {
    const cols = 4;
    const rows = 4;
    const padX = Math.round(areaW * 0.04);
    const padY = Math.round(areaH * 0.05);
    const gapX = Math.round(areaW * 0.02);
    const gapY = Math.round(areaH * 0.03);
    const btnW = Math.round((areaW - padX * 2 - gapX * (cols - 1)) / cols);
    const btnH = Math.round((areaH - padY * 2 - gapY * (rows - 1)) / rows);
    const btnRadius = Math.round(Math.min(btnW, btnH) * 0.12);
    const fontSize = Math.round(btnH * 0.36);
    const cellX = (col) => padX + col * (btnW + gapX);
    const cellY = (row) => padY + row * (btnH + gapY);
    const enterH = btnH * 4 + gapY * 3;

    const configs = [
      { label: "1", x: cellX(0), y: cellY(0), w: btnW, h: btnH },
      { label: "2", x: cellX(1), y: cellY(0), w: btnW, h: btnH },
      { label: "3", x: cellX(2), y: cellY(0), w: btnW, h: btnH },
      { label: "4", x: cellX(0), y: cellY(1), w: btnW, h: btnH },
      { label: "5", x: cellX(1), y: cellY(1), w: btnW, h: btnH },
      { label: "6", x: cellX(2), y: cellY(1), w: btnW, h: btnH },
      { label: "7", x: cellX(0), y: cellY(2), w: btnW, h: btnH },
      { label: "8", x: cellX(1), y: cellY(2), w: btnW, h: btnH },
      { label: "9", x: cellX(2), y: cellY(2), w: btnW, h: btnH },
      { label: "0", x: cellX(0), y: cellY(3), w: btnW * 2 + gapX, h: btnH },
      { label: "删除", x: cellX(2), y: cellY(3), w: btnW, h: btnH },
      { label: "确认", x: cellX(3), y: cellY(0), w: btnW, h: enterH },
    ];

    this._keyButtons = [];
    for (let i = 0; i < configs.length; i++) {
      const cfg = configs[i];
      const btn = dxui.Button.build(`${this.id}_k_${cfg.label}`, this.keypadArea);
      btn.setSize(cfg.w, cfg.h);
      btn.setPos(cfg.x, cfg.y);
      btn.radius(btnRadius);
      btn.borderWidth(0);
      btn.bgColor(cfg.label === "确认" ? 0x1e88e5 : 0xffffff);
      if (cfg.label === "删除") {
        const img = dxui.Image.build(`${this.id}_k_del_img`, btn);
        img.source("/app/code/resource/image/delete.png");
        img.align(dxui.Utils.ALIGN.CENTER, 0, 0);
      } else {
        const lbl = dxui.Label.build(`${this.id}_k_l_${cfg.label}`, btn);
        lbl.text(cfg.label);
        lbl.textColor(cfg.label === "确认" ? 0xffffff : 0x333333);
        lbl.textFont(UIManager.font(fontSize, dxui.Utils.FONT_STYLE.NORMAL));
        lbl.align(dxui.Utils.ALIGN.CENTER, 0, 0);
      }
      const label = cfg.label;
      btn.on(dxui.Utils.EVENT.CLICK, () => this._onKey(label));
      this._keyButtons.push(btn);
    }
  },

  _setActive: function (field, clearHint = true) {
    this._active = field === "pin" ? "pin" : "phone";
    if (this.phoneBox) {
      this.phoneBox.setBorderColor(this._active === "phone" ? 0x1e88e5 : 0xcccccc);
    }
    if (this.pinBox) {
      this.pinBox.setBorderColor(this._active === "pin" ? 0x1e88e5 : 0xcccccc);
    }
    if (this.phoneTa) this.phoneTa.focus(false);
    if (this.pinTa) this.pinTa.focus(false);
    if (this._active === "phone" && this.phoneTa) {
      this.phoneTa.focus(true);
    } else if (this.pinTa) {
      this.pinTa.focus(true);
    }
    if (clearHint) this._setHint("");
  },

  _activeTa: function () {
    return this._active === "pin" ? this.pinTa : this.phoneTa;
  },

  _setHint: function (text) {
    // Label 传空字符串会显示缺省文案 "Text"，用空格占位
    if (this.hint) this.hint.text(text || " ");
  },

  _onKey: function (label) {
    const ta = this._activeTa();
    if (!ta) return;
    if (label === "删除") {
      ta.lvTextareaDelChar();
      ta.focus(true);
      return;
    }
    if (label === "确认") {
      this._submit();
      return;
    }
    if (!/^\d$/.test(label)) return;
    const maxLen = this._active === "phone" ? 11 : 6;
    if (ta.text().length >= maxLen) return;
    ta.lvTextareaAddText(label);
    ta.focus(true);
    if (this._active === "phone" && ta.text().length === 11) {
      this._setActive("pin");
    }
  },

  _submit: function () {
    const phone = this.phoneTa ? this.phoneTa.text() : "";
    const pin = this.pinTa ? this.pinTa.text() : "";
    if (!/^\d{11}$/.test(phone)) {
      this._setActive("phone", false);
      this._setHint("请输入 11 位手机号");
      return;
    }
    if (!/^\d{6}$/.test(pin)) {
      this._setActive("pin", false);
      this._setHint("请输入 6 位密码");
      return;
    }
    let row = null;
    try {
      row = FitLockDB.getUserByPhonePin(phone, pin);
    } catch (e) {
      this._setHint("校验失败，请重试");
      return;
    }
    if (!row || !row.user_id) {
      this._setHint("手机号或密码错误");
      if (typeof this._onFailure === "function") this._onFailure();
      return;
    }
    if (Number(row.role) === 1) {
      this._setHint("请使用管理员入口");
      return;
    }
    this._setHint("");
    const uid = String(row.user_id).trim();
    if (this._onSuccess) this._onSuccess(uid);
  },

  _reset: function () {
    this._active = "phone";
    if (this.phoneTa) {
      this.phoneTa.text("");
    }
    if (this.pinTa) {
      this.pinTa.text("");
    }
    this._setActive("phone");
    this._setHint("");
  },

  start: function (onExit, onSuccess, onFailure, timeoutMs = 120000) {
    if (!this.root) this.init();
    this._onExit = onExit;
    this._onSuccess = onSuccess;
    this._onFailure = onFailure;
    this._reset();
    this.show(timeoutMs);
  },

  show: function (timeoutMs = 120000) {
    if (!this.root) this.init();
    if (this._visible) return;
    this._visible = true;
    this.root.show();
    if (this._timer) {
      std.clearTimeout(this._timer);
      this._timer = null;
    }
    if (timeoutMs > 0) {
      this._timer = std.setTimeout(() => {
        if (this._onExit) this._onExit(true);
      }, timeoutMs);
    }
  },

  hide: function () {
    if (!this._visible) return;
    this._visible = false;
    if (this._timer) {
      std.clearTimeout(this._timer);
      this._timer = null;
    }
    if (this.root) this.root.hide();
  },
};

export default PinEntryView;
