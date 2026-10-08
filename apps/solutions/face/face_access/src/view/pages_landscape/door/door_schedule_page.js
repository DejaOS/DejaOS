/**
 * @layer    view
 * @module   door_schedule_page
 * @fires    none
 * @listens  none
 * @depends  dxUi,BaseView,event commands
 *
 * 常开/常闭时段列表 + 新增/编辑。
 * 横屏：白底底部分割线；列表一页 5 条翻页；新增/保存右上角小按钮。
 */

import dxui from '../../../../dxmodules/dxUi.js';
import BaseView from '../../pages/base_view.js';
import router from '../../router/core.js';
import font from '../../components/font.js';
import layout from '../../components/layout.js';
import theme from '../../components/theme.js';
import pageHeader from '../../components/page_header.js';
import keyboard from '../../components/keyboard.js';
import popup from '../../components/popup.js';
import confirm from '../../components/confirm.js';
import { t } from '../../i18n/index.js';
import store from '../../pages/door/door_schedule_store.js';
import { CONTENT_W } from '../ls_metrics.js';
import {
    SETTING_PAGE_SIZE,
    SAVE_BTN_W,
    SAVE_BTN_H,
    SAVE_BTN_RADIUS,
    SAVE_BTN_RIGHT,
    settingPageRowH,
    attachSettingPager,
    styleSettingRow,
    buildTopSaveButton,
} from '../../components/setting_pager.js';

const MAX_ROWS = 32;
const DAYS = [1, 2, 3, 4, 5, 6, 7];
const SEG_H = 68;
const ROW_BG_PRESSED = 0xf0f0f0;

function blank() {
    return {
        scheduleId: '',
        name: '',
        mode: 'open',
        weekdays: [1, 2, 3, 4, 5],
        startTime: '09:00',
        endTime: '18:00',
        enabled: true,
    };
}

export default class DoorSchedulePage extends BaseView {
    constructor() {
        super('settings_door_schedule');
        this._header = null;
        this._listPanel = null;
        this._listContent = null;
        this._editorPanel = null;
        this._editorContent = null;
        this._listW = 0;
        this._rowH = 0;
        this._listPager = null;
        this._editorPager = null;
        /** @type {{ row: object, title: object, detail: object, status: object }[]} */
        this._rows = [];
        /** @type {{ key: string, box: object, active: boolean }[]} */
        this._editorRows = [];
        this._items = [];
        this._editingIndex = -1;
        this._form = blank();
        this._stateLbl = null;
        this._emptyLbl = null;
        this._nameInput = null;
        this._startInput = null;
        this._endInput = null;
        this._enabledSw = null;
        this._modeButtons = {};
        this._dayButtons = {};
        this._addBtn = null;
        this._addLbl = null;
        this._saveBtn = null;
        this._saveLbl = null;
        this._deleteBtn = null;
        this._deleteLbl = null;
        this._kbApis = [];
    }

    onCreate() {
        const self = this;
        this.root = dxui.View.build('page_' + this.name, dxui.Utils.LAYER.MAIN);
        this.root.setSize(layout.width, layout.height);
        layout.clearStyle(this.root);
        this.root.bgColor(0xffffff);
        this.root.bgOpa(100);
        this.root.scroll(false);

        this._header = pageHeader.build(this.root, {
            idPrefix: this.name,
            titleKey: 'schedule.title',
            onBack: function () {
                if (self._editorPanel && !self._editorPanel.isHide()) {
                    self._showList();
                } else {
                    router.back();
                }
            },
        });

        const top = pageHeader.contentTop();
        const contentH = layout.height - top;
        this._listW = layout.x(CONTENT_W);
        this._rowH = settingPageRowH(contentH);

        this._buildList(top, contentH);
        this._buildEditor(top, contentH);
        this._buildTopActions();
        this._showList();
    }

    onEnter() {
        this._showList();
        this._load();
    }

    onExit() {
        keyboard.hideAll();
        confirm.hide();
    }

    async _load() {
        try {
            const data = await store.load();
            this._items = data.items || [];
            this._renderList(data.state || { mode: 'normal' });
        } catch (error) {
            popup.showError(error && error.message ? error.message : t('schedule.loadFailed'));
        }
    }

    _buildTopActions() {
        const self = this;
        const saveY = pageHeader.contentTop() - pageHeader.barHeight()
            + Math.round((pageHeader.barHeight() - layout.y(SAVE_BTN_H)) / 2);

        const add = buildTopSaveButton(this.root, this.name + '_add', function () {
            if (self._items.length >= MAX_ROWS) {
                popup.showError(t('schedule.tooMany'));
            } else {
                self._edit(-1);
            }
        });
        this._addBtn = add.button;
        this._addLbl = add.label;
        this._addLbl.text(t('schedule.add'));

        const save = buildTopSaveButton(this.root, this.name + '_save', function () {
            self._save();
        });
        this._saveBtn = save.button;
        this._saveLbl = save.label;
        this._saveLbl.text(t('schedule.save'));
        this._saveBtn.hide();

        this._deleteBtn = dxui.Button.build(this.name + '_delete', this.root);
        this._deleteBtn.setSize(layout.x(SAVE_BTN_W), layout.y(SAVE_BTN_H));
        this._deleteBtn.bgColor(0xffffff);
        this._deleteBtn.radius(layout.x(SAVE_BTN_RADIUS));
        this._deleteBtn.borderWidth(layout.x(2));
        this._deleteBtn.setBorderColor(theme.errorText);
        this._deleteBtn.align(
            dxui.Utils.ALIGN.TOP_RIGHT,
            -layout.x(SAVE_BTN_RIGHT + SAVE_BTN_W + 16),
            saveY
        );
        this._deleteBtn.on(dxui.Utils.EVENT.CLICK, function () {
            self._remove();
        });
        this._deleteLbl = dxui.Label.build(this.name + '_delete_lbl', this._deleteBtn);
        this._deleteLbl.textFont(font.get(layout.fontSize(28)));
        this._deleteLbl.textColor(theme.errorText);
        this._deleteLbl.align(dxui.Utils.ALIGN.CENTER, 0, 0);
        this._deleteLbl.text(t('schedule.delete'));
        this._deleteBtn.hide();
    }

    /**
     * @param {number} top
     * @param {number} contentH
     */
    _buildList(top, contentH) {
        const self = this;
        const listX = Math.round((layout.width - this._listW) / 2);

        this._listPanel = dxui.View.build(this.name + '_list', this.root);
        this._listPanel.setSize(layout.width, contentH);
        this._listPanel.setPos(0, top);
        layout.clearStyle(this._listPanel);
        this._listPanel.bgColor(0xffffff);
        this._listPanel.bgOpa(100);
        this._listPanel.scroll(false);

        this._listContent = dxui.View.build(this.name + '_list_content', this._listPanel);
        layout.clearStyle(this._listContent);
        // 状态行固定在列表外，翻页只切日程条目（一屏状态 + 4 条）
        const stateH = this._rowH;
        const listPageSize = SETTING_PAGE_SIZE - 1;
        this._listContent.setSize(this._listW, this._rowH * listPageSize);
        this._listContent.setPos(listX, stateH);
        this._listContent.bgOpa(0);
        this._listContent.scroll(false);

        const stateRow = dxui.View.build(this.name + '_state', this._listPanel);
        layout.clearStyle(stateRow);
        stateRow.setSize(this._listW, stateH);
        stateRow.setPos(listX, 0);
        stateRow.scroll(false);
        styleSettingRow(stateRow);
        this._stateLbl = dxui.Label.build(this.name + '_state_lbl', stateRow);
        this._stateLbl.setSize(this._listW - layout.x(48), layout.y(40));
        this._stateLbl.align(dxui.Utils.ALIGN.LEFT_MID, layout.x(24), 0);
        this._stateLbl.textFont(font.get(layout.fontSize(26)));
        this._stateLbl.textColor(theme.textPrimary);
        this._stateLbl.text('');

        this._emptyLbl = dxui.Label.build(this.name + '_empty', this._listPanel);
        this._emptyLbl.setSize(this._listW, layout.y(60));
        this._emptyLbl.align(dxui.Utils.ALIGN.CENTER, 0, stateH / 2);
        this._emptyLbl.textFont(font.get(layout.fontSize(26)));
        this._emptyLbl.textColor(theme.textMuted);
        this._emptyLbl.textAlign(dxui.Utils.TEXT_ALIGN.CENTER);
        this._emptyLbl.text(t('schedule.empty'));
        this._emptyLbl.hide();

        this._rows = [];
        for (let i = 0; i < MAX_ROWS; i++) {
            const row = dxui.View.build(this.name + '_item_' + i, this._listContent);
            layout.clearStyle(row);
            row.setSize(this._listW, this._rowH);
            row.scroll(false);
            styleSettingRow(row);
            row.clickable(true);
            row.hide();
            row.on(dxui.Utils.EVENT.CLICK, (function (index) {
                return function () {
                    self._edit(index);
                };
            })(i));
            row.on(dxui.Utils.ENUM.LV_EVENT_PRESSED, (function (r) {
                return function () {
                    r.bgColor(ROW_BG_PRESSED);
                    r.bgOpa(100);
                };
            })(row));
            row.on(dxui.Utils.ENUM.LV_EVENT_RELEASED, (function (r) {
                return function () {
                    r.bgOpa(0);
                };
            })(row));
            if (dxui.Utils.ENUM.LV_EVENT_PRESS_LOST !== undefined) {
                row.on(dxui.Utils.ENUM.LV_EVENT_PRESS_LOST, (function (r) {
                    return function () {
                        r.bgOpa(0);
                    };
                })(row));
            }

            const title = dxui.Label.build(this.name + '_item_title_' + i, row);
            title.setSize(layout.x(360), layout.y(36));
            title.align(dxui.Utils.ALIGN.LEFT_MID, layout.x(24), -layout.y(16));
            title.textFont(font.get(layout.fontSize(26)));
            title.textColor(theme.textPrimary);
            title.text('');

            const detail = dxui.Label.build(this.name + '_item_detail_' + i, row);
            detail.setSize(this._listW - layout.x(48), layout.y(30));
            detail.align(dxui.Utils.ALIGN.LEFT_MID, layout.x(24), layout.y(20));
            detail.textFont(font.get(layout.fontSize(22)));
            detail.textColor(theme.textSecondary);
            detail.text('');

            const status = dxui.Label.build(this.name + '_item_status_' + i, row);
            status.setSize(layout.x(280), layout.y(34));
            status.align(dxui.Utils.ALIGN.RIGHT_MID, -layout.x(24), -layout.y(16));
            status.textFont(font.get(layout.fontSize(22)));
            status.textColor(theme.textSecondary);
            status.textAlign(dxui.Utils.TEXT_ALIGN.RIGHT);
            status.text('');

            this._rows.push({ row: row, title: title, detail: detail, status: status });
        }

        this._listPager = attachSettingPager(this.root, {
            idPrefix: this.name + '_list',
            rowH: this._rowH,
            pageSize: listPageSize,
            getRows: function () {
                const out = [];
                for (let i = 0; i < self._items.length; i++) {
                    out.push(self._rows[i].row);
                }
                return out;
            },
        });
    }

    /**
     * @param {number} top
     * @param {number} contentH
     */
    _buildEditor(top, contentH) {
        const self = this;
        const listX = Math.round((layout.width - this._listW) / 2);

        this._editorPanel = dxui.View.build(this.name + '_editor', this.root);
        this._editorPanel.setSize(layout.width, contentH);
        this._editorPanel.setPos(0, top);
        layout.clearStyle(this._editorPanel);
        this._editorPanel.bgColor(0xffffff);
        this._editorPanel.bgOpa(100);
        this._editorPanel.scroll(false);
        this._editorPanel.hide();

        this._editorContent = dxui.View.build(this.name + '_editor_content', this._editorPanel);
        layout.clearStyle(this._editorContent);
        this._editorContent.setSize(this._listW, this._rowH * SETTING_PAGE_SIZE);
        this._editorContent.setPos(listX, 0);
        this._editorContent.bgOpa(0);
        this._editorContent.scroll(false);

        this._editorRows = [];
        this._kbApis = [];
        this._nameInput = this._buildTextRow('name', keyboard.MODE.PINYIN);
        this._buildModeRow();
        this._buildWeekdayRow();
        this._startInput = this._buildTextRow('startTime', keyboard.MODE.ENGLISH);
        this._endInput = this._buildTextRow('endTime', keyboard.MODE.ENGLISH);
        this._enabledSw = this._buildSwitchRow('enabled');

        this._editorPager = attachSettingPager(this.root, {
            idPrefix: this.name + '_editor',
            rowH: this._rowH,
            getRows: function () {
                const out = [];
                for (let i = 0; i < self._editorRows.length; i++) {
                    if (self._editorRows[i].active !== false) {
                        out.push(self._editorRows[i].box);
                    }
                }
                return out;
            },
        });
        this._editorPager.hide();
    }

    /**
     * @param {string} key
     * @param {object} box
     */
    _registerEditorRow(key, box) {
        this._editorRows.push({ key: key, box: box, active: true });
    }

    /**
     * @param {string} key
     * @param {number} mode
     * @returns {object}
     */
    _buildTextRow(key, mode) {
        const row = dxui.View.build(this.name + '_row_' + key, this._editorContent);
        layout.clearStyle(row);
        row.setSize(this._listW, this._rowH);
        row.scroll(false);
        styleSettingRow(row);
        this._registerEditorRow(key, row);

        const label = dxui.Label.build(this.name + '_lbl_' + key, row);
        label.setSize(layout.x(240), layout.y(40));
        label.align(dxui.Utils.ALIGN.LEFT_MID, layout.x(24), 0);
        label.textFont(font.get(layout.fontSize(26)));
        label.textColor(theme.textPrimary);
        label.text(t('schedule.' + key));

        const box = dxui.View.build(this.name + '_box_' + key, row);
        layout.clearStyle(box);
        box.setSize(layout.x(520), layout.y(64));
        box.align(dxui.Utils.ALIGN.RIGHT_MID, -layout.x(20), 0);
        box.bgColor(0xf5f5f5);
        box.bgOpa(100);
        box.radius(layout.x(12));
        box.borderWidth(layout.x(2));
        box.setBorderColor(0xdcdcdc);
        box.scroll(false);

        const input = dxui.Textarea.build(this.name + '_input_' + key, box);
        layout.clearStyle(input);
        input.setSize(layout.x(480), layout.y(48));
        input.align(dxui.Utils.ALIGN.CENTER, 0, 0);
        input.bgOpa(0);
        input.padAll(0);
        input.borderWidth(0);
        input.setOneLine(true);
        input.setMaxLength(32);
        input.setCursorClickPos(true);
        input.textFont(font.get(layout.fontSize(26)));
        input.textColor(theme.textPrimary);
        input.text('');

        const kb = keyboard.bind(null, input, {
            mode: mode,
            placeholder: t('schedule.inputPlaceholder'),
        });
        this._kbApis.push({ key: key, kb: kb, input: input });
        return input;
    }

    _buildModeRow() {
        const self = this;
        const row = dxui.View.build(this.name + '_mode', this._editorContent);
        layout.clearStyle(row);
        row.setSize(this._listW, this._rowH);
        row.scroll(false);
        styleSettingRow(row);
        this._registerEditorRow('mode', row);

        const title = dxui.Label.build(this.name + '_mode_title', row);
        title.setSize(layout.x(220), layout.y(40));
        title.align(dxui.Utils.ALIGN.LEFT_MID, layout.x(24), 0);
        title.textFont(font.get(layout.fontSize(26)));
        title.textColor(theme.textPrimary);
        title.text(t('schedule.mode'));

        const leftPad = layout.x(24) + layout.x(220) + layout.x(12);
        const rightPad = layout.x(20);
        const gap = layout.x(12);
        const modes = ['open', 'closed'];
        const btnW = Math.floor((this._listW - leftPad - rightPad - gap) / modes.length);
        const btnH = Math.min(layout.y(SEG_H), this._rowH - layout.y(12));
        const btnY = Math.floor((this._rowH - btnH) / 2);

        for (let i = 0; i < modes.length; i++) {
            const mode = modes[i];
            const btn = dxui.Button.build(this.name + '_mode_' + mode, row);
            btn.setSize(btnW, btnH);
            btn.setPos(leftPad + i * (btnW + gap), btnY);
            btn.radius(layout.x(12));
            btn.borderWidth(0);
            btn.on(dxui.Utils.EVENT.CLICK, (function (id) {
                return function () {
                    self._form.mode = id;
                    self._refreshEditor();
                };
            })(mode));

            const label = dxui.Label.build(this.name + '_mode_lbl_' + mode, btn);
            label.textFont(font.get(layout.fontSize(24)));
            label.align(dxui.Utils.ALIGN.CENTER, 0, 0);
            label.text(t('schedule.' + mode));
            this._modeButtons[mode] = { button: btn, label: label };
        }
    }

    _buildWeekdayRow() {
        const self = this;
        const row = dxui.View.build(this.name + '_weekdays', this._editorContent);
        layout.clearStyle(row);
        row.setSize(this._listW, this._rowH);
        row.scroll(false);
        styleSettingRow(row);
        this._registerEditorRow('weekdays', row);

        const title = dxui.Label.build(this.name + '_weekdays_title', row);
        title.setSize(layout.x(180), layout.y(40));
        title.align(dxui.Utils.ALIGN.LEFT_MID, layout.x(24), 0);
        title.textFont(font.get(layout.fontSize(26)));
        title.textColor(theme.textPrimary);
        title.text(t('schedule.weekdays'));

        const leftPad = layout.x(24) + layout.x(180) + layout.x(8);
        const rightPad = layout.x(16);
        const gap = layout.x(8);
        const btnW = Math.floor(
            (this._listW - leftPad - rightPad - gap * (DAYS.length - 1)) / DAYS.length
        );
        const btnH = Math.min(layout.y(SEG_H), this._rowH - layout.y(12));
        const btnY = Math.floor((this._rowH - btnH) / 2);

        for (let i = 0; i < DAYS.length; i++) {
            const day = DAYS[i];
            const btn = dxui.Button.build(this.name + '_day_' + day, row);
            btn.setSize(btnW, btnH);
            btn.setPos(leftPad + i * (btnW + gap), btnY);
            btn.radius(layout.x(12));
            btn.borderWidth(0);
            btn.on(dxui.Utils.EVENT.CLICK, (function (d) {
                return function () {
                    const at = self._form.weekdays.indexOf(d);
                    if (at >= 0) {
                        self._form.weekdays.splice(at, 1);
                    } else {
                        self._form.weekdays.push(d);
                    }
                    self._refreshEditor();
                };
            })(day));

            const label = dxui.Label.build(this.name + '_day_lbl_' + day, btn);
            label.textFont(font.get(layout.fontSize(24)));
            label.align(dxui.Utils.ALIGN.CENTER, 0, 0);
            label.text(t('schedule.weekdayShort_' + day));
            this._dayButtons[day] = { button: btn, label: label };
        }
    }

    /**
     * @param {string} key
     * @returns {object}
     */
    _buildSwitchRow(key) {
        const row = dxui.View.build(this.name + '_row_' + key, this._editorContent);
        layout.clearStyle(row);
        row.setSize(this._listW, this._rowH);
        row.scroll(false);
        styleSettingRow(row);
        this._registerEditorRow(key, row);

        const label = dxui.Label.build(this.name + '_lbl_' + key, row);
        label.setSize(layout.x(400), layout.y(40));
        label.align(dxui.Utils.ALIGN.LEFT_MID, layout.x(24), 0);
        label.textFont(font.get(layout.fontSize(26)));
        label.textColor(theme.textPrimary);
        label.text(t('schedule.' + key));

        const sw = dxui.Switch.build(this.name + '_switch_' + key, row);
        sw.setSize(layout.x(88), layout.y(48));
        sw.align(dxui.Utils.ALIGN.RIGHT_MID, -layout.x(28), 0);
        sw.select(false);
        return sw;
    }

    _showList() {
        keyboard.hideAll();
        if (this._editorPanel) {
            this._editorPanel.hide();
        }
        if (this._listPanel) {
            this._listPanel.show();
        }
        if (this._header) {
            this._header.setTitle(t('schedule.title'));
        }
        if (this._addBtn) {
            this._addBtn.show();
            if (typeof this._addBtn.moveForeground === 'function') {
                this._addBtn.moveForeground();
            }
        }
        if (this._saveBtn) {
            this._saveBtn.hide();
        }
        if (this._deleteBtn) {
            this._deleteBtn.hide();
        }
        if (this._listPager) {
            this._listPager.show();
        }
        if (this._editorPager) {
            this._editorPager.hide();
        }
    }

    /**
     * @param {number} index
     */
    _edit(index) {
        this._editingIndex = index;
        this._form = index < 0
            ? blank()
            : Object.assign({}, this._items[index], {
                weekdays: (this._items[index].weekdays || []).slice(),
            });
        this._nameInput.text(this._form.name);
        this._startInput.text(this._form.startTime);
        this._endInput.text(this._form.endTime);
        this._enabledSw.select(this._form.enabled);
        this._refreshEditor();

        if (this._listPanel) {
            this._listPanel.hide();
        }
        if (this._editorPanel) {
            this._editorPanel.show();
        }
        if (this._header) {
            this._header.setTitle(t(index < 0 ? 'schedule.add' : 'schedule.edit'));
        }
        if (this._addBtn) {
            this._addBtn.hide();
        }
        if (this._saveBtn) {
            this._saveBtn.show();
            if (typeof this._saveBtn.moveForeground === 'function') {
                this._saveBtn.moveForeground();
            }
        }
        if (this._deleteBtn) {
            if (index < 0) {
                this._deleteBtn.hide();
            } else {
                this._deleteBtn.show();
                if (typeof this._deleteBtn.moveForeground === 'function') {
                    this._deleteBtn.moveForeground();
                }
            }
        }
        if (this._listPager) {
            this._listPager.hide();
        }
        if (this._editorPager) {
            this._editorPager.show();
            this._editorPager.reset();
        }
    }

    _refreshEditor() {
        const modeIds = Object.keys(this._modeButtons);
        for (let i = 0; i < modeIds.length; i++) {
            const mode = modeIds[i];
            const active = this._form.mode === mode;
            this._modeButtons[mode].button.bgColor(active ? theme.activeBg : theme.actionBg);
            this._modeButtons[mode].label.textColor(active ? theme.textOnDark : theme.textMuted);
        }
        for (let d = 0; d < DAYS.length; d++) {
            const day = DAYS[d];
            const active = this._form.weekdays.indexOf(day) >= 0;
            this._dayButtons[day].button.bgColor(active ? theme.activeBg : theme.actionBg);
            this._dayButtons[day].label.textColor(active ? theme.textOnDark : theme.textMuted);
        }
        if (this._saveLbl) {
            this._saveLbl.text(t('schedule.save'));
        }
        if (this._deleteLbl) {
            this._deleteLbl.text(t('schedule.delete'));
        }
        if (this._addLbl) {
            this._addLbl.text(t('schedule.add'));
        }
    }

    async _save() {
        this._form.name = String(this._nameInput.text() || '').trim();
        this._form.startTime = String(this._startInput.text() || '').trim();
        this._form.endTime = String(this._endInput.text() || '').trim();
        this._form.enabled = this._enabledSw.isSelect();
        if (!this._form.name || !this._form.weekdays.length
            || !/^\d{2}:\d{2}$/.test(this._form.startTime)
            || !/^\d{2}:\d{2}$/.test(this._form.endTime)
            || this._form.startTime === this._form.endTime) {
            popup.showError(t('schedule.invalid'));
            return;
        }
        const next = this._items.slice();
        if (this._editingIndex < 0) {
            next.push(this._form);
        } else {
            next.splice(this._editingIndex, 1, this._form);
        }
        const result = await store.save(next);
        if (!result.ok) {
            popup.showError(result.message);
            return;
        }
        this._items = result.data.items || [];
        this._renderList(result.data.state || { mode: 'normal' });
        popup.showSuccess(t('schedule.saved'));
        this._showList();
    }

    _remove() {
        const self = this;
        if (this._editingIndex < 0) {
            return;
        }
        confirm.show({
            title: t('schedule.delete'),
            message: t('schedule.deleteConfirm'),
            confirmText: t('schedule.delete'),
            cancelText: t('schedule.cancel'),
            onConfirm: async function () {
                const next = self._items.filter(function (_item, index) {
                    return index !== self._editingIndex;
                });
                const result = await store.save(next);
                if (!result.ok) {
                    popup.showError(result.message);
                    return;
                }
                self._items = result.data.items || [];
                self._renderList(result.data.state || { mode: 'normal' });
                self._showList();
            },
        });
    }

    /**
     * @param {{ mode?: string }} state
     */
    _renderList(state) {
        this._stateLbl.text(
            t('schedule.currentState') + '：' + t('schedule.state_' + (state.mode || 'normal'))
        );
        if (this._items.length) {
            this._emptyLbl.hide();
        } else {
            this._emptyLbl.show();
        }
        for (let i = 0; i < this._rows.length; i++) {
            const slot = this._rows[i];
            const item = this._items[i];
            if (!item) {
                slot.title.text('');
                slot.detail.text('');
                slot.status.text('');
                slot.row.hide();
                continue;
            }
            slot.title.text(item.name);
            slot.detail.text(
                this._weekdayText(item.weekdays) + '  ' + item.startTime + '–' + item.endTime
            );
            slot.status.text(
                t('schedule.' + item.mode) + ' · '
                + t(item.enabled ? 'schedule.enabledOn' : 'schedule.enabledOff')
            );
            slot.row.show();
            slot.row.bgOpa(0);
        }
        if (this._listPager) {
            this._listPager.apply();
        }
    }

    /**
     * @param {number[]} days
     * @returns {string}
     */
    _weekdayText(days) {
        return (days || []).map(function (day) {
            return t('schedule.weekdayShort_' + day);
        }).join(' ');
    }
}
