/**
 * @layer    view
 * @module   door_page
 * @fires    none
 * @listens  none
 * @depends  dxUi,BaseView,font,layout,theme,page_header,keyboard,i18n,popup,restart_required,door_store
 *
 * 门禁管理：开门继电器延时、防拆/火警开关、MQTT 连接与在线验证。
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
import restartRequired from '../../components/restart_required.js';
import { t } from '../../i18n/index.js';
import { asset } from '../../utils/assets.js';
import doorStore from '../../pages/door/door_store.js';
import capabilityStore from '../../core/capability_store.js';
import { CONTENT_W } from '../ls_metrics.js';
import {
    SETTING_PAGE_SIZE,
    settingPageRowH,
    attachSettingPager,
    styleSettingRow,
    buildTopSaveButton,
} from '../../components/setting_pager.js';

const IMG_ARROW = asset('keyboard-arrow-right.png');
const IMG_DROPDOWN = asset('down.png');
// 当前产品只开放 mqtt://，后续扩展 mqtts:// 时只需增加选项。
const MQTT_SCHEME_OPTIONS = ['mqtt://'];
const VERIFY_MODE_OPTIONS = ['door.option.verifySingle', 'door.option.verifyMultiFace',
    'door.option.verifyMultiFactor', 'door.option.verifyDualPerson'];

function buildFactorCatalog() {
    const values = ['face'];
    const options = ['door.option.face'];
    if (capabilityStore.hasNfc()) {
        values.push('card');
        options.push('door.option.card');
    }
    if (capabilityStore.hasScanner()) {
        values.push('code');
        options.push('door.option.code');
    }
    values.push('password');
    options.push('door.option.password');
    if (capabilityStore.hasFinger()) {
        values.push('finger');
        options.push('door.option.finger');
    }
    return { values: values, options: options };
}

export default class DoorPage extends BaseView {
    constructor(options) {
        const opts = options || {};
        const mode = opts.mode || 'accessControl';
        const routes = {
            accessControl: 'settings_access_control',
            verifyPolicy: 'settings_verify_policy',
            recordPolicy: 'settings_record_policy',
            mqtt: 'settings_mqtt',
            mqttAdvanced: 'settings_mqtt_advanced',
        };
        const titles = {
            accessControl: 'door.menu.accessControl',
            verifyPolicy: 'door.menu.verifyPolicy',
            recordPolicy: 'door.menu.recordPolicy',
            mqtt: 'connection.section.mqtt',
            mqttAdvanced: 'connection.section.mqttAdvanced',
        };
        super(routes[mode] || routes.accessControl);
        this._mode = routes[mode] ? mode : 'accessControl';
        this._titleKey = titles[this._mode];
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
        /** @type {object[]} */
        this._fieldLabels = [];
        this._switchLabels = [];
        this._infoLabels = [];
        this._sectionTitles = [];
        this._kbApis = [];
        this._fieldRows = {};
        this._relayInput = null;
        this._verifyModeDropdown = null;
        this._factor1Dropdown = null;
        this._factor2Dropdown = null;
        this._verifyTimeoutInput = null;
        this._mqttSchemeDropdown = null;
        this._mqttHostInput = null;
        this._mqttPortInput = null;
        this._mqttUserInput = null;
        this._mqttPwdInput = null;
        this._timeoutInput = null;
        this._tamperSw = null;
        this._fireSw = null;
        this._faceImageRetentionSw = null;
        this._uploadToCloudSw = null;
        this._uploadFaceScoresSw = null;
        this._deleteAfterUploadSw = null;
        this._strangerImageSw = null;
        this._onlineSw = null;
        this._timeoutKb = null;
        this._timeoutRow = null;
        this._mqttStatusLbl = null;
        this._clientIdLbl = null;
        this._qosInput = null;
        this._prefixInput = null;
        this._willTopicInput = null;
        this._heartbeatInput = null;
        this._cleanSessionSw = null;
        this._clientIdSuffixSw = null;
        this._heartbeatSw = null;
        this._heartbeatRow = null;
        this._heartbeatKb = null;
        this._lastFactors = ['face', 'card'];
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
    }

    onEnter() {
        if (this._header) {
            this._header.refresh();
        }
        const self = this;
        this._loadFromStore().then(function () {
            self._refreshOnlineTimeoutVisible();
            self._refreshHeartbeatVisible();
            if (self._pager) {
                self._pager.apply();
            }
        }).catch(function (error) {
            popup.showError(error && error.message ? error.message : t('door.saveRequired'));
        });
        this._refreshLabels();
        if (this._pager) {
            this._pager.apply();
        }
    }

    onExit() {
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

        this._listContent = dxui.View.build(this.name + '_list', this._content);
        layout.clearStyle(this._listContent);
        this._listContent.setSize(this._listW, this._rowH * SETTING_PAGE_SIZE);
        this._listContent.setPos(listX, 0);
        this._listContent.bgOpa(0);
        this._listContent.scroll(false);

        this._fieldLabels = [];
        this._switchLabels = [];
        this._infoLabels = [];
        this._sectionTitles = [];
        this._kbApis = [];
        this._fieldRows = {};
        this._listRows = [];

        if (this._mode === 'accessControl') {
            this._relayInput = this._buildTextRow('relayTime', { mode: keyboard.MODE.NUMBER, lockMode: keyboard.MODE.NUMBER });
            if (capabilityStore.hasTamper()) {
                this._tamperSw = this._buildSwitchRow('tamper');
            }
            this._fireSw = this._buildSwitchRow('fire');
            this._buildLinkRow('schedule', function () { router.navigate('settings_door_schedule'); });
        } else if (this._mode === 'verifyPolicy') {
            const factors = buildFactorCatalog();
            this._factorValues = factors.values;
            this._factorOptionKeys = factors.options;
            this._verifyModeDropdown = this._buildDropdownRow('verifyMode', VERIFY_MODE_OPTIONS.map(t));
            this._verifyModeDropdown.on(dxui.Utils.EVENT.VALUE_CHANGED, function () { self._refreshVerifyMode(); });
            this._factor1Dropdown = this._buildDropdownRow('factor1', this._factorOptionKeys.map(t));
            this._factor2Dropdown = this._buildDropdownRow('factor2', this._factorOptionKeys.map(t));
            this._factor1Dropdown.on(dxui.Utils.EVENT.VALUE_CHANGED, function () { self._onFactorChanged(0); });
            this._factor2Dropdown.on(dxui.Utils.EVENT.VALUE_CHANGED, function () { self._onFactorChanged(1); });
            this._verifyTimeoutInput = this._buildTextRow('verifyTimeout', { mode: keyboard.MODE.NUMBER, lockMode: keyboard.MODE.NUMBER });
            this._onlineSw = this._buildSwitchRow('onlineCheck', function () { self._refreshOnlineTimeoutVisible(); });
            this._timeoutInput = this._buildTextRow('onlineTimeout', { mode: keyboard.MODE.NUMBER, lockMode: keyboard.MODE.NUMBER });
            this._timeoutRow = this._fieldRows.onlineTimeout;
            const timeoutKbItem = this._kbApis[this._kbApis.length - 1];
            this._timeoutKb = timeoutKbItem ? timeoutKbItem.kb : null;
            this._refreshVerifyMode();
        } else if (this._mode === 'recordPolicy') {
            this._faceImageRetentionSw = this._buildSwitchRow('faceImageRetention');
            this._uploadToCloudSw = this._buildSwitchRow('uploadToCloud');
            this._uploadFaceScoresSw = this._buildSwitchRow('uploadFaceScores');
            this._deleteAfterUploadSw = this._buildSwitchRow('deleteRecordAfterUpload');
            this._strangerImageSw = this._buildSwitchRow('strangerImage');
        } else if (this._mode === 'mqtt') {
            this._buildSectionTitle('mqtt');
            this._mqttStatusLbl = this._buildInfoRow('mqttStatus');
            this._clientIdLbl = this._buildInfoRow('clientId');
            this._mqttSchemeDropdown = this._buildDropdownRow('mqttScheme', MQTT_SCHEME_OPTIONS);
            this._mqttHostInput = this._buildTextRow('mqttHost', { mode: keyboard.MODE.ENGLISH });
            this._mqttPortInput = this._buildTextRow('mqttPort', { mode: keyboard.MODE.NUMBER, lockMode: keyboard.MODE.NUMBER });
            this._mqttUserInput = this._buildTextRow('mqttUsername', { mode: keyboard.MODE.ENGLISH });
            this._mqttPwdInput = this._buildTextRow('mqttPassword', { mode: keyboard.MODE.ENGLISH });
            this._buildLinkRow('advanced', function () { router.navigate('settings_mqtt_advanced'); });
        } else {
            this._buildSectionTitle('mqttAdvanced');
            this._qosInput = this._buildTextRow('qos', { mode: keyboard.MODE.NUMBER, lockMode: keyboard.MODE.NUMBER });
            this._prefixInput = this._buildTextRow('topicPrefix', { mode: keyboard.MODE.ENGLISH });
            this._willTopicInput = this._buildTextRow('willTopic', { mode: keyboard.MODE.ENGLISH });
            this._cleanSessionSw = this._buildSwitchRow('cleanSession');
            this._clientIdSuffixSw = this._buildSwitchRow('clientIdSuffix');
            this._heartbeatSw = this._buildSwitchRow('heartbeatEnabled', function () {
                self._refreshHeartbeatVisible();
            });
            this._heartbeatInput = this._buildTextRow('heartbeatInterval', { mode: keyboard.MODE.NUMBER, lockMode: keyboard.MODE.NUMBER });
            this._heartbeatRow = this._fieldRows.heartbeatInterval;
            const heartbeatKbItem = this._kbApis[this._kbApis.length - 1];
            this._heartbeatKb = heartbeatKbItem ? heartbeatKbItem.kb : null;
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

    /**
     * @param {string} key
     */
    _buildSectionTitle(key) {
        const box = dxui.View.build(this.name + '_sec_' + key, this._listContent);
        layout.clearStyle(box);
        box.setSize(this._listW, this._rowH);
        box.bgOpa(0);
        box.scroll(false);
        this._registerListRow('sec_' + key, box);

        const label = dxui.Label.build(this.name + '_sec_lbl_' + key, box);
        label.setSize(layout.x(CONTENT_W), layout.y(40));
        label.align(dxui.Utils.ALIGN.LEFT_MID, 0, 0);
        label.textFont(font.get(layout.fontSize(24), dxui.Utils.FONT_STYLE.BOLD));
        label.textColor(theme.textPrimary);
        label.textAlign(dxui.Utils.TEXT_ALIGN.LEFT);
        this._sectionTitles.push({ key: key, label: label });
    }

    /** 构建只读状态行，避免把运行状态伪装成可编辑配置。 */
    _buildInfoRow(fieldKey) {
        const row = dxui.View.build(this.name + '_info_row_' + fieldKey, this._listContent);
        layout.clearStyle(row);
        row.setSize(this._listW, this._rowH);
        row.scroll(false);
        styleSettingRow(row);
        this._registerListRow(fieldKey, row);

        const label = dxui.Label.build(this.name + '_info_lbl_' + fieldKey, row);
        label.setSize(layout.x(260), layout.y(40));
        label.align(dxui.Utils.ALIGN.LEFT_MID, layout.x(24), 0);
        label.textFont(font.get(layout.fontSize(26)));
        label.textColor(theme.textPrimary);
        label.textAlign(dxui.Utils.TEXT_ALIGN.LEFT);

        const value = dxui.Label.build(this.name + '_info_val_' + fieldKey, row);
        value.setSize(layout.x(400), layout.y(48));
        value.align(dxui.Utils.ALIGN.RIGHT_MID, -layout.x(24), 0);
        value.textFont(font.get(layout.fontSize(24)));
        value.textColor(theme.textSecondary);
        value.textAlign(dxui.Utils.TEXT_ALIGN.RIGHT);
        value.longMode(dxui.Utils.LABEL_LONG_MODE.SCROLL_CIRCULAR);
        value.text('-');

        this._infoLabels.push({ key: fieldKey, label: label });
        return value;
    }

    /** 构建枚举下拉行，协议值不允许自由输入。 */
    _buildDropdownRow(fieldKey, options) {
        const row = dxui.View.build(this.name + '_dropdown_row_' + fieldKey, this._listContent);
        layout.clearStyle(row);
        row.setSize(this._listW, this._rowH);
        row.scroll(false);
        styleSettingRow(row);
        this._registerListRow(fieldKey, row);

        const label = dxui.Label.build(this.name + '_dropdown_lbl_' + fieldKey, row);
        label.setSize(layout.x(260), layout.y(40));
        label.align(dxui.Utils.ALIGN.LEFT_MID, layout.x(24), 0);
        label.textFont(font.get(layout.fontSize(26)));
        label.textColor(theme.textPrimary);
        label.textAlign(dxui.Utils.TEXT_ALIGN.LEFT);
        this._fieldLabels.push({ key: fieldKey, label: label });

        const dropdown = dxui.Dropdown.build(this.name + '_dropdown_' + fieldKey, row);
        dropdown.setSize(layout.x(400), layout.y(64));
        dropdown.align(dxui.Utils.ALIGN.RIGHT_MID, -layout.x(20), 0);
        dropdown.setOptions(options);
        dropdown.setSelected(0);
        // 默认符号依赖字体字形，当前字体会显示方块；显式使用图片资源。
        dropdown.setSymbol(IMG_DROPDOWN);
        dropdown.textFont(font.get(layout.fontSize(26)));
        dropdown.getList().textFont(font.get(layout.fontSize(26)));
        dropdown.bgColor(0xf5f5f5);
        dropdown.bgOpa(100);
        dropdown.radius(layout.x(12));
        dropdown.borderWidth(layout.x(2));
        dropdown.setBorderColor(0xdcdcdc);
        dropdown.textColor(theme.textPrimary);
        return dropdown;
    }

    /**
     * 构建文本配置行。
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
            placeholder: t('door.inputPlaceholder'),
        });
        this._kbApis.push({ key: fieldKey, kb: kb, input: input, inputBox: inputBox });
        return input;
    }

    /**
     * @param {string} fieldKey
     * @param {function(): void} [onChange]
     * @returns {object}
     */
    _buildLinkRow(fieldKey, onClick) {
        const row = dxui.View.build(this.name + '_link_row_' + fieldKey, this._listContent);
        layout.clearStyle(row);
        row.setSize(this._listW, this._rowH);
        row.scroll(false);
        styleSettingRow(row);
        row.clickable(true);
        row.on(dxui.Utils.EVENT.CLICK, onClick);
        this._registerListRow(fieldKey, row);

        const label = dxui.Label.build(this.name + '_link_lbl_' + fieldKey, row);
        label.setSize(layout.x(600), layout.y(40));
        label.align(dxui.Utils.ALIGN.LEFT_MID, layout.x(24), 0);
        label.textFont(font.get(layout.fontSize(26)));
        label.textColor(theme.textPrimary);
        label.textAlign(dxui.Utils.TEXT_ALIGN.LEFT);
        label.clickable(false);
        this._fieldLabels.push({ key: fieldKey, label: label });

        const arrow = dxui.Image.build(this.name + '_link_arrow_' + fieldKey, row);
        arrow.source(IMG_ARROW);
        arrow.align(dxui.Utils.ALIGN.RIGHT_MID, -layout.x(24), 0);
        arrow.clickable(false);
        return row;
    }

    _buildSwitchRow(fieldKey, onChange) {
        const self = this;
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
            self._pinContentScroll(function () {
                if (typeof onChange === 'function') {
                    onChange();
                }
            });
        });
        return sw;
    }

    /**
     * 在回调前后钉住内容滚动位置，避免点开关触发 focus 微滚动。
     * @param {function(): void} [fn]
     */
    _pinContentScroll(fn) {
        const y = this._content && typeof this._content.scrollTop === 'function'
            ? this._content.scrollTop()
            : 0;
        if (typeof fn === 'function') {
            fn();
        }
        if (this._content && typeof this._content.scrollToY === 'function') {
            this._content.scrollToY(y, false);
        }
    }

    async _loadFromStore() {
        const cfg = await doorStore.load();
        if (this._mode === 'accessControl') {
            this._setInput(this._relayInput, String(cfg.relayTime));
            if (this._tamperSw) {
                this._setSwitch(this._tamperSw, cfg.tamper);
            }
            this._setSwitch(this._fireSw, cfg.fire);
        } else if (this._mode === 'verifyPolicy') {
            this._verifyModeDropdown.setSelected(cfg.verifyMode);
            const sequence = cfg.factorSequence || ['face', 'card'];
            this._lastFactors = sequence.slice(0, 2);
            const values = this._factorValues || [];
            const i0 = values.indexOf(sequence[0]);
            const i1 = values.indexOf(sequence[1]);
            this._factor1Dropdown.setSelected(i0 >= 0 ? i0 : 0);
            this._factor2Dropdown.setSelected(i1 >= 0 ? i1 : Math.min(1, Math.max(0, values.length - 1)));
            this._setInput(this._verifyTimeoutInput, String(cfg.verifyTimeout));
            this._setSwitch(this._onlineSw, cfg.verifyMode > 0 ? false : cfg.onlineCheck);
            this._setInput(this._timeoutInput, String(cfg.onlineTimeout));
            this._refreshVerifyMode();
        } else if (this._mode === 'recordPolicy') {
            this._setSwitch(this._faceImageRetentionSw, cfg.faceImageRetention);
            this._setSwitch(this._uploadToCloudSw, cfg.uploadToCloud);
            this._setSwitch(this._uploadFaceScoresSw, cfg.uploadFaceScores);
            this._setSwitch(this._deleteAfterUploadSw, cfg.deleteRecordAfterUpload);
            this._setSwitch(this._strangerImageSw, cfg.strangerImage);
        } else if (this._mode === 'mqtt') {
            this._mqttStatusLbl.text(t(cfg.mqttConnected ? 'door.status.connected' : 'door.status.disconnected'));
            this._clientIdLbl.text(cfg.clientId || '-');
            const schemeIndex = MQTT_SCHEME_OPTIONS.indexOf(cfg.mqttScheme);
            this._mqttSchemeDropdown.setSelected(schemeIndex >= 0 ? schemeIndex : 0);
            this._setInput(this._mqttHostInput, cfg.mqttHost || '');
            this._setInput(this._mqttPortInput, cfg.mqttPort || '');
            this._setInput(this._mqttUserInput, cfg.mqttUsername || '');
            this._setInput(this._mqttPwdInput, cfg.mqttPassword || '');
        } else {
            this._setInput(this._qosInput, String(cfg.qos));
            this._setInput(this._prefixInput, cfg.topicPrefix || '');
            this._setInput(this._willTopicInput, cfg.willTopic || '');
            this._setSwitch(this._cleanSessionSw, cfg.cleanSession);
            this._setSwitch(this._clientIdSuffixSw, cfg.clientIdSuffix);
            this._setSwitch(this._heartbeatSw, cfg.heartbeatEnabled);
            this._setInput(this._heartbeatInput, String(cfg.heartbeatInterval));
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

    _onFactorChanged(index) {
        const values = this._factorValues || [];
        const first = values[this._factor1Dropdown.getSelected()];
        const second = values[this._factor2Dropdown.getSelected()];
        if (first === second) {
            const other = index === 0 ? 1 : 0;
            const previous = this._lastFactors[index];
            const dropdown = other === 0 ? this._factor1Dropdown : this._factor2Dropdown;
            dropdown.setSelected(Math.max(0, values.indexOf(previous)));
        }
        this._lastFactors = [
            values[this._factor1Dropdown.getSelected()],
            values[this._factor2Dropdown.getSelected()],
        ];
    }

    _refreshVerifyMode() {
        const mode = this._verifyModeDropdown ? this._verifyModeDropdown.getSelected() : 0;
        const showFactors = mode === 2;
        this._setRowActive('factor1', showFactors);
        this._setRowActive('factor2', showFactors);
        this._setRowActive('verifyTimeout', mode === 2 || mode === 3);
        if (mode > 0) this._setSwitch(this._onlineSw, false);
        if (this._onlineSw) this._onlineSw.clickable(mode === 0);
        this._refreshOnlineTimeoutVisible();
        if (this._pager) this._pager.apply();
    }
    /** 在线验证关闭时隐藏超时项。 */
    _refreshOnlineTimeoutVisible() {
        const on = this._readSwitch(this._onlineSw);
        this._setRowActive('onlineTimeout', on);
        if (!on && this._timeoutKb) {
            this._timeoutKb.hide();
        }
        if (this._pager) this._pager.apply();
    }

    _refreshHeartbeatVisible() {
        if (!this._heartbeatRow) return;
        const on = this._readSwitch(this._heartbeatSw);
        this._setRowActive('heartbeatInterval', on);
        if (!on && this._heartbeatKb) this._heartbeatKb.hide();
        if (this._pager) this._pager.apply();
    }

    _refreshLabels() {
        for (let i = 0; i < this._sectionTitles.length; i++) {
            const item = this._sectionTitles[i];
            item.label.text(t('door.section.' + item.key));
        }
        for (let j = 0; j < this._fieldLabels.length; j++) {
            const item = this._fieldLabels[j];
            item.label.text(t('door.field.' + item.key));
        }
        for (let k = 0; k < this._switchLabels.length; k++) {
            const item = this._switchLabels[k];
            item.label.text(t('door.field.' + item.key));
        }
        for (let n = 0; n < this._kbApis.length; n++) {
            this._kbApis[n].kb.setPlaceholder(t('door.inputPlaceholder'));
        }
        for (let m = 0; m < this._infoLabels.length; m++) {
            const item = this._infoLabels[m];
            item.label.text(t('door.field.' + item.key));
        }
        if (this._saveLbl) {
            this._saveLbl.text(t('door.save'));
        }
    }

    async _onSave() {
        keyboard.hideAll();
        let patch;
        if (this._mode === 'accessControl') {
            patch = {
                relayTime: this._readInput(this._relayInput),
                fire: this._readSwitch(this._fireSw),
            };
            if (this._tamperSw) {
                patch.tamper = this._readSwitch(this._tamperSw);
            }
        } else if (this._mode === 'verifyPolicy') {
            const values = this._factorValues || [];
            patch = {
                verifyMode: this._verifyModeDropdown.getSelected(),
                factorSequence: [
                    values[this._factor1Dropdown.getSelected()],
                    values[this._factor2Dropdown.getSelected()],
                ],
                verifyTimeout: this._readInput(this._verifyTimeoutInput),
                onlineCheck: this._readSwitch(this._onlineSw),
                onlineTimeout: this._readInput(this._timeoutInput),
            };
        } else if (this._mode === 'recordPolicy') {
            patch = {
                faceImageRetention: this._readSwitch(this._faceImageRetentionSw),
                uploadToCloud: this._readSwitch(this._uploadToCloudSw),
                uploadFaceScores: this._readSwitch(this._uploadFaceScoresSw),
                deleteRecordAfterUpload: this._readSwitch(this._deleteAfterUploadSw),
                strangerImage: this._readSwitch(this._strangerImageSw),
            };
        } else if (this._mode === 'mqtt') {
            patch = {
                mqttScheme: MQTT_SCHEME_OPTIONS[this._mqttSchemeDropdown.getSelected()] || MQTT_SCHEME_OPTIONS[0],
                mqttHost: this._readInput(this._mqttHostInput),
                mqttPort: this._readInput(this._mqttPortInput),
                mqttUsername: this._readInput(this._mqttUserInput),
                mqttPassword: this._readInput(this._mqttPwdInput),
            };
        } else {
            patch = {
                qos: this._readInput(this._qosInput),
                topicPrefix: this._readInput(this._prefixInput),
                willTopic: this._readInput(this._willTopicInput),
                cleanSession: this._readSwitch(this._cleanSessionSw),
                clientIdSuffix: this._readSwitch(this._clientIdSuffixSw),
                heartbeatEnabled: this._readSwitch(this._heartbeatSw),
                heartbeatInterval: this._readInput(this._heartbeatInput),
            };
        }
        const result = await doorStore.save(patch);
        if (!result.ok) {
            if (result.error === 'pending') {
                popup.showError(result.message || '功能待接入');
            } else if (result.error === 'relayTime') {
                popup.showError(t('door.error.relayTime'));
            } else if (result.error === 'onlineTimeout') {
                popup.showError(t('door.error.onlineTimeout'));
            } else if (result.error === 'mqttEndpoint') {
                popup.showError(result.message || t('door.error.mqttEndpoint'));
            } else if (result.error === 'qos') {
                popup.showError(t('door.error.qos'));
            } else if (result.error === 'heartbeatInterval') {
                popup.showError(t('door.error.heartbeatInterval'));
            } else {
                popup.showError(result.message || t('door.saveRequired'));
            }
            return;
        }
        if (result.restartRequired) {
            restartRequired.show({
                onCancel: function () { popup.showSuccess(t('door.saveSuccess')); },
            });
            return;
        }
        if (this._mode === 'mqtt') {
            if (result.changed) {
                popup.show({ message: t('door.mqttSavedReconnecting') });
            } else if (!result.mqttConnected) {
                popup.show({ message: t('door.mqttUnchangedOffline') });
            } else {
                popup.show({ message: t('door.noChanges') });
            }
            return;
        }
        popup.showSuccess(t('door.saveSuccess'));
    }
}
