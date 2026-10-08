/**
 * @layer    view
 * @module   system_section_page
 * @fires    none
 * @listens  none
 * @depends  dxUi,BaseView,router,font,layout,theme,page_header,keyboard,i18n,assets,popup,confirm,system_store,setting_pager
 *
 * 系统设置各大类独立子页（显示 / 语言 / 通行信息 / 人脸 / 刷卡 / 补光 / 密码 / 系统时间）。
 * 横屏：保存钮右上角小按钮；列表一页 5 条占位，超出上下翻页。
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
import restartRequired from '../../components/restart_required.js';
import { t, setLocale } from '../../i18n/index.js';
import { getAvailableLocales } from '../../i18n/languages.js';
import { asset } from '../../utils/assets.js';
import systemStore, {
    TIMEOUT_OPTIONS,
    TZ_REGIONS,
    TZ_BY_REGION,
    regionOfTimeZone,
} from '../../pages/system/system_store.js';
import capabilityStore from '../../core/capability_store.js';
import { CONTENT_W } from '../ls_metrics.js';
import {
    SETTING_PAGE_SIZE,
    settingPageRowH,
    attachSettingPager,
    styleSettingRow,
    buildTopSaveButton,
} from '../../components/setting_pager.js';

const SEG_H = 68;
const PICKER_VISIBLE = 5;
const PICKER_ROW_H = 56;
const IMG_ARROW = asset('keyboard-arrow-right.png');

/**
 * @param {string} routeName 如 settings_system_display
 * @param {string} sectionId display|language|accessDisplay|light|face|card|passwordOpen|loginPassword|systemTime
 * @param {string} titleKey i18n key
 */
export default class SystemSectionPage extends BaseView {
    constructor(routeName, sectionId, titleKey) {
        super(routeName);
        this._sectionId = sectionId;
        this._titleKey = titleKey;
        this._header = null;
        this._content = null;
        this._listContent = null;
        this._saveBtn = null;
        this._saveLbl = null;
        this._pager = null;
        this._rowH = 0;
        this._listW = 0;
        /** @type {{ key: string, box: object, active: boolean }[]} */
        this._listRows = [];

        /** @type {{ key: string, label: object }[]} */
        this._captions = [];
        /** @type {{ key: string, label: object }[]} */
        this._fieldLabels = [];
        /** @type {{ key: string, label: object }[]} */
        this._switchLabels = [];
        /** @type {{ key: string, label: object, valueLbl: object, suffix: string }[]} */
        this._sliderLabels = [];
        /** @type {{ key: string, titleLbl: object, valueLbl: object }[]} */
        this._pickerLabels = [];
        /** @type {{ key: string, label: object }[]} */
        this._linkLabels = [];
        /** @type {object[]} */
        this._kbApis = [];
        /** @type {Object.<string, object>} */
        this._fieldRows = {};

        this._language = 'zh';
        this._region = 'CN';
        this._languageValueLbl = null;
        this._languagePickerRow = null;
        this._screenOff = 0;
        this._screensaver = 0;
        this._whiteLightMode = 0;
        this._timeZone = 'Asia/Shanghai';
        this._tzRegion = 'asia';
        this._cardIdentity = 1;

        this._brightnessSlider = null;
        this._whiteLightSlider = null;
        this._nirLightSlider = null;
        this._similaritySlider = null;
        this._livenessValSlider = null;
        this._livenessValRow = null;

        this._showIpSw = null;
        this._showSnSw = null;
        this._showAccessNameSw = null;
        this._showAccessDepartmentSw = null;
        this._showAccessEmployeeNoSw = null;
        this._livenessSw = null;
        this._recheckEnabledSw = null;
        this._recheckSlider = null;
        this._recheckRow = null;
        this._recognitionTimeoutSlider = null;
        this._recheckDefaultSeconds = 8;
        this._cardVerifySw = null;
        this._cardIdentityValueLbl = null;
        this._passwordOpenSw = null;
        this._passwordLength = 6;
        this._passwordLengthButtons = {};

        this._oldPwdInput = null;
        this._newPwdInput = null;
        this._confirmPwdInput = null;
        this._ntpInput = null;
        this._manualDateInput = null;
        this._manualTimeInput = null;
        this._loadedManualTime = '';

        this._screenOffValueLbl = null;
        this._whiteLightModeValueLbl = null;
        this._screensaverValueLbl = null;
        this._tzRegionValueLbl = null;
        this._tzCityValueLbl = null;

        this._pickerMask = null;
        this._pickerTitleLbl = null;
        this._pickerCloseLbl = null;
        this._pickerList = null;
        /** @type {{ row: object, label: object, id: string }[]} */
        this._pickerSlots = [];
        this._pickerOnSelect = null;
        this._pickerSelectedId = '';
        this._needPicker = false;
    }

    onCreate() {
        this.root = dxui.View.build('page_' + this.name, dxui.Utils.LAYER.MAIN);
        this.root.setSize(layout.width, layout.height);
        layout.clearStyle(this.root);
        this.root.bgColor(0xffffff);
        this.root.bgOpa(100);
        this.root.scroll(false);

        this._header = pageHeader.build(this.root, {
            idPrefix: this.name,
            titleKey: this._titleKey,
        });
        this._buildBody();
        if (this._needPicker) {
            this._buildPickerDialog();
        }
    }

    onEnter() {
        if (this._header) {
            this._header.refresh();
        }
        this._hidePicker();
        const self = this;
        // 页面可能被缓存复用，每次进入都先查询真实配置，再刷新依赖状态。
        this._loadFromStore().then(function () {
            if (self._sectionId === 'display') self._refreshTimeoutLabels();
            if (self._sectionId === 'language') {
                self._applyLanguageRegion();
                self._refreshLanguageLabel();
            }
            if (self._sectionId === 'face') {
                self._refreshLivenessValVisible();
                self._refreshRecheckVisible();
            }
            if (self._sectionId === 'systemTime') self._refreshTzLabels();
            if (self._pager) {
                self._pager.apply();
            }
        }).catch(function (error) {
            popup.showError(error && error.message ? error.message : t('system.saveRequired'));
        });
        this._refreshLabels();
        if (this._pager) {
            this._pager.apply();
        }
    }

    onExit() {
        this._hidePicker();
        confirm.hide();
        keyboard.hideAll();
    }

    _buildBody() {
        const self = this;
        const top = pageHeader.contentTop();
        const contentH = layout.height - top;
        this._listW = layout.x(CONTENT_W);
        this._rowH = settingPageRowH(contentH);
        const listX = Math.round((layout.width - this._listW) / 2);

        this._content = dxui.View.build(this.name + '_content', this.root);
        this._content.setSize(layout.width, contentH);
        this._content.setPos(0, top);
        layout.clearStyle(this._content);
        this._content.bgColor(0xffffff);
        this._content.bgOpa(100);
        this._content.scroll(false);

        let listTop = 0;
        let listH = this._rowH * SETTING_PAGE_SIZE;
        if (this._sectionId === 'loginPassword') {
            const hintH = this._buildPasswordRuleHint(listX);
            listTop = hintH;
            const availH = Math.max(layout.y(200), contentH - hintH);
            this._rowH = settingPageRowH(availH);
            listH = this._rowH * SETTING_PAGE_SIZE;
        }

        this._listContent = dxui.View.build(this.name + '_list', this._content);
        layout.clearStyle(this._listContent);
        this._listContent.setSize(this._listW, listH);
        this._listContent.setPos(listX, listTop);
        this._listContent.bgOpa(0);
        this._listContent.scroll(false);

        // loginPassword 的规则说明已在列表外构建并写入 _captions
        if (this._sectionId !== 'loginPassword') {
            this._captions = [];
        }
        this._fieldLabels = [];
        this._switchLabels = [];
        this._sliderLabels = [];
        this._pickerLabels = [];
        this._linkLabels = [];
        this._kbApis = [];
        this._fieldRows = {};
        this._listRows = [];

        switch (this._sectionId) {
            case 'display':
                this._needPicker = true;
                this._buildDisplayFields();
                break;
            case 'language':
                this._buildLanguageFields();
                break;
            case 'accessDisplay':
                this._buildAccessDisplayFields();
                break;
            case 'light':
                this._needPicker = true;
                this._buildLightFields();
                break;
            case 'face':
                this._buildFaceFields();
                this._refreshLivenessValVisible();
                this._refreshRecheckVisible();
                break;
            case 'card':
                this._needPicker = true;
                this._buildCardFields();
                break;
            case 'passwordOpen':
                this._buildPasswordOpenFields();
                break;
            case 'loginPassword':
                this._buildLoginPasswordFields();
                break;
            case 'systemTime':
                this._needPicker = true;
                this._buildSystemTimeFields();
                break;
            default:
                break;
        }

        const save = buildTopSaveButton(this.root, this.name + '_save', function () {
            self._onSave();
        });
        this._saveBtn = save.button;
        this._saveLbl = save.label;

        this._pager = attachSettingPager(this.root, {
            idPrefix: this.name,
            rowH: this._rowH,
            getRows: function () {
                const out = [];
                for (let i = 0; i < self._listRows.length; i++) {
                    const item = self._listRows[i];
                    if (item.active !== false) {
                        out.push(item.box);
                    }
                }
                return out;
            },
        });
    }

    /**
     * @param {string} key
     * @param {object} box
     */
    _registerListRow(key, box) {
        this._listRows.push({ key: key, box: box, active: true });
        this._fieldRows[key] = box;
    }

    /**
     * @param {string} key
     * @param {boolean} active
     */
    _setRowActive(key, active) {
        for (let i = 0; i < this._listRows.length; i++) {
            if (this._listRows[i].key !== key) {
                continue;
            }
            this._listRows[i].active = !!active;
            // 未参与分页的行必须立刻 hide，否则会叠在后续重排后的行上
            if (!active && this._listRows[i].box) {
                this._listRows[i].box.hide();
            }
            break;
        }
    }

    _buildDisplayFields() {
        const self = this;
        this._brightnessSlider = this._buildSliderRow('brightness', 0, 100, '%');
        this._screenOffValueLbl = this._buildPickerRow('screenOff', function () {
            self._openTimeoutPicker('screenOff');
        }).valueLbl;
        this._screensaverValueLbl = this._buildPickerRow('screensaver', function () {
            self._openTimeoutPicker('screensaver');
        }).valueLbl;
        this._showIpSw = this._buildSwitchRow('showIp');
        this._showSnSw = this._buildSwitchRow('showSn');
        this._buildLinkRow('languageEntry', 'settings_system_language');
        this._buildLinkRow('accessDisplayEntry', 'settings_system_accessDisplay');
    }

    _buildLanguageFields() {
        const self = this;
        this._needPicker = true;
        this._languageValueLbl = this._buildPickerRow('language', function () {
            if (self._region !== 'INTL') return;
            self._openLanguagePicker();
        }).valueLbl;
        this._languagePickerRow = this._fieldRows.language;
    }

    _buildAccessDisplayFields() {
        this._showAccessNameSw = this._buildSwitchRow('showAccessName');
        this._showAccessDepartmentSw = this._buildSwitchRow('showAccessDepartment');
        this._showAccessEmployeeNoSw = this._buildSwitchRow('showAccessEmployeeNo');
    }

    _buildLightFields() {
        const self = this;
        if (capabilityStore.hasPwmWhite()) {
            this._whiteLightSlider = this._buildSliderRow('whiteLight', 0, 100, '%');
            this._whiteLightModeValueLbl = this._buildPickerRow('whiteLightMode', function () {
                self._openWhiteLightModePicker();
            }).valueLbl;
        }
        if (capabilityStore.hasPwmNir()) {
            this._nirLightSlider = this._buildSliderRow('nirLight', 0, 100, '%');
        }
    }

    _buildFaceFields() {
        const self = this;
        this._similaritySlider = this._buildSliderRow('similarity', 0, 100, '%');
        this._livenessSw = this._buildSwitchRow('liveness', function () {
            self._refreshLivenessValVisible();
        });
        this._livenessValSlider = this._buildSliderRow('livenessVal', 0, 10, '');
        this._livenessValRow = this._fieldRows.livenessVal;
        this._recheckEnabledSw = this._buildSwitchRow('recheckEnabled', function () {
            self._refreshRecheckVisible();
        });
        this._recheckSlider = this._buildSliderRow('recheck', 1, 100, 's');
        this._recheckRow = this._fieldRows.recheck;
        this._recognitionTimeoutSlider = this._buildSliderRow('recognitionTimeout', 1, 30, 's');
    }

    _buildCardFields() {
        this._cardVerifySw = this._buildSwitchRow('cardVerify');
        const self = this;
        this._cardIdentityValueLbl = this._buildPickerRow('cardIdentity', function () {
            self._openCardIdentityPicker();
        }).valueLbl;
    }

    _buildPasswordOpenFields() {
        this._passwordOpenSw = this._buildSwitchRow('passwordOpen');
        const self = this;
        this._passwordLengthButtons = this._buildSegmentRow('passwordLength', [
            { id: '4', labelKey: 'system.passwordLength.4' },
            { id: '6', labelKey: 'system.passwordLength.6' },
            { id: '8', labelKey: 'system.passwordLength.8' },
        ], function (id) {
            self._passwordLength = Number(id);
            self._refreshSegmentStyles(self._passwordLengthButtons, id);
        }).map;
    }

    _buildLoginPasswordFields() {
        this._oldPwdInput = this._buildTextRow('oldPassword', {
            mode: keyboard.MODE.ENGLISH,
        });
        this._newPwdInput = this._buildTextRow('newPassword', {
            mode: keyboard.MODE.ENGLISH,
        });
        this._confirmPwdInput = this._buildTextRow('confirmPassword', {
            mode: keyboard.MODE.ENGLISH,
        });
    }

    /**
     * 密码规则说明：放在分页列表上方，不参与 pager。
     * @param {number} listX
     * @returns {number} hint 高度（屏像素）
     */
    _buildPasswordRuleHint(listX) {
        this._captions = [];
        const hintH = layout.y(220);
        const box = dxui.View.build(this.name + '_password_rules', this._content);
        layout.clearStyle(box);
        box.setSize(this._listW, hintH);
        box.setPos(listX, 0);
        box.bgOpa(0);
        box.scroll(false);
        const label = dxui.Label.build(this.name + '_password_rules_lbl', box);
        label.setSize(this._listW, hintH - layout.y(4));
        label.textFont(font.get(layout.fontSize(20)));
        label.textColor(theme.textSecondary);
        label.textAlign(dxui.Utils.TEXT_ALIGN.LEFT);
        label.longMode(dxui.Utils.LABEL_LONG_MODE.WRAP);
        this._captions.push({ key: 'passwordRules', label: label });
        return hintH;
    }

    _buildSystemTimeFields() {
        const self = this;
        this._manualDateInput = this._buildTextRow('manualDate', {
            mode: keyboard.MODE.ENGLISH,
        });
        this._manualTimeInput = this._buildTextRow('manualTime', {
            mode: keyboard.MODE.ENGLISH,
        });
        // 先选时区，NTP 为可选服务地址。
        this._tzRegionValueLbl = this._buildPickerRow('tzRegion', function () {
            self._openTzRegionPicker();
        }).valueLbl;
        this._tzCityValueLbl = this._buildPickerRow('tzCity', function () {
            self._openTzCityPicker();
        }).valueLbl;
        this._ntpInput = this._buildTextRow('ntpServer', {
            mode: keyboard.MODE.ENGLISH,
        });
    }

    /**
     * @param {string} key
     */
    _buildCaption(key) {
        const box = dxui.View.build(this.name + '_cap_' + key, this._listContent);
        layout.clearStyle(box);
        box.setSize(this._listW, this._rowH);
        box.bgOpa(0);
        box.scroll(false);
        this._registerListRow('cap_' + key, box);

        const label = dxui.Label.build(this.name + '_cap_lbl_' + key, box);
        label.setSize(this._listW, layout.y(32));
        label.align(dxui.Utils.ALIGN.LEFT_MID, 0, 0);
        label.textFont(font.get(layout.fontSize(22)));
        label.textColor(theme.textSecondary);
        label.textAlign(dxui.Utils.TEXT_ALIGN.LEFT);
        this._captions.push({ key: key, label: label });
        return box;
    }

    _buildLinkRow(fieldKey, routeName) {
        const row = dxui.View.build(this.name + '_link_row_' + fieldKey, this._listContent);
        layout.clearStyle(row);
        row.setSize(this._listW, this._rowH);
        row.scroll(false);
        styleSettingRow(row);
        row.clickable(true);
        row.on(dxui.Utils.EVENT.CLICK, function () { router.navigate(routeName); });
        this._registerListRow(fieldKey, row);

        const label = dxui.Label.build(this.name + '_link_lbl_' + fieldKey, row);
        label.setSize(layout.x(600), layout.y(40));
        label.align(dxui.Utils.ALIGN.LEFT_MID, layout.x(24), 0);
        label.textFont(font.get(layout.fontSize(26)));
        label.textColor(theme.textPrimary);
        label.textAlign(dxui.Utils.TEXT_ALIGN.LEFT);
        label.clickable(false);
        this._linkLabels.push({ key: fieldKey, label: label });

        const arrow = dxui.Image.build(this.name + '_link_arrow_' + fieldKey, row);
        arrow.source(IMG_ARROW);
        arrow.align(dxui.Utils.ALIGN.RIGHT_MID, -layout.x(24), 0);
        arrow.clickable(false);
        return row;
    }

    /**
     * @param {string} prefix
     * @param {{ id: string, labelKey: string }[]} options
     * @param {function(string): void} onSelect
     * @returns {{ map: Object.<string, { button: object, label: object, labelKey: string }>, row: object }}
     */
    _buildSegmentRow(prefix, options, onSelect) {
        const row = dxui.View.build(this.name + '_seg_' + prefix, this._listContent);
        layout.clearStyle(row);
        row.setSize(this._listW, this._rowH);
        row.scroll(false);
        styleSettingRow(row);
        this._registerListRow(prefix, row);

        const map = {};
        const count = options.length;
        const gap = layout.x(10);
        const sidePad = layout.x(10);
        const btnW = Math.floor(
            (this._listW - sidePad * 2 - gap * (count - 1)) / count
        );
        const btnH = Math.min(layout.y(SEG_H), this._rowH - layout.y(12));
        const btnY = Math.floor((this._rowH - btnH) / 2);

        for (let i = 0; i < count; i++) {
            const option = options[i];
            const button = dxui.Button.build(
                this.name + '_seg_btn_' + prefix + '_' + option.id,
                row
            );
            button.setSize(btnW, btnH);
            button.setPos(sidePad + i * (btnW + gap), btnY);
            button.radius(layout.x(12));
            button.borderWidth(0);
            button.on(dxui.Utils.EVENT.CLICK, (function (id) {
                return function () {
                    onSelect(id);
                };
            })(option.id));

            const label = dxui.Label.build(
                this.name + '_seg_lbl_' + prefix + '_' + option.id,
                button
            );
            label.textFont(font.get(layout.fontSize(24)));
            label.align(dxui.Utils.ALIGN.CENTER, 0, 0);
            map[option.id] = { button: button, label: label, labelKey: option.labelKey };
        }
        return { map: map, row: row };
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
        const row = dxui.View.build(this.name + '_slider_row_' + fieldKey, this._listContent);
        layout.clearStyle(row);
        row.setSize(this._listW, this._rowH);
        row.scroll(false);
        styleSettingRow(row);
        this._registerListRow(fieldKey, row);

        const labelW = layout.x(280);
        const valueW = layout.x(80);
        const gap = layout.x(16);
        const sidePad = layout.x(24);
        const sliderH = layout.y(24);
        const sliderW = Math.max(
            layout.x(200),
            this._listW - sidePad - labelW - gap - valueW - sidePad
        );

        const label = dxui.Label.build(this.name + '_slider_lbl_' + fieldKey, row);
        label.setSize(labelW, layout.y(40));
        label.align(dxui.Utils.ALIGN.LEFT_MID, sidePad, 0);
        label.textFont(font.get(layout.fontSize(26)));
        label.textColor(theme.textPrimary);
        label.textAlign(dxui.Utils.TEXT_ALIGN.LEFT);

        const valueLbl = dxui.Label.build(this.name + '_slider_val_' + fieldKey, row);
        valueLbl.setSize(valueW, layout.y(40));
        valueLbl.align(dxui.Utils.ALIGN.RIGHT_MID, -sidePad, 0);
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

        const slider = dxui.Slider.build(this.name + '_slider_' + fieldKey, row);
        slider.setSize(sliderW, sliderH);
        slider.align(dxui.Utils.ALIGN.RIGHT_MID, -(sidePad + valueW + gap), 0);
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
                item.valueLbl.text(String(value) + suffix);
                break;
            }
        }
    }

    /**
     * @param {string} fieldKey
     * @param {function(): void} onClick
     * @returns {{ row: object, valueLbl: object }}
     */
    _buildPickerRow(fieldKey, onClick) {
        const row = dxui.View.build(this.name + '_pick_row_' + fieldKey, this._listContent);
        layout.clearStyle(row);
        row.setSize(this._listW, this._rowH);
        row.scroll(false);
        styleSettingRow(row);
        row.clickable(true);
        row.on(dxui.Utils.EVENT.CLICK, function () {
            keyboard.hideAll();
            onClick();
        });
        this._registerListRow(fieldKey, row);

        const titleLbl = dxui.Label.build(this.name + '_pick_title_' + fieldKey, row);
        titleLbl.setSize(layout.x(280), layout.y(40));
        titleLbl.align(dxui.Utils.ALIGN.LEFT_MID, layout.x(24), 0);
        titleLbl.textFont(font.get(layout.fontSize(26)));
        titleLbl.textColor(theme.textPrimary);
        titleLbl.textAlign(dxui.Utils.TEXT_ALIGN.LEFT);

        const valueLbl = dxui.Label.build(this.name + '_pick_val_' + fieldKey, row);
        valueLbl.setSize(layout.x(380), layout.y(40));
        valueLbl.align(dxui.Utils.ALIGN.RIGHT_MID, -layout.x(24), 0);
        valueLbl.textFont(font.get(layout.fontSize(24)));
        valueLbl.textColor(theme.textSecondary);
        valueLbl.textAlign(dxui.Utils.TEXT_ALIGN.RIGHT);

        this._pickerLabels.push({
            key: fieldKey,
            titleLbl: titleLbl,
            valueLbl: valueLbl,
        });
        return { row: row, valueLbl: valueLbl };
    }

    /**
     * @param {string} fieldKey
     * @param {{ mode?: number, lockMode?: number|boolean, password?: boolean }} [options]
     * @returns {object}
     */
    _buildTextRow(fieldKey, options) {
        const opts = options || {};
        const row = dxui.View.build(this.name + '_row_' + fieldKey, this._listContent);
        layout.clearStyle(row);
        row.setSize(this._listW, this._rowH);
        row.scroll(false);
        styleSettingRow(row);
        this._registerListRow(fieldKey, row);

        const label = dxui.Label.build(this.name + '_lbl_' + fieldKey, row);
        label.setSize(layout.x(260), layout.y(40));
        label.align(dxui.Utils.ALIGN.LEFT_MID, layout.x(24), 0);
        label.textFont(font.get(layout.fontSize(26)));
        label.textColor(theme.textPrimary);
        label.textAlign(dxui.Utils.TEXT_ALIGN.LEFT);
        this._fieldLabels.push({ key: fieldKey, label: label });

        const inputBox = dxui.View.build(this.name + '_box_' + fieldKey, row);
        layout.clearStyle(inputBox);
        inputBox.setSize(layout.x(400), layout.y(64));
        inputBox.align(dxui.Utils.ALIGN.RIGHT_MID, -layout.x(20), 0);
        inputBox.bgColor(0xf5f5f5);
        inputBox.bgOpa(100);
        inputBox.radius(layout.x(12));
        inputBox.borderWidth(layout.x(2));
        inputBox.setBorderColor(0xdcdcdc);
        inputBox.scroll(false);

        const input = dxui.Textarea.build(this.name + '_input_' + fieldKey, inputBox);
        layout.clearStyle(input);
        input.setSize(layout.x(360), layout.y(48));
        input.align(dxui.Utils.ALIGN.CENTER, 0, 0);
        input.bgOpa(0);
        input.padAll(0);
        input.borderWidth(0);
        input.setOneLine(true);
        input.setMaxLength(128);
        input.setCursorClickPos(true);
        input.textFont(font.get(layout.fontSize(26)));
        input.textColor(theme.textPrimary);
        input.setAlign(dxui.Utils.TEXT_ALIGN.LEFT);
        input.text('');

        const kb = keyboard.bind(null, input, {
            mode: opts.mode === undefined ? keyboard.MODE.ENGLISH : opts.mode,
            lockMode: opts.lockMode,
            placeholder: t('system.inputPlaceholder'),
        });
        this._kbApis.push({ key: fieldKey, kb: kb, input: input, inputBox: inputBox });
        return input;
    }

    /**
     * @param {string} fieldKey
     * @param {function(): void} [onChange]
     * @returns {object}
     */
    _buildSwitchRow(fieldKey, onChange) {
        const row = dxui.View.build(this.name + '_sw_row_' + fieldKey, this._listContent);
        layout.clearStyle(row);
        row.setSize(this._listW, this._rowH);
        row.scroll(false);
        styleSettingRow(row);
        this._registerListRow(fieldKey, row);

        const label = dxui.Label.build(this.name + '_sw_lbl_' + fieldKey, row);
        label.setSize(layout.x(520), layout.y(40));
        label.align(dxui.Utils.ALIGN.LEFT_MID, layout.x(24), 0);
        label.textFont(font.get(layout.fontSize(26)));
        label.textColor(theme.textPrimary);
        label.textAlign(dxui.Utils.TEXT_ALIGN.LEFT);
        this._switchLabels.push({ key: fieldKey, label: label });

        const sw = dxui.Switch.build(this.name + '_sw_' + fieldKey, row);
        sw.setSize(layout.x(88), layout.y(48));
        sw.align(dxui.Utils.ALIGN.RIGHT_MID, -layout.x(28), 0);
        sw.select(false);
        sw.on(dxui.Utils.EVENT.VALUE_CHANGED, function () {
            if (typeof onChange === 'function') {
                onChange();
            }
        });
        return sw;
    }

    _buildPickerDialog() {
        const self = this;
        const listH = layout.y(PICKER_ROW_H) * PICKER_VISIBLE + layout.y(16);
        const cardH = layout.y(120) + listH + layout.y(100);

        this._pickerMask = dxui.View.build(this.name + '_picker_mask', this.root);
        this._pickerMask.setSize(layout.width, layout.height);
        this._pickerMask.bgColor(0x000000);
        this._pickerMask.bgOpa(theme.maskOpa);
        this._pickerMask.radius(0);
        this._pickerMask.borderWidth(0);
        this._pickerMask.padAll(0);
        layout.disableScroll(this._pickerMask);
        this._pickerMask.clickable(true);
        this._pickerMask.hide();

        const card = dxui.View.build(this.name + '_picker_card', this._pickerMask);
        card.setSize(layout.x(680), cardH);
        card.align(dxui.Utils.ALIGN.CENTER, 0, 0);
        card.bgColor(theme.pageBg);
        card.bgOpa(100);
        card.radius(layout.x(20));
        card.borderWidth(0);
        card.padAll(0);
        layout.disableScroll(card);
        card.clickable(true);

        this._pickerTitleLbl = dxui.Label.build(this.name + '_picker_title', card);
        this._pickerTitleLbl.setSize(layout.x(620), layout.y(48));
        this._pickerTitleLbl.setPos(layout.x(28), layout.y(24));
        this._pickerTitleLbl.textFont(font.get(layout.fontSize(28), dxui.Utils.FONT_STYLE.BOLD));
        this._pickerTitleLbl.textColor(theme.textPrimary);
        this._pickerTitleLbl.textAlign(dxui.Utils.TEXT_ALIGN.LEFT);

        this._pickerList = dxui.View.build(this.name + '_picker_list', card);
        layout.clearStyle(this._pickerList);
        this._pickerList.setSize(layout.x(624), listH);
        this._pickerList.setPos(layout.x(28), layout.y(96));
        this._pickerList.bgColor(0xf5f5f5);
        this._pickerList.bgOpa(100);
        this._pickerList.radius(layout.x(14));
        this._pickerList.scroll(true);
        this._pickerList.flexFlow(dxui.Utils.FLEX_FLOW.COLUMN);
        this._pickerList.flexAlign(
            dxui.Utils.FLEX_ALIGN.START,
            dxui.Utils.FLEX_ALIGN.CENTER,
            dxui.Utils.FLEX_ALIGN.CENTER
        );
        this._pickerList.padTop(layout.y(8));
        this._pickerList.padBottom(layout.y(8));
        this._pickerList.obj.lvObjSetStylePadGap(
            layout.y(8),
            dxui.Utils.ENUM._LV_STYLE_STATE_CMP_SAME
        );

        this._pickerSlots = [];
        for (let i = 0; i < 20; i++) {
            this._pickerSlots.push(this._createPickerSlot(i));
        }

        const closeBtn = dxui.Button.build(this.name + '_picker_close', card);
        closeBtn.setSize(layout.x(320), layout.y(70));
        closeBtn.align(dxui.Utils.ALIGN.BOTTOM_MID, 0, -layout.y(20));
        closeBtn.bgColor(0xeeeeee);
        closeBtn.radius(layout.x(12));
        closeBtn.borderWidth(0);
        closeBtn.on(dxui.Utils.EVENT.CLICK, function () {
            self._hidePicker();
        });
        this._pickerCloseLbl = dxui.Label.build(this.name + '_picker_close_lbl', closeBtn);
        this._pickerCloseLbl.textFont(font.get(layout.fontSize(26)));
        this._pickerCloseLbl.textColor(0x555555);
        this._pickerCloseLbl.align(dxui.Utils.ALIGN.CENTER, 0, 0);
    }

    /**
     * @param {number} index
     * @returns {{ row: object, label: object, id: string }}
     */
    _createPickerSlot(index) {
        const self = this;
        const row = dxui.View.build(this.name + '_picker_row_' + index, this._pickerList);
        layout.clearStyle(row);
        row.setSize(layout.x(592), layout.y(PICKER_ROW_H - 8));
        row.bgColor(theme.pageBg);
        row.bgOpa(100);
        row.radius(layout.x(10));
        row.clickable(true);
        row.hide();
        row.on(dxui.Utils.EVENT.CLICK, function () {
            const slot = self._pickerSlots[index];
            if (!slot || !slot.id) {
                return;
            }
            const id = slot.id;
            const cb = self._pickerOnSelect;
            self._hidePicker();
            if (typeof cb === 'function') {
                cb(id);
            }
        });

        const label = dxui.Label.build(this.name + '_picker_lbl_' + index, row);
        label.setSize(layout.x(560), layout.y(40));
        label.align(dxui.Utils.ALIGN.LEFT_MID, layout.x(16), 0);
        label.textFont(font.get(layout.fontSize(26)));
        label.textColor(theme.textPrimary);
        label.textAlign(dxui.Utils.TEXT_ALIGN.LEFT);
        return { row: row, label: label, id: '' };
    }

    /**
     * @param {string} title
     * @param {{ id: string, text: string, locale?: string }[]} options
     * @param {string} selectedId
     * @param {function(string): void} onSelect
     */
    _showPicker(title, options, selectedId, onSelect) {
        if (!this._pickerMask) {
            return;
        }
        keyboard.hideAll();
        this._pickerOnSelect = onSelect;
        this._pickerSelectedId = selectedId || '';
        if (this._pickerTitleLbl) {
            this._pickerTitleLbl.text(title);
        }
        if (this._pickerCloseLbl) {
            this._pickerCloseLbl.text(t('system.picker.close'));
        }

        const pickerFontSize = layout.fontSize(26);

        while (this._pickerSlots.length < options.length) {
            this._pickerSlots.push(this._createPickerSlot(this._pickerSlots.length));
        }

        for (let i = 0; i < this._pickerSlots.length; i++) {
            const slot = this._pickerSlots[i];
            const opt = options[i];
            if (!opt) {
                slot.id = '';
                slot.row.hide();
                continue;
            }
            slot.id = opt.id;
            slot.label.text(opt.text);
            if (opt.locale) {
                slot.label.textFont(font.getForLocale(opt.locale, pickerFontSize));
            } else {
                slot.label.textFont(font.get(pickerFontSize));
            }
            if (opt.id === this._pickerSelectedId) {
                slot.row.bgColor(0xe8f0ff);
                slot.label.textColor(theme.accent);
            } else {
                slot.row.bgColor(theme.pageBg);
                slot.label.textColor(theme.textPrimary);
            }
            slot.row.show();
        }

        this._pickerMask.show();
        this._pickerMask.moveForeground();
    }

    _hidePicker() {
        this._pickerOnSelect = null;
        this._pickerSelectedId = '';
        if (this._pickerMask) {
            this._pickerMask.hide();
        }
    }

    /**
     * @param {'screenOff'|'screensaver'} field
     */
    _openTimeoutPicker(field) {
        const self = this;
        const options = [];
        for (let i = 0; i < TIMEOUT_OPTIONS.length; i++) {
            const v = TIMEOUT_OPTIONS[i];
            options.push({ id: String(v), text: this._formatTimeout(v) });
        }
        const current = field === 'screenOff' ? this._screenOff : this._screensaver;
        this._showPicker(
            t('system.field.' + field),
            options,
            String(current),
            function (id) {
                const n = Number(id);
                if (field === 'screenOff') {
                    self._screenOff = n;
                } else {
                    self._screensaver = n;
                }
                self._refreshTimeoutLabels();
            }
        );
    }

    _openWhiteLightModePicker() {
        const self = this;
        const options = [0, 1, 2].map(function (mode) {
            return { id: String(mode), text: self._formatWhiteLightMode(mode) };
        });
        this._showPicker(
            t('system.field.whiteLightMode'),
            options,
            String(this._whiteLightMode),
            function (id) {
                self._whiteLightMode = Number(id);
                self._refreshWhiteLightModeLabel();
            }
        );
    }

    _openCardIdentityPicker() {
        const self = this;
        const options = [
            { id: '1', text: t('system.cardIdentity.physical') },
            { id: '3', text: t('system.cardIdentity.idCard') },
        ];
        this._showPicker(
            t('system.field.cardIdentity'),
            options,
            String(this._cardIdentity),
            function (id) {
                self._cardIdentity = Number(id) === 3 ? 3 : 1;
                self._refreshCardIdentityLabel();
            }
        );
    }

    _openTzRegionPicker() {
        const self = this;
        const options = [];
        for (let i = 0; i < TZ_REGIONS.length; i++) {
            const region = TZ_REGIONS[i];
            options.push({
                id: region,
                text: t('system.tz.region.' + region),
            });
        }
        this._showPicker(
            t('system.field.tzRegion'),
            options,
            this._tzRegion,
            function (id) {
                if (id === self._tzRegion) {
                    return;
                }
                self._tzRegion = id;
                const list = TZ_BY_REGION[id] || [];
                if (list.length) {
                    self._timeZone = list[0];
                }
                self._refreshTzLabels();
            }
        );
    }

    _openTzCityPicker() {
        const self = this;
        const list = TZ_BY_REGION[this._tzRegion] || [];
        const options = [];
        for (let i = 0; i < list.length; i++) {
            options.push({ id: list[i], text: list[i] });
        }
        this._showPicker(
            t('system.field.tzCity'),
            options,
            this._timeZone,
            function (id) {
                self._timeZone = id;
                self._refreshTzLabels();
            }
        );
    }

    /**
     * @param {number} minutes
     * @returns {string}
     */
    _formatTimeout(minutes) {
        if (!minutes) {
            return t('system.timeout.never');
        }
        return t('system.timeout.minutes', { n: minutes });
    }
    _formatWhiteLightMode(mode) {
        if (Number(mode) === 1) return t('system.whiteLightMode.on');
        if (Number(mode) === 2) return t('system.whiteLightMode.off');
        return t('system.whiteLightMode.auto');
    }

    _refreshCardIdentityLabel() {
        if (!this._cardIdentityValueLbl) return;
        this._cardIdentityValueLbl.text(t(this._cardIdentity === 3
            ? 'system.cardIdentity.idCard' : 'system.cardIdentity.physical'));
    }

    async _loadFromStore() {
        const cfg = await systemStore.load();
        if (this._sectionId === 'display') {
            this._setSlider(this._brightnessSlider, 'brightness', cfg.brightness, '%');
            this._screenOff = cfg.screenOff;
            this._screensaver = cfg.screensaver;
            this._setSwitch(this._showIpSw, cfg.showIp);
            this._setSwitch(this._showSnSw, cfg.showSn);
        } else if (this._sectionId === 'language') {
            const status = await systemStore.getProductStatus();
            this._region = status && status.region === 'INTL' ? 'INTL' : 'CN';
            this._language = this._region === 'CN' ? 'zh' : cfg.language;
        } else if (this._sectionId === 'accessDisplay') {
            const fields = Array.isArray(cfg.accessDisplayFields) ? cfg.accessDisplayFields : [];
            this._setSwitch(this._showAccessNameSw, fields.indexOf('name') >= 0);
            this._setSwitch(this._showAccessDepartmentSw, fields.indexOf('department') >= 0);
            this._setSwitch(this._showAccessEmployeeNoSw, fields.indexOf('employeeNo') >= 0);
        } else if (this._sectionId === 'light') {
            this._setSlider(this._whiteLightSlider, 'whiteLight', cfg.whiteLight, '%');
            this._setSlider(this._nirLightSlider, 'nirLight', cfg.nirLight, '%');
            this._whiteLightMode = cfg.whiteLightMode;
            this._refreshWhiteLightModeLabel();
        } else if (this._sectionId === 'face') {
            this._setSlider(this._similaritySlider, 'similarity', cfg.similarity, '%');
            this._setSlider(this._livenessValSlider, 'livenessVal', cfg.livenessVal, '');
            this._setSwitch(this._livenessSw, cfg.liveness);
            // 关闭重检不增加协议字段，而是按产品约定写入100秒。
            const recheckEnabled = Number(cfg.recheck) < 100;
            this._setSwitch(this._recheckEnabledSw, recheckEnabled);
            this._setSlider(this._recheckSlider, 'recheck', recheckEnabled ? cfg.recheck : this._recheckDefaultSeconds, 's');
            this._setSlider(this._recognitionTimeoutSlider, 'recognitionTimeout', cfg.recognitionTimeout, 's');
            this._refreshRecheckVisible();
        } else if (this._sectionId === 'card') {
            this._setSwitch(this._cardVerifySw, cfg.cardVerify);
            this._cardIdentity = cfg.cardIdentity;
            this._refreshCardIdentityLabel();
        } else if (this._sectionId === 'passwordOpen') {
            this._setSwitch(this._passwordOpenSw, cfg.passwordOpen);
            this._passwordLength = cfg.passwordLength;
            this._refreshSegmentStyles(this._passwordLengthButtons, String(this._passwordLength));
        } else if (this._sectionId === 'loginPassword') {
            this._setInput(this._oldPwdInput, '');
            this._setInput(this._newPwdInput, '');
            this._setInput(this._confirmPwdInput, '');
        } else if (this._sectionId === 'systemTime') {
            this._timeZone = cfg.timeZone || 'Asia/Shanghai';
            this._tzRegion = regionOfTimeZone(this._timeZone) || 'asia';
            this._setInput(this._ntpInput, cfg.ntpServer || '');
            const current = await systemStore.getSystemTime();
            this._loadedManualTime = String(current && current.value || '');
            const parts = this._loadedManualTime.split(' ');
            this._setInput(this._manualDateInput, parts[0] || '');
            this._setInput(this._manualTimeInput, parts[1] || '');
        }
    }

    /**
     * @param {object|null} slider
     * @param {string} fieldKey
     * @param {number} value
     * @param {string} suffix
     */
    _setSlider(slider, fieldKey, value, suffix) {
        if (!slider) {
            return;
        }
        const n = Number(value);
        slider.value(Number.isFinite(n) ? n : 0, false);
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
     * @param {object|null} sw
     * @param {boolean} on
     */
    _setSwitch(sw, on) {
        if (!sw) {
            return;
        }
        sw.select(!!on);
    }

    /**
     * @param {object|null} sw
     * @returns {boolean}
     */
    _readSwitch(sw) {
        if (!sw) {
            return false;
        }
        try {
            return !!sw.isSelect();
        } catch (_e) {
            return false;
        }
    }

    _refreshLivenessValVisible() {
        const on = this._readSwitch(this._livenessSw);
        this._setRowActive('livenessVal', on);
        if (this._pager) {
            this._pager.apply();
        }
    }

    _refreshRecheckVisible() {
        if (!this._recheckRow) return;
        const on = this._readSwitch(this._recheckEnabledSw);
        this._setRowActive('recheck', on);
        if (!on) {
            // 再次开启时从清晰的默认值开始，不沿用“关闭”语义的100秒。
            this._setSlider(this._recheckSlider, 'recheck', this._recheckDefaultSeconds, 's');
        }
        if (this._pager) {
            this._pager.apply();
        }
    }

    _refreshTimeoutLabels() {
        if (this._screenOffValueLbl) {
            this._screenOffValueLbl.text(this._formatTimeout(this._screenOff));
        }
        if (this._screensaverValueLbl) {
            this._screensaverValueLbl.text(this._formatTimeout(this._screensaver));
        }
    }

    _refreshTzLabels() {
        if (this._tzRegionValueLbl) {
            this._tzRegionValueLbl.text(t('system.tz.region.' + this._tzRegion));
        }
        if (this._tzCityValueLbl) {
            this._tzCityValueLbl.text(this._timeZone || '-');
        }
    }

    _refreshWhiteLightModeLabel() {
        if (this._whiteLightModeValueLbl) {
            this._whiteLightModeValueLbl.text(this._formatWhiteLightMode(this._whiteLightMode));
        }
    }

    _refreshLanguageLabel() {
        if (!this._languageValueLbl) return;
        this._languageValueLbl.text(t('system.lang.' + this._language, this._language));
        this._languageValueLbl.textFont(font.getForLocale(this._language, layout.fontSize(24)));
    }

    _applyLanguageRegion() {
        if (this._region === 'CN') {
            this._language = 'zh';
        }
        if (this._languagePickerRow) {
            this._languagePickerRow.clickable(this._region === 'INTL');
        }
        this._refreshLanguageLabel();
    }

    _openLanguagePicker() {
        const self = this;
        const locales = getAvailableLocales('INTL');
        const options = [];
        for (let i = 0; i < locales.length; i++) {
            const locale = locales[i];
            options.push({
                id: locale,
                text: t('system.lang.' + locale, locale),
                locale: locale,
            });
        }
        this._showPicker(
            t('system.field.language'),
            options,
            this._language,
            function (id) {
                self._language = id;
                self._refreshLanguageLabel();
            }
        );
    }

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

    _refreshLabels() {
        for (let c = 0; c < this._captions.length; c++) {
            const cap = this._captions[c];
            cap.label.text(t('system.caption.' + cap.key));
        }
        for (let j = 0; j < this._fieldLabels.length; j++) {
            const item = this._fieldLabels[j];
            item.label.text(t('system.field.' + item.key));
        }
        for (let k = 0; k < this._switchLabels.length; k++) {
            const item = this._switchLabels[k];
            item.label.text(t('system.field.' + item.key));
        }
        for (let s = 0; s < this._sliderLabels.length; s++) {
            const item = this._sliderLabels[s];
            item.label.text(t('system.field.' + item.key));
        }
        for (let p = 0; p < this._pickerLabels.length; p++) {
            const item = this._pickerLabels[p];
            item.titleLbl.text(t('system.field.' + item.key));
        }
        for (let l = 0; l < this._linkLabels.length; l++) {
            const item = this._linkLabels[l];
            item.label.text(t('system.field.' + item.key));
        }

        if (this._sectionId === 'language') {
            this._refreshLanguageLabel();
        }
        const passwordLengthIds = Object.keys(this._passwordLengthButtons);
        for (let b = 0; b < passwordLengthIds.length; b++) {
            const entry = this._passwordLengthButtons[passwordLengthIds[b]];
            entry.label.text(t(entry.labelKey));
        }
        for (let n = 0; n < this._kbApis.length; n++) {
            this._kbApis[n].kb.setPlaceholder(t('system.inputPlaceholder'));
        }
        if (this._saveLbl) {
            this._saveLbl.text(t('system.save'));
        }
        if (this._pickerCloseLbl) {
            this._pickerCloseLbl.text(t('system.picker.close'));
        }
        if (this._sectionId === 'display') {
            this._refreshTimeoutLabels();
        }
        if (this._sectionId === 'systemTime') {
            this._refreshTzLabels();
        }
    }

    /**
     * @returns {object}
     */
    _collectPatch() {
        if (this._sectionId === 'display') {
            return {
                brightness: this._readSlider(this._brightnessSlider),
                screenOff: this._screenOff,
                screensaver: this._screensaver,
                showIp: this._readSwitch(this._showIpSw),
                showSn: this._readSwitch(this._showSnSw),
            };
        }
        if (this._sectionId === 'language') {
            return { language: this._region === 'CN' ? 'zh' : this._language };
        }
        if (this._sectionId === 'accessDisplay') {
            const accessDisplayFields = [];
            if (this._readSwitch(this._showAccessNameSw)) accessDisplayFields.push('name');
            if (this._readSwitch(this._showAccessDepartmentSw)) accessDisplayFields.push('department');
            if (this._readSwitch(this._showAccessEmployeeNoSw)) accessDisplayFields.push('employeeNo');
            return { accessDisplayFields: accessDisplayFields };
        }
        if (this._sectionId === 'light') {
            const patch = {};
            if (this._whiteLightSlider) {
                patch.whiteLight = this._readSlider(this._whiteLightSlider);
                patch.whiteLightMode = this._whiteLightMode;
            }
            if (this._nirLightSlider) {
                patch.nirLight = this._readSlider(this._nirLightSlider);
            }
            return patch;
        }
        if (this._sectionId === 'face') {
            return {
                similarity: this._readSlider(this._similaritySlider),
                liveness: this._readSwitch(this._livenessSw),
                livenessVal: this._readSlider(this._livenessValSlider),
                recheck: this._readSwitch(this._recheckEnabledSw) ? this._readSlider(this._recheckSlider) : 100,
                recognitionTimeout: this._readSlider(this._recognitionTimeoutSlider),
            };
        }
        if (this._sectionId === 'card') {
            return {
                cardVerify: this._readSwitch(this._cardVerifySw),
                cardIdentity: this._cardIdentity,
            };
        }
        if (this._sectionId === 'passwordOpen') {
            return {
                passwordOpen: this._readSwitch(this._passwordOpenSw),
                passwordLength: this._passwordLength,
            };
        }
        if (this._sectionId === 'loginPassword') {
            return {
                oldPassword: this._readInput(this._oldPwdInput),
                newPassword: this._readInput(this._newPwdInput),
                confirmPassword: this._readInput(this._confirmPwdInput),
                _changePassword: true,
            };
        }
        if (this._sectionId === 'systemTime') {
            return {
                ntpServer: this._readInput(this._ntpInput),
                timeZone: this._timeZone,
            };
        }
        return {};
    }

    async _onSave() {
        keyboard.hideAll();
        const patch = this._collectPatch();
        if (this._sectionId === 'systemTime') {
            const manualTime = this._readInput(this._manualDateInput).trim()
                + ' ' + this._readInput(this._manualTimeInput).trim();
            if (manualTime !== this._loadedManualTime) {
                const timeResult = await systemStore.setSystemTime(manualTime);
                if (!timeResult.ok) {
                    popup.showError(timeResult.message || t('system.error.manualTime'));
                    return;
                }
                this._loadedManualTime = timeResult.data.value;
            }
        }
        const result = await systemStore.save(patch);
        if (!result.ok) {
            if (result.error === 'pending') {
                popup.showError(result.message || '功能待接入');
                return;
            }
            const errKey = 'system.error.' + (result.error || 'required');
            const msg = t(errKey);
            // Service错误优先展示后端校验原因，避免全部退化成“请填写完整参数”。
            popup.showError(result.message || (msg === errKey ? t('system.saveRequired') : msg));
            return;
        }

        if (this._sectionId === 'language' && patch.language) {
            setLocale(patch.language);
        }

        if (this._sectionId === 'loginPassword') {
            this._setInput(this._oldPwdInput, '');
            this._setInput(this._newPwdInput, '');
            this._setInput(this._confirmPwdInput, '');
        }
        if (result.restartRequired) {
            // UI由用户决定立即重启；选择稍后时配置已保存，下次重启后生效。
            restartRequired.show({
                onCancel: function () {
                    popup.showSuccess(t('system.saveSuccess'));
                },
            });
            return;
        }
        popup.showSuccess(t('system.saveSuccess'));
    }
}

/**
 * 注册各大类子页实例。
 * @returns {SystemSectionPage[]}
 */
export function createSystemSectionPages() {
    const items = [
        ['settings_system_display', 'display', 'system.section.display'],
        ['settings_system_language', 'language', 'system.section.language'],
        ['settings_system_accessDisplay', 'accessDisplay', 'system.section.accessDisplay'],
        ['settings_system_face', 'face', 'system.section.face'],
        ['settings_system_card', 'card', 'system.section.card'],
        ['settings_system_light', 'light', 'system.section.light'],
        ['settings_system_passwordOpen', 'passwordOpen', 'system.section.passwordOpen'],
        ['settings_system_loginPassword', 'loginPassword', 'system.section.loginPassword'],
        ['settings_system_systemTime', 'systemTime', 'system.section.systemTime'],
    ];
    const pages = [];
    for (let i = 0; i < items.length; i++) {
        const item = items[i];
        pages.push(new SystemSectionPage(item[0], item[1], item[2]));
    }
    return pages;
}
