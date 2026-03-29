/**
 * NumericKeypad — 4×3 digit pad + Del (red) + OK (amber)
 *
 * With input row:
 *   placeholder, maskInput, maxLength, onConfirm(text), ...
 *
 * Keys only:
 *   onDigit, onDelete, onConfirm
 */

import dxui from "../../dxmodules/dxUi.js";
import std from "../../dxmodules/dxStd.js";
import pwm from "../../dxmodules/dxPwm.js";
import UIManager from "../UIManager.js";

const NumericKeypad = {
    build: function (id, parent, options = {}) {
        const view = Object.create(_NumericKeypadProto);
        view.id = id;
        view.options = options;
        view._init(parent);
        return view;
    },
};

const _NumericKeypadProto = {
    _init: function (parent) {
        // 480×320
        const H = 320;
        const W = 480;

        // Optional top input row + keypad
        this._hasInput = !!this.options.placeholder;

        this.root = dxui.View.build(this.id, parent);
        this.root.setSize(W, H);
        this.root.setPos(0, 0);
        this.root.radius(0);
        this.root.borderWidth(0);
        this.root.padAll(0);
        this.root.bgOpa(0);

        let inputRowH = 0;
        if (this._hasInput) {
            inputRowH = 50;
            this._inputRow = dxui.View.build(this.id + "_input_row", this.root);
            this._inputRow.setSize(W, inputRowH);
            this._inputRow.setPos(0, 0);
            this._inputRow.radius(0);
            this._inputRow.borderWidth(0);
            this._inputRow.padAll(0);
            this._inputRow.bgOpa(0);

            const fontSize = 20;
            const backBtnW = 44;
            const labelW = Math.round(W * 0.40);
            const countdownW = this.options.timeout > 0 ? 60 : 0;
            const taW = W - backBtnW - labelW - 20;
            const rowContentH = inputRowH - 10;
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
                }
            });

            // Hint label
            this._inputLabel = dxui.Label.build(this.id + "_input_label", this._inputRow);
            this._inputLabel.setSize(labelW, rowContentH);
            this._inputLabel.align(dxui.Utils.ALIGN.LEFT_MID, 8 + backBtnW, 0);
            this._inputLabel.padTop(padVert);
            this._inputLabel.padBottom(padVert);
            this._inputLabel.text(this.options.placeholder || "");
            this._inputLabel.textFont(UIManager.font(fontSize, dxui.Utils.FONT_STYLE.NORMAL));
            this._inputLabel.textColor(0xFFFFFF);
            this._inputLabel.on(dxui.Utils.EVENT.CLICK, () => this._inputTa.focus(true));

            // Text field
            this._inputTa = dxui.Textarea.build(this.id + "_input_ta", this._inputRow);
            this._inputTa.setSize(taW, rowContentH);
            this._inputTa.align(dxui.Utils.ALIGN.LEFT_MID, 8 + backBtnW + labelW + 4, 0);
            this._inputTa.padTop(padVert);
            this._inputTa.padBottom(padVert);
            this._inputTa.setOneLine(true);
            this._inputTa.setMaxLength(this.options.maxLength || 20);
            this._inputTa.setCursorClickPos(true);
            if (this.options.maskInput !== false) {
                this._inputTa.setPasswordMode(true);
            }
            this._inputTa.text("");
            this._inputTa.textFont(UIManager.font(fontSize, dxui.Utils.FONT_STYLE.NORMAL));
            this._inputTa.textColor(0x333333);
            this._inputTa.bgColor(0xFFFFFF);
            this._inputTa.radius(4);
            this._inputTa.on(dxui.Utils.EVENT.CLICK, () => this._inputTa.focus(true));

            const defaultText = this.options.defaultText;
            if (defaultText != null && String(defaultText).length > 0) {
                this._inputTa.text(String(defaultText));
                this._inputTa.focus(true);
            }

            // Countdown if timeout > 0
            if (this.options.timeout > 0) {
                this._countdownLabel = dxui.Label.build(this.id + "_countdown", this._inputRow);
                this._countdownLabel.setSize(countdownW, rowContentH);
                this._countdownLabel.setPos(W - countdownW - 4, padVert);
                this._countdownLabel.textFont(UIManager.font(16, dxui.Utils.FONT_STYLE.NORMAL));
                this._countdownLabel.textColor(0x888888);
                this._countdownLabel.text(this.options.timeout + "s");
            }
        }

        this._timer = null;
        this._remaining = 0;

        // Key area
        const keypadH = H - inputRowH;
        this._keypadArea = dxui.View.build(this.id + "_keypad", this.root);
        this._keypadArea.setSize(W, keypadH);
        this._keypadArea.setPos(0, inputRowH);
        this._keypadArea.radius(0);
        this._keypadArea.borderWidth(0);
        this._keypadArea.padAll(0);
        this._keypadArea.bgOpa(0);

        this._createKeyButtons(W, keypadH);
        this._bindEvents();
    },

    _createKeyButtons: function (areaW, areaH) {
        const cols = 4;
        const rows = 3;
        const padX = 8;
        const padY = 8;
        const gapX = 6;
        const gapY = 6;

        const btnW = Math.round((areaW - padX * 2 - gapX * (cols - 1)) / cols);
        const btnH = Math.round((areaH - padY * 2 - gapY * (rows - 1)) / rows);
        const btnRadius = 8;
        const fontSize = Math.round(btnH * 0.4);

        const cellX = (col) => padX + col * (btnW + gapX);
        const cellY = (row) => padY + row * (btnH + gapY);

        const btnConfigs = [
            // row 1
            { label: "1", x: cellX(0), y: cellY(0), w: btnW, h: btnH, color: 0xFFFFFF, textColor: 0x333333 },
            { label: "2", x: cellX(1), y: cellY(0), w: btnW, h: btnH, color: 0xFFFFFF, textColor: 0x333333 },
            { label: "3", x: cellX(2), y: cellY(0), w: btnW, h: btnH, color: 0xFFFFFF, textColor: 0x333333 },
            { label: "0", x: cellX(3), y: cellY(0), w: btnW, h: btnH, color: 0xFFFFFF, textColor: 0x333333 },

            { label: "4", x: cellX(0), y: cellY(1), w: btnW, h: btnH, color: 0xFFFFFF, textColor: 0x333333 },
            { label: "5", x: cellX(1), y: cellY(1), w: btnW, h: btnH, color: 0xFFFFFF, textColor: 0x333333 },
            { label: "6", x: cellX(2), y: cellY(1), w: btnW, h: btnH, color: 0xFFFFFF, textColor: 0x333333 },
            { label: "Del", x: cellX(3), y: cellY(1), w: btnW, h: btnH, color: 0xF44336, textColor: 0xFFFFFF },

            { label: "7", x: cellX(0), y: cellY(2), w: btnW, h: btnH, color: 0xFFFFFF, textColor: 0x333333 },
            { label: "8", x: cellX(1), y: cellY(2), w: btnW, h: btnH, color: 0xFFFFFF, textColor: 0x333333 },
            { label: "9", x: cellX(2), y: cellY(2), w: btnW, h: btnH, color: 0xFFFFFF, textColor: 0x333333 },
            { label: "OK", x: cellX(3), y: cellY(2), w: btnW, h: btnH, color: 0xFFC107, textColor: 0x333333 },
        ];

        this._keyButtons = [];

        btnConfigs.forEach((cfg) => {
            const btnId = `${this.id}_btn_${cfg.label}`;
            const btn = dxui.Button.build(btnId, this._keypadArea);
            btn.setSize(cfg.w, cfg.h);
            btn.setPos(cfg.x, cfg.y);
            btn.radius(btnRadius);
            btn.borderWidth(0);
            btn.bgColor(cfg.color);

            const lbl = dxui.Label.build(btnId + "_label", btn);
            lbl.text(cfg.label);
            lbl.textColor(cfg.textColor);
            lbl.textFont(UIManager.font(fontSize, dxui.Utils.FONT_STYLE.NORMAL));
            lbl.align(dxui.Utils.ALIGN.CENTER, 0, 0);

            this._keyButtons.push({ label: cfg.label, btn });
        });
    },

    _bindEvents: function () {
        const self = this;
        this._keyButtons.forEach(({ label, btn }) => {
            btn.on(dxui.Utils.EVENT.CLICK, () => {
                pwm.pressBeep();
                if (label === "Del") {
                    if (self._hasInput) {
                        self._inputTa.lvTextareaDelChar();
                        self._inputTa.focus(true);
                    } else {
                        self._emitDelete();
                    }
                } else if (label === "OK") {
                    if (self._hasInput) {
                        if (self.options && typeof self.options.onConfirm === "function") {
                            self.options.onConfirm(self._inputTa.text());
                        }
                    } else {
                        self._emitConfirm();
                    }
                } else {
                    if (self._hasInput) {
                        const maxLen = self.options.maxLength || 20;
                        if (self._inputTa.text().length >= maxLen) return;
                        self._inputTa.lvTextareaAddText(label);
                        self._inputTa.focus(true);
                    } else {
                        self._emitDigit(label);
                    }
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

    setPlaceholder: function (text) {
        this.options.placeholder = text != null ? String(text) : "";
        if (this._inputLabel) {
            this._inputLabel.text(this.options.placeholder);
        }
    },

    setDefaultText: function (text) {
        if (!this._inputTa) return;
        this._inputTa.text(text != null ? String(text) : "");
        this._inputTa.focus(true);
    },

    clearInput: function () {
        if (!this._inputTa) return;
        this._inputTa.text("");
        this._inputTa.focus(true);
    },

    show: function () {
        this.root.show();
    },

    hide: function () {
        this.root.hide();
    },

    startCountdown: function () {
        if (!this._countdownLabel) return;
        this.stopCountdown();
        this._remaining = this.options.timeout;
        this._countdownLabel.text(this._remaining + "s");
        this._timer = std.setInterval(() => {
            this._remaining -= 1;
            this._countdownLabel.text(this._remaining + "s");
            if (this._remaining <= 0) {
                this.stopCountdown();
                if (typeof this.options.onTimeout === "function") {
                    this.options.onTimeout();
                } else if (typeof this.options.onBack === "function") {
                    this.options.onBack();
                }
            }
        }, 1000);
    },

    stopCountdown: function () {
        if (this._timer !== null) {
            std.clearInterval(this._timer);
            this._timer = null;
        }
    },
};

export default NumericKeypad;
