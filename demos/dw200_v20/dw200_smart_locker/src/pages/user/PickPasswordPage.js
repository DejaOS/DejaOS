import dxui from "../../../dxmodules/dxUi.js";
import log from "../../../dxmodules/dxLogger.js";
import dxDriver from "../../../dxmodules/dxDriver.js";
import UIManager from "../UIManager.js";
import PasswordView from "../PasswordView.js";
import TipView from "../TipView.js";
import LockerService from "../../lock/LockerService.js";

// User pickup: enter pickup password (single input)
const PickPasswordPage = {
    id: "userPickPassword",

    init: function () {
        const parent = UIManager.getRoot();

        this.root = dxui.View.build(this.id, parent);
        this.root.setSize(dxDriver.DISPLAY.WIDTH, dxDriver.DISPLAY.HEIGHT);
        this.root.radius(0);
        this.root.borderWidth(0);
        this.root.padAll(0);
        this.root.bgColor(0xf5f7fa);

        this.data = {
            cabinetNo: 0,
            pwd: "",
        };

        this._initView();

        return this.root;
    },

    _initView: function () {
        // Top tip: "Enter 6-digit password for cabinet X"
        this.tipLabel = dxui.Label.build(this.id + "_tip", this.root);
        this.tipLabel.text(this._buildTipText());
        this.tipLabel.textFont(UIManager.font(20, dxui.Utils.FONT_STYLE.NORMAL));
        this.tipLabel.setPos(12, 8);

        // Top-right "Cancel" button: back to home
        this.topCancelBtn = dxui.Button.build(this.id + "_top_cancel", this.root);
        this.topCancelBtn.setSize(80, 32);
        this.topCancelBtn.radius(8);
        this.topCancelBtn.borderWidth(0);
        this.topCancelBtn.bgColor(0xcccccc);
        this.topCancelBtn.scroll(false);
        this.topCancelBtn.setPos(dxDriver.DISPLAY.WIDTH - 80 - 16, 8);

        this.topCancelLabel = dxui.Label.build(
            this.id + "_top_cancel_label",
            this.topCancelBtn
        );
        this.topCancelLabel.text("Cancel");
        this.topCancelLabel.textFont(UIManager.font(16, dxui.Utils.FONT_STYLE.NORMAL));
        this.topCancelLabel.textColor(0x333333);
        this.topCancelLabel.align(dxui.Utils.ALIGN.CENTER, 0, 0);

        // Middle: single password field (like set-password page)
        this.field = dxui.View.build(this.id + "_field", this.root);
        this.field.setSize(260, 40);
        this.field.radius(8);
        this.field.borderWidth(2);
        this.field.setPos(
            (dxDriver.DISPLAY.WIDTH - 260) / 2,
            40
        );
        this.field.scroll(false);

        this.fieldLabel = dxui.Label.build(
            this.id + "_field_label",
            this.field
        );
        this.fieldLabel.text("Enter password");
        this.fieldLabel.textFont(UIManager.font(20, dxui.Utils.FONT_STYLE.NORMAL));
        this.fieldLabel.align(dxui.Utils.ALIGN.CENTER, 0, 0);

        // Clear current input when clicking the field
        this.field.on(dxui.Utils.EVENT.CLICK, () => {
            this.data.pwd = "";
            this._refreshFieldText();
        });

        // Bottom: common numeric keypad (fixed at bottom)
        this.pwdView = PasswordView.build(this.id + "_pwd", this.root, {
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

        // Top Cancel button: back to home
        this.topCancelBtn.on(dxui.Utils.EVENT.CLICK, () => {
            this.backTo("home");
        });
    },

    _buildTipText: function () {
        if (this.data.cabinetNo) {
            return `Enter 6-digit password for cabinet ${this.data.cabinetNo}:`;
        }
        return "Enter 6-digit pickup password:";
    },

    _refreshFieldText: function () {
        if (this.data.pwd.length > 0) {
            this.fieldLabel.text("*".repeat(this.data.pwd.length));
        } else {
            this.fieldLabel.text("Enter password");
        }
    },

    _onDigit: function (d) {
        if (this.data.pwd.length >= 6) return;
        this.data.pwd += d;
        this._refreshFieldText();
    },

    _onDelete: function () {
        if (this.data.pwd.length > 0) {
            this.data.pwd = this.data.pwd.slice(0, -1);
            this._refreshFieldText();
        }
    },

    _handleConfirm: function () {
        if (this.data.pwd.length !== 6) {
            TipView.showError("Password must be 6 digits");
            return;
        }

        // Use LockerService to handle pickup (validate password + open + update DB)
        const result = LockerService.handlePickupByPassword(
            this.data.cabinetNo,
            this.data.pwd
        );

        if (!result || !result.ok) {
            // Show detailed error text based on reason
            const reason = result && result.reason;
            if (reason === "PWD_ERROR") {
                TipView.showError("Wrong password, try again", {
                    duration: 3000,
                    countdown: false,
                    onFinish: () => {
                        this.backTo("home");
                    },
                });
            } else if (reason === "NO_ITEM") {
                TipView.showError("No item in this cabinet", {
                    duration: 3000,
                    countdown: false,
                    onFinish: () => {
                        this.backTo("home");
                    },
                });
            } else if (reason === "NO_CONFIG") {
                TipView.showError("No groups configured, contact admin", {
                    duration: 3000,
                    countdown: false,
                    onFinish: () => {
                        this.backTo("home");
                    },
                });
            } else if (reason === "OUT_OF_RANGE") {
                TipView.showError("Cabinet no longer valid, choose again", {
                    duration: 3000,
                    countdown: false,
                    onFinish: () => {
                        this.backTo("home");
                    },
                });
            } else {
                TipView.showError("Pickup failed, try again", {
                    duration: 3000,
                    countdown: false,
                    onFinish: () => {
                        this.backTo("home");
                    },
                });
            }
            return;
        }

        log.info(
            `PickPasswordPage: password OK, cabinetNo=${this.data.cabinetNo}`
        );

        // Success: show 5s countdown then back home, also refresh free-cabinet text
        TipView.showSuccess(
            `Cabinet ${this.data.cabinetNo} opened, take items and close the door`,
            {
                duration: 5000,
                countdown: true,
                onFinish: () => {
                    this.backTo("home", { refreshRemain: true });
                },
            }
        );
    },

    onShow: function (data) {
        if (data && data.cabinetNo) {
            this.data.cabinetNo = data.cabinetNo;
            this.tipLabel.text(this._buildTipText());
        }
        // Reset password input
        this.data.pwd = "";
        this._refreshFieldText();
    },

    onHide: function () { },
};

export default PickPasswordPage;


