import dxui from "../../dxmodules/dxUi.js";
import log from "../../dxmodules/dxLogger.js";
import dxDriver from "../../dxmodules/dxDriver.js";
import bus from "../../dxmodules/dxEventBus.js";
import UIManager from "../UIManager.js";

const BlockDataPage = {
    id: "blockDataPage",
    blocks: [],
    blockUIElements: [], // Store pre-created UI elements for 6 blocks

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
        this.root.scroll(true); // Enable scrolling for content

        // Initialize UI components
        this.initView();

        return this.root;
    },

    initView: function () {
        // Header Bar
        this.header = dxui.View.build(this.id + "_header", this.root);
        this.header.setSize(dxDriver.DISPLAY.WIDTH, 60);
        this.header.align(dxui.Utils.ALIGN.TOP_MID, 0, 0);
        this.header.bgColor(0x2196F3);
        this.header.radius(0);
        this.header.borderWidth(0);
        this.header.scroll(false);

        // Back Button
        this.backBtn = dxui.View.build(this.id + "_back_btn", this.header);
        this.backBtn.setSize(80, 40);
        this.backBtn.align(dxui.Utils.ALIGN.LEFT_MID, 10, 0);
        this.backBtn.radius(5);
        this.backBtn.bgOpa(0);
        this.backBtn.borderWidth(0);
        this.backBtn.padAll(0);

        this.backBtnLabel = dxui.Label.build(this.id + "_back_label", this.backBtn);
        this.backBtnLabel.text("< Back");
        this.backBtnLabel.textFont(UIManager.font(14, dxui.Utils.FONT_STYLE.NORMAL));
        this.backBtnLabel.textColor(0xFFFFFF);
        this.backBtnLabel.align(dxui.Utils.ALIGN.CENTER, 0, 0);

        this.backBtn.on(dxui.Utils.EVENT.CLICK, () => {
            log.info("Back button clicked");
            this.close();
        });

        // Title
        this.title = dxui.Label.build(this.id + "_title", this.header);
        this.title.text("Block Data");
        this.title.textFont(UIManager.font(20, dxui.Utils.FONT_STYLE.BOLD));
        this.title.textColor(0xFFFFFF);
        this.title.align(dxui.Utils.ALIGN.CENTER, 0, 0);

        // Content Area (Scrollable)
        this.contentArea = dxui.View.build(this.id + "_content", this.root);
        this.contentArea.setSize(dxDriver.DISPLAY.WIDTH - 20, dxDriver.DISPLAY.HEIGHT - 80);
        this.contentArea.align(dxui.Utils.ALIGN.TOP_MID, 0, 70);
        this.contentArea.bgOpa(0);
        this.contentArea.radius(0);
        this.contentArea.borderWidth(0);
        this.contentArea.scroll(true);
        this.contentArea.padAll(10);

        // Loading label (will be replaced with block data)
        this.loadingLabel = dxui.Label.build(this.id + "_loading", this.contentArea);
        this.loadingLabel.text("Loading block data...");
        this.loadingLabel.textFont(UIManager.font(16, dxui.Utils.FONT_STYLE.NORMAL));
        this.loadingLabel.textColor(0x757575);
        this.loadingLabel.align(dxui.Utils.ALIGN.TOP_LEFT, 0, 0);

        // Pre-create all 6 block UI elements
        this.createBlockUIElements();
    },

    createBlockUIElements: function () {
        const contentWidth = dxDriver.DISPLAY.WIDTH - 40;
        const blockWidth = Math.floor((contentWidth - 20) / 3); // 3 columns with gaps
        const blockHeight = 90;
        const gap = 5;

        for (let index = 0; index < 6; index++) {
            const row = Math.floor(index / 3); // 0 or 1
            const col = index % 3; // 0, 1, or 2

            const xPos = col * (blockWidth + gap);
            const yPos = row * (blockHeight + gap);

            // Block container
            const blockView = dxui.View.build(this.id + "_block_" + index, this.contentArea);
            blockView.setSize(blockWidth, blockHeight);
            blockView.setPos(xPos, yPos);
            blockView.bgColor(0xFFFFFF);
            blockView.radius(6);
            blockView.borderWidth(1);
            blockView.setBorderColor(0xE0E0E0);
            blockView.padAll(8);
            blockView.scroll(false);
            blockView.hide(); // Hide initially

            // Block number label
            const blockNumLabel = dxui.Label.build(this.id + "_block_num_" + index, blockView);
            blockNumLabel.text("Block " + index);
            blockNumLabel.textFont(UIManager.font(10, dxui.Utils.FONT_STYLE.BOLD));
            blockNumLabel.textColor(0x2196F3);
            blockNumLabel.align(dxui.Utils.ALIGN.TOP_MID, 0, 0);

            // Line 1
            const line1Label = dxui.Label.build(this.id + "_line1_" + index, blockView);
            line1Label.text("");
            line1Label.textFont(UIManager.font(11, dxui.Utils.FONT_STYLE.NORMAL));
            line1Label.textColor(0x424242);
            line1Label.align(dxui.Utils.ALIGN.TOP_LEFT, 0, 30);

            // Line 2
            const line2Label = dxui.Label.build(this.id + "_line2_" + index, blockView);
            line2Label.text("");
            line2Label.textFont(UIManager.font(11, dxui.Utils.FONT_STYLE.NORMAL));
            line2Label.textColor(0x424242);
            line2Label.align(dxui.Utils.ALIGN.TOP_LEFT, 0, 50);

            // Error label
            const errorLabel = dxui.Label.build(this.id + "_error_" + index, blockView);
            errorLabel.text("Read Error");
            errorLabel.textFont(UIManager.font(11, dxui.Utils.FONT_STYLE.NORMAL));
            errorLabel.textColor(0xF44336);
            errorLabel.align(dxui.Utils.ALIGN.CENTER, 0, 10);
            errorLabel.hide();

            // Store references
            this.blockUIElements.push({
                blockView: blockView,
                blockNumLabel: blockNumLabel,
                line1Label: line1Label,
                line2Label: line2Label,
                errorLabel: errorLabel
            });
        }

        // Hint label
        const hintYPos = 2 * (blockHeight + gap) + 10;
        this.hintLabel = dxui.Label.build(this.id + "_hint", this.contentArea);
        this.hintLabel.text("Block 6, 7, 8... (More blocks not displayed)");
        this.hintLabel.textFont(UIManager.font(14, dxui.Utils.FONT_STYLE.NORMAL));
        this.hintLabel.textColor(0x9E9E9E);
        this.hintLabel.align(dxui.Utils.ALIGN.TOP_MID, 0, hintYPos);
        this.hintLabel.hide();
    },

    // Called when page is shown
    onShow: function (data) {
        log.info("BlockDataPage onShow", data);

        // Hide all block UI elements first if they exist
        if (this.blockUIElements && this.blockUIElements.length > 0) {
            this.blockUIElements.forEach(uiElement => {
                if (uiElement.blockView) {
                    uiElement.blockView.hide();
                }
            });
        }

        // Hide hint label
        if (this.hintLabel) {
            this.hintLabel.hide();
        }

        // Show loading label
        this.loadingLabel.show();

        // Read blocks via RPC
        this.readBlocks();
    },

    readBlocks: async function () {
        try {
            log.info("Reading blocks via RPC...");
            this.loadingLabel.text("Reading blocks...");

            // Call RPC to read 6 blocks starting from block 0
            const blocks = await bus.rpc.call("nfcWorker", "readBlocks", {
                startBlock: 0,
                count: 6
            });

            log.info("Blocks received:", blocks.length);
            this.blocks = blocks;
            this.displayBlocks(blocks);

        } catch (e) {
            log.error("Failed to read blocks:", e);
            this.loadingLabel.text("Error: " + String(e));
        }
    },

    displayBlocks: function (blocks) {
        // Hide loading label
        this.loadingLabel.hide();

        // Show hint label
        this.hintLabel.show();

        // Update pre-created UI elements with block data
        blocks.forEach((block, index) => {
            if (index >= this.blockUIElements.length) return; // Safety check

            const uiElement = this.blockUIElements[index];

            // Update block number
            uiElement.blockNumLabel.text("Block " + block.blockNum);

            if (block.success && block.data) {
                // Split hex string into 2 lines of 8 bytes each
                const hexData = block.data;
                const line1 = this.formatHexLine(hexData.substring(0, 16)); // First 8 bytes
                const line2 = this.formatHexLine(hexData.substring(16, 32)); // Second 8 bytes

                // Update text
                uiElement.line1Label.text(line1);
                uiElement.line2Label.text(line2);

                // Show data labels, hide error label
                uiElement.line1Label.show();
                uiElement.line2Label.show();
                uiElement.errorLabel.hide();
            } else {
                // Show error, hide data labels
                uiElement.line1Label.hide();
                uiElement.line2Label.hide();
                uiElement.errorLabel.show();
            }

            // Show the block view
            uiElement.blockView.show();
        });
    },

    // Format hex string as "FF 00 FF 00 FF 00 00 00"
    formatHexLine: function (hexStr) {
        if (!hexStr) return "";
        let formatted = "";
        for (let i = 0; i < hexStr.length; i += 2) {
            if (i > 0) formatted += " ";
            formatted += hexStr.substring(i, i + 2).toUpperCase();
        }
        return formatted;
    },

    // Called when page is hidden
    onHide: function () {
        log.info("BlockDataPage onHide");
    }
};

export default BlockDataPage;

