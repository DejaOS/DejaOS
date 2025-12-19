import dxui from "../../../dxmodules/dxUi.js";
import log from "../../../dxmodules/dxLogger.js";
import std from "../../../dxmodules/dxStd.js";
import dxDriver from "../../../dxmodules/dxDriver.js";
import UIManager from "../UIManager.js";
import LockerService from "../../lock/LockerService.js";

// Admin: open all cabinets in sequence (layout similar to StoreConfirmPage)
const OpenAllCabinetsPage = {
    id: "adminOpenAll",

    init: function () {
        const parent = UIManager.getRoot();

        this.root = dxui.View.build(this.id, parent);
        this.root.setSize(dxDriver.DISPLAY.WIDTH, dxDriver.DISPLAY.HEIGHT);
        this.root.radius(0);
        this.root.borderWidth(0);
        this.root.padAll(0);
        this.root.bgColor(0xf5f7fa);

        this._cabinetNo = 1; // current cabinet number to open
        this._maxCabinetNo = 30;
        this._timer = null;

        this._initView();
        this._bindEvents();

        return this.root;
    },

    _initView: function () {
        // Top tip
        this.tipLabel = dxui.Label.build(this.id + "_tip", this.root);
        this.tipLabel.text("Opening cabinet:");
        this.tipLabel.textFont(UIManager.font(20, dxui.Utils.FONT_STYLE.NORMAL));
        this.tipLabel.align(dxui.Utils.ALIGN.TOP_MID, 0, 60);

        // Big cabinet number in center
        this.cabLabel = dxui.Label.build(this.id + "_cab", this.root);
        this.cabLabel.text(String(this._cabinetNo));
        this.cabLabel.textFont(UIManager.font(80, dxui.Utils.FONT_STYLE.BOLD));
        this.cabLabel.align(dxui.Utils.ALIGN.CENTER, 0, -10);

        // Bottom button - Cancel (same visual style as StoreConfirmPage)
        this.btnCancel = dxui.Button.build(this.id + "_cancel", this.root);
        this.btnCancel.setSize(200, 56);
        this.btnCancel.radius(28);
        this.btnCancel.bgColor(0xcccccc);
        this.btnCancel.align(dxui.Utils.ALIGN.BOTTOM_MID, 0, -40);

        this.btnCancelLabel = dxui.Label.build(
            this.id + "_cancel_label",
            this.btnCancel
        );
        this.btnCancelLabel.text("Cancel");
        this.btnCancelLabel.textFont(
            UIManager.font(22, dxui.Utils.FONT_STYLE.NORMAL)
        );
        this.btnCancelLabel.textColor(0x333333);
        this.btnCancelLabel.align(dxui.Utils.ALIGN.CENTER, 0, 0);
    },

    _bindEvents: function () {
        // Cancel: stop timer and close this page
        this.btnCancel.on(dxui.Utils.EVENT.CLICK, () => {
            this._clearTimer();
            this.close();
        });
    },

    _startTimer: function () {
        this._clearTimer();
        if (!this._maxCabinetNo || this._maxCabinetNo <= 0) {
            return;
        }

        // Open first cabinet immediately
        LockerService.openCabinet(this._cabinetNo);
        this.cabLabel.text(String(this._cabinetNo));

        this._timer = std.setInterval(() => {
            if (this._cabinetNo >= this._maxCabinetNo) {
                this._clearTimer();
                return;
            }
            this._cabinetNo += 1;
            LockerService.openCabinet(this._cabinetNo);
            this.cabLabel.text(String(this._cabinetNo));
        }, 1000);
    },

    _clearTimer: function () {
        if (this._timer) {
            std.clearInterval(this._timer);
            this._timer = null;
        }
    },

    onShow: function () {
        // Each time we enter, start counting from 1
        this._cabinetNo = 1;
        // And refresh total cabinet count
        this._clearTimer();
        try {
            const total = LockerService.getTotalCabinetCount();
            this._maxCabinetNo = Number(total) || 0;
        } catch (e) {
            log.error("adminOpenAll", "failed to get total cabinet count", e);
            this._maxCabinetNo = 0;
        }

        if (this._maxCabinetNo <= 0) {
            this.cabLabel.text("-");
            return;
        }

        this._cabinetNo = 1;
        this._startTimer();
    },

    onHide: function () {
        this._clearTimer();
    },
};

export default OpenAllCabinetsPage;


