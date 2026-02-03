// HomePage.js - Main home page for Remote Open Demo
import dxui from "../../dxmodules/dxUi.js";
import dxDriver from "../../dxmodules/dxDriver.js";
import std from "../../dxmodules/dxStd.js";
import log from "../../dxmodules/dxLogger.js";
import bus from "../../dxmodules/dxEventBus.js";
import UIManager from "../UIManager.js";
import { COLORS, isNetworkConnected, getHttpServerUrl } from "../constants.js";

const HomePage = {
    _inited: false,
    _root: null,
    _titleLabel: null,
    _networkStatusLabel: null,
    _ipLabel: null,
    _urlLabel: null,
    _credentialsLabel: null,
    _doorContainer: null,
    _doorLeft: null,
    _doorRight: null,
    _doorStatusLabel: null,
    _configButton: null,
    _doorOpen: false,
    _animationTimer: null,
    _doorAngle: 0,
    _networkPollTimer: null,

    init: function () {
        if (this._inited) return;

        const screenW = dxDriver.DISPLAY.WIDTH;
        const screenH = dxDriver.DISPLAY.HEIGHT;

        // Root view
        this._root = dxui.View.build("home_root", UIManager.getRoot());
        this._root.setSize(screenW, screenH);
        this._root.bgColor(COLORS.dark);
        this._root.radius(0);
        this._root.borderWidth(0);
        this._root.padAll(0);
        this._root.scroll(false);

        // Title
        this._titleLabel = dxui.Label.build("home_title", this._root);
        this._titleLabel.text("Remote Door Control");
        this._titleLabel.textFont(UIManager.font(32, dxui.Utils.FONT_STYLE.BOLD));
        this._titleLabel.textColor(COLORS.primary);
        this._titleLabel.setSize(screenW - 40, 50);
        this._titleLabel.align(dxui.Utils.ALIGN.TOP_MID, 0, 20);

        // Network status
        this._networkStatusLabel = dxui.Label.build("home_network_status", this._root);
        this._networkStatusLabel.text("Network: Disconnected");
        this._networkStatusLabel.textFont(UIManager.font(24));
        this._networkStatusLabel.textColor(COLORS.danger);
        this._networkStatusLabel.setSize(screenW - 40, 40);
        this._networkStatusLabel.align(dxui.Utils.ALIGN.TOP_MID, 0, 80);

        // IP address
        this._ipLabel = dxui.Label.build("home_ip", this._root);
        this._ipLabel.text("IP: Not available");
        this._ipLabel.textFont(UIManager.font(20));
        this._ipLabel.textColor(COLORS.grayLight);
        this._ipLabel.setSize(screenW - 40, 35);
        this._ipLabel.align(dxui.Utils.ALIGN.TOP_MID, 0, 130);

        // Web access URL
        this._urlLabel = dxui.Label.build("home_url", this._root);
        this._urlLabel.text("Web Access: Not available");
        this._urlLabel.textFont(UIManager.font(18));
        this._urlLabel.textColor(COLORS.grayLight);
        this._urlLabel.setSize(screenW - 40, 35);
        this._urlLabel.align(dxui.Utils.ALIGN.TOP_MID, 0, 170);

        // Credentials info
        this._credentialsLabel = dxui.Label.build("home_credentials", this._root);
        this._credentialsLabel.text("Username: admin, Password: admin123");
        this._credentialsLabel.textFont(UIManager.font(16));
        this._credentialsLabel.textColor(COLORS.gray);
        this._credentialsLabel.setSize(screenW - 40, 30);
        this._credentialsLabel.align(dxui.Utils.ALIGN.TOP_MID, 0, 210);

        // Door visualization container
        this._doorContainer = dxui.View.build("home_door_container", this._root);
        this._doorContainer.setSize(300, 200);
        this._doorContainer.bgOpa(0);
        this._doorContainer.borderWidth(0);
        this._doorContainer.padAll(0);
        this._doorContainer.scroll(false);
        this._doorContainer.align(dxui.Utils.ALIGN.CENTER, 0, 20);

        // Left door panel
        this._doorLeft = dxui.View.build("home_door_left", this._doorContainer);
        this._doorLeft.setSize(140, 180);
        this._doorLeft.radius(10);
        this._doorLeft.bgColor(COLORS.secondary);
        this._doorLeft.borderWidth(3);
        this._doorLeft.setBorderColor(COLORS.primary);
        this._doorLeft.align(dxui.Utils.ALIGN.LEFT_MID, 10, 0);
        this._doorLeft.hide();

        // Right door panel
        this._doorRight = dxui.View.build("home_door_right", this._doorContainer);
        this._doorRight.setSize(140, 180);
        this._doorRight.radius(10);
        this._doorRight.bgColor(COLORS.secondary);
        this._doorRight.borderWidth(3);
        this._doorRight.setBorderColor(COLORS.primary);
        this._doorRight.align(dxui.Utils.ALIGN.RIGHT_MID, -10, 0);
        this._doorRight.hide();

        // Door status label
        this._doorStatusLabel = dxui.Label.build("home_door_status", this._root);
        this._doorStatusLabel.text("Door: Closed");
        this._doorStatusLabel.textFont(UIManager.font(28, dxui.Utils.FONT_STYLE.BOLD));
        this._doorStatusLabel.textColor(COLORS.warning);
        this._doorStatusLabel.setSize(screenW - 40, 40);
        this._doorStatusLabel.align(dxui.Utils.ALIGN.CENTER, 0, 150);

        // Network configuration button 
        this._configButton = dxui.Button.build("home_config_btn", this._root);
        this._configButton.bgColor(COLORS.primary);
        this._configButton.radius(8);
        this._configButton.setSize(200, 50);
        this._configButton.align(dxui.Utils.ALIGN.BOTTOM_MID, 0, -30);
        this._configButtonLabel = dxui.Label.build("home_config_btn_label", this._configButton);
        this._configButtonLabel.textFont(UIManager.font(20, dxui.Utils.FONT_STYLE.BOLD));
        this._configButtonLabel.text("Network Config");
        this._configButtonLabel.textColor(COLORS.white);
        this._configButtonLabel.align(dxui.Utils.ALIGN.CENTER, 0, 0);
        this._configButton.on(dxui.Utils.EVENT.CLICK, () => {
            this.openNetworkConfig();
        });

        // Initial door state
        this._doorOpen = false;
        this._doorAngle = 0;

        // Register once in init, not on every onShow
        bus.on("NETWORK_STATUS_CHANGED", (data) => {
            this.updateNetworkStatus(data.connected, data.ip);
        });
        bus.on("DOOR_STATE_CHANGED", (data) => {
            this.updateDoorState(data.isOpen);
        });

        this._inited = true;
        log.info("[HomePage] Initialized");
        return this._root;
    },

    /**
     * Update network status display
     */
    updateNetworkStatus: function (connected, ip) {
        if (!this._inited) return;

        if (connected) {
            this._networkStatusLabel.text("Network: Connected");
            this._networkStatusLabel.textColor(COLORS.success);

            if (ip) {
                this._ipLabel.text(`IP: ${ip}`);
                const url = `http://${ip}:8080`;
                this._urlLabel.text(`Web Access: ${url}`);
            } else {
                this._ipLabel.text("IP: Unknown");
                this._urlLabel.text("Web Access: Not available");
            }
        } else {
            this._networkStatusLabel.text("Network: Disconnected");
            this._networkStatusLabel.textColor(COLORS.danger);
            this._ipLabel.text("IP: Not available");
            this._urlLabel.text("Web Access: Not available");
        }
    },

    /**
     * Update door state and animation
     */
    updateDoorState: function (isOpen) {
        if (!this._inited) return;

        this._doorOpen = isOpen;

        if (isOpen) {
            this._doorLeft.show();
            this._doorRight.show();
            this._doorStatusLabel.text("Door: OPEN");
            this._doorStatusLabel.textColor(COLORS.success);
            this.startDoorOpenAnimation();
        } else {
            this._doorStatusLabel.text("Door: CLOSED");
            this._doorStatusLabel.textColor(COLORS.warning);
            this.stopDoorAnimation();
            this.resetDoorPosition();
            std.setTimeout(() => {
                this._doorLeft.hide();
                this._doorRight.hide();
            }, 1000);
        }
    },

    /**
     * Start door opening animation
     */
    startDoorOpenAnimation: function () {
        if (this._animationTimer) {
            std.clearInterval(this._animationTimer);
        }

        this._doorAngle = 0;
        const maxAngle = 90; // Maximum swing angle in degrees

        this._animationTimer = std.setInterval(() => {
            if (this._doorAngle >= maxAngle) {
                std.clearInterval(this._animationTimer);
                this._animationTimer = null;
                return;
            }

            this._doorAngle += 5;
            this.updateDoorPanels();
        }, 30);
    },

    /**
     * Stop door animation
     */
    stopDoorAnimation: function () {
        if (this._animationTimer) {
            std.clearInterval(this._animationTimer);
            this._animationTimer = null;
        }
    },

    /**
     * Reset door to closed position
     */
    resetDoorPosition: function () {
        this._doorAngle = 0;
        this.updateDoorPanels();
    },

    /**
     * Update door panel positions based on current angle
     */
    updateDoorPanels: function () {
        if (!this._doorLeft || !this._doorRight) return;

        // Convert angle to radians
        const rad = (this._doorAngle * Math.PI) / 180;

        // Calculate offset for swinging effect
        // Left door swings left (negative X), right door swings right (positive X)
        const offset = Math.sin(rad) * 30;

        this._doorLeft.align(dxui.Utils.ALIGN.LEFT_MID, 10 - offset, 0);
        this._doorRight.align(dxui.Utils.ALIGN.RIGHT_MID, -10 + offset, 0);
    },

    /**
     * Open network configuration page
     */
    openNetworkConfig: function () {
        UIManager.open("networkConfig");
    },

    /**
     * Lifecycle: Called when page is shown
     */
    onShow: function (data) {
        if (!this._inited) this.init();

        // Update initial network status (IP parsed from getHttpServerUrl)
        const networkConnected = isNetworkConnected();
        const url = getHttpServerUrl();
        const ip = url ? url.replace(/^https?:\/\//, "").split(":")[0] || "" : "";
        this.updateNetworkStatus(networkConnected, ip);

        // Door state updated by DOOR_STATE_CHANGED; default to closed on show
        this.updateDoorState(false);

        log.info("[HomePage] Shown");
    },

    /**
     * Lifecycle: Called when page is hidden
     */
    onHide: function () {
        this.stopDoorAnimation();
    },

    /**
     * Lifecycle: Called when a child page closes
     */
    onClose: function (sourceViewId, resultData) {
        // Handle any data returned from child pages
        if (sourceViewId === "networkConfig" && resultData) {
            log.info("[HomePage] Received data from network config:", resultData);
        }
    }
};

export default HomePage;