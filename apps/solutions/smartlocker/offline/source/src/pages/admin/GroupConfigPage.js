import dxui from "../../../dxmodules/dxUi.js";
import log from "../../../dxmodules/dxLogger.js";
import dxDriver from "../../../dxmodules/dxDriver.js";
import UIManager from "../UIManager.js";
import LockerService from "../../lock/LockerService.js";

// Admin: cabinet group management page (list + add/remove + edit)
// Real group data comes from LockerService.getGroupCabinetCounts() / setGroupCabinetCounts().
// this.data.groups is only for UI display, with startNo + count.
const GroupConfigPage = {
    id: "adminGroupConfig",

    init: function () {
        const parent = UIManager.getRoot();

        this.root = dxui.View.build(this.id, parent);
        this.root.setSize(dxDriver.DISPLAY.WIDTH, dxDriver.DISPLAY.HEIGHT);
        this.root.radius(0);
        this.root.borderWidth(0);
        this.root.padAll(0);
        this.root.bgColor(0xf5f7fa);

        this.data = {
            groups: [], // [{ startNo, count }, ...]
            needRefreshRemain: false, // Whether home page free-cabinet text should refresh on back
        };

        this._initView();
        this._renderGroups();

        return this.root;
    },

    _initView: function () {
        // Top title / hint
        this.tipLabel = dxui.Label.build(this.id + "_tip", this.root);
        this.tipLabel.text("Groups");
        this.tipLabel.textFont(UIManager.font(20, dxui.Utils.FONT_STYLE.NORMAL));
        this.tipLabel.setPos(12, 8);

        // Top-right "Cancel" button: back to admin home
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
            // Pass whether home free-cabinet text needs refresh back to AdminHomePage
            const needRefresh = !!(this.data && this.data.needRefreshRemain);
            this.close({ refreshRemain: needRefresh });
        });

        // Top "Add / Remove" buttons
        this.btnAdd = dxui.Button.build(this.id + "_add", this.root);
        this.btnAdd.setSize(80, 32);
        this.btnAdd.radius(8);
        this.btnAdd.borderWidth(0);
        this.btnAdd.bgColor(0x1abc9c);
        this.btnAdd.scroll(false);
        this.btnAdd.setPos(140, 8);

        this.btnAddLabel = dxui.Label.build(this.id + "_add_label", this.btnAdd);
        this.btnAddLabel.text("Add");
        this.btnAddLabel.textFont(UIManager.font(16, dxui.Utils.FONT_STYLE.NORMAL));
        this.btnAddLabel.textColor(0xffffff);
        this.btnAddLabel.align(dxui.Utils.ALIGN.CENTER, 0, 0);

        this.btnRemove = dxui.Button.build(this.id + "_remove", this.root);
        this.btnRemove.setSize(80, 32);
        this.btnRemove.radius(8);
        this.btnRemove.borderWidth(0);
        this.btnRemove.bgColor(0xcccccc);
        this.btnRemove.scroll(false);
        this.btnRemove.setPos(230, 8);

        this.btnRemoveLabel = dxui.Label.build(
            this.id + "_remove_label",
            this.btnRemove
        );
        this.btnRemoveLabel.text("Remove");
        this.btnRemoveLabel.textFont(UIManager.font(16, dxui.Utils.FONT_STYLE.NORMAL));
        this.btnRemoveLabel.textColor(0x333333);
        this.btnRemoveLabel.align(dxui.Utils.ALIGN.CENTER, 0, 0);

        this.btnAdd.on(dxui.Utils.EVENT.CLICK, () => {
            this._handleAddGroup();
        });
        this.btnRemove.on(dxui.Utils.EVENT.CLICK, () => {
            this._handleRemoveGroup();
        });

        // Middle: group list (rows with text + Edit button)
        this.groupRows = [];
        const startY = 60;
        const rowHeight = 40;
        const rowGap = 8;
        const maxRows = 6; // Screen height limited, show up to 6 groups

        for (let i = 0; i < maxRows; i++) {
            const y = startY + i * (rowHeight + rowGap);

            const row = dxui.View.build(`${this.id}_row_${i}`, this.root);
            row.setSize(dxDriver.DISPLAY.WIDTH - 24, rowHeight);
            row.radius(8);
            row.borderWidth(0);
            row.bgColor(0xffffff);
            row.setPos(12, y);
            row.scroll(false);

            const label = dxui.Label.build(
                `${this.id}_row_${i}_label`,
                row
            );
            label.text("");
            label.textFont(UIManager.font(18, dxui.Utils.FONT_STYLE.NORMAL));
            label.align(dxui.Utils.ALIGN.LEFT_MID, 8, 0);

            const btnEdit = dxui.Button.build(
                `${this.id}_row_${i}_edit`,
                row
            );
            btnEdit.setSize(72, 28);
            btnEdit.radius(6);
            btnEdit.borderWidth(0);
            btnEdit.bgColor(0x1abc9c);
            btnEdit.scroll(false);
            btnEdit.align(dxui.Utils.ALIGN.RIGHT_MID, -8, 0);

            const btnEditLabel = dxui.Label.build(
                `${this.id}_row_${i}_edit_label`,
                btnEdit
            );
            btnEditLabel.text("Edit");
            btnEditLabel.textFont(
                UIManager.font(16, dxui.Utils.FONT_STYLE.NORMAL)
            );
            btnEditLabel.textColor(0xffffff);
            btnEditLabel.align(dxui.Utils.ALIGN.CENTER, 0, 0);

            // Bind edit event; real group index is checked when rendering
            btnEdit.on(dxui.Utils.EVENT.CLICK, () => {
                this._handleEditGroup(i);
            });

            this.groupRows.push({ row, label, btnEdit });
        }
    },

    _loadGroups: function () {
        // Read counts per group from LockerService, e.g. [30,40,30]
        const counts = LockerService.getGroupCabinetCounts([]);
        const groups = [];
        let startNo = 1;
        for (let i = 0; i < counts.length; i++) {
            const count = Number(counts[i]) || 0;
            if (count <= 0) {
                continue;
            }
            groups.push({ startNo, count });
            startNo += count;
        }
        this.data.groups = groups;
    },

    _renderGroups: function () {
        this._loadGroups();
        const groups = this.data.groups || [];

        for (let i = 0; i < this.groupRows.length; i++) {
            const row = this.groupRows[i];
            const g = groups[i];
            if (!g) {
                row.row.hide();
                continue;
            }
            const index = i + 1;
            const start = g.startNo;
            const end = g.startNo + g.count - 1;
            row.label.text(`Group ${index}: No. ${start}-${end}`);
            row.row.show();
        }
    },

    _handleAddGroup: function () {
        const groups = this.data.groups || [];
        if (groups.length >= this.groupRows.length) {
            log.info("GroupConfigPage: already at max group count");
            return;
        }

        // Current group config (only cares about sizes per group)
        const counts = LockerService.getGroupCabinetCounts([]);
        // Default: each new group has 30 cabinets
        const DEFAULT_GROUP_COUNT = 30;
        counts.push(DEFAULT_GROUP_COUNT);
        LockerService.setGroupCabinetCounts(counts);

        // Group config change will affect total/free cabinet counts; mark for refresh
        this.data.needRefreshRemain = true;

        this._renderGroups();
    },

    _handleRemoveGroup: function () {
        const groups = this.data.groups || [];
        if (groups.length <= 1) {
            log.info("GroupConfigPage: must keep at least one group");
            return;
        }

        const counts = LockerService.getGroupCabinetCounts([]);
        if (counts.length <= 1) {
            log.info("GroupConfigPage: group count already minimal");
            return;
        }
        counts.pop();
        LockerService.setGroupCabinetCounts(counts);

        // Group config change will affect total/free cabinet counts; mark for refresh
        this.data.needRefreshRemain = true;

        this._renderGroups();
    },

    _handleEditGroup: function (rowIndex) {
        const groups = this.data.groups || [];
        if (rowIndex < 0 || rowIndex >= groups.length) return;
        // Open second page to edit single group
        this.open("adminGroupEdit", { groupIndex: rowIndex });
    },

    onShow: function () {
        this._renderGroups();
    },

    /**
     * Child-page close callback.
     * sourceId: closed page id, e.g. 'adminGroupEdit'.
     * resultData: data from child (not used currently).
     */
    onClose: function (sourceId, resultData) {
        log.info("GroupConfigPage: onClose", sourceId, resultData);
        if (sourceId === "adminGroupEdit") {
            // Returned from edit page, user may have changed group config
            this.data.needRefreshRemain = true;
            this._renderGroups();
        }
    },

    onHide: function () { },
};

export default GroupConfigPage;


