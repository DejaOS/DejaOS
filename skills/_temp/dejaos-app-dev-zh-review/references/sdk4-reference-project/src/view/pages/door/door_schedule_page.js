/** @layer view @module door_schedule_page @depends dxUi,BaseView,event commands */

import dxui from '../../../../dxmodules/dxUi.js';
import BaseView from '../base_view.js';
import router from '../../router/core.js';
import font from '../../components/font.js';
import layout from '../../components/layout.js';
import theme from '../../components/theme.js';
import pageHeader from '../../components/page_header.js';
import keyboard from '../../components/keyboard.js';
import popup from '../../components/popup.js';
import confirm from '../../components/confirm.js';
import { t } from '../../i18n/index.js';
import store from './door_schedule_store.js';

const MAX_ROWS = 32;
const DAYS = [1, 2, 3, 4, 5, 6, 7];

function blank() {
    return { scheduleId: '', name: '', mode: 'open', weekdays: [1, 2, 3, 4, 5],
        startTime: '09:00', endTime: '18:00', enabled: true };
}

export default class DoorSchedulePage extends BaseView {
    constructor() {
        super('settings_door_schedule');
        this._header = null;
        this._list = null;
        this._editor = null;
        this._rows = [];
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
        this._saveLbl = null;
        this._deleteLbl = null;
    }

    onCreate() {
        const self = this;
        this.root = dxui.View.build('page_' + this.name, dxui.Utils.LAYER.MAIN);
        this.root.setSize(layout.width, layout.height);
        layout.clearStyle(this.root);
        this.root.bgColor(theme.pageBg);
        this.root.bgOpa(100);
        this.root.scroll(false);
        this._header = pageHeader.build(this.root, {
            idPrefix: this.name,
            titleKey: 'schedule.title',
            onBack: function () {
                if (self._editor && !self._editor.isHide()) self._showList();
                else router.back();
            },
        });
        this._buildList();
        this._buildEditor();
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

    _buildList() {
        const self = this;
        const top = pageHeader.contentTop();
        this._list = dxui.View.build(this.name + '_list', this.root);
        this._list.setSize(layout.width, layout.height - top);
        this._list.setPos(0, top);
        layout.clearStyle(this._list);
        this._list.bgColor(0xf5f5f5);
        this._list.bgOpa(100);
        this._list.scroll(true);
        this._list.flexFlow(dxui.Utils.FLEX_FLOW.COLUMN);
        this._list.flexAlign(dxui.Utils.FLEX_ALIGN.START, dxui.Utils.FLEX_ALIGN.CENTER, dxui.Utils.FLEX_ALIGN.CENTER);
        this._list.padTop(layout.y(18));
        this._list.padBottom(layout.y(30));
        this._list.obj.lvObjSetStylePadGap(layout.y(12), dxui.Utils.ENUM._LV_STYLE_STATE_CMP_SAME);

        const stateRow = this._row(this._list, 'state', 82);
        this._stateLbl = this._label(stateRow, 'state_lbl', 440, 30, theme.textPrimary);
        this._stateLbl.align(dxui.Utils.ALIGN.LEFT_MID, layout.x(22), 0);
        const add = dxui.Button.build(this.name + '_add', stateRow);
        add.setSize(layout.x(190), layout.y(58));
        add.align(dxui.Utils.ALIGN.RIGHT_MID, -layout.x(14), 0);
        add.bgColor(theme.activeBg);
        add.radius(layout.x(12));
        add.borderWidth(0);
        add.on(dxui.Utils.EVENT.CLICK, function () {
            if (self._items.length >= MAX_ROWS) popup.showError(t('schedule.tooMany'));
            else self._edit(-1);
        });
        const addLbl = this._label(add, 'add_lbl', 170, 34, theme.textOnDark);
        addLbl.align(dxui.Utils.ALIGN.CENTER, 0, 0);
        addLbl.text(t('schedule.add'));

        this._emptyLbl = this._label(this._list, 'empty', 700, 60, theme.textMuted);
        this._emptyLbl.textAlign(dxui.Utils.TEXT_ALIGN.CENTER);
        this._emptyLbl.text(t('schedule.empty'));

        for (let i = 0; i < MAX_ROWS; i++) {
            const row = this._row(this._list, 'item_' + i, 98);
            row.clickable(true);
            row.on(dxui.Utils.EVENT.CLICK, (function (index) {
                return function () { self._edit(index); };
            })(i));
            const title = this._label(row, 'item_title_' + i, 300, 36, theme.textPrimary);
            title.align(dxui.Utils.ALIGN.LEFT_MID, layout.x(22), -layout.y(18));
            const detail = this._label(row, 'item_detail_' + i, 620, 30, theme.textSecondary);
            detail.align(dxui.Utils.ALIGN.LEFT_MID, layout.x(22), layout.y(22));
            const status = this._label(row, 'item_status_' + i, 120, 34, theme.textSecondary);
            status.align(dxui.Utils.ALIGN.RIGHT_MID, -layout.x(20), -layout.y(18));
            status.textAlign(dxui.Utils.TEXT_ALIGN.RIGHT);
            this._rows.push({ row: row, title: title, detail: detail, status: status });
        }
    }

    _buildEditor() {
        const self = this;
        const top = pageHeader.contentTop();
        this._editor = dxui.View.build(this.name + '_editor', this.root);
        this._editor.setSize(layout.width, layout.height - top);
        this._editor.setPos(0, top);
        layout.clearStyle(this._editor);
        this._editor.bgColor(0xf5f5f5);
        this._editor.bgOpa(100);
        this._editor.scroll(true);
        this._editor.flexFlow(dxui.Utils.FLEX_FLOW.COLUMN);
        this._editor.flexAlign(dxui.Utils.FLEX_ALIGN.START, dxui.Utils.FLEX_ALIGN.CENTER, dxui.Utils.FLEX_ALIGN.CENTER);
        this._editor.padTop(layout.y(18));
        this._editor.padBottom(layout.y(30));
        this._editor.obj.lvObjSetStylePadGap(layout.y(12), dxui.Utils.ENUM._LV_STYLE_STATE_CMP_SAME);

        this._nameInput = this._textRow(this._editor, 'name', keyboard.MODE.PINYIN);
        this._buildModeRow();
        this._buildWeekdayRow();
        this._startInput = this._textRow(this._editor, 'startTime', keyboard.MODE.ENGLISH);
        this._endInput = this._textRow(this._editor, 'endTime', keyboard.MODE.ENGLISH);
        this._enabledSw = this._switchRow(this._editor, 'enabled');

        const save = dxui.Button.build(this.name + '_save', this._editor);
        save.setSize(layout.x(720), layout.y(80));
        save.bgColor(theme.activeBg);
        save.radius(layout.x(14));
        save.borderWidth(0);
        save.on(dxui.Utils.EVENT.CLICK, function () { self._save(); });
        this._saveLbl = this._label(save, 'save_lbl', 680, 38, theme.textOnDark);
        this._saveLbl.align(dxui.Utils.ALIGN.CENTER, 0, 0);

        const del = dxui.Button.build(this.name + '_delete', this._editor);
        del.setSize(layout.x(720), layout.y(72));
        del.bgColor(0xffffff);
        del.radius(layout.x(14));
        del.borderWidth(layout.x(2));
        del.setBorderColor(0xff5a5f);
        del.on(dxui.Utils.EVENT.CLICK, function () { self._remove(); });
        this._deleteLbl = this._label(del, 'delete_lbl', 680, 36, 0xff3b30);
        this._deleteLbl.align(dxui.Utils.ALIGN.CENTER, 0, 0);
        this._deleteButton = del;
    }

    _row(parent, id, height) {
        const row = dxui.View.build(this.name + '_' + id, parent);
        layout.clearStyle(row);
        row.setSize(layout.x(720), layout.y(height));
        row.bgColor(theme.pageBg);
        row.bgOpa(100);
        row.radius(layout.x(14));
        row.scroll(false);
        return row;
    }

    _label(parent, id, width, height, color) {
        const label = dxui.Label.build(this.name + '_' + id, parent);
        label.setSize(layout.x(width), layout.y(height));
        label.textFont(font.get(layout.fontSize(24)));
        label.textColor(color);
        return label;
    }

    _textRow(parent, key, mode) {
        const row = this._row(parent, 'row_' + key, 92);
        const label = this._label(row, 'lbl_' + key, 250, 38, theme.textPrimary);
        label.align(dxui.Utils.ALIGN.LEFT_MID, layout.x(22), 0);
        label.text(t('schedule.' + key));
        const box = dxui.View.build(this.name + '_box_' + key, row);
        layout.clearStyle(box);
        box.setSize(layout.x(410), layout.y(60));
        box.align(dxui.Utils.ALIGN.RIGHT_MID, -layout.x(18), 0);
        box.bgColor(0xf5f5f5);
        box.bgOpa(100);
        box.radius(layout.x(10));
        const input = dxui.Textarea.build(this.name + '_input_' + key, box);
        layout.clearStyle(input);
        input.setSize(layout.x(370), layout.y(44));
        input.align(dxui.Utils.ALIGN.CENTER, 0, 0);
        input.setOneLine(true);
        input.setMaxLength(32);
        input.textFont(font.get(layout.fontSize(24)));
        input.bgOpa(0);
        keyboard.bind(null, input, { mode: mode, placeholder: t('schedule.inputPlaceholder') });
        return input;
    }

    _buildModeRow() {
        const self = this;
        const row = this._row(this._editor, 'mode', 92);
        const title = this._label(row, 'mode_title', 220, 38, theme.textPrimary);
        title.align(dxui.Utils.ALIGN.LEFT_MID, layout.x(22), 0);
        title.text(t('schedule.mode'));
        ['open', 'closed'].forEach(function (mode, index) {
            const btn = dxui.Button.build(self.name + '_mode_' + mode, row);
            btn.setSize(layout.x(190), layout.y(58));
            btn.setPos(layout.x(300 + index * 200), layout.y(17));
            btn.radius(layout.x(10));
            btn.borderWidth(0);
            btn.on(dxui.Utils.EVENT.CLICK, function () { self._form.mode = mode; self._refreshEditor(); });
            const label = self._label(btn, 'mode_lbl_' + mode, 170, 34, theme.textPrimary);
            label.align(dxui.Utils.ALIGN.CENTER, 0, 0);
            label.text(t('schedule.' + mode));
            self._modeButtons[mode] = { button: btn, label: label };
        });
    }

    _buildWeekdayRow() {
        const self = this;
        const row = this._row(this._editor, 'weekdays', 160);
        const title = this._label(row, 'weekdays_title', 680, 34, theme.textPrimary);
        title.setPos(layout.x(22), layout.y(12));
        title.text(t('schedule.weekdays'));
        DAYS.forEach(function (day, index) {
            const btn = dxui.Button.build(self.name + '_day_' + day, row);
            btn.setSize(layout.x(88), layout.y(62));
            btn.setPos(layout.x(18 + index * 98), layout.y(74));
            btn.radius(layout.x(10));
            btn.borderWidth(0);
            btn.on(dxui.Utils.EVENT.CLICK, function () {
                const at = self._form.weekdays.indexOf(day);
                if (at >= 0) self._form.weekdays.splice(at, 1);
                else self._form.weekdays.push(day);
                self._refreshEditor();
            });
            const label = self._label(btn, 'day_lbl_' + day, 80, 32, theme.textPrimary);
            label.align(dxui.Utils.ALIGN.CENTER, 0, 0);
            label.text(t('schedule.weekdayShort_' + day));
            self._dayButtons[day] = { button: btn, label: label };
        });
    }

    _switchRow(parent, key) {
        const row = this._row(parent, 'row_' + key, 92);
        const label = this._label(row, 'lbl_' + key, 400, 38, theme.textPrimary);
        label.align(dxui.Utils.ALIGN.LEFT_MID, layout.x(22), 0);
        label.text(t('schedule.' + key));
        const sw = dxui.Switch.build(this.name + '_switch_' + key, row);
        sw.setSize(layout.x(92), layout.y(48));
        sw.align(dxui.Utils.ALIGN.RIGHT_MID, -layout.x(24), 0);
        return sw;
    }

    _showList() {
        keyboard.hideAll();
        if (this._editor) this._editor.hide();
        if (this._list) this._list.show();
        if (this._header) this._header.setTitle(t('schedule.title'));
    }

    _edit(index) {
        this._editingIndex = index;
        this._form = index < 0 ? blank() : Object.assign({}, this._items[index], {
            weekdays: (this._items[index].weekdays || []).slice(),
        });
        this._nameInput.text(this._form.name);
        this._startInput.text(this._form.startTime);
        this._endInput.text(this._form.endTime);
        this._enabledSw.select(this._form.enabled);
        if (index < 0) this._deleteButton.hide();
        else this._deleteButton.show();
        this._refreshEditor();
        this._list.hide();
        this._editor.show();
        this._header.setTitle(t(index < 0 ? 'schedule.add' : 'schedule.edit'));
    }

    _refreshEditor() {
        Object.keys(this._modeButtons).forEach((mode) => {
            const active = this._form.mode === mode;
            this._modeButtons[mode].button.bgColor(active ? theme.activeBg : 0xe9e9e9);
            this._modeButtons[mode].label.textColor(active ? theme.textOnDark : theme.textPrimary);
        });
        DAYS.forEach((day) => {
            const active = this._form.weekdays.indexOf(day) >= 0;
            this._dayButtons[day].button.bgColor(active ? theme.activeBg : 0xe9e9e9);
            this._dayButtons[day].label.textColor(active ? theme.textOnDark : theme.textPrimary);
        });
        this._saveLbl.text(t('schedule.save'));
        this._deleteLbl.text(t('schedule.delete'));
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
        if (this._editingIndex < 0) next.push(this._form);
        else next.splice(this._editingIndex, 1, this._form);
        const result = await store.save(next);
        if (!result.ok) { popup.showError(result.message); return; }
        this._items = result.data.items || [];
        this._renderList(result.data.state || { mode: 'normal' });
        popup.showSuccess(t('schedule.saved'));
        this._showList();
    }

    _remove() {
        const self = this;
        if (this._editingIndex < 0) return;
        confirm.show({
            title: t('schedule.delete'), message: t('schedule.deleteConfirm'),
            confirmText: t('schedule.delete'), cancelText: t('schedule.cancel'),
            onConfirm: async function () {
                const next = self._items.filter(function (_item, index) { return index !== self._editingIndex; });
                const result = await store.save(next);
                if (!result.ok) { popup.showError(result.message); return; }
                self._items = result.data.items || [];
                self._renderList(result.data.state || { mode: 'normal' });
                self._showList();
            },
        });
    }

    _renderList(state) {
        this._stateLbl.text(t('schedule.currentState') + '：' + t('schedule.state_' + (state.mode || 'normal')));
        if (this._items.length) this._emptyLbl.hide(); else this._emptyLbl.show();
        for (let i = 0; i < this._rows.length; i++) {
            const slot = this._rows[i];
            const item = this._items[i];
            if (!item) { slot.row.hide(); continue; }
            slot.title.text(item.name);
            slot.detail.text(this._weekdayText(item.weekdays) + '  ' + item.startTime + '–' + item.endTime);
            slot.status.text(t('schedule.' + item.mode) + ' · ' + t(item.enabled ? 'schedule.enabledOn' : 'schedule.enabledOff'));
            slot.row.show();
        }
    }

    _weekdayText(days) {
        return (days || []).map(function (day) { return t('schedule.weekdayShort_' + day); }).join(' ');
    }
}
