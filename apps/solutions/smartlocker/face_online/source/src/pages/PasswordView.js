import dxui from "../../dxmodules/dxUi.js";
import dxDriver from "../../dxmodules/dxDriver.js";
import UIManager from "../UIManager.js";

const PasswordView = {
  build: function (id, parent, options = {}) {
    const view = Object.create(_PasswordViewProto);
    view.id = id;
    view.options = options;
    view._init(parent);
    return view;
  },
};

const _PasswordViewProto = {
  _init: function (parent) {
    const W = dxDriver.DISPLAY.WIDTH || 480;
    const H = dxDriver.DISPLAY.HEIGHT || 800;
    const keypadH = Math.round(H / 3);
    const blankH = H - keypadH;
    this._hasInput = !!this.options.placeholder;

    this.root = dxui.View.build(this.id, parent);
    this.root.setSize(W, H);
    this.root.setPos(0, 0);
    this.root.radius(0);
    this.root.borderWidth(0);
    this.root.padAll(0);
    this.root.bgOpa(20);
    this.root.scroll(false);

    this._blankArea = dxui.View.build(this.id + "_blank", this.root);
    this._blankArea.setSize(W, blankH);
    this._blankArea.setPos(0, 0);
    this._blankArea.radius(0);
    this._blankArea.borderWidth(0);
    this._blankArea.padAll(0);
    this._blankArea.bgOpa(20);
    this._blankArea.on(dxui.Utils.EVENT.CLICK, () => this.root.hide());
    this._blankArea.scroll(false);

    this._keypadArea = dxui.View.build(this.id + "_keypad", this.root);
    this._keypadArea.setSize(W, keypadH);
    this._keypadArea.setPos(0, blankH);
    this._keypadArea.radius(0);
    this._keypadArea.borderWidth(0);
    this._keypadArea.padAll(0);
    this._keypadArea.bgOpa(20);
    this._keypadArea.scroll(false);

    let buttonsArea = this._keypadArea;
    let buttonsH = keypadH;
    if (this._hasInput) {
      const textareaRowH = Math.round(keypadH * 0.2);
      buttonsH = keypadH - textareaRowH;
      this._textareaRow = dxui.View.build(this.id + "_textarea_row", this._keypadArea);
      this._textareaRow.setSize(W, textareaRowH);
      this._textareaRow.setPos(0, 0);
      this._textareaRow.radius(0);
      this._textareaRow.borderWidth(0);
      this._textareaRow.padAll(0);
      this._textareaRow.bgColor(0xffffff);
      this._textareaRow.scroll(false);
      const pad = Math.round(W * 0.04);
      const fontSize = Math.round(textareaRowH * 0.36);
      const labelW = Math.round(W * 0.42);
      const taW = W - labelW - pad * 2;
      const rowContentH = textareaRowH - 8;
      const padVert = Math.max(0, Math.round((rowContentH - fontSize * 1.2) / 2));
      this._inputLabel = dxui.Label.build(this.id + "_input_label", this._textareaRow);
      this._inputLabel.setSize(labelW, rowContentH);
      this._inputLabel.align(dxui.Utils.ALIGN.LEFT_MID, pad, 0);
      this._inputLabel.padTop(padVert);
      this._inputLabel.padBottom(padVert);
      this._inputLabel.text(this.options.placeholder || "");
      this._inputLabel.textFont(UIManager.font(fontSize, dxui.Utils.FONT_STYLE.NORMAL));
      this._inputLabel.textColor(0x000000);
      this._inputLabel.on(dxui.Utils.EVENT.CLICK, () => this._inputTa.focus(true));

      this._inputTa = dxui.Textarea.build(this.id + "_input_ta", this._textareaRow);
      this._inputTa.setSize(taW, rowContentH);
      this._inputTa.align(dxui.Utils.ALIGN.LEFT_MID, pad + labelW, 0);
      this._inputTa.padTop(padVert);
      this._inputTa.padBottom(padVert);
      this._inputTa.setOneLine(true);
      this._inputTa.setMaxLength(this.options.maxLength || 20);
      this._inputTa.setCursorClickPos(true);
      if (this.options.maskInput !== false) this._inputTa.setPasswordMode(true);
      this._inputTa.text("");
      this._inputTa.textFont(UIManager.font(fontSize, dxui.Utils.FONT_STYLE.NORMAL));
      this._inputTa.textColor(0x333333);
      this._inputTa.on(dxui.Utils.EVENT.CLICK, () => this._inputTa.focus(true));

      const defaultText = this.options.defaultText;
      if (defaultText != null && String(defaultText).length > 0) {
        this._inputTa.text(String(defaultText));
        this._inputTa.focus(true);
      }

      this._keypadButtonsArea = dxui.View.build(this.id + "_keypad_btns", this._keypadArea);
      this._keypadButtonsArea.setSize(W, buttonsH);
      this._keypadButtonsArea.setPos(0, textareaRowH);
      this._keypadButtonsArea.radius(0);
      this._keypadButtonsArea.borderWidth(0);
      this._keypadButtonsArea.padAll(0);
      this._keypadButtonsArea.bgOpa(0);
      this._keypadButtonsArea.scroll(false);
      buttonsArea = this._keypadButtonsArea;
    }

    this._createKeyButtons(W, buttonsH, buttonsArea);
    this._bindEvents();
  },

  clearInput: function () {
    if (!this._inputTa) return;
    this._inputTa.text("");
    this._inputTa.focus(true);
  },

  setPlaceholder: function (text) {
    if (!this._inputLabel) return;
    this._inputLabel.text(String(text || ""));
  },

  _createKeyButtons: function (areaW, areaH, buttonsParent) {
    const parent = buttonsParent || this._keypadArea;
    const cols = 4;
    const rows = 4;
    const padX = Math.round(areaW * 0.04);
    const padY = Math.round(areaH * 0.04);
    const gapX = Math.round(areaW * 0.02);
    const gapY = Math.round(areaH * 0.03);
    const btnW = Math.round((areaW - padX * 2 - gapX * (cols - 1)) / cols);
    const btnH = Math.round((areaH - padY * 2 - gapY * (rows - 1)) / rows);
    const btnRadius = Math.round(Math.min(btnW, btnH) * 0.08);
    const fontSize = Math.round(btnH * 0.38);
    const cellX = (col) => padX + col * (btnW + gapX);
    const cellY = (row) => padY + row * (btnH + gapY);
    const enterH = btnH * 4 + gapY * 3;
    const btnConfigs = [
      { label: "1", x: cellX(0), y: cellY(0), w: btnW, h: btnH, color: 0xffffff },
      { label: "2", x: cellX(1), y: cellY(0), w: btnW, h: btnH, color: 0xffffff },
      { label: "3", x: cellX(2), y: cellY(0), w: btnW, h: btnH, color: 0xffffff },
      { label: "4", x: cellX(0), y: cellY(1), w: btnW, h: btnH, color: 0xffffff },
      { label: "5", x: cellX(1), y: cellY(1), w: btnW, h: btnH, color: 0xffffff },
      { label: "6", x: cellX(2), y: cellY(1), w: btnW, h: btnH, color: 0xffffff },
      { label: "7", x: cellX(0), y: cellY(2), w: btnW, h: btnH, color: 0xffffff },
      { label: "8", x: cellX(1), y: cellY(2), w: btnW, h: btnH, color: 0xffffff },
      { label: "9", x: cellX(2), y: cellY(2), w: btnW, h: btnH, color: 0xffffff },
      { label: "0", x: cellX(0), y: cellY(3), w: btnW * 2 + gapX, h: btnH, color: 0xffffff },
      { label: "删除", x: cellX(2), y: cellY(3), w: btnW, h: btnH, color: 0xffffff },
      { label: "确定", x: cellX(3), y: cellY(0), w: btnW, h: enterH, color: 0x50a9ff },
    ];

    this._keyButtons = [];
    btnConfigs.forEach((cfg) => {
      const btnId = `${this.id}_btn_${cfg.label}`;
      const btn = dxui.Button.build(btnId, parent);
      btn.setSize(cfg.w, cfg.h);
      btn.setPos(cfg.x, cfg.y);
      btn.radius(btnRadius);
      btn.borderWidth(0);
      btn.bgColor(cfg.color);
      if (cfg.label === "删除") {
        const img = dxui.Image.build(btnId + "_img", btn);
        img.source("/app/code/resource/image/delete.png");
        img.align(dxui.Utils.ALIGN.CENTER, 0, 0);
      } else {
        const lbl = dxui.Label.build(btnId + "_label", btn);
        lbl.text(cfg.label);
        lbl.textColor(cfg.label === "确定" ? 0xffffff : 0x333333);
        lbl.textFont(UIManager.font(fontSize, dxui.Utils.FONT_STYLE.NORMAL));
        lbl.align(dxui.Utils.ALIGN.CENTER, 0, 0);
      }
      this._keyButtons.push({ label: cfg.label, btn });
    });
  },

  _bindEvents: function () {
    this._keyButtons.forEach(({ label, btn }) => {
      btn.on(dxui.Utils.EVENT.CLICK, () => {
        if (label === "删除") {
          if (this._hasInput) {
            this._inputTa.lvTextareaDelChar();
            this._inputTa.focus(true);
          } else if (this.options?.onDelete) this.options.onDelete();
        } else if (label === "确定") {
          if (this._hasInput) {
            if (typeof this.options.onConfirm === "function") this.options.onConfirm(this._inputTa.text());
          } else if (this.options?.onConfirm) this.options.onConfirm();
        } else {
          if (this._hasInput) {
            const maxLen = this.options.maxLength || 20;
            if (this._inputTa.text().length >= maxLen) return;
            this._inputTa.lvTextareaAddText(label);
            this._inputTa.focus(true);
          } else if (this.options?.onDigit) this.options.onDigit(label);
        }
      });
    });
  },
};

export default PasswordView;
