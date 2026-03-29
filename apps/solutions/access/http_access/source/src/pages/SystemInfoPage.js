// SystemInfoPage.js - System info
import dxui from "../../dxmodules/dxUi.js";
import log from "../../dxmodules/dxLogger.js";
import UIManager from "../UIManager.js";
import { COLORS, getDeviceInfo } from "../constants.js";
import ConfirmView from "../components/ConfirmView.js";
import TipView from "../components/TipView.js";
import DeviceConfigService from "../service/DeviceConfigService.js";

const SystemInfoPage = {
    _inited: false,
    _root: null,
    _snValueLabel: null,
    _modelValueLabel: null,
    _appValueLabel: null,
    _urlValueLabel: null,
    _memoryValueLabel: null,
    _storageValueLabel: null,

    /** Admin URL for QR payload */
    _manageUrl: "",
    /** QR overlay created */
    _qrOverlayInited: false,
    _qrOverlay: null,
    _qrCodeObj: null,

    init: function () {
        if (this._inited) return;

        const H = 320;
        const W = 480;
        const rowH = 44;
        /** Taller row for long admin URL */
        const urlRowH = 68;
        const labelW = 110;
        const fontSize = 22;

        // Root
        this._root = dxui.View.build("system_info_root", UIManager.getRoot());
        this._root.setSize(W, H);
        this._root.bgColor(COLORS.dark);
        this._root.radius(0);
        this._root.borderWidth(0);
        this._root.padAll(0);
        this._root.scroll(false);

        const titleLabel = dxui.Label.build("system_info_title", this._root);
        titleLabel.text("System");
        titleLabel.textFont(UIManager.font(24, dxui.Utils.FONT_STYLE.BOLD));
        titleLabel.textColor(0xFFFFFF);
        titleLabel.setSize(W - 88, 40);
        titleLabel.textAlign(dxui.Utils.TEXT_ALIGN.CENTER);
        titleLabel.align(dxui.Utils.ALIGN.TOP_MID, 0, 10);

        // Back
        const backBtn = dxui.View.build("system_info_back", this._root);
        backBtn.setSize(44, 44);
        backBtn.setPos(6, 4);
        backBtn.bgOpa(0);
        backBtn.radius(0);
        backBtn.borderWidth(0);
        backBtn.padAll(0);

        const backImg = dxui.Image.build("system_info_back_img", backBtn);
        backImg.source("/app/code/resource/image/back.png");
        backImg.setSize(24, 24);
        backImg.align(dxui.Utils.ALIGN.CENTER, 0, 0);

        backBtn.on(dxui.Utils.EVENT.CLICK, () => {
            this.close();
        });

        // Label + value row
        const makeRow = (id, labelText, startY) => {
            const lbl = dxui.Label.build(id + "_label", this._root);
            lbl.text(labelText);
            lbl.textFont(UIManager.font(fontSize));
            lbl.textColor(COLORS.gray);
            lbl.setSize(labelW, rowH);
            lbl.align(dxui.Utils.ALIGN.TOP_LEFT, 10, startY);

            const val = dxui.Label.build(id + "_value", this._root);
            val.text("--");
            val.textFont(UIManager.font(fontSize));
            val.textColor(0xFFFFFF);
            val.setSize(W - labelW - 20, rowH);
            val.align(dxui.Utils.ALIGN.TOP_RIGHT, -10, startY);
            return val;
        };

        let curY = 55;

        this._snValueLabel    = makeRow("sn",      "SN:",      curY); curY += rowH;
        this._modelValueLabel = makeRow("model",   "Model:",    curY); curY += rowH;
        this._appValueLabel   = makeRow("app",     "App:",    curY); curY += rowH;

        // Admin URL + QR share
        const urlRowY = curY;
        const urlLbl = dxui.Label.build("url_label", this._root);
        urlLbl.text("Admin URL:");
        urlLbl.textFont(UIManager.font(fontSize));
        urlLbl.textColor(COLORS.gray);
        urlLbl.setSize(labelW, urlRowH);
        urlLbl.align(dxui.Utils.ALIGN.TOP_LEFT, 10, urlRowY);

        const shareBtnW = 108;
        const shareBtnH = 36;
        const urlValW = W - labelW - 20 - shareBtnW - 8;

        this._urlValueLabel = dxui.Label.build("url_value", this._root);
        this._urlValueLabel.text("--");
        this._urlValueLabel.textFont(UIManager.font(fontSize));
        this._urlValueLabel.textColor(0xffffff);
        this._urlValueLabel.setSize(urlValW, urlRowH - 4);
        this._urlValueLabel.setPos(labelW + 10, urlRowY + 2);
        this._urlValueLabel.longMode(dxui.Utils.LABEL_LONG_MODE.WRAP);

        const qrShareBtn = dxui.Button.build("url_qr_share_btn", this._root);
        qrShareBtn.setSize(shareBtnW, shareBtnH);
        qrShareBtn.setPos(W - shareBtnW - 10, urlRowY + Math.floor((urlRowH - shareBtnH) / 2));
        qrShareBtn.bgColor(0x2a5a8a);
        qrShareBtn.radius(6);
        qrShareBtn.borderWidth(0);

        const qrShareLbl = dxui.Label.build("url_qr_share_lbl", qrShareBtn);
        qrShareLbl.text("QR share");
        qrShareLbl.textFont(UIManager.font(16, dxui.Utils.FONT_STYLE.NORMAL));
        qrShareLbl.textColor(0xffffff);
        qrShareLbl.align(dxui.Utils.ALIGN.CENTER, 0, 0);

        qrShareBtn.on(dxui.Utils.EVENT.CLICK, () => {
            this._showManageUrlQr();
        });

        curY += urlRowH;

        // Free memory + clear data
        const memLbl = dxui.Label.build("memory_label", this._root);
        memLbl.text("Free RAM:");
        memLbl.textFont(UIManager.font(fontSize));
        memLbl.textColor(COLORS.gray);
        memLbl.setSize(labelW, rowH);
        memLbl.align(dxui.Utils.ALIGN.TOP_LEFT, 10, curY);

        this._memoryValueLabel = dxui.Label.build("memory_value", this._root);
        this._memoryValueLabel.text("--");
        this._memoryValueLabel.textFont(UIManager.font(fontSize));
        this._memoryValueLabel.textColor(0xFFFFFF);
        this._memoryValueLabel.setSize(170, rowH);
        this._memoryValueLabel.setPos(labelW + 10, curY);

        const clearBtn = dxui.Button.build("clear_data_btn", this._root);
        const btnW = 110;
        const btnH = shareBtnH;
        clearBtn.setSize(btnW, btnH);
        clearBtn.setPos(W - btnW - 10, curY + Math.floor((rowH - btnH) / 2));
        clearBtn.bgColor(COLORS.danger);
        clearBtn.radius(6);
        clearBtn.borderWidth(0);

        const clearLabel = dxui.Label.build("clear_data_label", clearBtn);
        clearLabel.text("Erase data");
        clearLabel.textFont(UIManager.font(16, dxui.Utils.FONT_STYLE.NORMAL));
        clearLabel.textColor(0xFFFFFF);
        clearLabel.align(dxui.Utils.ALIGN.CENTER, 0, 0);

        clearBtn.on(dxui.Utils.EVENT.CLICK, () => {
            this._showClearConfirm();
        });

        curY += rowH - 6;

        this._storageValueLabel = makeRow("storage", "Free storage:", curY);

        // Confirm dialog
        this._initConfirmView();

        this._inited = true;
        log.info("[SystemInfoPage] initialized");
        return this._root;
    },

    /** Match demo lv_qrcode: no padding/radius */
    _clearQrViewStyle: function (obj) {
        obj.radius(0);
        obj.borderWidth(0);
        obj.padAll(0);
    },

    /** Lazy: dim overlay + card + lv_qrcode(admin URL) */
    _initQrShareOverlay: function () {
        if (this._qrOverlayInited) return;

        const W = 480;
        const H = 320;
        const GG = dxui.Utils.GG;
        if (!GG || !GG.NativeBasicComponent) {
            log.error("[SystemInfoPage] NativeBasicComponent unavailable, no QR");
            this._qrOverlayInited = true;
            return;
        }

        this._qrOverlay = dxui.View.build("sysinfo_qr_overlay", dxui.Utils.LAYER.TOP);
        this._qrOverlay.setSize(W, H);
        this._qrOverlay.bgColor(0x000000);
        this._qrOverlay.bgOpa(120);
        this._qrOverlay.radius(0);
        this._qrOverlay.borderWidth(0);
        this._qrOverlay.padAll(0);
        this._qrOverlay.scroll(false);

        const cardW = 420;
        /** Taller card for title / QR / close */
        const cardH = 300;
        const card = dxui.View.build("sysinfo_qr_card", this._qrOverlay);
        card.setSize(cardW, cardH);
        card.bgColor(0xffffff);
        card.radius(12);
        card.borderWidth(0);
        card.align(dxui.Utils.ALIGN.CENTER, 0, 0);
        card.scroll(false);

        const hint = dxui.Label.build("sysinfo_qr_hint", card);
        hint.text("Scan to open admin");
        hint.textFont(UIManager.font(16, dxui.Utils.FONT_STYLE.NORMAL));
        hint.textColor(0x333333);
        hint.setSize(cardW - 24, 22);
        hint.align(dxui.Utils.ALIGN.TOP_MID, 0, 2);

        const qrSize = 188;
        const qrWrap = dxui.View.build("sysinfo_qr_wrap", card);
        this._clearQrViewStyle(qrWrap);
        qrWrap.setSize(qrSize, qrSize);
        /** Nudge up for close button */
        qrWrap.align(dxui.Utils.ALIGN.CENTER, 0, -18);

        try {
            this._qrCodeObj = GG.NativeBasicComponent.lvQrcodeCreate(
                qrWrap.obj,
                qrSize,
                0x000000,
                0xffffff
            );
        } catch (e) {
            log.error("[SystemInfoPage] lvQrcodeCreate failed:", e);
            this._qrCodeObj = null;
        }

        const closeBtn = dxui.Button.build("sysinfo_qr_close", card);
        closeBtn.setSize(120, 40);
        closeBtn.bgColor(0xe0e0e0);
        closeBtn.radius(8);
        closeBtn.borderWidth(0);
        closeBtn.align(dxui.Utils.ALIGN.BOTTOM_MID, 0, -6);
        const closeLbl = dxui.Label.build("sysinfo_qr_close_lbl", closeBtn);
        closeLbl.text("Close");
        closeLbl.textFont(UIManager.font(18, dxui.Utils.FONT_STYLE.NORMAL));
        closeLbl.textColor(0x333333);
        closeLbl.align(dxui.Utils.ALIGN.CENTER, 0, 0);
        closeBtn.on(dxui.Utils.EVENT.CLICK, () => {
            this._hideManageUrlQr();
        });

        this._qrOverlay.hide();
        this._qrOverlayInited = true;
    },

    _showManageUrlQr: function () {
        const url = (this._manageUrl || "").trim();
        if (!url || url === "--") {
            TipView.showError("No admin URL");
            return;
        }
        this._initQrShareOverlay();
        if (!this._qrCodeObj) {
            TipView.showError("QR create failed");
            return;
        }
        try {
            dxui.Utils.GG.NativeBasicComponent.lvQrcodeUpdate(this._qrCodeObj, url);
        } catch (e) {
            log.error("[SystemInfoPage] lvQrcodeUpdate failed:", e);
            TipView.showError("QR update failed");
            return;
        }
        this._qrOverlay.show();
    },

    _hideManageUrlQr: function () {
        if (this._qrOverlay) {
            this._qrOverlay.hide();
        }
    },

    _initConfirmView: function () {
        ConfirmView.init();
    },

    _showClearConfirm: function () {
        ConfirmView.show({
            message: "Erase all data and configuration? Factory reset and reboot.",
            onConfirm: () => {
                DeviceConfigService.clearAllData();
                TipView.showSuccess("Data erased");
            },
            onCancel: () => {}
        });
    },

    _refresh: function () {
        const info = getDeviceInfo();
        this._snValueLabel.text(info.sn || "--");
        this._modelValueLabel.text(info.model || "--");
        this._appValueLabel.text(info.firmware || "--");
        this._manageUrl = info.ip ? `http://${info.ip}:8080` : "";
        this._urlValueLabel.text(this._manageUrl || "--");
        this._memoryValueLabel.text(info.freeMem ? info.freeMem + " KB" : "--");
        this._storageValueLabel.text(info.freeStorage !== undefined ? info.freeStorage + " MB" : "--");
    },

    onShow: function (data) {
        if (!this._inited) this.init();
        this._refresh();
        log.info("[SystemInfoPage] shown");
    },

    onHide: function () {
        this._hideManageUrlQr();
        log.info("[SystemInfoPage] hidden");
    },

    onClose: function (sourceViewId, resultData) {
        log.info("[SystemInfoPage] closed from:", sourceViewId);
    },

    close: function () {
        UIManager.backTo("settings");
    }
};

export default SystemInfoPage;
