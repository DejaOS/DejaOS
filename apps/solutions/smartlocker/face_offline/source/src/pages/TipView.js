import dxui from "../../dxmodules/dxUi.js";
import dxDriver from "../../dxmodules/dxDriver.js";
import std from "../../dxmodules/dxStd.js";
import UIManager from "./UIManager.js";

// Global tip view (success / error), on TOP layer, centered card
// Usage: TipView.showSuccess("Done"); TipView.showError("Error message");
const TipView = {
    _inited: false,
    _root: null,
    _card: null,
    _icon: null,
    _label: null,
    _hideTimer: null,
    _countdownTimer: null,
    _baseMessage: "",

    // Theme: bg, text, icon
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
    },

    init: function () {
        if (this._inited) return;

        const W = dxDriver.DISPLAY.WIDTH;
        const H = dxDriver.DISPLAY.HEIGHT;

        // 1. Full-screen semi-transparent overlay
        this._root = dxui.View.build("tip_root", dxui.Utils.LAYER.TOP);
        this._root.setSize(W, H);
        this._root.bgColor(0x000000);
        this._root.bgOpa(55);
        this._root.radius(0);
        this._root.borderWidth(0);
        this._root.padAll(0);
        this._root.scroll(false);

        // 2. Center white card
        const cardW = Math.round(W * 0.70);
        const cardH = Math.round(H * 0.215);
        this._card = dxui.View.build("tip_card", this._root);
        this._card.setSize(cardW, cardH);
        this._card.radius(Math.round(W * 0.027));
        this._card.borderWidth(0);
        this._card.bgColor(0xffffff);
        this._card.align(dxui.Utils.ALIGN.CENTER, 0, 0);
        this._card.scroll(false);

        // 3. Icon: top of card
        const iconSize = 48;
        this._icon = dxui.Image.build("tip_icon", this._card);
        this._icon.setSize(iconSize, iconSize);
        this._icon.align(dxui.Utils.ALIGN.TOP_MID, 0, Math.round(H * 0.027));

        // 4. Text: on root, centered
        this._label = dxui.Label.build("tip_label", this._root);
        this._label.text(" ");
        this._label.textFont(UIManager.font(Math.round(H * 0.020), dxui.Utils.FONT_STYLE.NORMAL));
        this._label.textColor(0x000000);
        this._label.setSize(Math.round(W * 0.633), Math.round(H * 0.059));
        this._label.longMode(dxui.Utils.LABEL_LONG_MODE.WRAP);
        this._label.align(dxui.Utils.ALIGN.TOP_MID, 0, Math.round(H * 0.52));

        // Hidden by default
        this._root.hide();

        this._inited = true;
    },

    _applyTheme: function (type) {
        const theme = this._themes[type] || this._themes.success;
        if (!theme) return;
        // Text color dark (near black)
        this._label.textColor(0x1a1a1a);
        if (theme.icon) {
            this._icon.source(theme.icon);
        }
        return theme;
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

        const theme = this._applyTheme(type);
        this._baseMessage = message || "";
        this._label.text(this._baseMessage);

        // Show first
        this._root.show();
        this._card.show();

        // Auto hide (default 2.5s), optional countdown
        this._clearTimer();
        const duration = options.duration || 2500;
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

    // showSuccess(msg, { duration, countdown, onFinish }) or showSuccess(msg, 5, true)
    showSuccess: function (message, durationOrOptions, showCountdown) {
        let options = {};
        if (typeof durationOrOptions === "number") {
            options.duration = durationOrOptions * 1000;
            if (showCountdown) options.countdown = true;
        } else if (durationOrOptions && typeof durationOrOptions === "object") {
            options = durationOrOptions;
        }
        this._show("success", message || "Success", options);
    },

    showError: function (message, durationOrOptions, showCountdown) {
        let options = {};
        if (typeof durationOrOptions === "number") {
            options.duration = durationOrOptions * 1000;
            if (showCountdown) options.countdown = true;
        } else if (durationOrOptions && typeof durationOrOptions === "object") {
            options = durationOrOptions;
        }
        this._show("error", message || "Failed", options);
    },

    hide: function () {
        this._clearTimer();
        if (!this._inited) return;
        this._root.hide();
    },
};

export default TipView;


