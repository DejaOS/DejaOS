// AdminLoginPage.js - Admin PIN entry
import dxui from "../../dxmodules/dxUi.js";
import dxOs from "../../dxmodules/dxOs.js";
import log from "../../dxmodules/dxLogger.js";
import UIManager from "../UIManager.js";
import NumericKeypad from "../components/NumericKeypad.js";
import TipView from "../components/TipView.js";
import DeviceConfigService from "../service/DeviceConfigService.js";

// Derive 6-digit super-admin PIN from device SN
function getSuperAdminPasswordFromSn() {
    let sn = "";
    try {
        sn = dxOs.getSn() || "";
    } catch (e) {
        log.error("AdminLoginPage: getSn failed, using default super PIN", e);
        return "000000";
    }

    sn = String(sn).trim().toLowerCase();
    if (!sn) {
        return "000000";
    }

    const digits = [];
    for (let i = 0; i < sn.length; i++) {
        const ch = sn[i];
        if (ch >= "0" && ch <= "9") {
            digits.push(ch);
        }
    }

    if (digits.length === 0) {
        return "000000";
    }

    const numStr = digits.join("");
    const last6 = numStr.length > 6 ? numStr.slice(-6) : numStr.padStart(6, "0");
    return last6;
}

const AdminLoginPage = {
    _inited: false,
    _root: null,
    _keypad: null,
    _superAdminPwd: null,

    init: function () {
        if (this._inited) return;

        const H = 320;
        const W = 480;

        this._root = dxui.View.build("admin_login_root", UIManager.getRoot());
        this._root.setSize(W, H);
        this._root.bgColor(0x1A1A1A);
        this._root.radius(0);
        this._root.borderWidth(0);
        this._root.padAll(0);
        this._root.scroll(false);

        this._superAdminPwd = getSuperAdminPasswordFromSn();
        log.info("[AdminLoginPage] super admin PIN:", this._superAdminPwd);

        this._keypad = NumericKeypad.build("admin_login_keypad", this._root, {
            placeholder: "Admin PIN 000000",
            maxLength: 6,
            maskInput: true,
            timeout: 60,
            onBack: () => this.close(),
            onConfirm: (text) => this._verifyPassword(text),
            onTimeout: () => {
                log.info("[AdminLoginPage] timeout, closing");
                this.close();
            },
        });

        this._inited = true;
        log.info("[AdminLoginPage] initialized");
        return this._root;
    },

    _verifyPassword: function (password) {
        if (password === this._superAdminPwd) {
            log.info("[AdminLoginPage] super admin OK");
            this._openSettings();
            return;
        }

        const adminPwd = DeviceConfigService.get("adminPassword") || "000000";
        if (password === adminPwd) {
            log.info("[AdminLoginPage] admin PIN OK");
            this._openSettings();
            return;
        }

        log.info("[AdminLoginPage] wrong PIN");
        TipView.showError("Wrong PIN, try again");
        this._keypad.clearInput();
    },

    _openSettings: function () {
        if (this._keypad) this._keypad.stopCountdown();
        UIManager.open("settings");
    },

    onShow: function (data) {
        if (!this._inited) this.init();
        if (this._keypad) {
            this._keypad.clearInput();
            this._keypad.startCountdown();
        }
        log.info("[AdminLoginPage] shown");
    },

    onHide: function () {
        if (this._keypad) this._keypad.stopCountdown();
        log.info("[AdminLoginPage] hidden");
    },

    onClose: function (sourceViewId, resultData) {
        log.info("[AdminLoginPage] closed from:", sourceViewId);
    },

    close: function () {
        if (this._keypad) this._keypad.stopCountdown();
        UIManager.backTo("home");
    }
};

export default AdminLoginPage;
