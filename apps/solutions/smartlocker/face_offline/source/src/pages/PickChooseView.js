import dxui from "../../dxmodules/dxUi.js";
import dxDriver from "../../dxmodules/dxDriver.js";
import UIManager from "./UIManager.js";

// Pick method dialog: temp use / clear use
// Usage: PickChooseView.show({ onTemp: () => {}, onClear: () => {}, onCancel: () => {} });
const PickChooseView = {
    _inited: false,
    _root: null,
    _card: null,
    _onTemp: null,
    _onClear: null,
    _onCancel: null,

    init: function () {
        if (this._inited) return;

        const W = dxDriver.DISPLAY.WIDTH;
        const H = dxDriver.DISPLAY.HEIGHT;

        // Full-screen semi-transparent overlay
        this._root = dxui.View.build("pick_choose_root", dxui.Utils.LAYER.TOP);
        this._root.setSize(W, H);
        this._root.bgColor(0x000000);
        this._root.bgOpa(120);
        this._root.radius(0);
        this._root.borderWidth(0);
        this._root.padAll(0);
        this._root.scroll(false);

        // Centered card
        const cardW = Math.round(W * 0.75);
        const cardH = Math.round(H * 0.38);
        this._card = dxui.View.build("pick_choose_card", this._root);
        this._card.setSize(cardW, cardH);
        this._card.radius(Math.round(W * 0.03));
        this._card.borderWidth(0);
        this._card.bgColor(0xffffff);
        this._card.align(dxui.Utils.ALIGN.CENTER, 0, 0);
        this._card.scroll(false);

        const titleFontSize = Math.round(H * 0.035);
        const descFontSize = Math.round(H * 0.022);
        const btnFontSize = Math.round(H * 0.028);
        const btnW = Math.round(cardW * 0.38);
        const btnH = Math.round(H * 0.065);
        const btnRadius = Math.round(btnH / 2);
        const btnGap = Math.round(cardW * 0.06);

        // Title
        this._titleLabel = dxui.Label.build("pick_choose_title", this._card);
        this._titleLabel.text("Choose pick method");
        this._titleLabel.textFont(UIManager.font(titleFontSize, dxui.Utils.FONT_STYLE.BOLD));
        this._titleLabel.textColor(0x333333);
        this._titleLabel.setSize(Math.round(cardW * 0.9), Math.round(H * 0.05));
        this._titleLabel.align(dxui.Utils.ALIGN.TOP_MID, 0, Math.round(cardH * 0.12));

        // Description
        this._descLabel = dxui.Label.build("pick_choose_desc", this._card);
        this._descLabel.text("Temp use: cabinet remains yours. Clear use: cabinet is released.");
        this._descLabel.textFont(UIManager.font(descFontSize, dxui.Utils.FONT_STYLE.NORMAL));
        this._descLabel.textColor(0x999999);
        this._descLabel.setSize(Math.round(cardW * 0.85), Math.round(H * 0.06));
        this._descLabel.longMode(dxui.Utils.LABEL_LONG_MODE.WRAP);
        this._descLabel.align(dxui.Utils.ALIGN.TOP_MID, 0, Math.round(cardH * 0.38));

        // Close button: top right
        const closeBtnSize = Math.round(H * 0.045);
        const closeFontSize = Math.round(H * 0.028);
        this._btnClose = dxui.Button.build("pick_choose_close", this._card);
        this._btnClose.setSize(closeBtnSize, closeBtnSize);
        this._btnClose.radius(0);
        this._btnClose.bgOpa(0);
        this._btnClose.borderWidth(0);
        this._btnClose.align(dxui.Utils.ALIGN.TOP_RIGHT, -Math.round(cardW * 0.03), Math.round(cardH * 0.04));

        this._btnCloseLabel = dxui.Label.build("pick_choose_close_label", this._btnClose);
        this._btnCloseLabel.text("X");
        this._btnCloseLabel.textFont(UIManager.font(closeFontSize, dxui.Utils.FONT_STYLE.BOLD));
        this._btnCloseLabel.textColor(0x999999);
        this._btnCloseLabel.align(dxui.Utils.ALIGN.CENTER, 0, 0);

        // Temp use button
        this._btnTemp = dxui.Button.build("pick_choose_temp", this._card);
        this._btnTemp.setSize(btnW, btnH);
        this._btnTemp.radius(btnRadius);
        this._btnTemp.bgColor(0xffa31f);
        this._btnTemp.align(
            dxui.Utils.ALIGN.BOTTOM_MID,
            -Math.round(btnW / 2 + btnGap / 2),
            -Math.round(cardH * 0.12)
        );

        this._btnTempLabel = dxui.Label.build("pick_choose_temp_label", this._btnTemp);
        this._btnTempLabel.text("Temp Use");
        this._btnTempLabel.textFont(UIManager.font(btnFontSize, dxui.Utils.FONT_STYLE.NORMAL));
        this._btnTempLabel.textColor(0xffffff);
        this._btnTempLabel.align(dxui.Utils.ALIGN.CENTER, 0, 0);

        // Clear use button
        this._btnClear = dxui.Button.build("pick_choose_clear", this._card);
        this._btnClear.setSize(btnW, btnH);
        this._btnClear.radius(btnRadius);
        this._btnClear.bgColor(0xffa31f);
        this._btnClear.align(
            dxui.Utils.ALIGN.BOTTOM_MID,
            Math.round(btnW / 2 + btnGap / 2),
            -Math.round(cardH * 0.12)
        );

        this._btnClearLabel = dxui.Label.build("pick_choose_clear_label", this._btnClear);
        this._btnClearLabel.text("Clear Use");
        this._btnClearLabel.textFont(UIManager.font(btnFontSize, dxui.Utils.FONT_STYLE.NORMAL));
        this._btnClearLabel.textColor(0xffffff);
        this._btnClearLabel.align(dxui.Utils.ALIGN.CENTER, 0, 0);

        // Event bindings
        this._btnClose.on(dxui.Utils.EVENT.CLICK, () => {
            this.hide();
            if (typeof this._onCancel === "function") this._onCancel();
        });

        this._btnTemp.on(dxui.Utils.EVENT.CLICK, () => {
            this.hide();
            if (typeof this._onTemp === "function") this._onTemp();
        });

        this._btnClear.on(dxui.Utils.EVENT.CLICK, () => {
            this.hide();
            if (typeof this._onClear === "function") this._onClear();
        });

        this._root.hide();
        this._inited = true;
    },

    /**
     * Show pick method dialog.
     * @param {object} options onTemp, onClear, onCancel
     */
    show: function (options) {
        if (!this._inited) this.init();

        this._onTemp = (options && options.onTemp) || null;
        this._onClear = (options && options.onClear) || null;
        this._onCancel = (options && options.onCancel) || null;

        this._root.show();
    },

    hide: function () {
        if (!this._inited) return;
        this._root.hide();
    },
};

export default PickChooseView;
