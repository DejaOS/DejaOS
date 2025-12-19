import dxui from "../../../dxmodules/dxUi.js";
import log from "../../../dxmodules/dxLogger.js";
import dxDriver from "../../../dxmodules/dxDriver.js";
import dxOs from "../../../dxmodules/dxOs.js";
import UIManager from "../UIManager.js";
import PasswordView from "../PasswordView.js";
import TipView from "../TipView.js";
import LockerService from "../../lock/LockerService.js";

// Generate a 6-digit super admin password from device UUID (unique per device)
function getSuperAdminPasswordFromUuid() {
    let uuid = "";
    try {
        uuid = dxOs.getUuid() || "";
    } catch (e) {
        log.error("AdminLoginPage: failed to get UUID, using default super password 000000", e);
        return "000000";
    }

    uuid = String(uuid).trim().toLowerCase();
    if (!uuid) {
        // Fallback to fixed value if device returns empty UUID
        return "000000";
    }

    // Simple algorithm: sum charCode * (index+1), then take 6 digits
    let sum = 0;
    for (let i = 0; i < uuid.length; i++) {
        const code = uuid.charCodeAt(i);
        sum += code * (i + 1);
    }

    const num = sum % 1000000; // Ensure in 0..999999
    const pwd = ("000000" + num).slice(-6); // Left-pad to 6 digits
    return pwd;
}

// Admin login password page (single input)
const AdminLoginPage = {
    id: "adminLogin",
  // Cache super admin password for this page to avoid recalculating each time
    superAdminPwd: null,

    init: function () {
        const parent = UIManager.getRoot();

        this.root = dxui.View.build(this.id, parent);
        this.root.setSize(dxDriver.DISPLAY.WIDTH, dxDriver.DISPLAY.HEIGHT);
        this.root.radius(0);
        this.root.borderWidth(0);
        this.root.padAll(0);
    this.root.bgColor(0xf5f7fa);

    // Compute super admin password once on init
        this.superAdminPwd = getSuperAdminPasswordFromUuid();

        this.data = {
            pwd: "",
        };

        this._initView();

        return this.root;
    },

    _initView: function () {
        // Top tip: "Enter admin password"
        this.tipLabel = dxui.Label.build(this.id + "_tip", this.root);
        this.tipLabel.text("Enter admin password:");
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

        // Middle: single input field (same style as pickup password page)
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

        // Clear current input when clicking the input field
        this.field.on(dxui.Utils.EVENT.CLICK, () => {
            this.data.pwd = "";
            this._refreshFieldText();
        });

        // Bottom: common numeric keypad
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

        // Top Cancel button → back to home
        this.topCancelBtn.on(dxui.Utils.EVENT.CLICK, () => {
            this.backTo("home");
        });
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
            TipView.showError("Admin password must be 6 digits");
            return;
        }

        // 1. Super admin password (6 digits from device UUID)
        const SUPER_ADMIN_PWD = this.superAdminPwd || getSuperAdminPasswordFromUuid();
        log.info("AdminLoginPage: super admin password", SUPER_ADMIN_PWD);
        if (this.data.pwd === SUPER_ADMIN_PWD) {
            log.info("AdminLoginPage: login with super admin password");
            this.open("adminHome");
            return;
        }

        // 2. Normal admin password from LockerService / config
        const adminPwd = LockerService.getAdminPassword();

        if (this.data.pwd !== adminPwd) {
            TipView.showError("Wrong admin password, try again");
            // Clear current input so user can start from first digit
            this.data.pwd = "";
            this._refreshFieldText();
            return;
        }

        log.info("AdminLoginPage: admin login success");
        this.open("adminHome");
    },

    onShow: function () {
        // Reset input when page is shown
        this.data.pwd = "";
        this._refreshFieldText();
    },

    onHide: function () { },
};

export default AdminLoginPage;


