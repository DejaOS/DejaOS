import dxui from "../../dxmodules/dxUi.js";
import dxDriver from "../../dxmodules/dxDriver.js";
import UIManager from "./UIManager.js";
import pwm from "../../dxmodules/dxPwm.js";

// Generic numeric keypad view; only handles digits (0‑9), delete and confirm.
// It does NOT include copy like "first input / second input".
// Usage:
// const keypad = PasswordView.build("xxx_pwd", parent, {
//   onDigit: (d) => {},
//   onDelete: () => {},
//   onConfirm: () => {},
// });
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
    const width = dxDriver.DISPLAY.WIDTH || 480;
    const screenHeight = dxDriver.DISPLAY.HEIGHT || 320;
    // Reserve height for top tip + text area; default ~80px, can be overridden via options.reserveTopHeight
    const reservedTop =
      (this.options && this.options.reserveTopHeight) != null
        ? this.options.reserveTopHeight
        : 80;
    const maxKeypadHeight = 240; // Max keypad height
    const minKeypadHeight = 160; // Min height so buttons are not too short

    let height =
      (this.options && this.options.height) ||
      Math.min(
        maxKeypadHeight,
        Math.max(minKeypadHeight, screenHeight - reservedTop)
      );

    this.root = dxui.View.build(this.id, parent);
    this.root.setSize(width, height);
    this.root.radius(0);
    this.root.borderWidth(0);
    this.root.padAll(0);
    this.root.bgOpa(0);
    this._height = height;

    // Pin keypad area to bottom of screen (default 480x320, bottom height = height)
    this.root.align(
      dxui.Utils.ALIGN.TOP_LEFT,
      0,
      screenHeight - height
    );

    this._createKeyButtons();
    this._bindEvents();
  },

  _createKeyButtons: function () {
    const keys = [
      ["1", "2", "3"],
      ["4", "5", "6"],
      ["7", "8", "9"],
      ["删除", "0", "确定"],
    ];

    const btnWidth = 90;
    const rows = keys.length; // 4 rows
    const paddingTop = 10;
    const paddingBottom = 10;
    const rowGap = 10;

    const usableHeight =
      (this._height || 200) - paddingTop - paddingBottom;
    const btnHeight = Math.floor(
      (usableHeight - rowGap * (rows - 1)) / rows
    );
    const startY = paddingTop;
    const gapY = btnHeight + rowGap;

    this._keyButtons = [];

    for (let row = 0; row < keys.length; row++) {
      const y = startY + row * gapY;
      for (let col = 0; col < keys[row].length; col++) {
        let label = keys[row][col];
        const btnId = `${this.id}_key_${row}_${col}`;
        const btn = dxui.Button.build(btnId, this.root);
        btn.setSize(btnWidth, btnHeight);
        btn.radius(8);

        let offsetX = 0;
        if (col === 0) offsetX = -120;
        else if (col === 1) offsetX = 0;
        else offsetX = 120;

        btn.align(dxui.Utils.ALIGN.TOP_MID, offsetX, y);

        const lbl = dxui.Label.build(btnId + "_label", btn);
        // Translate key labels to simple English for UI
        let displayText = label;
        if (label === "删除") displayText = "Del";
        if (label === "确定") displayText = "OK";
        lbl.text(displayText);
        lbl.textFont(
          UIManager.font(
            label.length === 1 ? 24 : 18,
            dxui.Utils.FONT_STYLE.NORMAL
          )
        );
        lbl.align(dxui.Utils.ALIGN.CENTER, 0, 0);

        // Use different background colors for different functions
        if (label === "删除") {
          btn.bgColor(0xd0d3d8); // light gray
          lbl.textColor(0x333333);
        } else if (label === "确定") {
          btn.bgColor(0x1abc9c); // green
          lbl.textColor(0xffffff);
        } else {
          btn.bgColor(0xf5f7fa); // normal number key
          lbl.textColor(0x333333);
        }

        this._keyButtons.push({ label, btn });
      }
    }
  },

  _bindEvents: function () {
    // 键盘按钮
    this._keyButtons.forEach(({ label, btn }) => {
      btn.on(dxui.Utils.EVENT.CLICK, () => {
        // 按键提示音（已在 main.js 里 init 过 pwm 通道）
        pwm.pressBeep();

        if (label === "删除") {
          this._emitDelete();
        } else if (label === "确定") {
          this._emitConfirm();
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
};

export default PasswordView;


