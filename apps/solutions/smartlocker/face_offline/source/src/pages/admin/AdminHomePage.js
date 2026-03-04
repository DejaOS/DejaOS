import dxui from "../../../dxmodules/dxUi.js";
import log from "../../../dxmodules/dxLogger.js";
import dxDriver from "../../../dxmodules/dxDriver.js";
import UIManager from "../UIManager.js";
import LockerService from "../../lock/LockerService.js";
import TipView from "../TipView.js";

const AdminHomePage = {
    id: "adminHome",

    init: function () {
        const parent = UIManager.getRoot();

        this.root = dxui.View.build(this.id, parent);
        this.root.setSize(dxDriver.DISPLAY.WIDTH, dxDriver.DISPLAY.HEIGHT);
        this.root.radius(0);
        this.root.borderWidth(0);
        this.root.padAll(0);
        this.root.bgColor(0xebebeb);

        this._initView();

        return this.root;
    },

    _initView: function () {
        const W = dxDriver.DISPLAY.WIDTH;
        const H = dxDriver.DISPLAY.HEIGHT;

        const titleFontSize = Math.round(H * 0.032);
        const menuFontSize = Math.round(H * 0.024);
        const iconSize = Math.round(H * 0.06);

        // 1. Top title
        this.title = dxui.Label.build(this.id + "_title", this.root);
        this.title.text("Admin Console");
        this.title.textFont(UIManager.font(titleFontSize, dxui.Utils.FONT_STYLE.BOLD));
        this.title.textColor(0x333333);
        this.title.setSize(Math.round(W * 0.6), Math.round(H * 0.05));
        this.title.align(dxui.Utils.ALIGN.TOP_MID, 0, Math.round(H * 0.025));

        // 2. Cancel button: top right
        const cancelFontSize = Math.round(H * 0.024);
        this.btnCancel = dxui.Button.build(this.id + "_cancel", this.root);
        this.btnCancel.setSize(Math.round(W * 0.15), Math.round(H * 0.05));
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
            log.info("AdminHomePage: Cancel clicked, back to home");
            const needRefresh = !!this._needRefreshRemain;
            this._needRefreshRemain = false;
            if (needRefresh) {
                UIManager.backTo("home", { refreshRemain: true });
            } else {
                UIManager.backTo("home");
            }
        });

        // 3. Menu: 2x2 centered
        const menuItems = [
            { id: "group", text: "Group Config", icon: "/app/code/resource/image/admin_group.png" },
            { id: "open_cabinet", text: "Cabinet Control", icon: "/app/code/resource/image/admin_open.png" },
            { id: "records", text: "Records", icon: "/app/code/resource/image/admin_records.png" },
            { id: "settings", text: "System Settings", icon: "/app/code/resource/image/admin_setting.png" },
        ];

        const cols = 2;
        const cardW = Math.round(W * 0.35);
        const cardH = Math.round(H * 0.18);
        const gapX = Math.round(W * 0.06);
        const gapY = Math.round(H * 0.03);
        const gridW = cardW * cols + gapX * (cols - 1);
        const gridH = cardH * 2 + gapY;
        const startX = Math.round((W - gridW) / 2);
        const startY = Math.round((H - gridH) / 2);

        for (let i = 0; i < menuItems.length; i++) {
            const cfg = menuItems[i];
            const col = i % cols;
            const row = Math.floor(i / cols);
            const x = startX + col * (cardW + gapX);
            const y = startY + row * (cardH + gapY);

            const item = dxui.View.build(`${this.id}_item_${cfg.id}`, this.root);
            item.setSize(cardW, cardH);
            item.radius(Math.round(cardW * 0.06));
            item.borderWidth(0);
            item.bgColor(0xffffff);
            item.setPos(x, y);
            item.scroll(false);

            const icon = dxui.Image.build(`${this.id}_icon_${cfg.id}`, item);
            icon.setSize(iconSize, iconSize);
            icon.align(dxui.Utils.ALIGN.TOP_MID, 0, Math.round(cardH * 0.15));
            icon.source(cfg.icon);

            const label = dxui.Label.build(`${this.id}_label_${cfg.id}`, item);
            label.text(cfg.text);
            label.textFont(UIManager.font(menuFontSize, dxui.Utils.FONT_STYLE.NORMAL));
            label.textColor(0x4d4d4d);
            label.align(dxui.Utils.ALIGN.BOTTOM_MID, 0, -Math.round(cardH * 0.15));

            item.on(dxui.Utils.EVENT.CLICK, () => {
                log.info(`AdminHomePage: menu click -> ${cfg.id}`);
                this._handleMenuClick(cfg.id);
            });
        }
    },

    _handleMenuClick: function (menuId) {
        if (menuId === "group") {
            UIManager.open("adminGroupConfig");
        } else if (menuId === "open_cabinet") {
            const total = LockerService.getTotalCabinetCount();
            if (!total || total <= 0) {
                TipView.showError("Cabinet groups not configured. Please set first.");
                return;
            }
            UIManager.open("adminOpenCabinet");
        } else if (menuId === "records") {
            const total = LockerService.getRecordsTotalCount();
            if (!total || total <= 0) {
                TipView.showError("No store/pick records yet", 3);
                return;
            }
            UIManager.open("adminRecords");
        } else if (menuId === "settings") {
            UIManager.open("adminPasswordSettings");
        }
    },

    onShow: function () {
        log.info("AdminHomePage onShow");
    },

    onHide: function () {
        log.info("AdminHomePage onHide");
    },

    onClose: function (sourceId, resultData) {
        if (sourceId === "adminGroupConfig" && resultData && resultData.refreshRemain) {
            this._needRefreshRemain = true;
        }
    },
};

export default AdminHomePage;
