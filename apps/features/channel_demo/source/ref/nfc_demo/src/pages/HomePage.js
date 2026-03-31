import dxui from "../../dxmodules/dxUi.js";
import log from "../../dxmodules/dxLogger.js";
import dxDriver from "../../dxmodules/dxDriver.js";
import bus from "../../dxmodules/dxEventBus.js";
import UIManager from "../UIManager.js";

const HomePage = {
    id: "homePage",
    currentCardInfo: null,
    isCardPresent: false,

    // Page initialization, called only once
    init: function () {
        const parent = UIManager.getRoot();

        // Create full-screen root view
        this.root = dxui.View.build(this.id, parent);
        this.root.setSize(dxDriver.DISPLAY.WIDTH, dxDriver.DISPLAY.HEIGHT);
        this.root.radius(0);
        this.root.borderWidth(0);
        this.root.padAll(0);
        this.root.bgColor(0xF5F5F5); // Light gray background

        // Initialize UI components
        this.initView();

        // Register event listeners for NFC events from nfcWorker
        bus.on("nfc:card_detected", (cardInfo) => {
            log.info("HomePage received nfc:card_detected");
            this.currentCardInfo = cardInfo;
            this.updateCardInfo(cardInfo);
        });

        bus.on("nfc:card_status", (status) => {
            log.info("HomePage received nfc:card_status", status.isCardIn);
            this.isCardPresent = status.isCardIn;
            this.updateStatusLight(status.isCardIn);

            if (!status.isCardIn) {
                // Card removed, clear info
                this.clearCardInfo();
            }
        });

        return this.root;
    },

    initView: function () {
        // Title
        this.title = dxui.Label.build(this.id + "_title", this.root);
        this.title.text("NFC Card Reader Demo");
        this.title.textFont(UIManager.font(22, dxui.Utils.FONT_STYLE.BOLD));
        this.title.textColor(0x212121);
        this.title.align(dxui.Utils.ALIGN.TOP_MID, 0, 15);

        // Status Indicator Area (move to left)
        this.statusArea = dxui.View.build(this.id + "_status_area", this.root);
        this.statusArea.setSize(200, 60);
        this.statusArea.align(dxui.Utils.ALIGN.TOP_LEFT, 20, 55);
        this.statusArea.bgOpa(0);
        this.statusArea.radius(0);
        this.statusArea.scroll(false);
        this.statusArea.borderWidth(0);

        // Status Light (Circle)
        this.statusLight = dxui.View.build(this.id + "_status_light", this.statusArea);
        this.statusLight.setSize(40, 40);
        this.statusLight.radius(20); // Make it circular
        this.statusLight.bgColor(0xFF0000); // Red by default
        this.statusLight.borderWidth(0);
        this.statusLight.align(dxui.Utils.ALIGN.LEFT_MID, 0, 0);

        // Status Text
        this.statusText = dxui.Label.build(this.id + "_status_text", this.statusArea);
        this.statusText.text("No Card");
        this.statusText.textFont(UIManager.font(16, dxui.Utils.FONT_STYLE.NORMAL));
        this.statusText.textColor(0x757575);
        this.statusText.align(dxui.Utils.ALIGN.LEFT_MID, 50, 0);

        // Card Display Area (White Card Background)
        this.cardArea = dxui.View.build(this.id + "_card_area", this.root);
        this.cardArea.setSize(300, 180);
        this.cardArea.align(dxui.Utils.ALIGN.TOP_MID, 0, 130);
        this.cardArea.bgColor(0xFFFFFF); // White card
        this.cardArea.radius(8);
        this.cardArea.borderWidth(2);
        this.cardArea.padAll(15);
        this.cardArea.scroll(false);

        // Card Info Labels (on the white card)
        const labelY = 10;
        const lineHeight = 30;

        this.cardIdLabel = dxui.Label.build(this.id + "_card_id", this.cardArea);
        this.cardIdLabel.text("Card ID: ---");
        this.cardIdLabel.textFont(UIManager.font(14, dxui.Utils.FONT_STYLE.NORMAL));
        this.cardIdLabel.textColor(0x424242);
        this.cardIdLabel.align(dxui.Utils.ALIGN.TOP_LEFT, 0, labelY);

        this.cardTypeLabel = dxui.Label.build(this.id + "_card_type", this.cardArea);
        this.cardTypeLabel.text("Type: ---");
        this.cardTypeLabel.textFont(UIManager.font(14, dxui.Utils.FONT_STYLE.NORMAL));
        this.cardTypeLabel.textColor(0x424242);
        this.cardTypeLabel.align(dxui.Utils.ALIGN.TOP_LEFT, 0, labelY + lineHeight);

        this.cardSakLabel = dxui.Label.build(this.id + "_card_sak", this.cardArea);
        this.cardSakLabel.text("SAK: ---");
        this.cardSakLabel.textFont(UIManager.font(14, dxui.Utils.FONT_STYLE.NORMAL));
        this.cardSakLabel.textColor(0x424242);
        this.cardSakLabel.align(dxui.Utils.ALIGN.TOP_LEFT, 0, labelY + lineHeight * 2);

        this.cardLenLabel = dxui.Label.build(this.id + "_card_len", this.cardArea);
        this.cardLenLabel.text("ID Length: ---");
        this.cardLenLabel.textFont(UIManager.font(14, dxui.Utils.FONT_STYLE.NORMAL));
        this.cardLenLabel.textColor(0x424242);
        this.cardLenLabel.align(dxui.Utils.ALIGN.TOP_LEFT, 0, labelY + lineHeight * 3);

        // Read Block Data Button (move to top right, same row as status area)
        this.readBtn = dxui.Button.build(this.id + "_read_btn", this.root);
        this.readBtn.setSize(160, 50);
        this.readBtn.align(dxui.Utils.ALIGN.TOP_RIGHT, -20, 60);
        this.readBtn.bgColor(0xBDBDBD); // Gray by default (disabled state)
        this.readBtn.radius(8);

        this.readBtnLabel = dxui.Label.build(this.id + "_read_btn_label", this.readBtn);
        this.readBtnLabel.text("Read Blocks");
        this.readBtnLabel.textFont(UIManager.font(15, dxui.Utils.FONT_STYLE.NORMAL));
        this.readBtnLabel.textColor(0xFFFFFF);
        this.readBtnLabel.align(dxui.Utils.ALIGN.CENTER, 0, 0);

        this.readBtn.on(dxui.Utils.EVENT.CLICK, () => {
            log.info("Read Block Data button clicked");
            if (this.isCardPresent && this.currentCardInfo) {
                // Open BlockDataPage
                this.open("blockData", { cardInfo: this.currentCardInfo });
            } else {
                log.info("No card present, cannot read blocks");
                // You could show a toast/alert here
            }
        });
    },

    updateStatusLight: function (isCardIn) {
        if (isCardIn) {
            this.statusLight.bgColor(0x4CAF50); // Green
            this.statusText.text("Card Present");
            this.readBtn.bgColor(0x2196F3); // Enable button (blue)
        } else {
            this.statusLight.bgColor(0xF44336); // Red
            this.statusText.text("No Card");
            this.readBtn.bgColor(0xBDBDBD); // Disable button (gray)
        }
    },

    updateCardInfo: function (cardInfo) {
        this.cardIdLabel.text("Card ID: " + cardInfo.id);
        this.cardTypeLabel.text("Type: " + cardInfo.card_type);
        this.cardSakLabel.text("SAK: 0x" + cardInfo.sak.toString(16).toUpperCase());
        this.cardLenLabel.text("ID Length: " + cardInfo.id_len + " bytes");
    },

    clearCardInfo: function () {
        this.cardIdLabel.text("Card ID: ---");
        this.cardTypeLabel.text("Type: ---");
        this.cardSakLabel.text("SAK: ---");
        this.cardLenLabel.text("ID Length: ---");
        this.currentCardInfo = null;
    },

    // Called when page is shown
    onShow: function (data) {
        log.info("HomePage onShow");
        // Keep current state
    },

    // Called when page is hidden
    onHide: function () {
        log.info("HomePage onHide");
    }
};

export default HomePage;
