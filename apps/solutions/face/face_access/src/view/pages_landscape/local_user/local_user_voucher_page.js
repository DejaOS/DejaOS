/**
 * @layer view @module local_user_voucher_page
 * @depends BaseView,router,keyboard,popup,confirm,local_user_store,voucher_types,setting_pager
 *
 * 卡、码、密码按大类编辑，每类设备 UI 最多管理 5 条；超过 5 条的 MQTT 凭证仅提示，
 * 不会被本页保存动作覆盖。真正写库仍由人员档案受控事务完成。
 * 横屏：白底底部分割线；完成钮右上角；新增凭证次按钮。
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
import { asset } from '../../utils/assets.js';
import localUserStore from '../../pages/local_user/local_user_store.js';
import voucherTypes from '../../../core/voucher_types.js';
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

const MAX_VISIBLE = 5;
const GROUP_TYPES = voucherTypes.GROUPS;
const IMG_DROPDOWN = asset('down.png');

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
        this._header = null;
        this._listContent = null;
        this._listW = 0;
        this._rowH = 0;
        this._pager = null;
        this._group = 'password';
        this._items = [];
        this._originalById = {};
        this._passwordLength = 6;
        this._slots = [];
        this._captureIndex = -1;
        this._countLabel = null;
        this._addBtn = null;
        this._addLbl = null;
        this._doneBtn = null;
        this._doneLbl = null;
        this._initialSnapshot = '[]';
    }

    onCreate() {
        const self = this;
        this.root = dxui.View.build('page_local_user_vouchers', dxui.Utils.LAYER.MAIN);
        this.root.setSize(layout.width, layout.height);
        layout.clearStyle(this.root);
        this.root.bgColor(0xffffff);
        this.root.bgOpa(100);
        this.root.scroll(false);

        this._header = pageHeader.build(this.root, {
            idPrefix: 'local_user_vouchers',
            titleKey: 'localUser.voucher.title',
            onBack: function () { self._requestBack(); },
        });

        const top = pageHeader.contentTop();
        const countH = layout.y(48);
        const listH = layout.height - top - countH;
        this._listW = layout.x(CONTENT_W);
        this._rowH = settingPageRowH(listH);
        const listX = Math.round((layout.width - this._listW) / 2);

        this._countLabel = dxui.Label.build('local_user_vouchers_count', this.root);
        this._countLabel.setSize(this._listW, countH);
        this._countLabel.setPos(listX, top);
        this._countLabel.textFont(font.get(layout.fontSize(24)));
        this._countLabel.textColor(theme.textSecondary);
        this._countLabel.textAlign(dxui.Utils.TEXT_ALIGN.LEFT);

        const listPanel = dxui.View.build('local_user_vouchers_panel', this.root);
        layout.clearStyle(listPanel);
        listPanel.setSize(layout.width, listH);
        listPanel.setPos(0, top + countH);
        listPanel.bgColor(0xffffff);
        listPanel.bgOpa(100);
        listPanel.scroll(false);

        this._listContent = dxui.View.build('local_user_vouchers_list', listPanel);
        layout.clearStyle(this._listContent);
        this._listContent.setSize(this._listW, this._rowH * SETTING_PAGE_SIZE);
        this._listContent.setPos(listX, 0);
        this._listContent.bgOpa(0);
        this._listContent.scroll(false);

        this._slots = [];
        for (let i = 0; i < MAX_VISIBLE; i++) {
            this._slots.push(this._buildSlot(i));
        }

        const saveY = top - pageHeader.barHeight()
            + Math.round((pageHeader.barHeight() - layout.y(SAVE_BTN_H)) / 2);

        const done = buildTopSaveButton(this.root, 'local_user_vouchers_done', function () {
            self._save();
        });
        this._doneBtn = done.button;
        this._doneLbl = done.label;
        this._doneLbl.text(t('localUser.voucher.done'));

        this._addBtn = dxui.Button.build('local_user_vouchers_add', this.root);
        this._addBtn.setSize(layout.x(SAVE_BTN_W), layout.y(SAVE_BTN_H));
        this._addBtn.bgColor(0xffffff);
        this._addBtn.radius(layout.x(SAVE_BTN_RADIUS));
        this._addBtn.borderWidth(layout.x(2));
        this._addBtn.setBorderColor(0x3d3d3d);
        this._addBtn.align(
            dxui.Utils.ALIGN.TOP_RIGHT,
            -layout.x(SAVE_BTN_RIGHT + SAVE_BTN_W + 16),
            saveY
        );
        this._addBtn.on(dxui.Utils.EVENT.CLICK, function () {
            if (self._items.length >= MAX_VISIBLE) return;
            self._items.push({ keyId: '', type: GROUP_TYPES[self._group][0], code: '', extra: {} });
            self._refresh();
            const slot = self._slots[self._items.length - 1];
            if (slot && slot.keyboard) slot.keyboard.open();
        });
        this._addLbl = dxui.Label.build('local_user_vouchers_add_lbl', this._addBtn);
        this._addLbl.textFont(font.get(layout.fontSize(26)));
        this._addLbl.textColor(0x3d3d3d);
        this._addLbl.align(dxui.Utils.ALIGN.CENTER, 0, 0);
        this._addLbl.text(t('localUser.voucher.add'));

        this._pager = attachSettingPager(this.root, {
            idPrefix: 'local_user_vouchers',
            rowH: this._rowH,
            getRows: function () {
                const out = [];
                for (let i = 0; i < self._items.length; i++) {
                    out.push(self._slots[i].row);
                }
                return out;
            },
        });
    }

    /**
     * @param {number} index
     * @returns {object}
     */
    _buildSlot(index) {
        const self = this;
        const ctrlH = layout.y(64);
        const row = dxui.View.build('local_user_voucher_row_' + index, this._listContent);
        layout.clearStyle(row);
        row.setSize(this._listW, this._rowH);
        row.scroll(false);
        styleSettingRow(row);
        row.hide();

        const typeW = layout.x(200);
        const type = dxui.Dropdown.build('local_user_voucher_type_' + index, row);
        type.setSize(typeW, ctrlH);
        type.align(dxui.Utils.ALIGN.LEFT_MID, layout.x(16), 0);
        type.textFont(font.get(layout.fontSize(24)));
        type.getList().textFont(font.get(layout.fontSize(24)));
        type.setSymbol(IMG_DROPDOWN);

        // 与输入框同高、同垂直中线；文字区高度与字号匹配，避免偏上
        const typeStatic = dxui.Label.build('local_user_voucher_type_static_' + index, row);
        typeStatic.setSize(typeW, layout.y(40));
        typeStatic.align(dxui.Utils.ALIGN.LEFT_MID, layout.x(16), 0);
        typeStatic.textFont(font.get(layout.fontSize(26)));
        typeStatic.textColor(theme.textPrimary);
        typeStatic.textAlign(dxui.Utils.TEXT_ALIGN.LEFT);
        typeStatic.hide();

        type.on(dxui.Utils.EVENT.VALUE_CHANGED, function () {
            if (!self._items[index]) return;
            self._items[index].type = GROUP_TYPES[self._group][type.getSelected()]
                || GROUP_TYPES[self._group][0];
        });

        const removeW = layout.x(110);
        const captureW = layout.x(110);
        const gap = layout.x(12);
        const rightPad = layout.x(16);
        const inputRight = rightPad + removeW + gap + captureW + gap;
        const inputLeft = layout.x(16) + typeW + gap;
        const inputW = Math.max(layout.x(200), this._listW - inputLeft - inputRight);

        const inputBox = dxui.View.build('local_user_voucher_ibox_' + index, row);
        layout.clearStyle(inputBox);
        inputBox.setSize(inputW, ctrlH);
        inputBox.align(dxui.Utils.ALIGN.LEFT_MID, inputLeft, 0);
        inputBox.bgColor(0xf5f5f5);
        inputBox.bgOpa(100);
        inputBox.radius(layout.x(12));
        inputBox.borderWidth(layout.x(2));
        inputBox.setBorderColor(0xdcdcdc);
        inputBox.scroll(false);

        const input = dxui.Textarea.build('local_user_voucher_input_' + index, inputBox);
        layout.clearStyle(input);
        input.setSize(Math.max(layout.x(160), inputW - layout.x(32)), layout.y(48));
        input.align(dxui.Utils.ALIGN.CENTER, 0, 0);
        input.bgOpa(0);
        input.padAll(0);
        input.borderWidth(0);
        input.setOneLine(true);
        input.setMaxLength(256);
        input.setCursorClickPos(true);
        input.textFont(font.get(layout.fontSize(26)));
        input.textColor(theme.textPrimary);
        input.setAlign(dxui.Utils.TEXT_ALIGN.LEFT);

        const kb = keyboard.bind(null, input, {
            mode: keyboard.MODE.ENGLISH,
            placeholder: t('localUser.inputPlaceholder'),
        });
        kb.setContentCb(function () {
            if (self._items[index]) self._items[index].code = String(input.text() || '').trim();
        });

        const capture = dxui.Button.build('local_user_voucher_capture_' + index, row);
        capture.setSize(captureW, ctrlH);
        capture.align(dxui.Utils.ALIGN.RIGHT_MID, -(rightPad + removeW + gap), 0);
        capture.bgColor(theme.accent);
        capture.radius(layout.x(12));
        capture.borderWidth(0);
        const captureLbl = dxui.Label.build('local_user_voucher_capture_lbl_' + index, capture);
        captureLbl.text(t('localUser.voucher.capture'));
        captureLbl.textFont(font.get(layout.fontSize(22)));
        captureLbl.textColor(theme.textOnDark);
        captureLbl.align(dxui.Utils.ALIGN.CENTER, 0, 0);
        capture.on(dxui.Utils.EVENT.CLICK, function () { self._startCardCapture(index); });

        const remove = dxui.Button.build('local_user_voucher_remove_' + index, row);
        remove.setSize(removeW, ctrlH);
        remove.align(dxui.Utils.ALIGN.RIGHT_MID, -rightPad, 0);
        remove.bgColor(0xffffff);
        remove.radius(layout.x(12));
        remove.borderWidth(layout.x(2));
        remove.setBorderColor(theme.errorText);
        const removeLbl = dxui.Label.build('local_user_voucher_remove_lbl_' + index, remove);
        removeLbl.text(t('localUser.voucher.remove'));
        removeLbl.textFont(font.get(layout.fontSize(22)));
        removeLbl.textColor(theme.errorText);
        removeLbl.align(dxui.Utils.ALIGN.CENTER, 0, 0);
        remove.on(dxui.Utils.EVENT.CLICK, function () {
            if (!self._items[index]) return;
            self._items.splice(index, 1);
            self._refresh();
        });

        return {
            row: row,
            type: type,
            typeStatic: typeStatic,
            input: input,
            inputBox: inputBox,
            keyboard: kb,
            capture: capture,
            captureLbl: captureLbl,
            remove: remove,
            removeLbl: removeLbl,
            inputLeft: inputLeft,
            inputRightWithCapture: inputRight,
            inputRightNoCapture: rightPad + removeW + gap,
            ctrlH: ctrlH,
        };
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
        if (this._doneLbl) this._doneLbl.text(t('localUser.voucher.done'));
        if (this._addLbl) this._addLbl.text(t('localUser.voucher.add'));
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
        const isCard = this._group === 'card';
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
            } else {
                slot.typeStatic.hide();
                slot.type.show();
            }
            const rightReserve = isCard ? slot.inputRightWithCapture : slot.inputRightNoCapture;
            const inputW = Math.max(layout.x(200), this._listW - slot.inputLeft - rightReserve);
            slot.inputBox.setSize(inputW, slot.ctrlH);
            slot.inputBox.align(dxui.Utils.ALIGN.LEFT_MID, slot.inputLeft, 0);
            slot.input.setSize(Math.max(layout.x(160), inputW - layout.x(32)), layout.y(48));
            slot.input.align(dxui.Utils.ALIGN.CENTER, 0, 0);
            slot.input.setAlign(dxui.Utils.TEXT_ALIGN.LEFT);
            slot.keyboard.setMode(this._group === 'password' ? keyboard.MODE.NUMBER : keyboard.MODE.ENGLISH);
            slot.input.setMaxLength(this._group === 'password' ? this._passwordLength : 256);
            slot.input.text(item.code || '');
            slot.captureLbl.text(t('localUser.voucher.capture'));
            slot.removeLbl.text(t('localUser.voucher.remove'));
            if (isCard) {
                slot.capture.show();
            } else {
                slot.capture.hide();
            }
            slot.row.show();
            slot.row.bgOpa(0);
        }
        const total = this._items.length;
        this._countLabel.text(total > MAX_VISIBLE
            ? t('localUser.voucher.overflow', { total: total })
            : t('localUser.voucher.count', { count: total, max: MAX_VISIBLE }));
        const canAdd = total < MAX_VISIBLE;
        this._addBtn.bgColor(canAdd ? 0xffffff : 0xf0f0f0);
        this._addBtn.setBorderColor(canAdd ? 0x3d3d3d : theme.disabledBg);
        this._addLbl.textColor(canAdd ? 0x3d3d3d : theme.disabledBg);
        this._addBtn.clickable(canAdd);
        if (typeof this._addBtn.moveForeground === 'function') this._addBtn.moveForeground();
        if (typeof this._doneBtn.moveForeground === 'function') this._doneBtn.moveForeground();
        if (this._pager) this._pager.apply();
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
            if (changed && this._group === 'password'
                && !new RegExp('^\\d{' + this._passwordLength + '}$').test(item.code)) {
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
