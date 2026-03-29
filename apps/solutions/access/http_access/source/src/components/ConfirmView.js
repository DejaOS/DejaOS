/**
 * ConfirmView — dim overlay + card + OK / Cancel
 */

import dxui from "../../dxmodules/dxUi.js";
import std from "../../dxmodules/dxStd.js";
import UIManager from "../UIManager.js";

const ConfirmView = {
    _inited: false,
    _root: null,
    _card: null,
    _onConfirm: null,
    _onCancel: null,
    _autoCancelTimer: null,
    _autoCancelMs: 5000,

    _clearAutoCancelTimer: function () {
        if (this._autoCancelTimer) {
            std.clearTimeout(this._autoCancelTimer);
            this._autoCancelTimer = null;
        }
    },

    init: function () {
        if (this._inited) return;

        const W = 480;
        const H = 320;

        // Overlay
        this._root = dxui.View.build("confirm_root", dxui.Utils.LAYER.TOP);
        this._root.setSize(W, H);
        this._root.bgColor(0x000000);
        this._root.bgOpa(120);
        this._root.radius(0);
        this._root.borderWidth(0);
        this._root.padAll(0);
        this._root.scroll(false);

        // Card
        const cardW = Math.round(W * 0.75);
        const cardH = Math.round(H * 0.60);
        this._card = dxui.View.build("confirm_card", this._root);
        this._card.setSize(cardW, cardH);
        this._card.radius(12);
        this._card.borderWidth(0);
        this._card.bgColor(0xFFFFFF);
        this._card.align(dxui.Utils.ALIGN.CENTER, 0, 0);
        this._card.scroll(false);

        const fontSize = 16;
        const btnFontSize = 18;
        const btnW = Math.round(cardW * 0.35);
        const btnH = 40;
        const btnRadius = 8;
        const btnGap = 15;
        const msgTop = 16;
        const msgBottomPad = btnH + 30;

        // Message
        this._msgLabel = dxui.Label.build("confirm_msg", this._card);
        this._msgLabel.text("");
        this._msgLabel.textFont(UIManager.font(fontSize, dxui.Utils.FONT_STYLE.NORMAL));
        this._msgLabel.textColor(0x333333);
        this._msgLabel.setSize(cardW - 30, cardH - msgTop - msgBottomPad);
        this._msgLabel.longMode(dxui.Utils.LABEL_LONG_MODE.WRAP);
        this._msgLabel.align(dxui.Utils.ALIGN.TOP_MID, 0, msgTop);

        // Cancel
        this._btnCancel = dxui.Button.build("confirm_cancel", this._card);
        this._btnCancel.setSize(btnW, btnH);
        this._btnCancel.radius(btnRadius);
        this._btnCancel.bgColor(0xE0E0E0);
        this._btnCancel.align(
            dxui.Utils.ALIGN.BOTTOM_MID,
            -Math.round(btnW / 2 + btnGap / 2),
            -15
        );

        const cancelLabel = dxui.Label.build("confirm_cancel_label", this._btnCancel);
        cancelLabel.text("Cancel");
        cancelLabel.textFont(UIManager.font(btnFontSize, dxui.Utils.FONT_STYLE.NORMAL));
        cancelLabel.textColor(0x666666);
        cancelLabel.align(dxui.Utils.ALIGN.CENTER, 0, 0);

        // OK
        this._btnOk = dxui.Button.build("confirm_ok", this._card);
        this._btnOk.setSize(btnW, btnH);
        this._btnOk.radius(btnRadius);
        this._btnOk.bgColor(0xFFA31F);
        this._btnOk.align(
            dxui.Utils.ALIGN.BOTTOM_MID,
            Math.round(btnW / 2 + btnGap / 2),
            -15
        );

        const okLabel = dxui.Label.build("confirm_ok_label", this._btnOk);
        okLabel.text("OK");
        okLabel.textFont(UIManager.font(btnFontSize, dxui.Utils.FONT_STYLE.NORMAL));
        okLabel.textColor(0xFFFFFF);
        okLabel.align(dxui.Utils.ALIGN.CENTER, 0, 0);

        this._btnCancel.on(dxui.Utils.EVENT.CLICK, () => {
            this._clearAutoCancelTimer();
            this.hide();
            if (typeof this._onCancel === "function") this._onCancel();
        });

        this._btnOk.on(dxui.Utils.EVENT.CLICK, () => {
            this._clearAutoCancelTimer();
            this.hide();
            if (typeof this._onConfirm === "function") this._onConfirm();
        });

        this._root.hide();
        this._inited = true;
    },

    show: function (options) {
        if (!this._inited) this.init();

        this._onConfirm = (options && options.onConfirm) || null;
        this._onCancel = (options && options.onCancel) || null;
        this._msgLabel.text((options && options.message) || "Are you sure?");

        this._root.show();

        // Auto-cancel after 5s idle
        this._clearAutoCancelTimer();
        this._autoCancelTimer = std.setTimeout(() => {
            this._autoCancelTimer = null;
            this.hide();
            if (typeof this._onCancel === "function") this._onCancel();
        }, this._autoCancelMs);
    },

    hide: function () {
        this._clearAutoCancelTimer();
        if (!this._inited) return;
        this._root.hide();
    },
};

export default ConfirmView;
