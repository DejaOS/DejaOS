/**
 * TipView — toast overlay (success / error / warning / info)
 */

import dxui from "../../dxmodules/dxUi.js";
import std from "../../dxmodules/dxStd.js";
import pwm from "../../dxmodules/dxPwm.js";
import UIManager from "../UIManager.js";

const TipView = {
    _inited: false,
    _root: null,
    _card: null,
    _icon: null,
    _label: null,
    _hideTimer: null,

    _themes: {
        success: {
            bg: 0xe6f7e9,
            text: 0x1f8b4d,
            icon: "/app/code/resource/image/tip_success.png",
        },
        error: {
            bg: 0xffecec,
            text: 0xcc3333,
            icon: "/app/code/resource/image/tip_error.png",
        },
        warning: {
            bg: 0xfff8e1,
            text: 0xff9800,
            icon: "/app/code/resource/image/tip_warning.png",
        },
        info: {
            bg: 0xe3f2fd,
            text: 0x2196f3,
            icon: "/app/code/resource/image/tip_info.png",
        },
    },

    init: function () {
        if (this._inited) return;

        const W = 480;
        const H = 320;

        // Dim overlay
        this._root = dxui.View.build("tip_root", dxui.Utils.LAYER.TOP);
        this._root.setSize(W, H);
        this._root.bgColor(0x000000);
        this._root.bgOpa(55);
        this._root.radius(0);
        this._root.borderWidth(0);
        this._root.padAll(0);
        this._root.scroll(false);

        // Card
        const cardW = Math.round(W * 0.78);
        const cardH = Math.round(H * 0.42);
        this._card = dxui.View.build("tip_card", this._root);
        this._card.setSize(cardW, cardH);
        this._card.radius(12);
        this._card.borderWidth(0);
        this._card.bgColor(this._themes.info.bg);
        this._card.align(dxui.Utils.ALIGN.CENTER, 0, 0);
        this._card.scroll(false);

        // Icon
        const iconSize = 36;
        this._icon = dxui.Image.build("tip_icon", this._card);
        this._icon.setSize(iconSize, iconSize);
        this._icon.align(dxui.Utils.ALIGN.LEFT_MID, 18, 0);

        // Message (wrap)
        this._label = dxui.Label.build("tip_label", this._card);
        this._label.text(" ");
        this._label.textFont(UIManager.font(16, dxui.Utils.FONT_STYLE.NORMAL));
        this._label.textColor(0x333333);
        this._label.setSize(cardW - 72, cardH - 24);
        this._label.longMode(dxui.Utils.LABEL_LONG_MODE.WRAP);
        this._label.textAlign(dxui.Utils.TEXT_ALIGN.LEFT);
        this._label.align(dxui.Utils.ALIGN.LEFT_MID, 64, 0);

        // Hidden by default
        this._root.hide();
        this._inited = true;
    },

    _applyTheme: function (type) {
        const theme = this._themes[type] || this._themes.info;
        if (theme.icon) {
            this._icon.source(theme.icon);
        }
        this._label.textColor(theme.text);
        return theme;
    },

    _clearTimer: function () {
        if (this._hideTimer) {
            std.clearTimeout(this._hideTimer);
            this._hideTimer = null;
        }
    },

    _calcMessageLines: function (message, charsPerLine) {
        const text = String(message || "");
        const parts = text.split("\n");
        let lines = 0;
        parts.forEach((part) => {
            const len = part.length || 1;
            lines += Math.max(1, Math.ceil(len / charsPerLine));
        });
        return Math.max(1, lines);
    },

    _layoutContent: function (type, message) {
        const W = 480;
        const H = 320;
        const theme = this._themes[type] || this._themes.info;

        const cardW = Math.round(W * 0.78);
        const baseCardH = Math.round(H * 0.42);
        const iconSize = 36;
        const iconLeft = 18;
        const textLeft = iconLeft + iconSize + 14;
        const textRightPad = 32;
        const textWidth = cardW - textLeft - textRightPad;
        const charsPerLine = Math.max(10, Math.floor(textWidth / 16));
        const lineH = 22;
        const lineCount = this._calcMessageLines(message, charsPerLine);
        const labelH = Math.max(lineH, lineCount * lineH);
        const cardH = Math.max(baseCardH, labelH + 28);

        this._card.setSize(cardW, cardH);
        this._card.bgColor(theme.bg);
        this._card.align(dxui.Utils.ALIGN.CENTER, 0, 0);

        this._icon.setSize(iconSize, iconSize);
        this._icon.align(dxui.Utils.ALIGN.LEFT_MID, iconLeft, 0);

        this._label.setSize(textWidth, labelH);
        this._label.align(dxui.Utils.ALIGN.LEFT_MID, textLeft, 0);
        this._label.longMode(dxui.Utils.LABEL_LONG_MODE.WRAP);
        this._label.textAlign(dxui.Utils.TEXT_ALIGN.LEFT);
        this._label.textColor(theme.text);
    },

    _show: function (type, message, duration) {
        if (!this._inited) {
            this.init();
        }

        this._applyTheme(type);
        this._label.text(message || "");
        this._layoutContent(type, message || "");

        this._root.show();
        this._card.show();

        this._clearTimer();
        this._hideTimer = std.setTimeout(() => {
            this.hide();
        }, duration || 2500);
    },

    showSuccess: function (message, duration) {
        pwm.successBeep();
        this._show("success", message || "Done", duration);
    },

    showError: function (message, duration) {
        pwm.failBeep();
        this._show("error", message || "Failed", duration);
    },

    showWarning: function (message, duration) {
        pwm.failBeep();
        this._show("warning", message || "Warning", duration);
    },

    showInfo: function (message, duration) {
        this._show("info", message || "Notice", duration);
    },

    hide: function () {
        this._clearTimer();
        if (!this._inited) return;
        this._root.hide();
    },
};

export default TipView;
