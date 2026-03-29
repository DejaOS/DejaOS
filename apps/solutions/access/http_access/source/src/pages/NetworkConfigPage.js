// NetworkConfigPage.js - Network settings
import dxui from "../../dxmodules/dxUi.js";
import std from "../../dxmodules/dxStd.js";
import log from "../../dxmodules/dxLogger.js";
import bus from "../../dxmodules/dxEventBus.js";
import UIManager from "../UIManager.js";
import {
    COLORS,
    EVENT_NETWORK_CONFIG_UPDATE,
    EVENT_WIFI_SHARE_SCANNED,
    isNetworkConnected,
    setScanWifiShare,
} from "../constants.js";
import DeviceConfigService from "../service/DeviceConfigService.js";
import FullKeyboard from "../components/FullKeyboard.js";
import WaitingView from "../components/WaitingView.js";
import TipView from "../components/TipView.js";

const NetworkConfigPage = {
    _inited: false,
    _root: null,
    _networkType: "ETH",
    _keyboard: null,

    init: function () {
        if (this._inited) return;

        const H = 320;
        const W = 480;

        // Root
        this._root = dxui.View.build("network_config_root", UIManager.getRoot());
        this._root.setSize(W, H);
        this._root.bgColor(COLORS.dark);
        this._root.radius(0);
        this._root.borderWidth(0);
        this._root.padAll(0);
        this._root.scroll(true);

        const titleLabel = dxui.Label.build("network_config_title", this._root);
        titleLabel.text("Network");
        titleLabel.textFont(UIManager.font(24, dxui.Utils.FONT_STYLE.BOLD));
        titleLabel.textColor(0xFFFFFF);
        titleLabel.setSize(W - 88, 40);
        titleLabel.textAlign(dxui.Utils.TEXT_ALIGN.CENTER);
        titleLabel.align(dxui.Utils.ALIGN.TOP_MID, 0, 10);

        // Back
        const backBtn = dxui.View.build("network_back", this._root);
        backBtn.setSize(44, 44);
        backBtn.setPos(6, 4);
        backBtn.bgOpa(0);
        backBtn.radius(0);
        backBtn.borderWidth(0);
        backBtn.padAll(0);

        const backImg = dxui.Image.build("network_back_img", backBtn);
        backImg.source("/app/code/resource/image/back.png");
        backImg.setSize(24, 24);
        backImg.align(dxui.Utils.ALIGN.CENTER, 0, 0);

        backBtn.on(dxui.Utils.EVENT.CLICK, () => {
            this.close();
        });

        const noteLabel = dxui.Label.build("network_note", this._root);
        noteLabel.text("Static IP: use web admin or API");
        noteLabel.textFont(UIManager.font(16));
        noteLabel.textColor(COLORS.gray);
        noteLabel.setSize(W - 20, 25);
        noteLabel.align(dxui.Utils.ALIGN.BOTTOM_MID, 0, -4);

        // Link type row
        const typeRowY = 60;
        const typeRowH = 45;
        const leftLabelW = 140;
        const inputX = 10 + leftLabelW + 10;

        const typeLabel = dxui.Label.build("type_label", this._root);
        typeLabel.text("Link type:");
        typeLabel.textFont(UIManager.font(22));
        typeLabel.textColor(COLORS.light);
        typeLabel.setSize(leftLabelW, typeRowH);
        typeLabel.align(dxui.Utils.ALIGN.TOP_LEFT, 10, typeRowY + 10);

        // Dropdown
        this._typeDropdown = dxui.Dropdown.build("type_dropdown", this._root);
        this._typeDropdown.setSize(150, 40);
        this._typeDropdown.setPos(inputX, typeRowY + 5);
        this._typeDropdown.setOptions(["ETH", "WIFI"]);
        this._typeDropdown.setSelected(this._networkType === "WIFI" ? 1 : 0);

        this._typeDropdown.on(dxui.Utils.EVENT.VALUE_CHANGED, () => {
            const idx = this._typeDropdown.getSelected();
            this._setNetworkType(idx === 1 ? "WIFI" : "ETH");
        });

        // Connect
        this._connectBtn = dxui.Button.build("connect_btn", this._root);
        this._connectBtn.setSize(60, 60);
        this._connectBtn.setPos(inputX + 160, typeRowY - 5);
        this._connectBtn.bgColor(COLORS.success);
        this._connectBtn.radius(8);
        this._connectBtn.borderWidth(0);

        const connectLabel = dxui.Label.build("connect_btn_label", this._connectBtn);
        connectLabel.text("Connect");
        connectLabel.textFont(UIManager.font(16));
        connectLabel.textColor(0xFFFFFF);
        connectLabel.align(dxui.Utils.ALIGN.CENTER, 0, 0);

        this._connectBtn.on(dxui.Utils.EVENT.CLICK, () => {
            this._connect();
        });

        // WiFi SSID (WiFi only)
        const wifiRowGap = 12;
        const wifiRowH = 50;
        const ssidY = 125;
        const wifiInputW = 220;
        const scanBtnSize = 80;

        this._ssidLabel = dxui.Label.build("ssid_label", this._root);
        this._ssidLabel.text("WiFi SSID:");
        this._ssidLabel.textFont(UIManager.font(22));
        this._ssidLabel.textColor(COLORS.light);
        this._ssidLabel.setSize(leftLabelW, 50);
        this._ssidLabel.align(dxui.Utils.ALIGN.TOP_LEFT, 10, ssidY + 10);
        this._ssidLabel.hide();

        this._ssidInput = dxui.Button.build("ssid_input", this._root);
        this._ssidInput.setSize(wifiInputW, 45);
        this._ssidInput.setPos(inputX, ssidY + 2);
        this._ssidInput.bgColor(COLORS.secondary);
        this._ssidInput.radius(6);
        this._ssidInput.borderWidth(0);
        this._ssidInput.hide();

        this._ssidInputLabel = dxui.Label.build("ssid_input_label", this._ssidInput);
        this._ssidInputLabel.text("Tap to type or scan QR");
        this._ssidInputLabel.textFont(UIManager.font(16));
        this._ssidInputLabel.textColor(COLORS.gray);
        this._ssidInputLabel.align(dxui.Utils.ALIGN.CENTER, 0, 0);

        this._ssidInput.on(dxui.Utils.EVENT.CLICK, () => {
            this._showKeyboard("ssid");
        });

        // WiFi password
        const pwdY = ssidY + wifiRowH + wifiRowGap;

        this._pwdLabel = dxui.Label.build("pwd_label", this._root);
        this._pwdLabel.text("WiFi password:");
        this._pwdLabel.textFont(UIManager.font(22));
        this._pwdLabel.textColor(COLORS.light);
        this._pwdLabel.setSize(leftLabelW, 50);
        this._pwdLabel.align(dxui.Utils.ALIGN.TOP_LEFT, 10, pwdY + 10);
        this._pwdLabel.hide();

        this._pwdInput = dxui.Button.build("pwd_input", this._root);
        this._pwdInput.setSize(wifiInputW, 45);
        this._pwdInput.setPos(inputX, pwdY + 2);
        this._pwdInput.bgColor(COLORS.secondary);
        this._pwdInput.radius(6);
        this._pwdInput.borderWidth(0);
        this._pwdInput.hide();

        this._pwdInputLabel = dxui.Label.build("pwd_input_label", this._pwdInput);
        this._pwdInputLabel.text("Tap to type or scan QR");
        this._pwdInputLabel.textFont(UIManager.font(16));
        this._pwdInputLabel.textColor(COLORS.gray);
        this._pwdInputLabel.align(dxui.Utils.ALIGN.CENTER, 0, 0);

        this._pwdInput.on(dxui.Utils.EVENT.CLICK, () => {
            this._showKeyboard("password");
        });

        // Scan WiFi QR
        const scanY = ssidY + 2;

        this._scanBtn = dxui.Button.build("scan_btn", this._root);
        this._scanBtn.setSize(scanBtnSize, scanBtnSize + 30);
        this._scanBtn.setPos(W - 10 - scanBtnSize, scanY);
        this._scanBtn.bgColor(0x1E88E5);
        this._scanBtn.radius(8);
        this._scanBtn.padAll(0);
        this._scanBtn.borderWidth(0);
        this._scanBtn.hide();

        const scanLabel = dxui.Label.build("scan_btn_label", this._scanBtn);
        scanLabel.text("Scan WiFi\nshare QR");
        scanLabel.textFont(UIManager.font(18));
        scanLabel.textColor(0xFFFFFF);
        scanLabel.setSize(scanBtnSize - 10, scanBtnSize + 20);
        scanLabel.textAlign(dxui.Utils.TEXT_ALIGN.CENTER);
        scanLabel.align(dxui.Utils.ALIGN.CENTER, 0, 0);

        this._scanBtn.on(dxui.Utils.EVENT.CLICK, () => {
            setScanWifiShare(true);
            WaitingView.show("Point phone WiFi share QR at camera…");

            const stopScan = () => {
                setScanWifiShare(false);
                bus.off(EVENT_WIFI_SHARE_SCANNED, onWifiScanned);
                WaitingView.hide();
            };

            // Scan result
            const onWifiScanned = (data) => {
                std.clearTimeout(scanTimeoutId);
                stopScan();

                this._ssidValue = data.ssid || "";
                this._pwdValue = data.password || "";

                this._updateWifiLabels();
                TipView.showSuccess("WiFi details captured");
            };
            bus.on(EVENT_WIFI_SHARE_SCANNED, onWifiScanned);

            const scanTimeoutId = std.setTimeout(() => {
                stopScan();
                TipView.showWarning("Scan timed out");
            }, 20000);
        });

        // Child views
        this._initKeyboard();
        this._initWaitingView();

        this._inited = true;
        log.info("[NetworkConfigPage] initialized");
        return this._root;
    },

    _initKeyboard: function () {
        // Full keyboard
        this._keyboard = FullKeyboard.build("full_keyboard", this._root, {
            isPassword: false,
            maxLength: 64,
            onConfirm: (value) => this._onKeyboardConfirm(value),
        });
        this._keyboard.hide();
    },

    _initWaitingView: function () {
        WaitingView.init();
    },

    _toggleNetworkType: function () {
        const nextType = this._networkType === "ETH" ? "WIFI" : "ETH";
        this._setNetworkType(nextType);
    },

    _setNetworkType: function (type) {
        this._networkType = type === "WIFI" ? "WIFI" : "ETH";

        if (this._typeDropdown) {
            this._typeDropdown.setSelected(this._networkType === "WIFI" ? 1 : 0);
        }

        if (this._networkType === "WIFI") {
            this._ssidLabel.show();
            this._ssidInput.show();
            this._pwdLabel.show();
            this._pwdInput.show();
            this._scanBtn.show();
        } else {
            this._ssidLabel.hide();
            this._ssidInput.hide();
            this._pwdLabel.hide();
            this._pwdInput.hide();
            this._scanBtn.hide();
        }
    },

    _updateWifiLabels: function () {
        if (this._ssidInputLabel) {
            this._ssidInputLabel.text(this._ssidValue || "Tap to enter or scan WiFi QR");
            this._ssidInputLabel.textColor(this._ssidValue ? 0xFFFFFF : COLORS.gray);
        }
        if (this._pwdInputLabel) {
            this._pwdInputLabel.text(this._pwdValue ? "*".repeat(this._pwdValue.length) : "Tap to enter WiFi password");
            this._pwdInputLabel.textColor(this._pwdValue ? 0xFFFFFF : COLORS.gray);
        }
    },

    _showKeyboard: function (field) {
        this._currentField = field;

        this._keyboard.setPasswordMode(field === "password");
        this._keyboard.show({ placeholder: field === "password" ? "WiFi password" : "WiFi SSID" });
        this._keyboard.setValue(field === "password" ? (this._pwdValue || "") : (this._ssidValue || ""));
    },

    _onKeyboardConfirm: function (value) {
        if (this._currentField === "ssid") {
            this._ssidValue = value;
        } else if (this._currentField === "password") {
            this._pwdValue = value;
        }
        this._updateWifiLabels();
        this._keyboard.hide();
    },

    _connect: function () {
        const config = {
            netType: this._networkType,
            dhcp: true,
            ssid: this._ssidValue || "",
            password: this._pwdValue || ""
        };

        if (this._networkType === "WIFI" && !this._ssidValue) {
            TipView.showError("Enter WiFi SSID");
            return;
        }

        bus.fire(EVENT_NETWORK_CONFIG_UPDATE, config);
        WaitingView.show("Connecting…");

        std.setTimeout(() => {
            WaitingView.hide();
            if (isNetworkConnected()) {
                TipView.showSuccess("Connected");
                this.close();
            } else {
                TipView.showWarning("Connection failed");
            }
        }, 10000);
    },

    onShow: function (data) {
        if (!this._inited) this.init();
        this._loadConfiguration();
        log.info("[NetworkConfigPage] shown");
    },

    onHide: function () {
        log.info("[NetworkConfigPage] hidden");
    },

    onClose: function (sourceViewId, resultData) {
        log.info("[NetworkConfigPage] closed from:", sourceViewId);
    },

    _loadConfiguration: function () {
        let cfg = {};
        try {
            const raw = DeviceConfigService.get("networkConfig");
            if (raw) cfg = JSON.parse(raw);
        } catch (e) {
            log.info("[NetworkConfigPage] load network config failed:", e);
        }

        this._setNetworkType(cfg.netType === "WIFI" ? "WIFI" : "ETH");

        // SSID / password (masked)
        this._ssidValue = cfg.ssid || "";
        this._pwdValue = cfg.password || "";
        this._updateWifiLabels();
    },

    close: function () {
        UIManager.backTo("settings");
    }
};

export default NetworkConfigPage;
