import dxui from "../../../dxmodules/dxUi.js";
import log from "../../../dxmodules/dxLogger.js";
import dxDriver from "../../../dxmodules/dxDriver.js";
import UIManager from "../UIManager.js";
import PasswordView from "../PasswordView.js";
import LockerService from "../../lock/LockerService.js";
import TipView from "../TipView.js";

const GroupConfigPage = {
    id: "adminGroupConfig",

    init: function () {
        const parent = UIManager.getRoot();

        this.root = dxui.View.build(this.id, parent);
        this.root.setSize(dxDriver.DISPLAY.WIDTH, dxDriver.DISPLAY.HEIGHT);
        this.root.radius(0);
        this.root.borderWidth(0);
        this.root.padAll(0);
        this.root.bgColor(0xebebeb);

        this.data = {
            groups: [],
            needRefreshRemain: false,
            editIndex: -1,
            editCount: "",
        };

        this._initView();
        this._renderGroups();

        return this.root;
    },

    _initView: function () {
        const W = dxDriver.DISPLAY.WIDTH;
        const H = dxDriver.DISPLAY.HEIGHT;

        const titleFontSize = Math.round(H * 0.032);
        const cancelFontSize = Math.round(H * 0.024);
        const rowFontSize = Math.round(H * 0.024);
        const editBtnFontSize = Math.round(H * 0.02);
        const fieldFontSize = Math.round(H * 0.024);
        const addDelSize = Math.round(H * 0.04);

        // 1. Title
        this.title = dxui.Label.build(this.id + "_title", this.root);
        this.title.text("Config");
        this.title.textFont(UIManager.font(titleFontSize, dxui.Utils.FONT_STYLE.BOLD));
        this.title.textColor(0x333333);
        this.title.setSize(Math.round(W * 0.6), Math.round(H * 0.05));
        this.title.align(dxui.Utils.ALIGN.TOP_MID, 0, Math.round(H * 0.025));

        // 2. Cancel button: top right
        this.btnCancel = dxui.Button.build(this.id + "_cancel", this.root);
        this.btnCancel.setSize(Math.round(W * 0.15), Math.round(H * 0.05));
        this.btnCancel.radius(0);
        this.btnCancel.bgOpa(0);
        this.btnCancel.borderWidth(0);
        this.btnCancel.align(dxui.Utils.ALIGN.TOP_RIGHT, -Math.round(W * 0.03), Math.round(H * 0.02));

        const btnCancelLabel = dxui.Label.build(this.id + "_cancel_label", this.btnCancel);
        btnCancelLabel.text("Cancel");
        btnCancelLabel.textFont(UIManager.font(cancelFontSize, dxui.Utils.FONT_STYLE.NORMAL));
        btnCancelLabel.textColor(0x888888);
        btnCancelLabel.align(dxui.Utils.ALIGN.CENTER, 0, 0);

        this.btnCancel.on(dxui.Utils.EVENT.CLICK, () => {
            const needRefresh = !!(this.data && this.data.needRefreshRemain);
            this.close({ refreshRemain: needRefresh });
        });

        // 3. Add/Remove buttons: to the right of title
        const actionY = Math.round(H * 0.025);
        const btnSize = 48;
        const gap = Math.round(W * 0.02);
        // Title centered, buttons to the right of center
        const actionStartX = Math.round(W * 0.52);

        this.btnAdd = dxui.Button.build(this.id + "_add", this.root);
        this.btnAdd.setSize(btnSize, btnSize);
        this.btnAdd.bgOpa(0);
        this.btnAdd.borderWidth(0);
        this.btnAdd.radius(0);
        this.btnAdd.align(dxui.Utils.ALIGN.TOP_LEFT, actionStartX, actionY);

        this.btnAddImg = dxui.Image.build(this.id + "_add_img", this.btnAdd);
        this.btnAddImg.source("/app/code/resource/image/add.png");
        this.btnAddImg.setSize(addDelSize, addDelSize);
        this.btnAddImg.align(dxui.Utils.ALIGN.CENTER, 0, 0);

        this.btnRemove = dxui.Button.build(this.id + "_remove", this.root);
        this.btnRemove.setSize(btnSize, btnSize);
        this.btnRemove.bgOpa(0);
        this.btnRemove.borderWidth(0);
        this.btnRemove.radius(0);
        this.btnRemove.align(dxui.Utils.ALIGN.TOP_LEFT, actionStartX + btnSize + gap, actionY);

        this.btnRemoveImg = dxui.Image.build(this.id + "_remove_img", this.btnRemove);
        this.btnRemoveImg.source("/app/code/resource/image/del.png");
        this.btnRemoveImg.setSize(addDelSize, addDelSize);
        this.btnRemoveImg.align(dxui.Utils.ALIGN.CENTER, 0, 0);

        this.btnAdd.on(dxui.Utils.EVENT.CLICK, () => { this._handleAddGroup(); });
        this.btnRemove.on(dxui.Utils.EVENT.CLICK, () => { this._handleRemoveGroup(); });

        // 4. Group list
        const rowW = Math.round(W * 0.85);
        const rowH = Math.round(H * 0.065);
        const rowGap = Math.round(H * 0.015);
        const listStartY = Math.round(H * 0.09);
        const editBtnW = Math.round(W * 0.15);
        const editBtnH = Math.round(rowH * 0.7);

        this.groupRows = [];
        for (let i = 0; i < 5; i++) {
            const y = listStartY + i * (rowH + rowGap);

            const row = dxui.View.build(`${this.id}_row_${i}`, this.root);
            row.setSize(rowW, rowH);
            row.radius(Math.round(rowH * 0.15));
            row.borderWidth(0);
            row.bgColor(0xffffff);
            row.align(dxui.Utils.ALIGN.TOP_MID, 0, y);
            row.scroll(false);

            const label = dxui.Label.build(`${this.id}_row_${i}_label`, row);
            label.text("");
            label.textFont(UIManager.font(rowFontSize, dxui.Utils.FONT_STYLE.NORMAL));
            label.textColor(0x4d4d4d);
            label.align(dxui.Utils.ALIGN.LEFT_MID, Math.round(rowW * 0.04), 0);

            const btnEdit = dxui.Button.build(`${this.id}_row_${i}_edit`, row);
            btnEdit.setSize(editBtnW, editBtnH);
            btnEdit.radius(Math.round(editBtnH / 2));
            btnEdit.borderWidth(0);
            btnEdit.bgColor(0xffa31f);
            btnEdit.align(dxui.Utils.ALIGN.RIGHT_MID, -Math.round(rowW * 0.03), 0);

            const btnEditLabel = dxui.Label.build(`${this.id}_row_${i}_edit_label`, btnEdit);
            btnEditLabel.text("Edit");
            btnEditLabel.textFont(UIManager.font(editBtnFontSize, dxui.Utils.FONT_STYLE.NORMAL));
            btnEditLabel.textColor(0xffffff);
            btnEditLabel.align(dxui.Utils.ALIGN.CENTER, 0, 0);

            btnEdit.on(dxui.Utils.EVENT.CLICK, () => {
                this._startEdit(i);
            });

            row.hide();
            this.groupRows.push({ row, label, btnEdit });
        }

        // 5. Empty state hint
        this.emptyLabel = dxui.Label.build(this.id + "_empty_tip", this.root);
        this.emptyLabel.text("Tap [+] to add cabinet group");
        this.emptyLabel.textFont(UIManager.font(Math.round(H * 0.026), dxui.Utils.FONT_STYLE.NORMAL));
        this.emptyLabel.textColor(0x999999);
        this.emptyLabel.setSize(Math.round(W * 0.6), Math.round(H * 0.04));
        this.emptyLabel.align(dxui.Utils.ALIGN.CENTER, 0, -Math.round(H * 0.1));
        this.emptyLabel.hide();

        // 6. Edit input (above keypad), hidden by default
        const keypadH = Math.round(H / 3);
        const fieldW = Math.round(W * 0.85);
        const fieldH = Math.round(H * 0.055);
        const fieldY = H - keypadH - fieldH - Math.round(H * 0.02);

        this.editField = dxui.View.build(this.id + "_edit_field", this.root);
        this.editField.setSize(fieldW, fieldH);
        this.editField.radius(Math.round(fieldH * 0.15));
        this.editField.borderWidth(0);
        this.editField.bgColor(0xffffff);
        this.editField.align(dxui.Utils.ALIGN.TOP_MID, 0, fieldY);
        this.editField.scroll(false);

        this.editFieldLabel = dxui.Label.build(this.id + "_edit_field_label", this.editField);
        this.editFieldLabel.text("");
        this.editFieldLabel.textFont(UIManager.font(fieldFontSize, dxui.Utils.FONT_STYLE.NORMAL));
        this.editFieldLabel.textColor(0x999999);
        this.editFieldLabel.align(dxui.Utils.ALIGN.LEFT_MID, Math.round(fieldW * 0.04), 0);

        this.editField.on(dxui.Utils.EVENT.CLICK, () => {
            this.data.editCount = "";
            this._refreshEditField();
        });

        this.editField.hide();

        // 7. Bottom numeric keypad (1/3 screen), hidden by default
        this.editKeypad = PasswordView.build(this.id + "_edit_keypad", this.root, {
            onDigit: (d) => { this._onEditDigit(d); },
            onDelete: () => { this._onEditDelete(); },
            onConfirm: () => { this._handleEditConfirm(); },
            onExit: () => { this._cancelEdit(); },
        });
        this.editKeypad.root.hide();
    },

    // ---------- Data load and render ----------

    _loadGroups: function () {
        const counts = LockerService.getGroupCabinetCounts([]);
        const groups = [];
        let startNo = 1;
        for (let i = 0; i < counts.length; i++) {
            const count = Number(counts[i]) || 0;
            if (count <= 0) continue;
            groups.push({ startNo, count });
            startNo += count;
        }
        this.data.groups = groups;
    },

    _renderGroups: function () {
        this._loadGroups();
        const groups = this.data.groups || [];

        if (groups.length >= 5) { this.btnAdd.hide(); } else { this.btnAdd.show(); }
        if (groups.length <= 0) { this.btnRemove.hide(); } else { this.btnRemove.show(); }
        if (groups.length === 0) { this.emptyLabel.show(); } else { this.emptyLabel.hide(); }

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
            row.label.text(`Group ${index}: ${start}-${end}, count ${g.count}`);
            row.row.show();
        }
    },

    // ---------- Add/remove groups ----------

    _handleAddGroup: function () {
        const groups = this.data.groups || [];
        if (groups.length >= this.groupRows.length) return;

        const counts = LockerService.getGroupCabinetCounts([]);
        counts.push(30);
        LockerService.setGroupCabinetCounts(counts);
        this.data.needRefreshRemain = true;
        this._renderGroups();
    },

    _handleRemoveGroup: function () {
        const groups = this.data.groups || [];
        if (groups.length <= 1) {
            TipView.showError("Keep at least one cabinet group");
            return;
        }

        const counts = LockerService.getGroupCabinetCounts([]);
        if (counts.length <= 1) return;
        counts.pop();
        LockerService.setGroupCabinetCounts(counts);
        this.data.needRefreshRemain = true;
        this._renderGroups();
    },

    // ---------- Inline edit ----------

    _startEdit: function (rowIndex) {
        const groups = this.data.groups || [];
        if (rowIndex < 0 || rowIndex >= groups.length) return;

        this.data.editIndex = rowIndex;
        const counts = LockerService.getGroupCabinetCounts([]);
        this.data.editCount = String(counts[rowIndex] || "");
        this._refreshEditField();
        this.editField.show();
        this.editKeypad.root.show();
    },

    _cancelEdit: function () {
        this.data.editIndex = -1;
        this.data.editCount = "";
        this.editField.hide();
        this.editKeypad.root.hide();
    },

    _refreshEditField: function () {
        const index = this.data.editIndex + 1;
        if (this.data.editCount && this.data.editCount.length > 0) {
            this.editFieldLabel.text(`Group ${index} count: ${this.data.editCount}`);
            this.editFieldLabel.textColor(0x333333);
        } else {
            this.editFieldLabel.text(`Enter cabinet count for group ${index}`);
            this.editFieldLabel.textColor(0x999999);
        }
    },

    _onEditDigit: function (d) {
        if (this.data.editCount.length >= 3) return;
        this.data.editCount += d;
        this._refreshEditField();
    },

    _onEditDelete: function () {
        if (this.data.editCount.length > 0) {
            this.data.editCount = this.data.editCount.slice(0, -1);
            this._refreshEditField();
        }
    },

    _handleEditConfirm: function () {
        const counts = LockerService.getGroupCabinetCounts([]);
        if (this.data.editIndex < 0 || this.data.editIndex >= counts.length) {
            TipView.showError("Cabinet group does not exist");
            return;
        }

        const countNum = parseInt(this.data.editCount, 10);
        if (!Number.isFinite(countNum) || countNum <= 0) {
            TipView.showError("Cabinet count must be a positive integer");
            return;
        }

        counts[this.data.editIndex] = countNum;
        LockerService.setGroupCabinetCounts(counts);
        this.data.needRefreshRemain = true;

        log.info(`GroupConfigPage: Group ${this.data.editIndex + 1} count set to ${countNum}`);

        TipView.showSuccess("Group config updated", {
            duration: 1500,
            countdown: false,
            onFinish: () => {
                this._cancelEdit();
                this._renderGroups();
            },
        });
    },

    onShow: function () {
        this._cancelEdit();
        this._renderGroups();
    },

    onClose: function () { },

    onHide: function () { },
};

export default GroupConfigPage;
