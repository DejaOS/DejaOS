// HomePage.js - Home screen
import dxui from "../../dxmodules/dxUi.js";
import std from "../../dxmodules/dxStd.js";
import log from "../../dxmodules/dxLogger.js";
import bus from "../../dxmodules/dxEventBus.js";
import dxOs from "../../dxmodules/dxOs.js";
import UIManager from "../UIManager.js";
import {
    COLORS,
    EVENT_NETWORK_STATUS_CHANGED,
    EVENT_HOMEPAGE_UI,
    isNetworkConnected,
    getNetworkCurrentIp,
} from "../constants.js";
import DeviceConfigService from "../service/DeviceConfigService.js";

const HomePage = {
    _inited: false,
    _root: null,
    _bgImage: null,
    _timeLabel: null,
    _titleLabel: null,
    _networkStatusImg: null,
    _bottomSN: null,
    _bottomIP: null,
    _unlockButton: null,
    _settingsButton: null,

    init: function () {
        if (this._inited) return;

        // 320x480 landscape
        const H = 320;
        const W = 480;

        // Root
        this._root = dxui.View.build("home_root", UIManager.getRoot());
        this._root.setSize(W, H);
        this._root.bgColor(0x1A1A1A);
        this._root.radius(0);
        this._root.borderWidth(0);
        this._root.padAll(0);
        this._root.scroll(false);

        // Background
        this._bgImage = dxui.Image.build("home_bg", this._root);
        this._bgImage.source("/app/code/resource/image/background.png");

        // Top bar (~28px): settings (View to avoid button shadow)
        this._settingsButton = dxui.View.build("settings_btn", this._root);
        this._settingsButton.setSize(40, 40);
        this._settingsButton.setPos(10, 4);
        this._settingsButton.bgOpa(0);
        this._settingsButton.radius(0);
        this._settingsButton.borderWidth(0);
        this._settingsButton.padAll(0);

        const settingsImg = dxui.Image.build("settings_img", this._settingsButton);
        settingsImg.source("/app/code/resource/image/settings.png");
        settingsImg.setSize(24, 24);
        settingsImg.align(dxui.Utils.ALIGN.CENTER, 0, 0);

        // Network icon top-right
        this._netIcon = dxui.Image.build("net_icon", this._root);
        this._netIcon.source("/app/code/resource/image/eth_disable.png");
        this._netIcon.setSize(24, 24);
        this._netIcon.align(dxui.Utils.ALIGN.TOP_RIGHT, -10, 4);

        // Date + time (single label)
        this._timeLabel = dxui.Label.build("time_label", this._root);
        this._timeLabel.textFont(UIManager.font(22, dxui.Utils.FONT_STYLE.NORMAL));
        this._timeLabel.textColor(0xFFFFFF);
        this._timeLabel.text("2025-01-01  00:00:00");
        this._timeLabel.setSize(300, 26);
        this._timeLabel.textAlign(dxui.Utils.TEXT_ALIGN.CENTER);
        this._timeLabel.align(dxui.Utils.ALIGN.TOP_MID, 0, 4);

        const titleText = DeviceConfigService.get("screenTitle") || "Access app";
        this._titleLabel = dxui.Label.build("title_label", this._root);
        this._titleLabel.textFont(UIManager.font(44, dxui.Utils.FONT_STYLE.BOLD));
        this._titleLabel.textColor(0xFFFFFF);
        this._titleLabel.text(titleText);
        this._titleLabel.setSize(460, 50);
        this._titleLabel.textAlign(dxui.Utils.TEXT_ALIGN.CENTER);
        this._titleLabel.align(dxui.Utils.ALIGN.TOP_MID, 0, 56);

        // Unlock button toward bottom
        const unlockAreaY = 180;
        const unlockAreaH = 100;
        const unlockBtnH = 70;

        this._unlockButton = dxui.Button.build("unlock_btn", this._root);
        this._unlockButton.setSize(200, unlockBtnH);
        this._unlockButton.setPos((W - 200) / 2, unlockAreaY + (unlockAreaH - unlockBtnH) / 2);
        this._unlockButton.bgColor(0x000000);
        this._unlockButton.bgOpa(30);
        this._unlockButton.radius(12);
        this._unlockButton.borderWidth(0);

        const unlockLabel = dxui.Label.build("unlock_label", this._unlockButton);
        unlockLabel.textFont(UIManager.font(30, dxui.Utils.FONT_STYLE.NORMAL));
        unlockLabel.textColor(0xFFFFFF);
        unlockLabel.text("PIN unlock");
        unlockLabel.align(dxui.Utils.ALIGN.CENTER, 0, 0);

        this._unlockButton.on(dxui.Utils.EVENT.CLICK, () => {
            UIManager.open("pinUnlock");
        });

        // Settings tap
        this._settingsButton.on(dxui.Utils.EVENT.CLICK, () => {
            UIManager.open("adminLogin");
        });

        // Bottom bar
        const bottomY = H - 28;

        // SN
        this._bottomSN = dxui.Label.build("bottom_sn", this._root);
        this._bottomSN.textFont(UIManager.font(16, dxui.Utils.FONT_STYLE.NORMAL));
        this._bottomSN.textColor(0xFFFFFF);
        this._bottomSN.text("SN: " + (dxOs.getSn() || ""));
        this._bottomSN.setSize(W / 2, 20);
        this._bottomSN.textAlign(dxui.Utils.TEXT_ALIGN.LEFT);
        this._bottomSN.setPos(0, bottomY + 4);

        // IP
        this._bottomIP = dxui.Label.build("bottom_ip", this._root);
        this._bottomIP.textFont(UIManager.font(16, dxui.Utils.FONT_STYLE.NORMAL));
        this._bottomIP.textColor(0xFFFFFF);
        this._bottomIP.text("");
        this._bottomIP.setSize(W / 2, 20);
        this._bottomIP.textAlign(dxui.Utils.TEXT_ALIGN.RIGHT);
        this._bottomIP.setPos(W / 2, bottomY + 4);

        this.startTimeUpdate();

        // Network status
        bus.on(EVENT_NETWORK_STATUS_CHANGED, (data) => {
            this.updateNetworkStatus(data.connected, data.ip, data.netType);
        });

        bus.on(EVENT_HOMEPAGE_UI, (data) => {
            if (!this._inited) return;
            if (data.type === "title" && this._titleLabel) {
                this._titleLabel.text(data.value || "Access app");
            }
        });

        this._inited = true;
        log.info("[HomePage] initialized");
        return this._root;
    },

    startTimeUpdate: function () {
        const updateTime = () => {
            const now = new Date();
            const hours = String(now.getHours()).padStart(2, '0');
            const minutes = String(now.getMinutes()).padStart(2, '0');
            const seconds = String(now.getSeconds()).padStart(2, '0');
            const timeStr = `${hours}:${minutes}:${seconds}`;

            const year = now.getFullYear();
            const month = String(now.getMonth() + 1).padStart(2, '0');
            const day = String(now.getDate()).padStart(2, '0');
            const dateStr = `${year}-${month}-${day}`;

            if (this._timeLabel) this._timeLabel.text(dateStr + "  " + timeStr);
        };

        updateTime();
        this._timer = std.setInterval(() => updateTime(), 1000);
    },

    updateNetworkStatus: function (connected, ip, netType) {
        if (!this._inited) return;

        const isWifi = netType === "WIFI";
        const iconName = isWifi
            ? (connected && ip ? "wifi_enable" : "wifi_disable")
            : (connected && ip ? "eth_enable" : "eth_disable");

        if (this._netIcon) {
            this._netIcon.source(`/app/code/resource/image/${iconName}.png`);
        }
        if (this._bottomIP) {
            this._bottomIP.text(connected && ip ? "IP " + ip : " ");
        }
    },

    onShow: function (data) {
        if (!this._inited) this.init();

        // Initial network state
        const networkConnected = isNetworkConnected();
        const ip = getNetworkCurrentIp() || "";
        const netType = DeviceConfigService.get("networkConfig")
            ? (() => { try { return JSON.parse(DeviceConfigService.get("networkConfig")).netType || "ETH"; } catch (e) { return "ETH"; } })()
            : "ETH";
        this.updateNetworkStatus(networkConnected, ip, netType);
        if (this._titleLabel) {
            this._titleLabel.text(DeviceConfigService.get("screenTitle") || "Access app");
        }

        log.info("[HomePage] shown");
    },

    onHide: function () {
        log.info("[HomePage] hidden");
    },

    onClose: function (sourceViewId, resultData) {
        log.info("[HomePage] closed from:", sourceViewId, resultData);
    }
};

export default HomePage;
