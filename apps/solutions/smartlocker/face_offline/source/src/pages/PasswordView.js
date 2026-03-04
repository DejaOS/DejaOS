import dxui from "../../dxmodules/dxUi.js";
import dxDriver from "../../dxmodules/dxDriver.js";
import UIManager from "./UIManager.js";

// Numeric keypad view: 0-9, delete, confirm, exit. No "first/second input" text.
// Usage: PasswordView.build("xxx_pwd", parent, { onDigit, onDelete, onConfirm, onExit });
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
    const topY = H - keypadH;

    this.root = dxui.View.build(this.id, parent);
    this.root.setSize(W, keypadH);
    this.root.setPos(0, topY);
    this.root.radius(0);
    this.root.borderWidth(0);
    this.root.padAll(0);
    this.root.bgOpa(0);

    this._createKeyButtons(W, keypadH);
    this._bindEvents();
  },

  _createKeyButtons: function (areaW, areaH) {
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

    const btnConfigs = [
      { label: "1", x: cellX(0), y: cellY(0), w: btnW, h: btnH, color: 0xffffff },
      { label: "2", x: cellX(1), y: cellY(0), w: btnW, h: btnH, color: 0xffffff },
      { label: "3", x: cellX(2), y: cellY(0), w: btnW, h: btnH, color: 0xffffff },
      { label: "Exit", x: cellX(3), y: cellY(0), w: btnW, h: btnH, color: 0xffa31f },

      { label: "4", x: cellX(0), y: cellY(1), w: btnW, h: btnH, color: 0xffffff },
      { label: "5", x: cellX(1), y: cellY(1), w: btnW, h: btnH, color: 0xffffff },
      { label: "6", x: cellX(2), y: cellY(1), w: btnW, h: btnH, color: 0xffffff },
      { label: "OK", x: cellX(3), y: cellY(1), w: btnW, h: btnH * 3 + gapY * 2, color: 0x50a9ff },

      { label: "7", x: cellX(0), y: cellY(2), w: btnW, h: btnH, color: 0xffffff },
      { label: "8", x: cellX(1), y: cellY(2), w: btnW, h: btnH, color: 0xffffff },
      { label: "9", x: cellX(2), y: cellY(2), w: btnW, h: btnH, color: 0xffffff },

      { label: "0", x: cellX(0), y: cellY(3), w: btnW * 2 + gapX, h: btnH, color: 0xffffff },
      { label: "Del", x: cellX(2), y: cellY(3), w: btnW, h: btnH, color: 0xffffff },
    ];

    this._keyButtons = [];

    btnConfigs.forEach((cfg) => {
      const btnId = `${this.id}_btn_${cfg.label}`;
      const btn = dxui.Button.build(btnId, this.root);
      btn.setSize(cfg.w, cfg.h);
      btn.setPos(cfg.x, cfg.y);
      btn.radius(btnRadius);
      btn.borderWidth(0);
      btn.bgColor(cfg.color);

      if (cfg.label === "Del") {
        const img = dxui.Image.build(btnId + "_img", btn);
        img.source("/app/code/resource/image/delete.png");
        img.align(dxui.Utils.ALIGN.CENTER, 0, 0);
      } else {
        const lbl = dxui.Label.build(btnId + "_label", btn);
        lbl.text(cfg.label);
        lbl.textColor(cfg.label === "Exit" || cfg.label === "OK" ? 0xffffff : 0x333333);
        lbl.textFont(UIManager.font(fontSize, dxui.Utils.FONT_STYLE.NORMAL));
        lbl.align(dxui.Utils.ALIGN.CENTER, 0, 0);
      }

      this._keyButtons.push({ label: cfg.label, btn });
    });
  },

  _bindEvents: function () {
    this._keyButtons.forEach(({ label, btn }) => {
      btn.on(dxui.Utils.EVENT.CLICK, () => {
        if (label === "Del") {
          this._emitDelete();
        } else if (label === "OK") {
          this._emitConfirm();
        } else if (label === "Exit") {
          this._emitExit();
        } else {
          this._emitDigit(label);
        }
      });
    });
  },

  _emitDigit: function (d) {
    if (this.options && typeof this.options.onDigit === "function") {
      this.options.onDigit(d);
    }
  },

  _emitDelete: function () {
    if (this.options && typeof this.options.onDelete === "function") {
      this.options.onDelete();
    }
  },

  _emitConfirm: function () {
    if (this.options && typeof this.options.onConfirm === "function") {
      this.options.onConfirm();
    }
  },

  _emitExit: function () {
    if (this.options && typeof this.options.onExit === "function") {
      this.options.onExit();
    }
  },
};

export default PasswordView;
