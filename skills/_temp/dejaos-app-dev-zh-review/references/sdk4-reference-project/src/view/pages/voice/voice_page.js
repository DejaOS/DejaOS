/**
 * @layer    view
 * @module   voice_page
 * @fires    none
 * @listens  none
 * @depends  dxUi,BaseView,font,layout,theme,page_header,keyboard,i18n,popup,voice_store
 *
 * 语音播报：陌生人语音、语音模式、问候语（仅问候语模式）、音量 0–10。
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
import voiceStore from './voice_store.js';

const ROW_H = 96;
const SEG_H = 72;
const SLIDER_ROW_H = 120;
const ROW_GAP = 12;
const ACTION_BTN_H = 88;
const ACTION_BTN_BOTTOM = 48;

const STRANGER_OPTIONS = [
    { id: '0', labelKey: 'voice.stranger.none' },
    { id: '1', labelKey: 'voice.stranger.register' },
    { id: '2', labelKey: 'voice.stranger.unregistered' },
];

const VOICE_MODE_OPTIONS = [
    { id: '0', labelKey: 'voice.mode.none' },
    { id: '1', labelKey: 'voice.mode.name' },
    { id: '2', labelKey: 'voice.mode.greeting' },
];

export default class VoicePage extends BaseView {
    constructor() {
        super('settings_voice');
        this._header = null;
        this._content = null;
        this._saveBtn = null;
        this._saveLbl = null;
        /** @type {{ key: string, label: object }[]} */
        this._captions = [];
        /** @type {{ key: string, label: object, valueLbl: object, suffix: string }[]} */
        this._sliderLabels = [];
        /** @type {{ key: string, label: object }[]} */
        this._fieldLabels = [];
        /** @type {object[]} */
        this._kbApis = [];
        /** @type {Object.<string, object>} */
        this._fieldRows = {};
        /** @type {string} */
        this._stranger = '1';
        /** @type {string} */
        this._voiceMode = '1';
        /** @type {Object.<string, { button: object, label: object, labelKey: string }>} */
        this._strangerButtons = {};
        /** @type {Object.<string, { button: object, label: object, labelKey: string }>} */
        this._voiceModeButtons = {};
        /** @type {object|null} */
        this._greetingInput = null;
        /** @type {object|null} */
        this._greetingRow = null;
        /** @type {object|null} */
        this._greetingKb = null;
        /** @type {object|null} */
        this._volumeSlider = null;
    }

    onCreate() {
        this.root = dxui.View.build('page_voice', dxui.Utils.LAYER.MAIN);
        this.root.setSize(layout.width, layout.height);
        layout.clearStyle(this.root);
        this.root.bgColor(theme.pageBg);
        this.root.bgOpa(100);
        this.root.scroll(false);

        this._header = pageHeader.build(this.root, {
            idPrefix: 'voice',
            titleKey: 'settings.menu.voice',
        });
        this._buildBody();
    }

    onEnter() {
        if (this._header) {
            this._header.refresh();
        }
        const self = this;
        this._loadFromStore().then(function () {
            self._refreshStrangerStyles();
            self._refreshVoiceModeStyles();
            self._refreshGreetingVisible();
        }).catch(function (error) {
            popup.showError(error && error.message ? error.message : t('voice.saveRequired'));
        });
        this._refreshLabels();
    }

    onExit() {
        keyboard.hideAll();
    }

    _buildBody() {
        const self = this;
        const top = pageHeader.contentTop();
        const contentH = layout.height - top;
        const actionReserve = layout.y(ACTION_BTN_H + ACTION_BTN_BOTTOM + 24);

        this._content = dxui.View.build('voice_content', this.root);
        this._content.setSize(layout.width, contentH);
        this._content.setPos(0, top);
        layout.clearStyle(this._content);
        this._content.bgColor(0xf5f5f5);
        this._content.bgOpa(100);
        this._content.scroll(true);
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

        this._captions = [];
        this._sliderLabels = [];
        this._fieldLabels = [];
        this._kbApis = [];
        this._fieldRows = {};

        this._volumeSlider = this._buildSliderRow('volume', 0, 10, '');

        this._buildCaption('stranger');
        this._strangerButtons = this._buildSegmentRow('stranger', STRANGER_OPTIONS, function (id) {
            if (id === self._stranger) {
                return;
            }
            self._stranger = id;
            self._refreshStrangerStyles();
        }).map;

        this._buildCaption('voiceMode');
        this._voiceModeButtons = this._buildSegmentRow('voiceMode', VOICE_MODE_OPTIONS, function (id) {
            if (id === self._voiceMode) {
                return;
            }
            self._voiceMode = id;
            self._refreshVoiceModeStyles();
            self._refreshGreetingVisible();
        }).map;

        this._greetingInput = this._buildTextRow('greeting');
        this._greetingRow = this._fieldRows.greeting;
        const greetingKbItem = this._kbApis.length
            ? this._kbApis[this._kbApis.length - 1]
            : null;
        this._greetingKb = greetingKbItem ? greetingKbItem.kb : null;

        this._saveBtn = dxui.Button.build('voice_save', this.root);
        this._saveBtn.setSize(layout.x(720), layout.y(ACTION_BTN_H));
        this._saveBtn.align(dxui.Utils.ALIGN.BOTTOM_MID, 0, -layout.y(ACTION_BTN_BOTTOM));
        this._saveBtn.bgColor(theme.activeBg);
        this._saveBtn.radius(layout.x(14));
        this._saveBtn.borderWidth(0);
        this._saveBtn.on(dxui.Utils.EVENT.CLICK, function () {
            self._onSave();
        });

        this._saveLbl = dxui.Label.build('voice_save_lbl', this._saveBtn);
        this._saveLbl.textFont(font.get(layout.fontSize(30)));
        this._saveLbl.textColor(theme.textOnDark);
        this._saveLbl.align(dxui.Utils.ALIGN.CENTER, 0, 0);
    }

    /**
     * @param {string} key
     */
    _buildCaption(key) {
        const box = dxui.View.build('voice_cap_' + key, this._content);
        layout.clearStyle(box);
        box.setSize(layout.x(720), layout.y(36));
        box.bgOpa(0);
        box.scroll(false);

        const label = dxui.Label.build('voice_cap_lbl_' + key, box);
        label.setSize(layout.x(720), layout.y(32));
        label.align(dxui.Utils.ALIGN.LEFT_MID, 0, 0);
        label.textFont(font.get(layout.fontSize(22)));
        label.textColor(theme.textSecondary);
        label.textAlign(dxui.Utils.TEXT_ALIGN.LEFT);
        this._captions.push({ key: key, label: label });
    }

    /**
     * @param {string} prefix
     * @param {{ id: string, labelKey: string }[]} options
     * @param {function(string): void} onSelect
     * @returns {{ map: Object.<string, { button: object, label: object, labelKey: string }>, row: object }}
     */
    _buildSegmentRow(prefix, options, onSelect) {
        const row = dxui.View.build('voice_seg_' + prefix, this._content);
        layout.clearStyle(row);
        row.setSize(layout.x(720), layout.y(SEG_H));
        row.bgColor(theme.pageBg);
        row.bgOpa(100);
        row.radius(layout.x(14));
        row.scroll(false);

        const map = {};
        const count = options.length;
        const gap = layout.x(10);
        const sidePad = layout.x(10);
        const btnW = Math.floor(
            (layout.x(720) - sidePad * 2 - gap * (count - 1)) / count
        );
        const btnH = layout.y(SEG_H - 16);

        for (let i = 0; i < count; i++) {
            const option = options[i];
            const button = dxui.Button.build(
                'voice_seg_btn_' + prefix + '_' + option.id,
                row
            );
            button.setSize(btnW, btnH);
            button.setPos(sidePad + i * (btnW + gap), layout.y(8));
            button.radius(layout.x(10));
            button.borderWidth(0);
            button.on(dxui.Utils.EVENT.CLICK, (function (id) {
                return function () {
                    onSelect(id);
                };
            })(option.id));

            const label = dxui.Label.build(
                'voice_seg_lbl_' + prefix + '_' + option.id,
                button
            );
            label.textFont(font.get(layout.fontSize(22)));
            label.align(dxui.Utils.ALIGN.CENTER, 0, 0);
            map[option.id] = { button: button, label: label, labelKey: option.labelKey };
        }
        return { map: map, row: row };
    }

    /**
     * @param {string} fieldKey
     * @returns {object}
     */
    _buildTextRow(fieldKey) {
        const row = dxui.View.build('voice_row_' + fieldKey, this._content);
        layout.clearStyle(row);
        row.setSize(layout.x(720), layout.y(ROW_H));
        row.bgColor(theme.pageBg);
        row.bgOpa(100);
        row.radius(layout.x(14));
        row.scroll(false);
        this._fieldRows[fieldKey] = row;

        const label = dxui.Label.build('voice_lbl_' + fieldKey, row);
        label.setSize(layout.x(200), layout.y(40));
        label.align(dxui.Utils.ALIGN.LEFT_MID, layout.x(24), 0);
        label.textFont(font.get(layout.fontSize(26)));
        label.textColor(theme.textPrimary);
        label.textAlign(dxui.Utils.TEXT_ALIGN.LEFT);
        this._fieldLabels.push({ key: fieldKey, label: label });

        const inputBox = dxui.View.build('voice_box_' + fieldKey, row);
        layout.clearStyle(inputBox);
        inputBox.setSize(layout.x(460), layout.y(64));
        inputBox.align(dxui.Utils.ALIGN.RIGHT_MID, -layout.x(20), 0);
        inputBox.bgColor(0xf5f5f5);
        inputBox.bgOpa(100);
        inputBox.radius(layout.x(12));
        inputBox.borderWidth(layout.x(2));
        inputBox.setBorderColor(0xdcdcdc);
        inputBox.scroll(false);

        const input = dxui.Textarea.build('voice_input_' + fieldKey, inputBox);
        layout.clearStyle(input);
        input.setSize(layout.x(420), layout.y(48));
        input.align(dxui.Utils.ALIGN.CENTER, 0, 0);
        input.bgOpa(0);
        input.padAll(0);
        input.borderWidth(0);
        input.setOneLine(true);
        input.setMaxLength(64);
        input.setCursorClickPos(true);
        input.textFont(font.get(layout.fontSize(26)));
        input.textColor(theme.textPrimary);
        input.setAlign(dxui.Utils.TEXT_ALIGN.LEFT);
        input.text('');

        const kb = keyboard.bind(null, input, {
            mode: keyboard.MODE.PINYIN,
            placeholder: t('voice.inputPlaceholder'),
        });
        this._kbApis.push({ key: fieldKey, kb: kb, input: input, inputBox: inputBox });
        return input;
    }

    /**
     * @param {string} fieldKey
     * @param {number} min
     * @param {number} max
     * @param {string} suffix
     * @returns {object}
     */
    _buildSliderRow(fieldKey, min, max, suffix) {
        const self = this;
        const row = dxui.View.build('voice_slider_row_' + fieldKey, this._content);
        layout.clearStyle(row);
        row.setSize(layout.x(720), layout.y(SLIDER_ROW_H));
        row.bgColor(theme.pageBg);
        row.bgOpa(100);
        row.radius(layout.x(14));
        row.scroll(false);
        this._fieldRows[fieldKey] = row;

        const label = dxui.Label.build('voice_slider_lbl_' + fieldKey, row);
        label.setSize(layout.x(420), layout.y(36));
        label.setPos(layout.x(24), layout.y(16));
        label.textFont(font.get(layout.fontSize(26)));
        label.textColor(theme.textPrimary);
        label.textAlign(dxui.Utils.TEXT_ALIGN.LEFT);

        const valueLbl = dxui.Label.build('voice_slider_val_' + fieldKey, row);
        valueLbl.setSize(layout.x(160), layout.y(36));
        valueLbl.setPos(layout.x(536), layout.y(16));
        valueLbl.textFont(font.get(layout.fontSize(26)));
        valueLbl.textColor(theme.accent);
        valueLbl.textAlign(dxui.Utils.TEXT_ALIGN.RIGHT);
        valueLbl.text(String(min) + (suffix || ''));

        this._sliderLabels.push({
            key: fieldKey,
            label: label,
            valueLbl: valueLbl,
            suffix: suffix || '',
        });

        const slider = dxui.Slider.build('voice_slider_' + fieldKey, row);
        slider.setSize(layout.x(672), layout.y(28));
        slider.setPos(layout.x(24), layout.y(68));
        slider.range(min, max);
        slider.value(min, false);
        slider.on(dxui.Utils.EVENT.VALUE_CHANGED, function () {
            self._updateSliderValueLabel(fieldKey, slider, suffix || '');
        });
        return slider;
    }

    /**
     * @param {string} fieldKey
     * @param {object} slider
     * @param {string} suffix
     */
    _updateSliderValueLabel(fieldKey, slider, suffix) {
        let value = 0;
        try {
            value = slider.value();
        } catch (_e) {
            value = 0;
        }
        for (let i = 0; i < this._sliderLabels.length; i++) {
            const item = this._sliderLabels[i];
            if (item.key === fieldKey) {
                item.valueLbl.text(String(value) + (suffix || ''));
                break;
            }
        }
    }

    async _loadFromStore() {
        const cfg = await voiceStore.load();
        this._stranger = String(cfg.stranger);
        this._voiceMode = String(cfg.voiceMode);
        this._setInput(this._greetingInput, cfg.greeting || '');
        this._setSlider(this._volumeSlider, cfg.volume, 'volume', '');
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

    /**
     * @param {object|null} slider
     * @param {number} value
     * @param {string} fieldKey
     * @param {string} suffix
     */
    _setSlider(slider, value, fieldKey, suffix) {
        if (!slider) {
            return;
        }
        let n = Number(value);
        if (!Number.isFinite(n)) {
            n = 0;
        }
        slider.value(n, false);
        this._updateSliderValueLabel(fieldKey, slider, suffix || '');
    }

    /**
     * @param {object|null} slider
     * @returns {number}
     */
    _readSlider(slider) {
        if (!slider) {
            return 0;
        }
        try {
            return Number(slider.value()) || 0;
        } catch (_e) {
            return 0;
        }
    }

    _refreshGreetingVisible() {
        if (!this._greetingRow) {
            return;
        }
        if (this._voiceMode === '2') {
            this._greetingRow.show();
        } else {
            this._greetingRow.hide();
            if (this._greetingKb) {
                this._greetingKb.hide();
            }
        }
    }

    /**
     * @param {Object.<string, { button: object, label: object }>} buttonMap
     * @param {string} selectedId
     */
    _refreshSegmentStyles(buttonMap, selectedId) {
        const ids = Object.keys(buttonMap);
        for (let i = 0; i < ids.length; i++) {
            const id = ids[i];
            const entry = buttonMap[id];
            const active = id === selectedId;
            entry.button.bgColor(active ? theme.activeBg : theme.actionBg);
            entry.label.textColor(active ? theme.textOnDark : theme.textMuted);
        }
    }

    _refreshStrangerStyles() {
        this._refreshSegmentStyles(this._strangerButtons, this._stranger);
    }

    _refreshVoiceModeStyles() {
        this._refreshSegmentStyles(this._voiceModeButtons, this._voiceMode);
    }

    _refreshLabels() {
        for (let c = 0; c < this._captions.length; c++) {
            const cap = this._captions[c];
            cap.label.text(t('voice.caption.' + cap.key));
        }
        for (let j = 0; j < this._fieldLabels.length; j++) {
            const item = this._fieldLabels[j];
            item.label.text(t('voice.field.' + item.key));
        }
        for (let s = 0; s < this._sliderLabels.length; s++) {
            const item = this._sliderLabels[s];
            item.label.text(t('voice.field.' + item.key));
        }

        const strangerIds = Object.keys(this._strangerButtons);
        for (let i = 0; i < strangerIds.length; i++) {
            const entry = this._strangerButtons[strangerIds[i]];
            entry.label.text(t(entry.labelKey));
        }
        const modeIds = Object.keys(this._voiceModeButtons);
        for (let m = 0; m < modeIds.length; m++) {
            const entry = this._voiceModeButtons[modeIds[m]];
            entry.label.text(t(entry.labelKey));
        }

        for (let n = 0; n < this._kbApis.length; n++) {
            this._kbApis[n].kb.setPlaceholder(t('voice.inputPlaceholder'));
        }
        if (this._saveLbl) {
            this._saveLbl.text(t('voice.save'));
        }
    }

    async _onSave() {
        keyboard.hideAll();
        const result = await voiceStore.save({
            stranger: this._stranger,
            voiceMode: this._voiceMode,
            greeting: this._readInput(this._greetingInput),
            volume: this._readSlider(this._volumeSlider),
        });
        if (!result.ok) {
            if (result.error === 'pending') {
                popup.showError(result.message || '功能待接入');
                return;
            }
            if (result.error === 'greetingRequired') {
                popup.showError(t('voice.error.greetingRequired'));
                return;
            }
            popup.showError(result.message || t('voice.saveRequired'));
            return;
        }
        popup.showSuccess(t('voice.saveSuccess'));
    }
}
