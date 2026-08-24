import dxui from "../../dxmodules/dxUi.js";
import dxDriver from "../../dxmodules/dxDriver.js";
import UIManager from "../UIManager.js";
import TipView from "./TipView.js";

/**
 * 底部全键盘：顶部一行与 PasswordView 一致（左文案 + 右 Textarea），
 * 按键直接驱动 Textarea，避免焦点丢失。
 *
 * KeyboardView.show({
 *   fieldLabel: "MQTT地址",           // 顶部左侧说明
 *   initialText: "",
 *   maxLength: 128,
 *   passwordMode: false,
 *   validate: (text) => ({ ok: true }) | { ok: false, message: "..." },
 *   onCommit: (text) => {},          // 校验通过后 Done 时调用
 *   afterHide: () => {},             // 面板关闭后（含 Done、外部 hide）
 * })
 */
const KeyboardView = {
  _inited: false,
  _root: null,
  _inputRow: null,
  _fieldLabel: null,
  _inputTa: null,
  _visible: false,
  _afterHide: null,
  _mode: "LOWER",
  _keyCache: [],

  KB_PANEL_HEIGHT: 460,
  INPUT_ROW_H: 72,

  _maxLen: 128,
  _validate: null,
  _onCommit: null,

  /** 按键区顶端 Y（在 _root 内） */
  _keysTopY: 0,

  LAYOUTS: {
    LOWER: [
      ["q", "w", "e", "r", "t", "y", "u", "i", "o", "p"],
      ["a", "s", "d", "f", "g", "h", "j", "k", "l"],
      ["{shift}", "z", "x", "c", "v", "b", "n", "m", "{del}"],
      ["{mode_sym}", "{space}", "{done}"],
    ],
    UPPER: [
      ["Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P"],
      ["A", "S", "D", "F", "G", "H", "J", "K", "L"],
      ["{shift}", "Z", "X", "C", "V", "B", "N", "M", "{del}"],
      ["{mode_sym}", "{space}", "{done}"],
    ],
    SYMBOL: [
      ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0"],
      ["-", "_", "/", ":", ";", "(", ")", "$", "&", "@"],
      ["{mode_abc}", ".", ",", "?", "!", "'", '"', "{del}"],
      ["{mode_abc}", "{space}", "{done}"],
    ],
  },

  show: function (options) {
    options = options || {};
    if (!this._inited) {
      this.init();
    }

    this._afterHide = options.afterHide || null;
    this._validate = options.validate || null;
    this._onCommit = options.onCommit || null;
    this._maxLen = options.maxLength != null ? options.maxLength : 128;

    this._fieldLabel.text(options.fieldLabel != null ? String(options.fieldLabel) : "");
    this._inputTa.setMaxLength(this._maxLen);
    this._inputTa.setPasswordMode(!!options.passwordMode);
    this._inputTa.text(options.initialText != null ? String(options.initialText) : "");
    this._inputTa.textColor(0x333333);

    this._mode = "LOWER";
    this.render();
    this._visible = true;
    this._root.show();

    try {
      this._inputTa.focus(true);
    } catch (e) {}
  },

  hide: function () {
    if (this._root) this._root.hide();
    this._visible = false;
    const cb = this._afterHide;
    this._afterHide = null;
    if (typeof cb === "function") {
      try {
        cb();
      } catch (e) {}
    }
  },

  isVisible: function () {
    return !!this._visible;
  },

  init: function () {
    if (this._inited) return;

    const screenW = dxDriver.DISPLAY.WIDTH;
    const screenH = dxDriver.DISPLAY.HEIGHT;

    this.KB_PANEL_HEIGHT = Math.min(500, Math.round(screenH * 0.56));
    this.INPUT_ROW_H = Math.round(screenH * 0.072);

    /** 与 PasswordView 数字键区一致：浅底 + 白键 + 蓝确认键 */
    this._root = dxui.View.build("kb_root", dxui.Utils.LAYER.TOP);
    this._root.setSize(screenW, this.KB_PANEL_HEIGHT);
    this._root.setPos(0, screenH - this.KB_PANEL_HEIGHT);
    this._root.bgColor(0xf0f0f0);
    this._root.radius(0);
    this._root.borderWidth(0);
    this._root.padAll(0);
    this._root.scroll(false);

    const irh = this.INPUT_ROW_H;
    this._inputRow = dxui.View.build("kb_input_row", this._root);
    this._inputRow.setSize(screenW, irh);
    this._inputRow.setPos(0, 0);
    this._inputRow.radius(0);
    this._inputRow.borderWidth(0);
    this._inputRow.padAll(0);
    this._inputRow.bgColor(0xffffff);
    this._inputRow.scroll(false);

    const pad = Math.round(screenW * 0.04);
    const fontSize = Math.round(irh * 0.36);
    const labelW = Math.round(screenW * 0.42);
    const taW = screenW - labelW - pad * 2;
    const rowContentH = irh - 8;
    const padVert = Math.max(0, Math.round((rowContentH - fontSize * 1.2) / 2));

    this._fieldLabel = dxui.Label.build("kb_field_lbl", this._inputRow);
    this._fieldLabel.setSize(labelW, rowContentH);
    this._fieldLabel.align(dxui.Utils.ALIGN.LEFT_MID, pad, 0);
    this._fieldLabel.padTop(padVert);
    this._fieldLabel.padBottom(padVert);
    this._fieldLabel.text("");
    this._fieldLabel.textFont(UIManager.font(fontSize, dxui.Utils.FONT_STYLE.NORMAL));
    this._fieldLabel.textColor(0x000000);
    this._fieldLabel.on(dxui.Utils.EVENT.CLICK, () => {
      try {
        this._inputTa.focus(true);
      } catch (e) {}
    });

    this._inputTa = dxui.Textarea.build("kb_input_ta", this._inputRow);
    this._inputTa.setSize(taW, rowContentH);
    this._inputTa.align(dxui.Utils.ALIGN.LEFT_MID, pad + labelW, 0);
    this._inputTa.padTop(padVert);
    this._inputTa.padBottom(padVert);
    this._inputTa.setOneLine(true);
    this._inputTa.setCursorClickPos(true);
    this._inputTa.text("");
    this._inputTa.textFont(UIManager.font(fontSize, dxui.Utils.FONT_STYLE.NORMAL));
    this._inputTa.textColor(0x333333);
    try {
      this._inputTa.bgColor(0xffffff);
    } catch (e) {}
    this._inputTa.on(dxui.Utils.EVENT.CLICK, () => {
      try {
        this._inputTa.focus(true);
      } catch (e) {}
    });

    this._keysTopY = irh + 8;

    this._inited = true;
  },

  render: function () {
    this._keyCache.forEach((k) => k.btn.hide());

    const layout = this.LAYOUTS[this._mode];
    const rowCount = layout.length;
    const padding = 10;
    const gap = 8;
    const totalW = dxDriver.DISPLAY.WIDTH;
    const availableW = totalW - padding * 2;

    const keysTop = this._keysTopY;
    const keysBottomPad = 10;
    const keysAreaH = this.KB_PANEL_HEIGHT - keysTop - keysBottomPad;

    const baseKeyW = (availableW - gap * 9) / 10;
    const keyH = (keysAreaH - padding * 2 - gap * (rowCount - 1)) / rowCount;

    let keyIdx = 0;
    layout.forEach((row, rowIndex) => {
      const isLastRow = rowIndex === rowCount - 1;
      let currentX = padding;
      const currentY = keysTop + padding + rowIndex * (keyH + gap);

      row.forEach((key, colIndex) => {
        let label = key;
        /** PasswordView：普通键 0xffffff / 0x333333，确定 0x50a9ff / 白字 */
        let bgColor = 0xffffff;
        let textColor = 0x333333;
        let currentKeyW = baseKeyW;

        if (key === "{shift}") {
          label = "Shift";
          bgColor = this._mode === "UPPER" ? 0x50a9ff : 0xe8e8e8;
          textColor = this._mode === "UPPER" ? 0xffffff : 0x333333;
          currentKeyW = baseKeyW * 1.2;
        } else if (key === "{del}") {
          label = "Del";
          bgColor = 0xe8e8e8;
          textColor = 0x333333;
          currentKeyW = availableW - (currentX - padding);
        } else if (key === "{mode_sym}" || key === "{mode_abc}") {
          label = key === "{mode_sym}" ? "123" : "ABC";
          bgColor = 0xe8e8e8;
          textColor = 0x333333;
          currentKeyW = baseKeyW * 1.5;
        } else if (key === "{space}") {
          label = "Space";
          currentKeyW = availableW - baseKeyW * 1.5 - baseKeyW * 2 - gap * 2;
        } else if (key === "{done}") {
          label = "Done";
          bgColor = 0x50a9ff;
          textColor = 0xffffff;
          currentKeyW = baseKeyW * 2;
        }

        if (colIndex === row.length - 1 && !isLastRow && key !== "{del}") {
          currentKeyW = availableW - (currentX - padding);
        }

        this.updateOrCreateKey(keyIdx++, label, key, currentX, currentY, currentKeyW, keyH, bgColor, textColor);

        currentX += currentKeyW + gap;
      });
    });
  },

  updateOrCreateKey: function (idx, label, value, x, y, w, h, bg, textCol) {
    let item = this._keyCache[idx];
    if (!item) {
      const btn = dxui.Button.build(`kb_key_${idx}`, this._root);
      const lbl = dxui.Label.build(`kb_lbl_${idx}`, btn);
      item = { btn, lbl, value: value };
      this._keyCache[idx] = item;

      btn.on(dxui.Utils.EVENT.CLICK, () => {
        this.handleKey(item.value);
      });
    }

    item.value = value;
    item.btn.setSize(w, h);
    item.btn.setPos(x, y);
    item.btn.bgColor(bg);
    item.btn.radius(8);
    item.btn.borderWidth(0);
    item.btn.show();

    item.lbl.text(label);
    item.lbl.textFont(UIManager.font(24, dxui.Utils.FONT_STYLE.NORMAL));
    item.lbl.textColor(textCol);
    item.lbl.align(dxui.Utils.ALIGN.CENTER, 0, 0);
  },

  handleKey: function (val) {
    if (val === "{shift}") {
      this._mode = this._mode === "LOWER" ? "UPPER" : "LOWER";
      this.render();
      try {
        this._inputTa.focus(true);
      } catch (e) {}
      return;
    }
    if (val === "{mode_sym}") {
      this._mode = "SYMBOL";
      this.render();
      try {
        this._inputTa.focus(true);
      } catch (e) {}
      return;
    }
    if (val === "{mode_abc}") {
      this._mode = "LOWER";
      this.render();
      try {
        this._inputTa.focus(true);
      } catch (e) {}
      return;
    }

    if (val === "{del}") {
      try {
        this._inputTa.lvTextareaDelChar();
        this._inputTa.focus(true);
      } catch (e) {}
      return;
    }

    if (val === "{done}") {
      let text = "";
      try {
        text = this._inputTa.text();
      } catch (e) {}
      if (this._validate) {
        try {
          const r = this._validate(text);
          if (r && r.ok === false) {
            if (r.message) TipView.showError(r.message);
            try {
              this._inputTa.focus(true);
            } catch (e2) {}
            return;
          }
        } catch (e) {}
      }
      if (this._onCommit) {
        try {
          this._onCommit(text);
        } catch (e) {}
      }
      this.hide();
      return;
    }

    if (val === "{space}") {
      if (String(this._inputTa.text()).length >= this._maxLen) return;
      try {
        this._inputTa.lvTextareaAddText(" ");
        this._inputTa.focus(true);
      } catch (e) {}
      return;
    }

    if (String(this._inputTa.text()).length >= this._maxLen) return;
    try {
      this._inputTa.lvTextareaAddText(val);
      this._inputTa.focus(true);
    } catch (e) {}
  },
};

export default KeyboardView;
