// SettingsPage.js - Settings hub
import dxui from "../../dxmodules/dxUi.js";
import log from "../../dxmodules/dxLogger.js";
import UIManager from "../UIManager.js";

const SettingsPage = {
    _inited: false,
    _root: null,

    init: function () {
        if (this._inited) return;

        const H = 320;
        const W = 480;

        // Root
        this._root = dxui.View.build("settings_root", UIManager.getRoot());
        this._root.setSize(W, H);
        this._root.bgColor(0x1A1A1A);
        this._root.radius(0);
        this._root.borderWidth(0);
        this._root.padAll(0);
        this._root.scroll(false);

        const titleLabel = dxui.Label.build("settings_title", this._root);
        titleLabel.text("Settings");
        titleLabel.textFont(UIManager.font(28, dxui.Utils.FONT_STYLE.BOLD));
        titleLabel.textColor(0xFFFFFF);
        titleLabel.setSize(W - 88, 40);
        titleLabel.textAlign(dxui.Utils.TEXT_ALIGN.CENTER);
        titleLabel.align(dxui.Utils.ALIGN.TOP_MID, 0, 10);

        // Back
        const backBtn = dxui.View.build("settings_back", this._root);
        backBtn.setSize(44, 44);
        backBtn.setPos(6, 4);
        backBtn.bgOpa(0);
        backBtn.radius(0);
        backBtn.borderWidth(0);
        backBtn.padAll(0);

        const backImg = dxui.Image.build("settings_back_img", backBtn);
        backImg.source("/app/code/resource/image/back.png");
        backImg.setSize(24, 24);
        backImg.align(dxui.Utils.ALIGN.CENTER, 0, 0);

        backBtn.on(dxui.Utils.EVENT.CLICK, () => {
            UIManager.backTo("home");
        });

        const topAreaH = 60;
        const btnSize = 140;
        const btnGap = 28;
        const totalW = btnSize * 2 + btnGap;
        const startX = Math.round((W - totalW) / 2);
        const btnY = topAreaH + 40;

        // Network
        const networkBtn = dxui.Button.build("network_btn", this._root);
        networkBtn.setSize(btnSize, btnSize);
        networkBtn.setPos(startX, btnY);
        networkBtn.bgColor(0x1E88E5);
        networkBtn.radius(8);
        networkBtn.borderWidth(0);

        const networkLabel = dxui.Label.build("network_btn_label", networkBtn);
        networkLabel.text("Network");
        networkLabel.textFont(UIManager.font(28, dxui.Utils.FONT_STYLE.NORMAL));
        networkLabel.textColor(0xFFFFFF);
        networkLabel.align(dxui.Utils.ALIGN.CENTER, 0, 0);

        networkBtn.on(dxui.Utils.EVENT.CLICK, () => {
            UIManager.open("networkConfig");
        });

        // System
        const systemBtn = dxui.Button.build("system_btn", this._root);
        systemBtn.setSize(btnSize, btnSize);
        systemBtn.setPos(startX + btnSize + btnGap, btnY);
        systemBtn.bgColor(0x1E88E5);
        systemBtn.radius(8);
        systemBtn.borderWidth(0);

        const systemLabel = dxui.Label.build("system_btn_label", systemBtn);
        systemLabel.text("System");
        systemLabel.textFont(UIManager.font(28, dxui.Utils.FONT_STYLE.NORMAL));
        systemLabel.textColor(0xFFFFFF);
        systemLabel.align(dxui.Utils.ALIGN.CENTER, 0, 0);

        systemBtn.on(dxui.Utils.EVENT.CLICK, () => {
            UIManager.open("systemInfo");
        });

        this._inited = true;
        log.info("[SettingsPage] initialized");
        return this._root;
    },

    onShow: function (data) {
        if (!this._inited) this.init();
        log.info("[SettingsPage] shown");
    },

    onHide: function () {
        log.info("[SettingsPage] hidden");
    },

    onClose: function (sourceViewId, resultData) {
        log.info("[SettingsPage] closed from:", sourceViewId);
    },

    close: function () {
        UIManager.backTo("home");
    }
};

export default SettingsPage;
