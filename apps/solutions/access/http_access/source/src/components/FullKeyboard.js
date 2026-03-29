/**
 * FullKeyboard — lower → upper → numbers/symbols (cycle)
 */

import dxui from "../../dxmodules/dxUi.js";
import std from "../../dxmodules/dxStd.js";
import pwm from "../../dxmodules/dxPwm.js";
import UIManager from "../UIManager.js";

function getMap(mode) {
    // mode: 0 lower, 1 upper, 2 nums/symbols
    if (mode === 0) {
        return [
            "q", "w", "e", "r", "t", "y", "u", "i", "o", "p", "\n",
            "a", "s", "d", "f", "g", "h", "j", "k", "l", "|", "\n",
            "z", "x", "c", "v", "b", "n", "m", ",", ".", "/", "\n",
            "Shift", "Del", " ", "Done", ""
        ];
    }
    if (mode === 1) {
        return [
            "Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P", "\n",
            "A", "S", "D", "F", "G", "H", "J", "K", "L", "Del", "\n",
            "Z", "X", "C", "V", "B", "N", "M", ",", ".", "/", "\n",
            "Shift", "Del", " ", "Done", ""
        ];
    }
    return [
        "1", "2", "3", "4", "5", "6", "7", "8", "9", "0", "\n",
        ".", "@", "-", "_", "/", "\\", "[", "]", "{", "}", "\n",
        ",", "'", "\"", ";", ":", "=", "+", "?", "#", "&", "\n",
        "Shift", "Del", " ", "Done", ""
    ];
}

const FullKeyboard = {
    build: function (id, parent, options = {}) {
        const view = Object.create(_FullKeyboardProto);
        view.id = id;
        view.options = options;
        view._init(parent);
        return view;
    },
};

const _FullKeyboardProto = {
    _init: function (parent) {
        const H = 320;
        const W = 480;

        this.root = dxui.View.build(this.id, parent);
        this.root.setSize(W, H);
        this.root.setPos(0, 0);
        this.root.radius(0);
        this.root.borderWidth(0);
        this.root.padAll(0);

        // Input row
        const inputH = 50;
        this._inputRowH = inputH;
        this._inputRow = dxui.View.build(this.id + "_input_row", this.root);
        this._inputRow.setSize(W, inputH);
        this._inputRow.setPos(0, 0);
        this._inputRow.radius(0);
        this._inputRow.borderWidth(0);
        this._inputRow.padAll(0);
        this._inputRow.bgColor(0x1A1A1A);

        const fontSize = 20;
        const labelW = Math.round(W * 0.40);
        const backBtnW = 44;
        const taW = W - backBtnW - labelW - 20;
        const rowContentH = inputH - 10;
        const padVert = 5;

        // Back
        this._backBtn = dxui.View.build(this.id + "_back_btn", this._inputRow);
        this._backBtn.setSize(44, 44);
        this._backBtn.align(dxui.Utils.ALIGN.LEFT_MID, 4, 0);
        this._backBtn.bgOpa(0);
        this._backBtn.radius(0);
        this._backBtn.borderWidth(0);
        this._backBtn.padAll(0);

        const backImg = dxui.Image.build(this.id + "_back_img", this._backBtn);
        backImg.source("/app/code/resource/image/back.png");
        backImg.setSize(24, 24);
        backImg.align(dxui.Utils.ALIGN.CENTER, 0, 0);

        this._backBtn.on(dxui.Utils.EVENT.CLICK, () => {
            if (this.options && typeof this.options.onBack === "function") {
                this.options.onBack();
            } else {
                this.hide();
            }
        });

        // Placeholder label
        this._inputLabel = dxui.Label.build(this.id + "_input_label", this._inputRow);
        this._inputLabel.setSize(labelW, rowContentH);
        this._inputLabel.align(dxui.Utils.ALIGN.LEFT_MID, 8 + backBtnW, 0);
        this._inputLabel.padTop(padVert);
        this._inputLabel.padBottom(padVert);
        this._inputLabel.text(this.options.placeholder || "");
        this._inputLabel.textFont(UIManager.font(fontSize, dxui.Utils.FONT_STYLE.NORMAL));
        this._inputLabel.textColor(0xFFFFFF);

        this._inputTa = dxui.Textarea.build(this.id + "_input_ta", this._inputRow);
        this._inputTa.setSize(taW, rowContentH);
        this._inputTa.align(dxui.Utils.ALIGN.LEFT_MID, 8 + backBtnW + labelW + 4, 0);
        this._inputTa.padTop(padVert);
        this._inputTa.padBottom(padVert);
        this._inputTa.setOneLine(true);
        this._inputTa.setCursorClickPos(true);
        this._inputTa.scroll(false);
        this._inputTa.textFont(UIManager.font(fontSize, dxui.Utils.FONT_STYLE.NORMAL));
        this._inputTa.textColor(0x333333);
        this._inputTa.bgColor(0xFFFFFF);
        this._inputTa.radius(4);
        this._inputTa.on(dxui.Utils.EVENT.CLICK, () => this._inputTa.focus(true));
        this._inputLabel.on(dxui.Utils.EVENT.CLICK, () => this._inputTa.focus(true));

        if (this.options.isPassword) {
            this._inputTa.setPasswordMode(true);
        }

        const initialValue = this.options.initialValue || "";
        this._inputTa.text(initialValue);

        // Keyboard (btnmatrix)
        const keyboardY = inputH;
        const keyboardH = H - keyboardY;

        this._keyboard = dxui.Buttons.build(this.id + "_buttons", this.root);
        this._keyboard.setSize(W, keyboardH);
        this._keyboard.setPos(0, keyboardY);
        this._keyboard.textFont(UIManager.font(24), dxui.Utils.STYLE_PART.ITEMS);
        // White keys, dark text (like NumericKeypad)
        this._keyboard.textColor(0x333333, dxui.Utils.STYLE_PART.ITEMS);
        this._keyboard.bgColor(0x000000);
        this._keyboard.bgColor(0xFFFFFF, dxui.Utils.STYLE_PART.ITEMS);
        this._keyboard.radius(4, dxui.Utils.STYLE_PART.ITEMS);

        // No outer chrome; keys fill area
        this._keyboard.radius(0);
        this._keyboard.borderWidth(0);
        this._keyboard.padAll(0);

        this._mode = 0;
        this._loadKeyboardMap();

        this._keyboard.on(dxui.Utils.EVENT.VALUE_CHANGED, () => {
            this._onKeyPress();
        });
    },

    _loadKeyboardMap: function () {
        if (!this._keyboard) return;
        this._keyboard.data(getMap(this._mode));
    },

    _onKeyPress: function () {
        if (!this._keyboard || !this._inputTa) return;
        pwm.pressBeep();
        const btn = this._keyboard.clickedButton();
        if (!btn || btn.text == null) return;

        const raw = btn.text;
        const t = raw.trim();

        if (t === "Del") {
            this._inputTa.lvTextareaDelChar();
            this._inputTa.send(dxui.Utils.EVENT.FOCUSED);
            return;
        }
        if (t === "Done") {
            const value = (this._inputTa.text() || "").trim();
            if (this.options && typeof this.options.onConfirm === "function") {
                this.options.onConfirm(value);
            }
            return;
        }
        if (t === "Shift") {
            this._mode = (this._mode + 1) % 3;
            this._loadKeyboardMap();
            return;
        }
        if (raw === " ") {
            this._inputTa.lvTextareaAddText(" ");
            this._inputTa.send(dxui.Utils.EVENT.FOCUSED);
            return;
        }

        if (t.length >= 1 && t !== "Shift" && t !== "Del" && t !== "Done") {
            const maxLen = this.options.maxLength || 100;
            if (this._inputTa.text().length >= maxLen) return;
            this._inputTa.lvTextareaAddText(t);
            this._inputTa.send(dxui.Utils.EVENT.FOCUSED);
        }
    },

    setValue: function (value) {
        if (this._inputTa) {
            this._inputTa.text(value || "");
        }
    },

    setPasswordMode: function (en) {
        if (this._inputTa && typeof this._inputTa.setPasswordMode === "function") {
            this._inputTa.setPasswordMode(!!en);
        }
    },

    setPlaceholder: function (text) {
        if (this._inputLabel) {
            this._inputLabel.text(text != null ? String(text) : "");
        }
    },

    getValue: function () {
        return this._inputTa ? this._inputTa.text() : "";
    },

    show: function (options) {
        if (options && options.placeholder != null) {
            this.setPlaceholder(options.placeholder);
        }
        this.root.show();
        std.setTimeout(() => {
            if (this._inputTa) {
                this._inputTa.focus(true);
                this._inputTa.send(dxui.Utils.EVENT.FOCUSED);
            }
        }, 50);
    },

    hide: function () {
        this.root.hide();
    },
};

export default FullKeyboard;
