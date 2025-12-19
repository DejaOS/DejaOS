import dxui from "../../dxmodules/dxUi.js";
import dxDriver from "../../dxmodules/dxDriver.js";
import std from "../../dxmodules/dxStd.js";
import pwm from "../../dxmodules/dxPwm.js";
import UIManager from "./UIManager.js";

// Global tip view (success / error), attached to TOP layer, shows a centered small card.
// Usage examples:
//   TipView.showSuccess("Password set");
//   TipView.showError("Passwords do not match");
const TipView = {
    _inited: false,
    _root: null,
    _card: null,
    _icon: null,
    _label: null,
    _hideTimer: null,
    _countdownTimer: null,
    _baseMessage: "",

    // Theme config: background / text color / icon / sound
    _themes: {
        success: {
            bg: 0xe6f7e9,
            text: 0x1f8b4d,
            icon: "/app/code/resource/image/tip_success.png",
            beep: () => {
                try {
                    pwm.successBeep();
                } catch (e) { }
            },
        },
        error: {
            bg: 0xffecec,
            text: 0xcc3333,
            icon: "/app/code/resource/image/tip_error.png",
            beep: () => {
                try {
                    pwm.failBeep();
                } catch (e) { }
            },
        },
    },

    init: function () {
        if (this._inited) return;

        const width = dxDriver.DISPLAY.WIDTH || 480;
        const height = dxDriver.DISPLAY.HEIGHT || 320;

        // Transparent full‑screen overlay on TOP layer to stay above everything
        this._root = dxui.View.build("tip_root", dxui.Utils.LAYER.TOP);
        this._root.setSize(width, height);
        this._root.bgOpa(0);
        this._root.radius(0);
        this._root.borderWidth(0);
        this._root.padAll(0);
        this._root.scroll(false);

        // Center card
        this._card = dxui.View.build("tip_card", this._root);
        const cardWidth = 320;
        const cardHeight = 96;
        this._card.setSize(cardWidth, cardHeight);
        this._card.radius(10);
        this._card.borderWidth(0);
        this._card.padAll(12);
        this._card.scroll(false);
        this._card.align(dxui.Utils.ALIGN.CENTER, 0, -10);

        // Icon
        this._icon = dxui.Image.build("tip_icon", this._card);
        this._icon.setSize(32, 32);
        this._icon.align(dxui.Utils.ALIGN.LEFT_MID, 4, 0);

        // Text
        this._label = dxui.Label.build("tip_label", this._card);
        this._label.text("");
        this._label.textFont(UIManager.font(18, dxui.Utils.FONT_STYLE.NORMAL));
        // To wrap long text, we must limit label width and enable WRAP mode
        const labelWidth = cardWidth - 44 - 16; // leave space for icon and right margin
        this._label.setSize(labelWidth, cardHeight - 24);
        this._label.longMode(dxui.Utils.LABEL_LONG_MODE.WRAP);
        this._label.align(dxui.Utils.ALIGN.LEFT_MID, 44, 0);

        // Hidden by default
        this._root.hide();

        this._inited = true;
    },

    _applyTheme: function (type) {
        const theme = this._themes[type] || this._themes.success;
        if (!theme) return;
        this._card.bgColor(theme.bg);
        this._label.textColor(theme.text);
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

        // Show first, then play sound
        this._root.show();
        this._card.show();

        // Sound hint (can be disabled via options.silent)
        if (!options.silent && theme && typeof theme.beep === "function") {
            theme.beep();
        }

        // Auto hide (default 2.5s), optional countdown display
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

    // Two calling styles:
    // 1) showSuccess(msg, { duration, countdown, onFinish })
    // 2) showSuccess(msg, 5, true) // 5 seconds, with countdown
    showSuccess: function (message, durationOrOptions, showCountdown) {
        let options = {};
        if (typeof durationOrOptions === "number") {
            options.duration = durationOrOptions * 1000;
            if (showCountdown) options.countdown = true;
        } else if (durationOrOptions && typeof durationOrOptions === "object") {
            options = durationOrOptions;
        }
        this._show("success", message || "Done", options);
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


