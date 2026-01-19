import dxui from "../../../dxmodules/dxUi.js";
import log from "../../../dxmodules/dxLogger.js";
import dxDriver from "../../../dxmodules/dxDriver.js";
import UIManager from "../UIManager.js";
import PasswordView from "../PasswordView.js";
import TipView from "../TipView.js";
import LockerService from "../../lock/LockerService.js";

// Admin: manually enter cabinet number and open directly (no password)
// UI is based on user PickCabinetPage without countdown and password steps
const AdminOpenCabinetPage = {
    id: "adminOpenCabinet",

    init: function () {
        const parent = UIManager.getRoot();

        this.root = dxui.View.build(this.id, parent);
        this.root.setSize(dxDriver.DISPLAY.WIDTH, dxDriver.DISPLAY.HEIGHT);
        this.root.radius(0);
        this.root.borderWidth(0);
        this.root.padAll(0);
        this.root.bgColor(0xf5f7fa);

        this.data = {
            cabinetNo: "", // cabinet number typed by admin
        };

        this._initView();

        return this.root;
    },

    _initView: function () {
        // Top tip
        this.tipLabel = dxui.Label.build(this.id + "_tip", this.root);
        this.tipLabel.text("Enter cabinet number:");
        this.tipLabel.textFont(UIManager.font(20, dxui.Utils.FONT_STYLE.NORMAL));
        this.tipLabel.setPos(12, 8);

        // Right button: cancel, back to admin home
        this.btnCancel = dxui.Button.build(this.id + "_cancel", this.root);
        this.btnCancel.setSize(80, 40);
        this.btnCancel.radius(8);
        this.btnCancel.borderWidth(0);
        this.btnCancel.bgColor(0xcccccc);
        this.btnCancel.scroll(false);
        this.btnCancel.setPos(dxDriver.DISPLAY.WIDTH - 80 - 20, 8);

        this.btnCancelLabel = dxui.Label.build(
            this.id + "_cancel_label",
            this.btnCancel
        );
        this.btnCancelLabel.text("Back");
        this.btnCancelLabel.textFont(UIManager.font(16, dxui.Utils.FONT_STYLE.NORMAL));
        this.btnCancelLabel.textColor(0x333333);
        this.btnCancelLabel.align(dxui.Utils.ALIGN.CENTER, 0, 0);

        // Center: show entered cabinet number (numbers only, text handled by tipLabel)
        this.cabLabel = dxui.Label.build(this.id + "_cab", this.root);
        this.cabLabel.text(" ");
        this.cabLabel.textFont(UIManager.font(64, dxui.Utils.FONT_STYLE.BOLD));
        this.cabLabel.bgColor(0xe0f3ff);
        const cabWidth = 220;
        const cabHeight = 64;
        this.cabLabel.setSize(cabWidth, cabHeight);
        const cabX = (dxDriver.DISPLAY.WIDTH - cabWidth) / 2 + 80;
        const cabY = 2;
        this.cabLabel.setPos(cabX, cabY);

        // Bottom keypad
        this.keypad = PasswordView.build(this.id + "_keypad", this.root, {
            onDigit: (d) => {
                this._onDigit(d);
            },
            onDelete: () => {
                this._onDelete();
            },
            onConfirm: () => {
                this._handleConfirm();
            },
        });

        // Bind button events
        this._bindEvents();
    },

    _bindEvents: function () {
        // Cancel: back to admin home
        this.btnCancel.on(dxui.Utils.EVENT.CLICK, () => {
            this.backTo("adminHome");
        });
    },

    _updateCabinetText: function () {
        if (this.data.cabinetNo) {
            this.cabLabel.text(this.data.cabinetNo);
        } else {
            this.cabLabel.text(" ");
        }
    },

    _onDigit: function (d) {
        // Limit cabinet number to at most 3 digits
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

    _handleConfirm: function () {
        if (!this.data.cabinetNo) {
            TipView.showError("Enter cabinet number");
            return;
        }

        const no = parseInt(this.data.cabinetNo, 10);
        if (isNaN(no)) {
            TipView.showError(`Invalid cabinet: ${this.data.cabinetNo}`);
            return;
        }

        // Admin: only check config and range; cabinet may be empty
        let total = 0;
        try {
            total = LockerService.getTotalCabinetCount();
        } catch (e) {
            log.error("AdminOpenCabinetPage: failed to get total cabinet count", e);
        }

        if (!total || total <= 0) {
            TipView.showError("No groups configured, set them in admin first");
            return;
        }

        if (no < 1 || no > total) {
            TipView.showError(`Cabinet must be in 1-${total}`);
            return;
        }

        // Fire open-cabinet command (no password)
        LockerService.openCabinet(no);
        log.info(`AdminOpenCabinetPage: sent open command, cabinetNo=${no}`);

        TipView.showSuccess(`Open command sent: No. ${no}`);

        // Reset input for continuous operations
        this.data.cabinetNo = "";
        this._updateCabinetText();
    },

    onShow: function () {
        // Reset state each time page is shown
        this.data.cabinetNo = "";
        this._updateCabinetText();
    },

    onHide: function () {
        // No extra resources to clean
    },
};

export default AdminOpenCabinetPage;



