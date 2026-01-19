import dxui from "../../../dxmodules/dxUi.js";
import log from "../../../dxmodules/dxLogger.js";
import dxDriver from "../../../dxmodules/dxDriver.js";
import UIManager from "../UIManager.js";
import PasswordView from "../PasswordView.js";
import TipView from "../TipView.js";
import LockerService from "../../lock/LockerService.js";

// Admin: edit single group (change cabinet count)
const GroupEditPage = {
    id: "adminGroupEdit",

    init: function () {
        const parent = UIManager.getRoot();

        this.root = dxui.View.build(this.id, parent);
        this.root.setSize(dxDriver.DISPLAY.WIDTH, dxDriver.DISPLAY.HEIGHT);
        this.root.radius(0);
        this.root.borderWidth(0);
        this.root.padAll(0);
        this.root.bgColor(0xf5f7fa);

        this.data = {
            groupIndex: 0,  // Which group (0-based)
            count: "",      // Cabinet count string
        };

        this._initView();

        return this.root;
    },

    _initView: function () {
        // Top tip: "Edit group cabinet count"
        this.tipLabel = dxui.Label.build(this.id + "_tip", this.root);
        this.tipLabel.text("Edit cabinet count");
        this.tipLabel.textFont(UIManager.font(20, dxui.Utils.FONT_STYLE.NORMAL));
        this.tipLabel.setPos(12, 8);

        // Top-right "Cancel" button: close and back to group list
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
            // Pass explicit flag so parent onClose is called
            this.close({ refreshRemain: false });
        });

        // Middle: cabinet count label (display only)
        this.countField = dxui.View.build(this.id + "_count_field", this.root);
        this.countField.setSize(200, 40);
        this.countField.radius(8);
        this.countField.borderWidth(2);
        this.countField.setPos((dxDriver.DISPLAY.WIDTH - 200) / 2, 40);
        this.countField.scroll(false);

        this.countLabel = dxui.Label.build(
            this.id + "_count_label",
            this.countField
        );
        this.countLabel.text("Cabinets");
        this.countLabel.textFont(
            UIManager.font(20, dxui.Utils.FONT_STYLE.NORMAL)
        );
        this.countLabel.align(dxui.Utils.ALIGN.CENTER, 0, 0);

        // Bottom keypad: edit cabinet count
        this.keypad = PasswordView.build(this.id + "_keypad", this.root, {
            onDigit: (d) => {
                this._onDigit(d);
            },
            onDelete: () => {
                this._onDelete();
            },
            onConfirm: () => {
                this._handleConfirm();
            },
        });
    },

    _buildTipText: function () {
        const index = this.data.groupIndex + 1;
        return `Edit group ${index} cabinet count`;
    },

    _refreshCountLabel: function () {
        if (this.data.count && this.data.count.length > 0) {
            this.countLabel.text(this.data.count);
        } else {
            this.countLabel.text("Cabinets");
        }
    },

    _onDigit: function (d) {
        // At most 3 digits
        if (this.data.count.length >= 3) return;
        this.data.count += d;
        this._refreshCountLabel();
    },

    _onDelete: function () {
        if (this.data.count.length > 0) {
            this.data.count = this.data.count.slice(0, -1);
            this._refreshCountLabel();
        }
    },

    _handleConfirm: function () {
        const counts = LockerService.getGroupCabinetCounts([]);
        if (
            this.data.groupIndex < 0 ||
            this.data.groupIndex >= counts.length
        ) {
            TipView.showError("Group not found");
            return;
        }

        const countNum = parseInt(this.data.count, 10);
        if (!Number.isFinite(countNum) || countNum <= 0) {
            TipView.showError("Cabinet count must be > 0");
            return;
        }

        counts[this.data.groupIndex] = countNum;
        LockerService.setGroupCabinetCounts(counts);

        log.info(
            `GroupEditPage: group ${this.data.groupIndex + 1} count updated to ${countNum}`
        );

        // Show success, then close and go back to group config
        TipView.showSuccess("Group updated", {
            duration: 2000,
            countdown: false,
            onFinish: () => {
                // Notify parent (GroupConfigPage) that config change may affect home free-cabinet text
                this.close({ refreshRemain: true });
            },
        });
    },

    onShow: function (data) {
        // Read passed-in groupIndex and fetch current count from model
        if (data && typeof data.groupIndex === "number") {
            this.data.groupIndex = data.groupIndex;
        }

        const counts = LockerService.getGroupCabinetCounts([]);
        if (
            this.data.groupIndex >= 0 &&
            this.data.groupIndex < counts.length
        ) {
            this.data.count = String(counts[this.data.groupIndex]);
            this.tipLabel.text(this._buildTipText());
        } else {
            this.data.count = "";
            this.tipLabel.text("Edit cabinet count");
        }

        this._refreshCountLabel();
    },

    onHide: function () { },
};

export default GroupEditPage;


