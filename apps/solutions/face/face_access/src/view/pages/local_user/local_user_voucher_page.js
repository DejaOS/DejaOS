/**
 * @layer view @module local_user_voucher_page
 * @depends BaseView,router,keyboard,popup,confirm,local_user_store,voucher_types
 *
 * 卡、码、密码按大类编辑，每类设备 UI 最多管理 5 条；超过 5 条的 MQTT 凭证仅提示，
 * 不会被本页保存动作覆盖。真正写库仍由人员档案受控事务完成。
 */

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
import localUserStore from './local_user_store.js';
import voucherTypes from '../../../core/voucher_types.js';

const MAX_VISIBLE = 5;
const GROUP_TYPES = voucherTypes.GROUPS;

function clone(items) {
    return (Array.isArray(items) ? items : []).map(function (item) {
        return {
            keyId: String(item.keyId || ''),
            type: String(item.type || ''),
            code: String(item.code || ''),
            extra: item.extra || {},
        };
    });
}

function optionsOf(group) {
    if (group === 'card') return [t('localUser.voucher.type.card'), t('localUser.voucher.type.idCard')];
    if (group === 'code') return [
        t('localUser.voucher.type.code100'),
        t('localUser.voucher.type.code101'),
        t('localUser.voucher.type.code103'),
    ];
    return [t('localUser.voucher.type.password')];
}

export default class LocalUserVoucherPage extends BaseView {
    constructor() {
        super('settings_localUser_vouchers');
        this._group = 'password';
        this._items = [];
        this._originalById = {};
        this._passwordLength = 6;
        this._slots = [];
        this._captureIndex = -1;
        this._countLabel = null;
        this._addButton = null;
        this._addLabel = null;
        this._initialSnapshot = '[]';
    }

    onCreate() {
        const self = this;
        this.root = dxui.View.build('page_local_user_vouchers', dxui.Utils.LAYER.MAIN);
        this.root.setSize(layout.width, layout.height);
        layout.clearStyle(this.root);
        this.root.bgColor(0xf5f5f5);
        this.root.bgOpa(100);
        this.root.scroll(false);
        this._header = pageHeader.build(this.root, {
            idPrefix: 'local_user_vouchers',
            titleKey: 'localUser.voucher.title',
            onBack: function () { self._requestBack(); },
        });

        this._countLabel = dxui.Label.build('local_user_vouchers_count', this.root);
        this._countLabel.setSize(layout.x(720), layout.y(42));
        this._countLabel.setPos(layout.x(40), pageHeader.contentTop() + layout.y(8));
        this._countLabel.textFont(font.get(layout.fontSize(20)));
        this._countLabel.textColor(theme.textSecondary);
        this._countLabel.textAlign(dxui.Utils.TEXT_ALIGN.LEFT);

        const list = dxui.View.build('local_user_vouchers_list', this.root);
        layout.clearStyle(list);
        list.setSize(layout.x(720), layout.y(650));
        list.setPos(layout.x(40), pageHeader.contentTop() + layout.y(58));
        list.bgOpa(0);
        list.scroll(false);
        list.flexFlow(dxui.Utils.FLEX_FLOW.COLUMN);
        list.flexAlign(dxui.Utils.FLEX_ALIGN.START, dxui.Utils.FLEX_ALIGN.CENTER, dxui.Utils.FLEX_ALIGN.CENTER);
        list.obj.lvObjSetStylePadGap(layout.y(12), dxui.Utils.ENUM._LV_STYLE_STATE_CMP_SAME);
        for (let i = 0; i < MAX_VISIBLE; i++) this._slots.push(this._buildSlot(list, i));

        this._addButton = this._button(this.root, 'local_user_vouchers_add', t('localUser.voucher.add'));
        this._addButton.setSize(layout.x(720), layout.y(76));
        this._addButton.align(dxui.Utils.ALIGN.BOTTOM_MID, 0, -layout.y(132));
        this._addLabel = this._addButton._label;
        this._addButton.on(dxui.Utils.EVENT.CLICK, function () {
            if (self._items.length >= MAX_VISIBLE) return;
            self._items.push({ keyId: '', type: GROUP_TYPES[self._group][0], code: '', extra: {} });
            self._refresh();
            const slot = self._slots[self._items.length - 1];
            if (slot && slot.keyboard) slot.keyboard.open();
        });

        const save = this._button(this.root, 'local_user_vouchers_save', t('localUser.voucher.done'));
        save.setSize(layout.x(720), layout.y(88));
        save.align(dxui.Utils.ALIGN.BOTTOM_MID, 0, -layout.y(24));
        save.on(dxui.Utils.EVENT.CLICK, function () { self._save(); });
    }

    _button(parent, id, text) {
        const button = dxui.Button.build(id, parent);
        button.bgColor(theme.activeBg);
        button.radius(layout.x(12));
        button.borderWidth(0);
        const label = dxui.Label.build(id + '_label', button);
        label.text(text);
        label.textFont(font.get(layout.fontSize(25)));
        label.textColor(theme.textOnDark);
        label.align(dxui.Utils.ALIGN.CENTER, 0, 0);
        button._label = label;
        return button;
    }

    _buildSlot(parent, index) {
        const self = this;
        const row = dxui.View.build('local_user_voucher_row_' + index, parent);
        layout.clearStyle(row);
        row.setSize(layout.x(720), layout.y(112));
        row.bgColor(theme.pageBg);
        row.bgOpa(100);
        row.radius(layout.x(12));
        row.scroll(false);
        row.hide();

        const type = dxui.Dropdown.build('local_user_voucher_type_' + index, row);
        type.setSize(layout.x(160), layout.y(66));
        type.align(dxui.Utils.ALIGN.LEFT_MID, layout.x(16), 0);
        type.textFont(font.get(layout.fontSize(20)));
        type.getList().textFont(font.get(layout.fontSize(20)));

        // 密码只有一种类型，使用静态文本，避免显示无意义的下拉符号。
        const typeStatic = dxui.Label.build('local_user_voucher_type_static_' + index, row);
        typeStatic.setSize(layout.x(160), layout.y(66));
        typeStatic.align(dxui.Utils.ALIGN.LEFT_MID, layout.x(16), 0);
        typeStatic.textFont(font.get(layout.fontSize(20)));
        typeStatic.textColor(theme.textPrimary);
        typeStatic.textAlign(dxui.Utils.TEXT_ALIGN.LEFT);
        typeStatic.bgColor(theme.pageBg);
        typeStatic.bgOpa(100);
        typeStatic.radius(layout.x(8));
        typeStatic.padLeft(layout.x(12));
        typeStatic.hide();

        // 当前中文字体不包含 LVGL 默认下拉符号；用不透明 ASCII 箭头遮住原生方块。
        const arrow = dxui.Label.build('local_user_voucher_type_arrow_' + index, row);
        arrow.setSize(layout.x(34), layout.y(48));
        arrow.text('v');
        arrow.textFont(font.get(layout.fontSize(16)));
        arrow.textColor(theme.secondaryText);
        arrow.textAlign(dxui.Utils.TEXT_ALIGN.CENTER);
        arrow.bgColor(theme.pageBg);
        arrow.bgOpa(100);
        arrow.align(dxui.Utils.ALIGN.LEFT_MID, layout.x(136), 0);
        arrow.clickable(false);
        type.on(dxui.Utils.EVENT.VALUE_CHANGED, function () {
            if (!self._items[index]) return;
            self._items[index].type = GROUP_TYPES[self._group][type.getSelected()] || GROUP_TYPES[self._group][0];
        });

        const input = dxui.Textarea.build('local_user_voucher_input_' + index, row);
        input.setSize(layout.x(310), layout.y(66));
        input.align(dxui.Utils.ALIGN.LEFT_MID, layout.x(188), 0);
        input.setOneLine(true);
        input.setMaxLength(256);
        input.textFont(font.get(layout.fontSize(23)));
        const kb = keyboard.bind(null, input, {
            mode: keyboard.MODE.ENGLISH,
            placeholder: t('localUser.inputPlaceholder'),
        });
        kb.setContentCb(function () {
            if (self._items[index]) self._items[index].code = String(input.text() || '').trim();
        });

        const capture = this._button(row, 'local_user_voucher_capture_' + index, t('localUser.voucher.capture'));
        capture.setSize(layout.x(90), layout.y(58));
        capture.align(dxui.Utils.ALIGN.RIGHT_MID, -layout.x(108), 0);
        capture.on(dxui.Utils.EVENT.CLICK, function () { self._startCardCapture(index); });

        const remove = this._button(row, 'local_user_voucher_remove_' + index, t('localUser.voucher.remove'));
        remove.setSize(layout.x(90), layout.y(58));
        remove.align(dxui.Utils.ALIGN.RIGHT_MID, -layout.x(12), 0);
        remove.bgColor(theme.pageBg);
        remove.borderWidth(layout.x(2));
        remove.setBorderColor(theme.errorText);
        remove._label.textColor(theme.errorText);
        remove.on(dxui.Utils.EVENT.CLICK, function () {
            if (!self._items[index]) return;
            self._items.splice(index, 1);
            self._refresh();
        });
        return { row: row, type: type, typeStatic: typeStatic, arrow: arrow, input: input, keyboard: kb, capture: capture };
    }

    onEnter(context) {
        if (this._header) this._header.refresh();
        const params = context && context.params ? context.params : {};
        this._group = GROUP_TYPES[params.group] ? params.group : 'password';
        this._passwordLength = [4, 6, 8].indexOf(Number(params.passwordLength)) >= 0
            ? Number(params.passwordLength) : 6;
        this._items = clone(params.credentials).filter((function (group) {
            return function (item) { return voucherTypes.groupOf(item.type) === group; };
        })(this._group));
        this._originalById = {};
        for (let i = 0; i < this._items.length; i++) {
            if (this._items[i].keyId) this._originalById[this._items[i].keyId] = clone([this._items[i]])[0];
        }
        this._initialSnapshot = JSON.stringify(clone(this._items));
        this._refresh();
    }

    onExit() {
        this._cancelCardCapture();
        keyboard.hideAll();
        confirm.hide();
    }

    _refresh() {
        const options = optionsOf(this._group);
        const types = GROUP_TYPES[this._group];
        for (let i = 0; i < this._slots.length; i++) {
            const slot = this._slots[i];
            const item = this._items[i];
            if (!item) {
                slot.row.hide();
                continue;
            }
            slot.type.setOptions(options);
            slot.type.setSelected(Math.max(0, types.indexOf(item.type)));
            if (this._group === 'password') {
                slot.type.hide();
                slot.typeStatic.text(options[0]);
                slot.typeStatic.show();
                slot.arrow.hide();
            } else {
                slot.typeStatic.hide();
                slot.type.show();
                slot.arrow.show();
            }
            slot.keyboard.setMode(this._group === 'password' ? keyboard.MODE.NUMBER : keyboard.MODE.ENGLISH);
            slot.input.setMaxLength(this._group === 'password' ? this._passwordLength : 256);
            slot.input.text(item.code || '');
            slot.capture[this._group === 'card' ? 'show' : 'hide']();
            slot.row.show();
        }
        const total = this._items.length;
        this._countLabel.text(total > MAX_VISIBLE
            ? t('localUser.voucher.overflow', { total: total })
            : t('localUser.voucher.count', { count: total, max: MAX_VISIBLE }));
        const canAdd = total < MAX_VISIBLE;
        this._addButton.bgColor(canAdd ? theme.activeBg : theme.disabledBg);
        this._addButton.clickable(canAdd);
    }

    _startCardCapture(index) {
        if (this._group !== 'card' || this._captureIndex >= 0) return;
        if (!this._items[index]) return;
        const self = this;
        const types = GROUP_TYPES.card;
        keyboard.hideAll();
        this._captureIndex = index;
        confirm.show({
            title: t('localUser.cardWaitingTitle'),
            message: t('localUser.cardWaitingMessage'),
            confirmText: t('localUser.cardWaitingCancel'),
            showCancel: false,
            onConfirm: function () { self._cancelCardCapture(); },
        });
        localUserStore.captureCard().then(function (result) {
            if (self._captureIndex !== index) return;
            self._captureIndex = -1;
            confirm.hide();
            if (!result || result.cancelled || !self._items[index]) return;
            if (!result.cardNo) {
                if (result.error === 'eid_read_failed') {
                    popup.showError(t('localUser.cardCaptureFailed'));
                }
                return;
            }
            const capturedType = String(result.type || voucherTypes.CARD);
            self._items[index].type = types.indexOf(capturedType) >= 0 ? capturedType : voucherTypes.CARD;
            self._items[index].code = String(result.cardNo).toUpperCase();
            self._slots[index].type.setSelected(Math.max(0, types.indexOf(self._items[index].type)));
            self._slots[index].input.text(self._items[index].code);
            popup.showSuccess(t('localUser.cardCaptured'));
        }).catch(function (error) {
            if (self._captureIndex !== index) return;
            self._captureIndex = -1;
            confirm.hide();
            popup.showError(localUserStore.errorMessage(error) || t('localUser.cardCaptureFailed'));
        });
    }

    _cancelCardCapture() {
        if (this._captureIndex < 0) return;
        this._captureIndex = -1;
        localUserStore.cancelCardCapture();
    }



    _requestBack() {
        keyboard.hideAll();
        if (JSON.stringify(clone(this._items)) === this._initialSnapshot) {
            router.back();
            return;
        }
        confirm.show({
            title: t('localUser.voucher.exitTitle'),
            message: t('localUser.voucher.exitMessage'),
            confirmText: t('localUser.voucher.exitDiscard'),
            cancelText: t('localUser.voucher.exitContinue'),
            onConfirm: function () { router.back(); },
        });
    }
    _save() {
        keyboard.hideAll();
        const seen = {};
        for (let i = 0; i < this._items.length; i++) {
            const slot = this._slots[i];
            if (slot) this._items[i].code = String(slot.input.text() || '').trim();
            const item = this._items[i];
            const before = item.keyId ? this._originalById[item.keyId] : null;
            const changed = !before || before.type !== item.type || before.code !== item.code;
            if (changed && !item.code) {
                popup.showError(t('localUser.voucher.required'));
                return;
            }
            if (changed && this._group === 'password' && !new RegExp('^\\d{' + this._passwordLength + '}$').test(item.code)) {
                popup.showError(t('localUser.passwordLengthError', { length: this._passwordLength }));
                return;
            }
            if (this._group === 'card') item.code = item.code.toUpperCase();
            const identity = item.type + '\u0000' + item.code;
            if (seen[identity]) {
                popup.showError(t('localUser.voucher.duplicate'));
                return;
            }
            seen[identity] = true;
        }
        router.back({ credentialGroup: this._group, credentials: clone(this._items) });
    }
}
