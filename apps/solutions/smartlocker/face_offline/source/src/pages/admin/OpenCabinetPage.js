import dxui from "../../../dxmodules/dxUi.js";
import log from "../../../dxmodules/dxLogger.js";
import std from "../../../dxmodules/dxStd.js";
import dxDriver from "../../../dxmodules/dxDriver.js";
import UIManager from "../UIManager.js";
import PasswordView from "../PasswordView.js";
import TipView from "../TipView.js";
import LockerService from "../../lock/LockerService.js";

// Admin: cabinet control. Top: open all / clear all; bottom: open one / clear one (shared keypad, selected state by bg color)
const AdminOpenCabinetPage = {
    id: "adminOpenCabinet",

    init: function () {
        const parent = UIManager.getRoot();

        this.root = dxui.View.build(this.id, parent);
        this.root.setSize(dxDriver.DISPLAY.WIDTH, dxDriver.DISPLAY.HEIGHT);
        this.root.radius(0);
        this.root.borderWidth(0);
        this.root.padAll(0);
        this.root.bgColor(0xebebeb);

        this.data = {
            cabinetNo: "",
            specifyMode: "open", // "open" | "clear": open one cabinet / clear one permission, shared keypad
        };

        this._openAllCabinetNo = 1;
        this._openAllMax = 0;
        this._openAllTimer = null;
        this._openAllFinished = false;

        this._initView();

        return this.root;
    },

    _initView: function () {
        const W = dxDriver.DISPLAY.WIDTH;
        const H = dxDriver.DISPLAY.HEIGHT;

        const titleFontSize = Math.round(H * 0.032);
        const cancelFontSize = Math.round(H * 0.024);
        const subFontSize = Math.round(H * 0.022);
        const fieldFontSize = Math.round(H * 0.024);
        const btnFontSize = Math.round(H * 0.026);
        const keypadH = Math.round(H / 3);
        const fieldH = Math.round(H * 0.055);
        const fieldW = Math.round(W * 0.85);
        const btnW = Math.round(W * 0.42);
        const btnH = Math.round(H * 0.058);
        const btnRadius = Math.round(btnH / 2);
        const gap = Math.round(W * 0.03);

        // ---------- 1. Title + Cancel ----------
        this.title = dxui.Label.build(this.id + "_title", this.root);
        this.title.text("Cabinet Control");
        this.title.textFont(UIManager.font(titleFontSize, dxui.Utils.FONT_STYLE.BOLD));
        this.title.textColor(0x333333);
        this.title.setSize(Math.round(W * 0.6), Math.round(H * 0.05));
        this.title.align(dxui.Utils.ALIGN.TOP_MID, 0, Math.round(H * 0.025));

        this.btnCancel = dxui.Button.build(this.id + "_cancel", this.root);
        this.btnCancel.setSize(Math.round(W * 0.15), Math.round(H * 0.05));
        this.btnCancel.radius(0);
        this.btnCancel.bgOpa(0);
        this.btnCancel.borderWidth(0);
        this.btnCancel.align(dxui.Utils.ALIGN.TOP_RIGHT, -Math.round(W * 0.03), Math.round(H * 0.02));

        const btnCancelLabel = dxui.Label.build(this.id + "_cancel_label", this.btnCancel);
        btnCancelLabel.text("Cancel");
        btnCancelLabel.textFont(UIManager.font(cancelFontSize, dxui.Utils.FONT_STYLE.NORMAL));
        btnCancelLabel.textColor(0x888888);
        btnCancelLabel.align(dxui.Utils.ALIGN.CENTER, 0, 0);

        this.btnCancel.on(dxui.Utils.EVENT.CLICK, () => {
            this._clearOpenAllTimer();
            UIManager.backTo("adminHome");
        });

        // ---------- 2. Top: Open all + Clear all ----------
        const topRowY = Math.round(H * 0.09);
        const topLabelH = Math.round(H * 0.028);

        this.labelTop = dxui.Label.build(this.id + "_label_top", this.root);
        this.labelTop.text("Batch Actions");
        this.labelTop.textFont(UIManager.font(subFontSize, dxui.Utils.FONT_STYLE.NORMAL));
        this.labelTop.textColor(0x666666);
        this.labelTop.setSize(Math.round(W * 0.8), topLabelH);
        this.labelTop.align(dxui.Utils.ALIGN.TOP_MID, 0, topRowY);

        const topBtnY = topRowY + topLabelH + Math.round(H * 0.01);
        const topGridW = btnW * 2 + gap;
        const topStartX = Math.round((W - topGridW) / 2);

        this.btnOpenAll = dxui.Button.build(this.id + "_open_all", this.root);
        this.btnOpenAll.setSize(btnW, btnH);
        this.btnOpenAll.radius(btnRadius);
        this.btnOpenAll.bgColor(0xffa31f);
        this.btnOpenAll.setPos(topStartX, topBtnY);

        const btnOpenAllLabel = dxui.Label.build(this.id + "_open_all_label", this.btnOpenAll);
        btnOpenAllLabel.text("Open All Cabinets");
        btnOpenAllLabel.textFont(UIManager.font(btnFontSize, dxui.Utils.FONT_STYLE.NORMAL));
        btnOpenAllLabel.textColor(0xffffff);
        btnOpenAllLabel.align(dxui.Utils.ALIGN.CENTER, 0, 0);

        this.btnOpenAll.on(dxui.Utils.EVENT.CLICK, () => { this._handleOpenAll(); });

        this.btnClearAll = dxui.Button.build(this.id + "_clear_all", this.root);
        this.btnClearAll.setSize(btnW, btnH);
        this.btnClearAll.radius(btnRadius);
        this.btnClearAll.bgColor(0xffa31f);
        this.btnClearAll.setPos(topStartX + btnW + gap, topBtnY);

        const btnClearAllLabel = dxui.Label.build(this.id + "_clear_all_label", this.btnClearAll);
        btnClearAllLabel.text("Clear All Permissions");
        btnClearAllLabel.textFont(UIManager.font(btnFontSize, dxui.Utils.FONT_STYLE.NORMAL));
        btnClearAllLabel.textColor(0xffffff);
        btnClearAllLabel.align(dxui.Utils.ALIGN.CENTER, 0, 0);

        this.btnClearAll.on(dxui.Utils.EVENT.CLICK, () => { this._handleClearAll(); });

        // ---------- 3. Bottom: Open one / Clear one (shared keypad) ----------
        const bottomLabelY = H - keypadH - fieldH - Math.round(H * 0.02) - btnH - Math.round(H * 0.025);
        this.labelBottom = dxui.Label.build(this.id + "_label_bottom", this.root);
        this.labelBottom.text("Specify cabinet (use keypad below)");
        this.labelBottom.textFont(UIManager.font(subFontSize, dxui.Utils.FONT_STYLE.NORMAL));
        this.labelBottom.textColor(0x666666);
        this.labelBottom.setSize(Math.round(W * 0.9), topLabelH);
        this.labelBottom.align(dxui.Utils.ALIGN.TOP_MID, 0, bottomLabelY);

        const specBtnY = bottomLabelY + topLabelH + Math.round(H * 0.008);
        const specGridW = btnW * 2 + gap;
        const specStartX = Math.round((W - specGridW) / 2);

        this.btnSpecOpen = dxui.Button.build(this.id + "_spec_open", this.root);
        this.btnSpecOpen.setSize(btnW, btnH);
        this.btnSpecOpen.radius(btnRadius);
        this.btnSpecOpen.setPos(specStartX, specBtnY);
        this.btnSpecOpen.on(dxui.Utils.EVENT.CLICK, () => { this._setSpecifyMode("open"); });

        this.btnSpecOpenLabel = dxui.Label.build(this.id + "_spec_open_label", this.btnSpecOpen);
        this.btnSpecOpenLabel.text("Open One Cabinet");
        this.btnSpecOpenLabel.textFont(UIManager.font(btnFontSize, dxui.Utils.FONT_STYLE.NORMAL));
        this.btnSpecOpenLabel.align(dxui.Utils.ALIGN.CENTER, 0, 0);

        this.btnSpecClear = dxui.Button.build(this.id + "_spec_clear", this.root);
        this.btnSpecClear.setSize(btnW, btnH);
        this.btnSpecClear.radius(btnRadius);
        this.btnSpecClear.setPos(specStartX + btnW + gap, specBtnY);
        this.btnSpecClear.on(dxui.Utils.EVENT.CLICK, () => { this._setSpecifyMode("clear"); });

        this.btnSpecClearLabel = dxui.Label.build(this.id + "_spec_clear_label", this.btnSpecClear);
        this.btnSpecClearLabel.text("Clear One Permission");
        this.btnSpecClearLabel.textFont(UIManager.font(btnFontSize, dxui.Utils.FONT_STYLE.NORMAL));
        this.btnSpecClearLabel.align(dxui.Utils.ALIGN.CENTER, 0, 0);

        const fieldY = specBtnY + btnH + Math.round(H * 0.015);
        this.cabField = dxui.View.build(this.id + "_cab_field", this.root);
        this.cabField.setSize(fieldW, fieldH);
        this.cabField.radius(Math.round(fieldH * 0.15));
        this.cabField.borderWidth(0);
        this.cabField.bgColor(0xffffff);
        this.cabField.align(dxui.Utils.ALIGN.TOP_MID, 0, fieldY);
        this.cabField.scroll(false);

        this.cabLabel = dxui.Label.build(this.id + "_cab_label", this.cabField);
        this.cabLabel.text("Enter cabinet no.");
        this.cabLabel.textFont(UIManager.font(fieldFontSize, dxui.Utils.FONT_STYLE.NORMAL));
        this.cabLabel.textColor(0x999999);
        this.cabLabel.align(dxui.Utils.ALIGN.LEFT_MID, Math.round(fieldW * 0.04), 0);

        this.cabField.on(dxui.Utils.EVENT.CLICK, () => {
            this.data.cabinetNo = "";
            this._updateCabinetText();
        });

        this.keypad = PasswordView.build(this.id + "_keypad", this.root, {
            onDigit: (d) => { this._onDigit(d); },
            onDelete: () => { this._onDelete(); },
            onConfirm: () => { this._handleSpecifyConfirm(); },
            onExit: () => { UIManager.backTo("adminHome"); },
        });

        // ---------- 4. Open-all progress panel ----------
        this.openAllPanel = dxui.View.build(this.id + "_open_all_panel", this.root);
        this.openAllPanel.setSize(W, H);
        this.openAllPanel.setPos(0, 0);
        this.openAllPanel.bgOpa(0);
        this.openAllPanel.borderWidth(0);
        this.openAllPanel.padAll(0);

        this.openAllTip = dxui.Label.build(this.id + "_open_all_tip", this.openAllPanel);
        this.openAllTip.text("Opening all cabinet doors");
        this.openAllTip.textFont(UIManager.font(subFontSize, dxui.Utils.FONT_STYLE.NORMAL));
        this.openAllTip.textColor(0x666666);
        this.openAllTip.setSize(Math.round(W * 0.8), Math.round(H * 0.04));
        this.openAllTip.align(dxui.Utils.ALIGN.TOP_MID, 0, Math.round(H * 0.25));

        this.openAllCabLabel = dxui.Label.build(this.id + "_open_all_cab", this.openAllPanel);
        this.openAllCabLabel.text("1");
        this.openAllCabLabel.textFont(UIManager.font(Math.round(H * 0.12), dxui.Utils.FONT_STYLE.BOLD));
        this.openAllCabLabel.textColor(0x333333);
        this.openAllCabLabel.setSize(Math.round(W * 0.4), Math.round(H * 0.15));
        this.openAllCabLabel.align(dxui.Utils.ALIGN.CENTER, 0, 0);

        this.btnOpenAllExit = dxui.Button.build(this.id + "_open_all_exit", this.openAllPanel);
        this.btnOpenAllExit.setSize(btnW, btnH);
        this.btnOpenAllExit.radius(btnRadius);
        this.btnOpenAllExit.bgOpa(0);
        this.btnOpenAllExit.borderWidth(2);
        this.btnOpenAllExit.setBorderColor(0xffa31f);
        this.btnOpenAllExit.align(dxui.Utils.ALIGN.BOTTOM_MID, 0, -Math.round(H * 0.08));

        this.btnOpenAllExitLabel = dxui.Label.build(this.id + "_open_all_exit_label", this.btnOpenAllExit);
        this.btnOpenAllExitLabel.text("Cancel");
        this.btnOpenAllExitLabel.textFont(UIManager.font(btnFontSize, dxui.Utils.FONT_STYLE.NORMAL));
        this.btnOpenAllExitLabel.textColor(0xffa31f);
        this.btnOpenAllExitLabel.align(dxui.Utils.ALIGN.CENTER, 0, 0);

        this.btnOpenAllExit.on(dxui.Utils.EVENT.CLICK, () => { this._exitOpenAllMode(); });

        this.openAllPanel.hide();

        this._updateSpecifyModeStyle();
    },

    _setSpecifyMode: function (mode) {
        this.data.specifyMode = mode === "clear" ? "clear" : "open";
        this._updateSpecifyModeStyle();
    },

    _updateSpecifyModeStyle: function () {
        const isOpen = this.data.specifyMode === "open";
        if (this.btnSpecOpen) {
            this.btnSpecOpen.bgColor(isOpen ? 0x3cbfa5 : 0xffffff);
            if (this.btnSpecOpenLabel) {
                this.btnSpecOpenLabel.textColor(isOpen ? 0xffffff : 0x333333);
            }
        }
        if (this.btnSpecClear) {
            this.btnSpecClear.bgColor(isOpen ? 0xffffff : 0x3cbfa5);
            if (this.btnSpecClearLabel) {
                this.btnSpecClearLabel.textColor(isOpen ? 0x333333 : 0xffffff);
            }
        }
    },

    _showNormalMode: function () {
        this.title.show();
        this.btnCancel.show();
        this.labelTop.show();
        this.btnOpenAll.show();
        this.btnClearAll.show();
        this.labelBottom.show();
        this.btnSpecOpen.show();
        this.btnSpecClear.show();
        this.cabField.show();
        this.keypad.root.show();
        this.openAllPanel.hide();
    },

    _showOpenAllMode: function () {
        this.title.hide();
        this.btnCancel.hide();
        this.labelTop.hide();
        this.btnOpenAll.hide();
        this.btnClearAll.hide();
        this.labelBottom.hide();
        this.btnSpecOpen.hide();
        this.btnSpecClear.hide();
        this.cabField.hide();
        this.keypad.root.hide();
        this.openAllPanel.show();
    },

    _updateCabinetText: function () {
        if (this.data.cabinetNo) {
            this.cabLabel.text(this.data.cabinetNo);
            this.cabLabel.textColor(0x333333);
        } else {
            this.cabLabel.text("Enter cabinet no.");
            this.cabLabel.textColor(0x999999);
        }
    },

    _onDigit: function (d) {
        if (this.data.cabinetNo.length >= 3) return;
        this.data.cabinetNo += d;
        this._updateCabinetText();
    },

    _onDelete: function () {
        if (this.data.cabinetNo.length > 0) {
            this.data.cabinetNo = this.data.cabinetNo.slice(0, -1);
            this._updateCabinetText();
        }
    },

    _handleSpecifyConfirm: function () {
        if (!this.data.cabinetNo) {
            TipView.showError("Please enter cabinet number");
            return;
        }

        const no = parseInt(this.data.cabinetNo, 10);
        if (!Number.isFinite(no)) {
            TipView.showError("Invalid cabinet number format");
            return;
        }

        let total = 0;
        try {
            total = LockerService.getTotalCabinetCount();
        } catch (e) {
            log.error("AdminOpenCabinetPage: Get total cabinet count failed", e);
        }

        if (!total || total <= 0) {
            TipView.showError("Cabinet groups not configured. Please set in admin first.");
            return;
        }

        if (no < 1 || no > total) {
            TipView.showError("Cabinet number out of range (1-" + total + ")");
            return;
        }

        if (this.data.specifyMode === "open") {
            LockerService.openCabinet(no);
            log.info("AdminOpenCabinetPage: Open command sent, cabinetNo=" + no);
            TipView.showSuccess("Open command sent: cabinet " + no);
        } else {
            LockerService.clearCabinetStatusForAdmin(no);
            log.info("AdminOpenCabinetPage: Cleared cabinet permission, cabinetNo=" + no);
            TipView.showSuccess("Cleared cabinet " + no + " permission");
        }

        this.data.cabinetNo = "";
        this._updateCabinetText();
    },

    _handleClearAll: function () {
        let total = 0;
        try {
            total = LockerService.getTotalCabinetCount();
        } catch (e) {
            log.error("AdminOpenCabinetPage: Get total cabinet count failed", e);
        }

        if (!total || total <= 0) {
            TipView.showError("Cabinet groups not configured. Please set first.");
            return;
        }

        LockerService.clearAllCabinetStatusForAdmin();
        log.info("AdminOpenCabinetPage: Cleared all cabinet permissions");
        TipView.showSuccess("Cleared all cabinet permissions");
    },

    _handleOpenAll: function () {
        let total = 0;
        try {
            total = LockerService.getTotalCabinetCount();
        } catch (e) {
            log.error("AdminOpenCabinetPage: Get total cabinet count failed", e);
        }

        if (!total || total <= 0) {
            TipView.showError("Cabinet groups not configured. Please set first.");
            return;
        }

        this._openAllMax = total;
        this._openAllCabinetNo = 1;
        this._openAllFinished = false;
        this.openAllTip.text("Opening all cabinet doors");
        this.btnOpenAllExitLabel.text("Cancel");

        this._showOpenAllMode();
        this._startOpenAllTimer();
    },

    _startOpenAllTimer: function () {
        this._clearOpenAllTimer();
        if (!this._openAllMax || this._openAllMax <= 0) return;

        this.openAllCabLabel.text(String(this._openAllCabinetNo));
        LockerService.openCabinet(this._openAllCabinetNo);

        this._openAllTimer = std.setInterval(() => {
            if (this._openAllCabinetNo >= this._openAllMax) {
                this._clearOpenAllTimer();
                this._openAllFinished = true;
        this.openAllTip.text("All cabinet doors opened");
        this.btnOpenAllExitLabel.text("Exit");
                return;
            }
            this._openAllCabinetNo += 1;
            LockerService.openCabinet(this._openAllCabinetNo);
            this.openAllCabLabel.text(String(this._openAllCabinetNo));
        }, 1000);
    },

    _clearOpenAllTimer: function () {
        if (this._openAllTimer) {
            std.clearInterval(this._openAllTimer);
            this._openAllTimer = null;
        }
    },

    _exitOpenAllMode: function () {
        this._clearOpenAllTimer();
        if (this._openAllFinished) {
            UIManager.backTo("adminHome");
        } else {
            this._showNormalMode();
        }
    },

    onShow: function () {
        this.data.cabinetNo = "";
        this.data.specifyMode = "open";
        this._updateCabinetText();
        this._updateSpecifyModeStyle();
        this._showNormalMode();
    },

    onHide: function () {
        this._clearOpenAllTimer();
    },
};

export default AdminOpenCabinetPage;
