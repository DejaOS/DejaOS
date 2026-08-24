/**
 * @layer    view
 * @module   cloud_cert_page
 * @fires    CMD_ACTIVATE_EID
 * @listens  none
 * @depends  dxUi,BaseView,font,layout,theme,page_header,keyboard,i18n,popup,cloud_cert_store
 *
 * 云证激活：手输激活码或在首页扫专用二维码；本页仅密钥输入与提交。
 */

import dxui from '../../../../dxmodules/dxUi.js';
import BaseView from '../base_view.js';
import font from '../../components/font.js';
import layout from '../../components/layout.js';
import theme from '../../components/theme.js';
import pageHeader from '../../components/page_header.js';
import keyboard from '../../components/keyboard.js';
import popup from '../../components/popup.js';
import { t } from '../../i18n/index.js';
import cloudCertStore from './cloud_cert_store.js';

const ROW_H = 96;
const ROW_GAP = 12;
const ACTION_BTN_H = 88;
const ACTION_BTN_BOTTOM = 48;

export default class CloudCertPage extends BaseView {
    constructor() {
        super('settings_cloudCert');
        this._header = null;
        this._content = null;
        this._saveBtn = null;
        this._saveLbl = null;
        this._tipLbl = null;
        /** @type {{ key: string, label: object }[]} */
        this._fieldLabels = [];
        /** @type {object[]} */
        this._kbApis = [];
        /** @type {object|null} */
        this._keyInput = null;
        this._saving = false;
    }

    onCreate() {
        this.root = dxui.View.build('page_cloud_cert', dxui.Utils.LAYER.MAIN);
        this.root.setSize(layout.width, layout.height);
        layout.clearStyle(this.root);
        this.root.bgColor(theme.pageBg);
        this.root.bgOpa(100);
        this.root.scroll(false);

        this._header = pageHeader.build(this.root, {
            idPrefix: 'cloud_cert',
            titleKey: 'settings.menu.cloudCert',
        });
        this._buildBody();
    }

    onEnter() {
        if (this._header) {
            this._header.refresh();
        }
        this._setInput(this._keyInput, '');
        this._saving = false;
        this._refreshLabels();
    }

    onExit() {
        keyboard.hideAll();
        this._saving = false;
    }

    _buildBody() {
        const self = this;
        const top = pageHeader.contentTop();
        const contentH = layout.height - top;
        const actionReserve = layout.y(ACTION_BTN_H + ACTION_BTN_BOTTOM + 24);

        this._content = dxui.View.build('cloud_cert_content', this.root);
        this._content.setSize(layout.width, contentH);
        this._content.setPos(0, top);
        layout.clearStyle(this._content);
        this._content.bgColor(0xf5f5f5);
        this._content.bgOpa(100);
        this._content.scroll(false);
        this._content.flexFlow(dxui.Utils.FLEX_FLOW.COLUMN);
        this._content.flexAlign(
            dxui.Utils.FLEX_ALIGN.START,
            dxui.Utils.FLEX_ALIGN.CENTER,
            dxui.Utils.FLEX_ALIGN.CENTER
        );
        this._content.padTop(layout.y(16));
        this._content.padBottom(actionReserve);
        this._content.obj.lvObjSetStylePadGap(
            layout.y(ROW_GAP),
            dxui.Utils.ENUM._LV_STYLE_STATE_CMP_SAME
        );

        this._fieldLabels = [];
        this._kbApis = [];
        this._keyInput = this._buildTextRow('secretKey', {
            mode: keyboard.MODE.ENGLISH,
        });

        this._tipLbl = dxui.Label.build('cloud_cert_tip', this._content);
        this._tipLbl.setSize(layout.x(720), layout.y(80));
        this._tipLbl.textFont(font.get(layout.fontSize(22)));
        this._tipLbl.textColor(theme.textSecondary);
        this._tipLbl.textAlign(dxui.Utils.TEXT_ALIGN.CENTER);
        this._tipLbl.longMode(dxui.Utils.LABEL_LONG_MODE.WRAP);

        this._saveBtn = dxui.Button.build('cloud_cert_save', this.root);
        this._saveBtn.setSize(layout.x(720), layout.y(ACTION_BTN_H));
        this._saveBtn.align(dxui.Utils.ALIGN.BOTTOM_MID, 0, -layout.y(ACTION_BTN_BOTTOM));
        this._saveBtn.bgColor(theme.activeBg);
        this._saveBtn.radius(layout.x(14));
        this._saveBtn.borderWidth(0);
        this._saveBtn.on(dxui.Utils.EVENT.CLICK, function () {
            self._onSave();
        });

        this._saveLbl = dxui.Label.build('cloud_cert_save_lbl', this._saveBtn);
        this._saveLbl.textFont(font.get(layout.fontSize(30)));
        this._saveLbl.textColor(theme.textOnDark);
        this._saveLbl.align(dxui.Utils.ALIGN.CENTER, 0, 0);
    }

    /**
     * @param {string} fieldKey
     * @param {{ mode?: number }} [options]
     * @returns {object}
     */
    _buildTextRow(fieldKey, options) {
        const opts = options || {};
        const row = dxui.View.build('cloud_cert_row_' + fieldKey, this._content);
        layout.clearStyle(row);
        row.setSize(layout.x(720), layout.y(ROW_H));
        row.bgColor(theme.pageBg);
        row.bgOpa(100);
        row.radius(layout.x(14));
        row.scroll(false);

        const label = dxui.Label.build('cloud_cert_lbl_' + fieldKey, row);
        label.setSize(layout.x(200), layout.y(40));
        label.align(dxui.Utils.ALIGN.LEFT_MID, layout.x(24), 0);
        label.textFont(font.get(layout.fontSize(26)));
        label.textColor(theme.textPrimary);
        label.textAlign(dxui.Utils.TEXT_ALIGN.LEFT);
        this._fieldLabels.push({ key: fieldKey, label: label });

        const inputBox = dxui.View.build('cloud_cert_box_' + fieldKey, row);
        layout.clearStyle(inputBox);
        inputBox.setSize(layout.x(460), layout.y(64));
        inputBox.align(dxui.Utils.ALIGN.RIGHT_MID, -layout.x(20), 0);
        inputBox.bgColor(0xf5f5f5);
        inputBox.bgOpa(100);
        inputBox.radius(layout.x(12));
        inputBox.borderWidth(layout.x(2));
        inputBox.setBorderColor(0xdcdcdc);
        inputBox.scroll(false);

        const input = dxui.Textarea.build('cloud_cert_input_' + fieldKey, inputBox);
        layout.clearStyle(input);
        input.setSize(layout.x(420), layout.y(48));
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
        input.text('');

        const kb = keyboard.bind(null, input, {
            mode: opts.mode === undefined ? keyboard.MODE.ENGLISH : opts.mode,
            placeholder: t('cloudCert.inputPlaceholder'),
        });
        this._kbApis.push({ key: fieldKey, kb: kb, input: input });
        return input;
    }

    /**
     * @param {object|null} input
     * @param {string} value
     */
    _setInput(input, value) {
        if (!input) {
            return;
        }
        input.text(value == null ? '' : String(value));
    }

    /**
     * @param {object|null} input
     * @returns {string}
     */
    _readInput(input) {
        if (!input) {
            return '';
        }
        try {
            return String(input.text() || '').trim();
        } catch (_e) {
            return '';
        }
    }

    _refreshLabels() {
        for (let i = 0; i < this._fieldLabels.length; i++) {
            const item = this._fieldLabels[i];
            item.label.text(t('cloudCert.field.' + item.key));
        }
        for (let n = 0; n < this._kbApis.length; n++) {
            this._kbApis[n].kb.setPlaceholder(t('cloudCert.inputPlaceholder'));
        }
        if (this._tipLbl) {
            this._tipLbl.text(t('cloudCert.tip'));
        }
        if (this._saveLbl) {
            this._saveLbl.text(t('cloudCert.activate'));
        }
    }

    _onSave() {
        if (this._saving) {
            return;
        }
        keyboard.hideAll();
        const self = this;
        this._saving = true;
        cloudCertStore.activate({
            secretKey: this._readInput(this._keyInput),
        }).then(function (result) {
            self._saving = false;
            if (!result || !result.ok) {
                if (result && result.error === 'keyRequired') {
                    popup.showError(t('cloudCert.error.keyRequired'));
                    return;
                }
                if (result && result.error === 'keyInvalid') {
                    popup.showError(t('cloudCert.error.keyInvalid'));
                    return;
                }
                popup.showError((result && result.message) || t('cloudCert.activateFail'));
                return;
            }
            self._setInput(self._keyInput, '');
            popup.showSuccess(t('cloudCert.activateSuccess'));
        }).catch(function () {
            self._saving = false;
            popup.showError(t('cloudCert.activateFail'));
        });
    }
}
