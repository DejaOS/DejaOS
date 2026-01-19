import dxui from "../../../dxmodules/dxUi.js";
import log from "../../../dxmodules/dxLogger.js";
import dxDriver from "../../../dxmodules/dxDriver.js";
import UIManager from "../UIManager.js";

// Admin home page
const AdminHomePage = {
    id: "adminHome",

    init: function () {
        const parent = UIManager.getRoot();

        this.root = dxui.View.build(this.id, parent);
        this.root.setSize(dxDriver.DISPLAY.WIDTH, dxDriver.DISPLAY.HEIGHT);
        this.root.radius(0);
        this.root.borderWidth(0);
        this.root.padAll(0);
        this.root.bgColor(0xf0f2f5);

        this._initView();

        return this.root;
    },

    _initView: function () {
        // Top title
        this.title = dxui.Label.build(this.id + "_title", this.root);
        this.title.text("Admin Panel");
        this.title.textFont(UIManager.font(24, dxui.Utils.FONT_STYLE.BOLD));
        this.title.align(dxui.Utils.ALIGN.TOP_MID, 0, 16);

        // Top-right "Cancel" button: same style as user password page, back to home
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

        this.topCancelBtn.on(dxui.Utils.EVENT.CLICK, () => {
            log.info("AdminHomePage: click top-right cancel, back to home");
            const needRefresh = !!this._needRefreshRemain;
            // Reset flag to avoid reusing next time
            this._needRefreshRemain = false;
            if (needRefresh) {
                this.backTo("home", { refreshRemain: true });
            } else {
                this.backTo("home");
            }
        });

        // Menu items (6 feature icons)
        const menuItems = [
            { id: "group", text: "Groups", icon: "/app/code/resource/image/admin_group.png" },
            // New: open single cabinet, between "group" and "open all"
            { id: "open_cabinet", text: "Open One", icon: "/app/code/resource/image/admin_open.png" },
            { id: "open_all", text: "Open All", icon: "/app/code/resource/image/admin_open_all.png" },
            { id: "records", text: "Records", icon: "/app/code/resource/image/admin_records.png" },
            { id: "time", text: "Time", icon: "/app/code/resource/image/admin_time.png" },
            { id: "password", text: "Admin PIN", icon: "/app/code/resource/image/admin_password.png" },
        ];

        const cardWidth = 120;
        const cardHeight = 110;
        const gapX = 12;
        const gapY = 20;
        const startY = 70; // First row Y position, slightly below title
        const screenWidth = dxDriver.DISPLAY.WIDTH || 480;

        // First row: 3 centered items
        const totalWidthRow1 = cardWidth * 3 + gapX * 2;
        const startXRow1 = (screenWidth - totalWidthRow1) / 2;
        for (let i = 0; i < 3; i++) {
            const cfg = menuItems[i];
            const x = startXRow1 + i * (cardWidth + gapX);
            this._createMenuItem(cfg, x, startY, cardWidth, cardHeight);
        }

        // Second row: 3 centered items
        const totalWidthRow2 = cardWidth * 3 + gapX * 2;
        const startXRow2 = (screenWidth - totalWidthRow2) / 2;
        const row2Y = startY + cardHeight + gapY;
        for (let i = 3; i < menuItems.length; i++) {
            const cfg = menuItems[i];
            const colIndex = i - 3;
            const x = startXRow2 + colIndex * (cardWidth + gapX);
            this._createMenuItem(cfg, x, row2Y, cardWidth, cardHeight);
        }

        // No extra "Back" button at bottom; use top-right Cancel for consistency
    },

    _createMenuItem: function (cfg, x, y, width, height) {
        const item = dxui.View.build(`${this.id}_item_${cfg.id}`, this.root);
        item.setSize(width, height);
        item.radius(12);
        item.borderWidth(0);
        item.bgColor(0xffffff);
        item.setPos(x, y);
        item.scroll(false);

        // Icon (resource suggested 64x64)
        const icon = dxui.Image.build(`${this.id}_icon_${cfg.id}`, item);
        icon.setSize(64, 64);
        icon.align(dxui.Utils.ALIGN.TOP_MID, 0, 2);
        icon.source(cfg.icon);

        // Text: align under icon using alignTo to avoid overlapping
        const label = dxui.Label.build(`${this.id}_label_${cfg.id}`, item);
        label.text(cfg.text);
        label.textFont(UIManager.font(18, dxui.Utils.FONT_STYLE.NORMAL));
        // Let label width auto-fit text so its center is at text middle,
        // align relative to icon and shift down a bit while keeping center
        label.alignTo(icon, dxui.Utils.ALIGN.BOTTOM_MID, 0, 28);

        // Click event: open target page based on id (groups / open all / records / time / password)
        item.on(dxui.Utils.EVENT.CLICK, () => {
            log.info(`AdminHomePage: click menu -> ${cfg.id}`);
            if (cfg.id === "group") {
                this.open("adminGroupConfig");
            } else if (cfg.id === "open_cabinet") {
                this.open("adminOpenCabinet");
            } else if (cfg.id === "open_all") {
                this.open("adminOpenAll");
            } else if (cfg.id === "records") {
                this.open("adminRecords");
            } else if (cfg.id === "time") {
                this.open("adminTimeSettings");
            } else if (cfg.id === "password") {
                this.open("adminPasswordSettings");
            } else {
                // Other menu items can be implemented later
            }
        });
    },

    onShow: function () {
        log.info("AdminHomePage onShow");
    },

    onHide: function () {
        log.info("AdminHomePage onHide");
    },

    /**
     * Callback when a child page closes.
     * Used to receive "need to refresh home free-cabinet display" flag from group pages.
     */
    onClose: function (sourceId, resultData) {
        if (sourceId === "adminGroupConfig" && resultData && resultData.refreshRemain) {
            this._needRefreshRemain = true;
        }
    },
};

export default AdminHomePage;


