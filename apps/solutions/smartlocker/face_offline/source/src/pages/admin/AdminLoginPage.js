import dxui from "../../../dxmodules/dxUi.js";
import log from "../../../dxmodules/dxLogger.js";
import dxDriver from "../../../dxmodules/dxDriver.js";
import dxOs from "../../../dxmodules/dxOs.js";
import std from "../../../dxmodules/dxStd.js";
import UIManager from "../UIManager.js";
import PasswordView from "../PasswordView.js";
import TipView from "../TipView.js";
import FaceMaskView from "../FaceMaskView.js";
import LockerService from "../../lock/LockerService.js";
import bus from "../../../dxmodules/dxEventBus.js";

// Generate 6-digit super admin password from device UUID (unique per device)
function getSuperAdminPasswordFromUuid() {
    let uuid = "";
    try {
        uuid = dxOs.getSn() || "";
    } catch (e) {
        log.error("AdminLoginPage: Get UUID failed, using default super password 000000", e);
        return "000000";
    }

    uuid = String(uuid).trim().toLowerCase();
    if (!uuid) {
        return "000000";
    }

    // Map hex: 0-9 unchanged; a->9, b->8, c->7, d->6, e->5, f->4. Take first 6, pad end with 0.
    const mapHex = (ch) => {
        if (ch >= "0" && ch <= "9") return ch;
        if (ch >= "a" && ch <= "f") return String(9 - (ch.charCodeAt(0) - "a".charCodeAt(0)));
        return "";
    };

    const numStr = uuid.split("").map(mapHex).filter(Boolean).join("");
    if (!numStr) {
        return "000000";
    }

    const first6 = numStr.length >= 6 ? numStr.slice(0, 6) : numStr.padEnd(6, "0");
    return first6;
}

const AdminLoginPage = {
    id: "adminLogin",
    superAdminPwd: null,

    init: function () {
        const parent = UIManager.getRoot();

        this.root = dxui.View.build(this.id, parent);
        this.root.setSize(dxDriver.DISPLAY.WIDTH, dxDriver.DISPLAY.HEIGHT);
        this.root.radius(0);
        this.root.borderWidth(0);
        this.root.padAll(0);
        this.root.bgColor(0xebebeb);

        this.superAdminPwd = getSuperAdminPasswordFromUuid();

        this.data = {
            pwd: "",
        };

        this._initView();

        return this.root;
    },

    _initView: function () {
        const W = dxDriver.DISPLAY.WIDTH;
        const H = dxDriver.DISPLAY.HEIGHT;

        const titleFontSize = Math.round(H * 0.038);
        const subFontSize = Math.round(H * 0.024);
        const btnFontSize = Math.round(H * 0.026);
        const fieldFontSize = Math.round(H * 0.024);
        const btnW = Math.round(W * 0.55);
        const btnH = Math.round(H * 0.06);
        const btnRadius = Math.round(btnH / 2);
        const btnRowGap = Math.round(H * 0.02);

        const titleH = Math.round(H * 0.05);
        const subH = Math.round(H * 0.04);
        const fieldH = Math.round(H * 0.055);
        const fieldW = Math.round(W * 0.85);
        const cancelFontSize = Math.round(H * 0.024);

        // 1. Title: top left
        this.titleLabel = dxui.Label.build(this.id + "_title", this.root);
        this.titleLabel.text("Admin Login");
        this.titleLabel.textFont(UIManager.font(titleFontSize, dxui.Utils.FONT_STYLE.BOLD));
        this.titleLabel.textColor(0x333333);
        this.titleLabel.setSize(Math.round(W * 0.5), titleH);
        this.titleLabel.align(dxui.Utils.ALIGN.TOP_LEFT, Math.round(W * 0.05), Math.round(H * 0.025));

        // 2. Cancel button: top right
        this.btnCancel = dxui.Button.build(this.id + "_cancel", this.root);
        this.btnCancel.setSize(Math.round(W * 0.15), titleH);
        this.btnCancel.radius(0);
        this.btnCancel.bgOpa(0);
        this.btnCancel.borderWidth(0);
        this.btnCancel.align(dxui.Utils.ALIGN.TOP_RIGHT, -Math.round(W * 0.03), Math.round(H * 0.02));

        this.btnCancelLabel = dxui.Label.build(this.id + "_cancel_label", this.btnCancel);
        this.btnCancelLabel.text("Cancel");
        this.btnCancelLabel.textFont(UIManager.font(cancelFontSize, dxui.Utils.FONT_STYLE.NORMAL));
        this.btnCancelLabel.textColor(0x888888);
        this.btnCancelLabel.align(dxui.Utils.ALIGN.CENTER, 0, 0);

        this.btnCancel.on(dxui.Utils.EVENT.CLICK, () => {
            UIManager.backTo("home");
        });

        // 3. Main content: below title
        let curY = Math.round(H * 0.09);

        // Subtitle
        this.subLabel = dxui.Label.build(this.id + "_sub", this.root);
        this.subLabel.text("Please choose login method");
        this.subLabel.textFont(UIManager.font(subFontSize, dxui.Utils.FONT_STYLE.NORMAL));
        this.subLabel.textColor(0x888888);
        this.subLabel.setSize(Math.round(W * 0.85), subH);
        this.subLabel.align(dxui.Utils.ALIGN.TOP_MID, 0, curY);
        curY += subH + btnRowGap;

        // Face login button (first row, center)
        this.btnFace = dxui.Button.build(this.id + "_face", this.root);
        this.btnFace.setSize(btnW, btnH);
        this.btnFace.radius(btnRadius);
        this.btnFace.bgColor(0xffa31f);
        this.btnFace.align(dxui.Utils.ALIGN.TOP_MID, 0, curY);

        this.btnFaceLabel = dxui.Label.build(this.id + "_face_label", this.btnFace);
        this.btnFaceLabel.text("Face Login");
        this.btnFaceLabel.textFont(UIManager.font(btnFontSize, dxui.Utils.FONT_STYLE.NORMAL));
        this.btnFaceLabel.textColor(0xffffff);
        this.btnFaceLabel.align(dxui.Utils.ALIGN.CENTER, 0, 0);
        curY += btnH + btnRowGap;

        // Password login button (second row, center)
        this.btnPwd = dxui.Button.build(this.id + "_pwdbtn", this.root);
        this.btnPwd.setSize(btnW, btnH);
        this.btnPwd.radius(btnRadius);
        this.btnPwd.bgColor(0xffa31f);
        this.btnPwd.align(dxui.Utils.ALIGN.TOP_MID, 0, curY);

        this.btnPwdLabel = dxui.Label.build(this.id + "_pwdbtn_label", this.btnPwd);
        this.btnPwdLabel.text("Password Login");
        this.btnPwdLabel.textFont(UIManager.font(btnFontSize, dxui.Utils.FONT_STYLE.NORMAL));
        this.btnPwdLabel.textColor(0xffffff);
        this.btnPwdLabel.align(dxui.Utils.ALIGN.CENTER, 0, 0);
        curY += btnH + btnRowGap;

        // Password input field
        this.field = dxui.View.build(this.id + "_field", this.root);
        this.field.setSize(fieldW, fieldH);
        this.field.radius(Math.round(fieldH * 0.15));
        this.field.borderWidth(0);
        this.field.bgColor(0xffffff);
        this.field.align(dxui.Utils.ALIGN.TOP_MID, 0, curY);
        this.field.scroll(false);

        this.fieldLabel = dxui.Label.build(this.id + "_field_label", this.field);
        this.fieldLabel.text("Enter admin password");
        this.fieldLabel.textFont(UIManager.font(fieldFontSize, dxui.Utils.FONT_STYLE.NORMAL));
        this.fieldLabel.textColor(0x999999);
        this.fieldLabel.align(dxui.Utils.ALIGN.LEFT_MID, Math.round(fieldW * 0.04), 0);

        this.field.on(dxui.Utils.EVENT.CLICK, () => {
            this.data.pwd = "";
            this._refreshFieldText();
        });

        // Bottom numeric keypad (1/3 of screen)
        this.pwdView = PasswordView.build(this.id + "_pwd", this.root, {
            onDigit: (d) => { this._onDigit(d); },
            onDelete: () => { this._onDelete(); },
            onConfirm: () => { this._handleConfirm(); },
            onExit: () => { UIManager.backTo("home"); },
        });

        // Hide password field and keypad by default
        this.field.hide();
        this.pwdView.root.hide();

        // Event bindings
        this.btnFace.on(dxui.Utils.EVENT.CLICK, () => {
            this._startFaceLogin();
        });

        this.btnPwd.on(dxui.Utils.EVENT.CLICK, () => {
            this.field.show();
            this.pwdView.root.show();
            this.data.pwd = "";
            this._refreshFieldText();
        });
    },

    _refreshFieldText: function () {
        if (this.data.pwd.length > 0) {
            this.fieldLabel.text("*".repeat(this.data.pwd.length));
            this.fieldLabel.textColor(0x333333);
        } else {
            this.fieldLabel.text("Enter admin password");
            this.fieldLabel.textColor(0x999999);
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

        const SUPER_ADMIN_PWD = this.superAdminPwd || getSuperAdminPasswordFromUuid();
        log.info("AdminLoginPage: Super admin password", SUPER_ADMIN_PWD);
        if (this.data.pwd === SUPER_ADMIN_PWD) {
            log.info("AdminLoginPage: Super admin login success");
            this.open("adminHome");
            return;
        }

        const adminPwd = LockerService.getAdminPassword();

        if (this.data.pwd !== adminPwd) {
            TipView.showError("Wrong admin password, please retry");
            this.data.pwd = "";
            this._refreshFieldText();
            return;
        }

        log.info("AdminLoginPage: Admin login success");
        this.open("adminHome");
    },

    onShow: function () {
        this.data.pwd = "";
        this._refreshFieldText();
        this.field.hide();
        this.pwdView.root.hide();
    },

    _startFaceLogin: function () {
        try {
            FaceMaskView.start((isCancel) => this._exitFaceMode(isCancel));
            FaceMaskView.setHint('info', 'Starting face recognition...');
            try { UIManager.getRoot().hide(); } catch (e) { }
            try { this.root.hide(); } catch (e) { }
            bus.fire('FACE_START');
            bus.on('FACE_RECOGNIZED', (event) => {
                log.info("AdminLoginPage: Face recognition result", event.isRec + "," + event.userId);
                if (event.isRec && event.userId === "admin") {
                    FaceMaskView.setHint('success', 'Admin face recognition success');
                    std.setTimeout(() => {
                        this._exitFaceMode(true);
                        this.open("adminHome");
                    }, 1000);
                } else if (event.isRec) {
                    FaceMaskView.setHint('error', 'You are not admin, cannot login');
                } else {
                    FaceMaskView.setHint('error', 'Face recognition failed, please retry');
                }
            });
        } catch (e) {
            log.error("AdminLoginPage: Face login failed", e);
            TipView.showError("System error, please try again later", 3);
        }
    },

    _exitFaceMode: function (isCancel) {
        if (isCancel) {
            bus.off('FACE_RECOGNIZED');
            bus.fire('FACE_STOP');
            FaceMaskView.clearHint();
            FaceMaskView.hide();
            try { UIManager.getRoot().show(); } catch (e) { }
            try { this.root.show(); } catch (e) { }
        }
    },

    onHide: function () { },
};

export default AdminLoginPage;
