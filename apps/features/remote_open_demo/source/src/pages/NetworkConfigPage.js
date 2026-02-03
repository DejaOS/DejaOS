// NetworkConfigPage.js - Network configuration page
import dxui from "../../dxmodules/dxUi.js";
import dxDriver from "../../dxmodules/dxDriver.js";
import std from "../../dxmodules/dxStd.js";
import log from "../../dxmodules/dxLogger.js";
import bus from "../../dxmodules/dxEventBus.js";
import UIManager from "../UIManager.js";
import { COLORS, getNetworkConfig } from "../constants.js";

const NetworkConfigPage = {
    _inited: false,
    _root: null,
    _titleLabel: null,
    _networkTypeLabel: null,
    _networkTypeDropdown: null,
    _ssidLabel: null,
    _ssidInput: null,
    _passwordLabel: null,
    _passwordInput: null,
    _saveButton: null,
    _backButton: null,
    _currentConfig: null,
    _networkType: "ETH",

    init: function () {
        if (this._inited) return;

        const screenW = dxDriver.DISPLAY.WIDTH;
        const screenH = dxDriver.DISPLAY.HEIGHT;

        // Root view
        this._root = dxui.View.build("network_config_root", UIManager.getRoot());
        this._root.setSize(screenW, screenH);
        this._root.bgColor(COLORS.dark);
        this._root.radius(0);
        this._root.borderWidth(0);
        this._root.padAll(0);
        this._root.scroll(true);

        // Title
        this._titleLabel = dxui.Label.build("network_config_title", this._root);
        this._titleLabel.text("Network Configuration");
        this._titleLabel.textFont(UIManager.font(28, dxui.Utils.FONT_STYLE.BOLD));
        this._titleLabel.textColor(COLORS.primary);
        this._titleLabel.setSize(screenW - 40, 50);
        this._titleLabel.align(dxui.Utils.ALIGN.TOP_MID, 0, 20);

        // Network type selection
        this._networkTypeTitleLabel = dxui.Label.build("network_type_label", this._root);
        this._networkTypeTitleLabel.text("Connection Type:");
        this._networkTypeTitleLabel.textFont(UIManager.font(22));
        this._networkTypeTitleLabel.textColor(COLORS.light);
        this._networkTypeTitleLabel.setSize(200, 35);
        this._networkTypeTitleLabel.align(dxui.Utils.ALIGN.TOP_LEFT, 20, 90);

        // Network type dropdown
        this._networkTypeDropdown = dxui.Button.build("network_type_dropdown", this._root);
        this._networkTypeDropdown.bgColor(COLORS.secondary);
        this._networkTypeDropdown.radius(6);
        this._networkTypeDropdown.setSize(200, 45);
        this._networkTypeDropdown.align(dxui.Utils.ALIGN.TOP_RIGHT, -20, 80);
        this._networkTypeDropdownLabel = dxui.Label.build("network_type_dropdown_label", this._networkTypeDropdown);
        this._networkTypeDropdownLabel.textFont(UIManager.font(20));
        this._networkTypeDropdownLabel.text("Ethernet");
        this._networkTypeDropdownLabel.textColor(COLORS.white);
        this._networkTypeDropdownLabel.align(dxui.Utils.ALIGN.CENTER, 0, 0);
        this._networkTypeDropdown.on(dxui.Utils.EVENT.CLICK, () => {
            this.toggleNetworkType();
        });

        // SSID input (only visible for WiFi)
        this._ssidLabel = dxui.Label.build("ssid_label", this._root);
        this._ssidLabel.text("WiFi SSID:");
        this._ssidLabel.textFont(UIManager.font(20));
        this._ssidLabel.textColor(COLORS.light);
        this._ssidLabel.setSize(200, 30);
        this._ssidLabel.align(dxui.Utils.ALIGN.TOP_LEFT, 20, 148);
        this._ssidLabel.hide();

        this._ssidInput = dxui.Textarea.build("ssid_input", this._root);
        this._ssidInput.text("");
        this._ssidInput.setOneLine(true);
        this._ssidInput.textFont(UIManager.font(18));
        this._ssidInput.textColor(COLORS.white);
        this._ssidInput.bgColor(COLORS.secondary);
        this._ssidInput.radius(6);
        this._ssidInput.padAll(6);
        this._ssidInput.setSize(screenW - 80, 42);
        this._ssidInput.align(dxui.Utils.ALIGN.TOP_MID, 0, 182);
        this._ssidInput.on(dxui.Utils.EVENT.CLICK, () => this._openKeyboardInput("ssid"));
        this._ssidInput.hide();

        // Password input (only visible for WiFi)
        this._passwordLabel = dxui.Label.build("password_label", this._root);
        this._passwordLabel.text("WiFi Password:");
        this._passwordLabel.textFont(UIManager.font(20));
        this._passwordLabel.textColor(COLORS.light);
        this._passwordLabel.setSize(200, 30);
        this._passwordLabel.align(dxui.Utils.ALIGN.TOP_LEFT, 20, 228);
        this._passwordLabel.hide();

        this._passwordInput = dxui.Textarea.build("password_input", this._root);
        this._passwordInput.text("");
        this._passwordInput.setOneLine(true);
        this._passwordInput.setPasswordMode(true);
        this._passwordInput.textFont(UIManager.font(18));
        this._passwordInput.textColor(COLORS.white);
        this._passwordInput.bgColor(COLORS.secondary);
        this._passwordInput.radius(6);
        this._passwordInput.padAll(6);
        this._passwordInput.setSize(screenW - 80, 42);
        this._passwordInput.align(dxui.Utils.ALIGN.TOP_MID, 0, 262);
        this._passwordInput.on(dxui.Utils.EVENT.CLICK, () => this._openKeyboardInput("password"));
        this._passwordInput.hide();

        // Note label (position adjusted by ETH/WiFi layout)
        this._noteLabel = dxui.Label.build("network_note", this._root);
        this._noteLabel.text("Note: Only DHCP is supported in this demo.");
        this._noteLabel.textFont(UIManager.font(14));
        this._noteLabel.textColor(COLORS.gray);
        this._noteLabel.setSize(screenW - 40, 28);

        // Save & Back buttons (position adjusted by ETH/WiFi layout)
        this._saveButton = dxui.Button.build("network_save_btn", this._root);
        this._saveButton.bgColor(COLORS.success);
        this._saveButton.radius(8);
        this._saveButton.setSize(screenW - 80, 50);
        this._saveButtonLabel = dxui.Label.build("network_save_btn_label", this._saveButton);
        this._saveButtonLabel.textFont(UIManager.font(22, dxui.Utils.FONT_STYLE.BOLD));
        this._saveButtonLabel.text("Save & Connect");
        this._saveButtonLabel.textColor(COLORS.white);
        this._saveButtonLabel.align(dxui.Utils.ALIGN.CENTER, 0, 0);
        this._saveButton.on(dxui.Utils.EVENT.CLICK, () => {
            this.saveConfiguration();
        });

        // Back button (uiButton has no text property; use inner Label)
        this._backButton = dxui.Button.build("network_back_btn", this._root);
        this._backButton.bgColor(COLORS.secondary);
        this._backButton.radius(8);
        this._backButton.setSize(screenW - 80, 50);

        this._updateLayout();
        this._backButtonLabel = dxui.Label.build("network_back_btn_label", this._backButton);
        this._backButtonLabel.textFont(UIManager.font(22, dxui.Utils.FONT_STYLE.BOLD));
        this._backButtonLabel.text("Back");
        this._backButtonLabel.textColor(COLORS.white);
        this._backButtonLabel.align(dxui.Utils.ALIGN.CENTER, 0, 0);
        this._backButton.on(dxui.Utils.EVENT.CLICK, () => {
            this.close();
        });

        this._inited = true;
        log.info("[NetworkConfigPage] Initialized");
        return this._root;
    },

    /**
     * Update Note and button positions by ETH/WiFi layout
     */
    _updateLayout: function () {
        if (this._networkType === "ETH") {
            // ETH compact: no SSID/password; Note and buttons moved up, single screen
            this._root.scroll(false);
            this._noteLabel.align(dxui.Utils.ALIGN.TOP_MID, 0, 148);
            this._saveButton.align(dxui.Utils.ALIGN.TOP_MID, 0, 198);
            this._backButton.align(dxui.Utils.ALIGN.TOP_MID, 0, 258);
        } else {
            // WiFi layout: SSID/password visible; enable scroll
            this._root.scroll(true);
            this._noteLabel.align(dxui.Utils.ALIGN.TOP_MID, 0, 310);
            this._saveButton.align(dxui.Utils.ALIGN.TOP_MID, 0, 348);
            this._backButton.align(dxui.Utils.ALIGN.TOP_MID, 0, 408);
        }
    },

    /**
     * Toggle between Ethernet and WiFi
     */
    toggleNetworkType: function () {
        this._networkType = this._networkType === "ETH" ? "WIFI" : "ETH";
        this._networkTypeDropdownLabel.text(this._networkType === "ETH" ? "Ethernet" : "WiFi");

        if (this._networkType === "WIFI") {
            this._ssidLabel.show();
            this._ssidInput.show();
            this._passwordLabel.show();
            this._passwordInput.show();
        } else {
            this._ssidLabel.hide();
            this._ssidInput.hide();
            this._passwordLabel.hide();
            this._passwordInput.hide();
        }
        this._updateLayout();
    },

    /**
     * Load current configuration
     */
    loadConfiguration: function () {
        this._currentConfig = getNetworkConfig();
        log.info("[NetworkConfigPage] Loaded config:", this._currentConfig);

        if (this._currentConfig.netType) {
            this._networkType = this._currentConfig.netType;
            this._networkTypeDropdownLabel.text(this._networkType === "ETH" ? "Ethernet" : "WiFi");

            if (this._networkType === "WIFI") {
                this._ssidLabel.show();
                this._ssidInput.show();
                this._passwordLabel.show();
                this._passwordInput.show();

                if (this._currentConfig.ssid) {
                    this._ssidInput.text(this._currentConfig.ssid);
                }
                if (this._currentConfig.password) {
                    this._passwordInput.text(this._currentConfig.password);
                }
            } else {
                this._ssidLabel.hide();
                this._ssidInput.hide();
                this._passwordLabel.hide();
                this._passwordInput.hide();
            }
            this._updateLayout();
        }
    },

    /**
     * Save configuration and trigger reconnection
     */
    saveConfiguration: function () {
        const config = {
            netType: this._networkType,
            dhcp: true, // Demo only supports DHCP
            ssid: "",
            password: ""
        };

        if (this._networkType === "WIFI") {
            const ssid = (this._ssidInput.text() || "").trim();
            const password = (this._passwordInput.text() || "").trim();

            if (!ssid) {
                this.showMessage("WiFi SSID is required", COLORS.danger);
                return;
            }

            config.ssid = ssid;
            config.password = password;
        }

        // Send configuration to uiWorker via EventBus
        bus.fire("NETWORK_CONFIG_UPDATE", config);

        this.showMessage("Configuration saved. Reconnecting...", COLORS.success);

        std.setTimeout(() => {
            this.close();
        }, 2000);
    },

    /**
     * Open keyboard input page
     */
    _openKeyboardInput: function (field) {
        const initialValue = field === "ssid"
            ? (this._ssidInput.text() || "")
            : (this._passwordInput.text() || "");
        this.open("keyboardInput", { field: field, initialValue: initialValue });
    },

    /**
     * Show temporary message
     */
    showMessage: function (message, color) {
        const screenW = dxDriver.DISPLAY.WIDTH;
        const msgLabel = dxui.Label.build("temp_message_" + std.genRandomStr(6), this._root);
        msgLabel.text(message);
        msgLabel.textFont(UIManager.font(18));
        msgLabel.textColor(color);
        msgLabel.setSize(screenW - 40, 36);
        msgLabel.align(dxui.Utils.ALIGN.TOP_MID, 0, 75);

        std.setTimeout(() => {
            dxui.del(msgLabel);
        }, 2000);
    },

    /**
     * Lifecycle: Called when page is shown
     */
    onShow: function (data) {
        if (!this._inited) this.init();

        // Load current configuration
        this.loadConfiguration();

        // Re-apply layout so Note and buttons are correct on each show
        this._updateLayout();

        // Reset scroll position to avoid layout shift when re-entering after WiFi mode
        this._root.scrollToY(0, false);

        log.info("[NetworkConfigPage] Shown");
    },

    /**
     * Lifecycle: Called when page is hidden
     */
    onHide: function () {
        log.info("[NetworkConfigPage] Hidden");
    },

    /**
     * Lifecycle: Called when a child page closes
     */
    onClose: function (sourceViewId, resultData) {
        if (sourceViewId === "keyboardInput" && resultData && resultData.field) {
            if (resultData.field === "ssid") {
                this._ssidInput.text(resultData.value || "");
            } else if (resultData.field === "password") {
                this._passwordInput.text(resultData.value || "");
            }
            log.info("[NetworkConfigPage] Received input from keyboard:", resultData.field);
        }
    }
};

export default NetworkConfigPage;