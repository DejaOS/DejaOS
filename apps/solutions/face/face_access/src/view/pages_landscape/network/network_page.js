/**
 * @layer    view
 * @module   network_page
 * @fires    none
 * @listens  none
 * @depends  dxUi,BaseView,font,layout,theme,page_header,keyboard,i18n,popup,loading_spinner,network_store,setting_pager
 *
 * 网络设置页：网络类型（以太网 / WiFi / 4G）。
 * 以太网、WiFi：动静态 + IP 参数 + 只读 MAC。
 * WiFi：入口行打开列表弹窗，可手动刷新；加密网络需输密码。
 * 4G：无动静态与 IP 配置，仅切换类型。
 * 保存成功即提示完成，不等待网络实际连上。
 * 横屏：白底 + 透明分割线行；右上角保存；超出 5 条时右侧上下翻页。
 */

import dxui from '../../../../dxmodules/dxUi.js';
import BaseView from '../../pages/base_view.js';
import font from '../../components/font.js';
import layout from '../../components/layout.js';
import theme from '../../components/theme.js';
import pageHeader from '../../components/page_header.js';
import keyboard from '../../components/keyboard.js';
import popup from '../../components/popup.js';

import loadingSpinner from '../../components/loading_spinner.js';
import { t } from '../../i18n/index.js';
import networkStore from '../../pages/network/network_store.js';
import capabilityStore from '../../core/capability_store.js';
import { CONTENT_W } from '../ls_metrics.js';
import {
    SETTING_PAGE_SIZE,
    settingPageRowH,
    attachSettingPager,
    styleSettingRow,
    buildTopSaveButton,
} from '../../components/setting_pager.js';

/** 分段选项按钮高 */
const SEG_H = 68;
/** WiFi 列表弹窗可见行数（行加高后一屏少显几条，超出由列表整体滚动） */
const WIFI_VISIBLE = 4;
/** WiFi 行高（需容纳双行文案，禁止行内滚动） */
const WIFI_ROW_H = 100;

const TYPE_OPTIONS_ALL = [
    { id: 'ethernet', labelKey: 'network.type.ethernet' },
    { id: 'wifi', labelKey: 'network.type.wifi' },
    { id: 'cellular', labelKey: 'network.type.cellular' },
];

function typeOptions() {
    return TYPE_OPTIONS_ALL.filter(function (item) {
        return item.id !== 'wifi' || capabilityStore.hasWifi();
    });
}

const IP_MODE_OPTIONS = [
    { id: 'dhcp', labelKey: 'network.ipMode.dhcp' },
    { id: 'static', labelKey: 'network.ipMode.static' },
];

export default class NetworkPage extends BaseView {
    constructor() {
        super('settings_network');
        this._header = null;
        this._content = null;
        this._listContent = null;
        this._listW = 0;
        this._rowH = 0;
        this._saveBtn = null;
        this._saveLbl = null;
        this._pager = null;
        /** @type {{ key: string, box: object, active: boolean }[]} */
        this._listRows = [];
        /** @type {{ key: string, label: object }[]} */
        this._captions = [];
        /** @type {string} */
        this._type = 'ethernet';
        /** @type {string} */
        this._ipMode = 'dhcp';
        /** @type {string} */
        this._wifiSsid = '';
        /** @type {string} */
        this._pendingWifiSsid = '';
        /** @type {boolean} */
        this._wifiScanning = false;
        this._wifiScanToken = 0;
        /** @type {Object.<string, { button: object, label: object, labelKey: string }>} */
        this._typeButtons = {};
        /** @type {Object.<string, { button: object, label: object, labelKey: string }>} */
        this._ipModeButtons = {};
        /** @type {{ key: string, label: object }[]} */
        this._fieldLabels = [];
        /** @type {object[]} */
        this._kbApis = [];
        /** @type {Object.<string, object>} */
        this._fieldRows = {};
        /** @type {object|null} */
        this._ipInput = null;
        /** @type {object|null} */
        this._maskInput = null;
        /** @type {object|null} */
        this._gatewayInput = null;
        /** @type {object|null} */
        this._dnsInput = null;
        /** @type {object|null} */
        this._macInput = null;
        /** @type {object|null} */
        this._wifiEntryRow = null;
        /** @type {object|null} */
        this._wifiEntryTitleLbl = null;
        /** @type {object|null} */
        this._wifiEntryValueLbl = null;
        /** @type {object|null} */
        this._wifiListMask = null;
        /** @type {object|null} */
        this._wifiListTitleLbl = null;
        /** @type {object|null} */
        this._wifiRefreshLbl = null;
        /** @type {object|null} */
        this._wifiRefreshBtn = null;
        /** @type {object|null} */
        this._wifiCloseLbl = null;
        /** @type {object|null} */
        this._wifiList = null;
        /** @type {object|null} */
        this._wifiEmptyLbl = null;
        /** @type {{ root: object, start: Function, stop: Function }|null} */
        this._wifiScanSpinner = null;
        /** @type {object|null} */
        this._wifiScanOverlay = null;
        /** @type {object|null} */
        this._wifiScanLbl = null;
        /** @type {{ row: object, ssidLbl: object, metaLbl: object, ap: object|null }[]} */
        this._wifiSlots = [];
        /** @type {object|null} */
        this._pwdMask = null;
        /** @type {object|null} */
        this._pwdTitleLbl = null;
        /** @type {object|null} */
        this._pwdHintLbl = null;
        /** @type {object|null} */
        this._pwdInput = null;
        /** @type {object|null} */
        this._pwdKb = null;
        /** @type {object|null} */
        this._pwdCancelLbl = null;
        /** @type {object|null} */
        this._pwdConnectLbl = null;
        /** @type {function(): void|null} */
        this._offNetworkChanged = null;
    }

    onCreate() {
        this.root = dxui.View.build('page_network', dxui.Utils.LAYER.MAIN);
        this.root.setSize(layout.width, layout.height);
        layout.clearStyle(this.root);
        this.root.bgColor(0xffffff);
        this.root.bgOpa(100);
        this.root.scroll(false);

        this._header = pageHeader.build(this.root, {
            idPrefix: 'network',
            titleKey: 'settings.menu.network',
        });
        this._buildBody();
        this._buildWifiListDialog();
        this._buildWifiPasswordDialog();
    }

    onEnter() {
        if (this._header) {
            this._header.refresh();
        }
        this._wifiScanToken += 1;
        this._wifiScanning = false;
        this._hideWifiPasswordDialog();
        this._hideWifiListDialog();
        this._bindNetworkChanged();
        const self = this;
        this._loadFromStore().then(function () {
            self._refreshTypeStyles();
            self._refreshIpModeStyles();
            self._refreshByType();
            if (self._pager) {
                self._pager.apply();
            }
        }).catch(function (error) {
            popup.showError(error && error.message ? error.message : t('network.saveRequired'));
        });
        this._refreshLabels();
        this._refreshTypeStyles();
        this._refreshIpModeStyles();
        this._refreshByType();
    }

    onExit() {
        this._unbindNetworkChanged();
        this._wifiScanToken += 1;
        this._wifiScanning = false;
        this._hideWifiPasswordDialog();
        this._hideWifiListDialog();
        keyboard.hideAll();
    }

    _buildBody() {
        const self = this;
        const top = pageHeader.contentTop();
        const contentH = layout.height - top;
        this._listW = layout.x(CONTENT_W);
        this._rowH = settingPageRowH(contentH);
        const listX = Math.round((layout.width - this._listW) / 2);

        this._content = dxui.View.build('network_content', this.root);
        this._content.setSize(layout.width, contentH);
        this._content.setPos(0, top);
        layout.clearStyle(this._content);
        this._content.bgColor(0xffffff);
        this._content.bgOpa(100);
        this._content.scroll(false);

        this._listContent = dxui.View.build('network_list', this._content);
        layout.clearStyle(this._listContent);
        this._listContent.setSize(this._listW, this._rowH * SETTING_PAGE_SIZE);
        this._listContent.setPos(listX, 0);
        this._listContent.bgOpa(0);
        this._listContent.scroll(false);

        this._captions = [];
        this._fieldLabels = [];
        this._kbApis = [];
        this._fieldRows = {};
        this._listRows = [];

        this._typeButtons = this._buildSegmentRow(
            'type',
            typeOptions(),
            function (id) {
                self._onSelectType(id);
            },
            { titleCaptionKey: 'type' }
        ).map;

        // WiFi 选网入口紧跟网络类型，避免沉在表单最底部。
        this._buildWifiEntryRow();

        const ipModeSeg = this._buildSegmentRow(
            'ipMode',
            IP_MODE_OPTIONS,
            function (id) {
                if (id === self._ipMode) {
                    return;
                }
                keyboard.hideAll();
                self._ipMode = id;
                self._refreshIpModeStyles();
                self._refreshIpFieldsEditable();
            },
            { titleCaptionKey: 'ipMode' }
        );
        this._ipModeButtons = ipModeSeg.map;

        this._ipInput = this._buildTextRow('ip', false);
        this._maskInput = this._buildTextRow('mask', false);
        this._gatewayInput = this._buildTextRow('gateway', false);
        this._dnsInput = this._buildTextRow('dns', false);
        this._macInput = this._buildTextRow('mac', true);

        const save = buildTopSaveButton(this.root, 'network_save', function () {
            self._onSave();
        });
        this._saveBtn = save.button;
        this._saveLbl = save.label;

        this._pager = attachSettingPager(this.root, {
            idPrefix: 'network',
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
            if (!active && this._listRows[i].box) {
                this._listRows[i].box.hide();
            }
            break;
        }
    }

    /**
     * WiFi 入口行：点击打开列表弹窗。
     */
    _buildWifiEntryRow() {
        const self = this;
        this._wifiEntryRow = dxui.View.build('network_wifi_entry', this._listContent);
        layout.clearStyle(this._wifiEntryRow);
        this._wifiEntryRow.setSize(this._listW, this._rowH);
        this._wifiEntryRow.scroll(false);
        this._wifiEntryRow.clickable(true);
        styleSettingRow(this._wifiEntryRow);
        this._registerListRow('wifiEntry', this._wifiEntryRow);
        this._wifiEntryRow.hide();
        this._setRowActive('wifiEntry', false);
        this._wifiEntryRow.on(dxui.Utils.EVENT.CLICK, function () {
            self._showWifiListDialog();
        });

        this._wifiEntryTitleLbl = dxui.Label.build('network_wifi_entry_title', this._wifiEntryRow);
        this._wifiEntryTitleLbl.setSize(layout.x(220), layout.y(40));
        this._wifiEntryTitleLbl.align(dxui.Utils.ALIGN.LEFT_MID, layout.x(24), 0);
        this._wifiEntryTitleLbl.textFont(font.get(layout.fontSize(26)));
        this._wifiEntryTitleLbl.textColor(theme.textPrimary);
        this._wifiEntryTitleLbl.textAlign(dxui.Utils.TEXT_ALIGN.LEFT);

        this._wifiEntryValueLbl = dxui.Label.build('network_wifi_entry_value', this._wifiEntryRow);
        this._wifiEntryValueLbl.setSize(layout.x(420), layout.y(40));
        this._wifiEntryValueLbl.align(dxui.Utils.ALIGN.RIGHT_MID, -layout.x(24), 0);
        this._wifiEntryValueLbl.textFont(font.get(layout.fontSize(24)));
        this._wifiEntryValueLbl.textColor(theme.textSecondary);
        this._wifiEntryValueLbl.textAlign(dxui.Utils.TEXT_ALIGN.RIGHT);
    }

    /**
     * @param {string} prefix
     * @param {{ id: string, labelKey: string }[]} options
     * @param {function(string): void} onSelect
     * @param {{ titleCaptionKey?: string }=} opts
     * @returns {{ map: Object.<string, { button: object, label: object, labelKey: string }>, row: object }}
     */
    _buildSegmentRow(prefix, options, onSelect, opts) {
        const row = dxui.View.build('network_seg_' + prefix, this._listContent);
        layout.clearStyle(row);
        row.setSize(this._listW, this._rowH);
        row.scroll(false);
        styleSettingRow(row);
        this._registerListRow(prefix, row);

        const titleKey = opts && opts.titleCaptionKey ? opts.titleCaptionKey : '';
        const titleW = titleKey ? layout.x(220) : 0;
        const leftPad = titleKey ? layout.x(24) + titleW + layout.x(12) : layout.x(10);
        const rightPad = layout.x(10);

        if (titleKey) {
            const titleLbl = dxui.Label.build('network_seg_title_' + prefix, row);
            titleLbl.setSize(titleW, layout.y(40));
            titleLbl.align(dxui.Utils.ALIGN.LEFT_MID, layout.x(24), 0);
            titleLbl.textFont(font.get(layout.fontSize(26)));
            titleLbl.textColor(theme.textPrimary);
            titleLbl.textAlign(dxui.Utils.TEXT_ALIGN.LEFT);
            this._captions.push({ key: titleKey, label: titleLbl });
        }

        const map = {};
        const count = options.length;
        const gap = layout.x(10);
        const controlW = this._listW - leftPad - rightPad;
        const btnW = Math.floor((controlW - gap * (count - 1)) / count);
        const btnH = Math.min(layout.y(SEG_H), this._rowH - layout.y(12));
        const btnY = Math.floor((this._rowH - btnH) / 2);

        for (let i = 0; i < count; i++) {
            const option = options[i];
            const button = dxui.Button.build(
                'network_seg_btn_' + prefix + '_' + option.id,
                row
            );
            button.setSize(btnW, btnH);
            button.setPos(leftPad + i * (btnW + gap), btnY);
            button.radius(layout.x(12));
            button.borderWidth(0);
            button.on(dxui.Utils.EVENT.CLICK, (function (id) {
                return function () {
                    onSelect(id);
                };
            })(option.id));

            const label = dxui.Label.build(
                'network_seg_lbl_' + prefix + '_' + option.id,
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
     * @param {boolean} readOnly
     * @returns {object}
     */
    _buildTextRow(fieldKey, readOnly) {
        const row = dxui.View.build('network_row_' + fieldKey, this._listContent);
        layout.clearStyle(row);
        row.setSize(this._listW, this._rowH);
        row.scroll(false);
        styleSettingRow(row);
        this._registerListRow(fieldKey, row);

        const label = dxui.Label.build('network_lbl_' + fieldKey, row);
        label.setSize(layout.x(200), layout.y(40));
        label.align(dxui.Utils.ALIGN.LEFT_MID, layout.x(24), 0);
        label.textFont(font.get(layout.fontSize(26)));
        label.textColor(theme.textPrimary);
        label.textAlign(dxui.Utils.TEXT_ALIGN.LEFT);
        this._fieldLabels.push({ key: fieldKey, label: label });

        const inputBox = dxui.View.build('network_box_' + fieldKey, row);
        layout.clearStyle(inputBox);
        inputBox.setSize(layout.x(460), layout.y(64));
        inputBox.align(dxui.Utils.ALIGN.RIGHT_MID, -layout.x(20), 0);
        inputBox.bgColor(readOnly ? 0xe8e8e8 : 0xf5f5f5);
        inputBox.bgOpa(100);
        inputBox.radius(layout.x(12));
        inputBox.borderWidth(layout.x(2));
        inputBox.setBorderColor(0xdcdcdc);
        inputBox.scroll(false);

        const input = dxui.Textarea.build('network_input_' + fieldKey, inputBox);
        layout.clearStyle(input);
        input.setSize(layout.x(420), layout.y(48));
        input.align(dxui.Utils.ALIGN.CENTER, 0, 0);
        input.bgOpa(0);
        input.padAll(0);
        input.borderWidth(0);
        input.setOneLine(true);
        input.setMaxLength(64);
        input.setCursorClickPos(!readOnly);
        input.textFont(font.get(layout.fontSize(26)));
        input.textColor(readOnly ? theme.textSecondary : theme.textPrimary);
        input.setAlign(dxui.Utils.TEXT_ALIGN.LEFT);
        input.text('');

        if (readOnly) {
            input.clickable(false);
            return input;
        }

        const kb = keyboard.bind(null, input, {
            mode: keyboard.MODE.ENGLISH,
            placeholder: t('network.inputPlaceholder'),
        });
        this._kbApis.push({ kb: kb, fieldKey: fieldKey, input: input, inputBox: inputBox });
        return input;
    }

    /**
     * WiFi 列表弹窗：标题 + 刷新 + 列表 + 关闭。
     */
    _buildWifiListDialog() {
        const self = this;
        const rowGap = layout.y(8);
        const listPad = layout.y(16);
        const listH = layout.y(WIFI_ROW_H) * WIFI_VISIBLE
            + rowGap * Math.max(0, WIFI_VISIBLE - 1)
            + listPad;
        const cardH = layout.y(120) + listH + layout.y(100);

        this._wifiListMask = dxui.View.build('network_wifi_list_mask', this.root);
        this._wifiListMask.setSize(layout.width, layout.height);
        this._wifiListMask.bgColor(0x000000);
        this._wifiListMask.bgOpa(theme.maskOpa);
        this._wifiListMask.radius(0);
        this._wifiListMask.borderWidth(0);
        this._wifiListMask.padAll(0);
        layout.disableScroll(this._wifiListMask);
        this._wifiListMask.clickable(true);
        this._wifiListMask.hide();

        const card = dxui.View.build('network_wifi_list_card', this._wifiListMask);
        card.setSize(layout.x(680), cardH);
        card.align(dxui.Utils.ALIGN.CENTER, 0, 0);
        card.bgColor(theme.pageBg);
        card.bgOpa(100);
        card.radius(layout.x(20));
        card.borderWidth(0);
        card.padAll(0);
        layout.disableScroll(card);
        card.clickable(true);

        this._wifiListTitleLbl = dxui.Label.build('network_wifi_list_title', card);
        this._wifiListTitleLbl.setSize(layout.x(400), layout.y(48));
        this._wifiListTitleLbl.setPos(layout.x(28), layout.y(24));
        this._wifiListTitleLbl.textFont(font.get(layout.fontSize(28), dxui.Utils.FONT_STYLE.BOLD));
        this._wifiListTitleLbl.textColor(theme.textPrimary);
        this._wifiListTitleLbl.textAlign(dxui.Utils.TEXT_ALIGN.LEFT);

        this._wifiRefreshBtn = dxui.Button.build('network_wifi_refresh', card);
        this._wifiRefreshBtn.setSize(layout.x(140), layout.y(56));
        this._wifiRefreshBtn.setPos(layout.x(512), layout.y(20));
        this._wifiRefreshBtn.bgColor(theme.accent);
        this._wifiRefreshBtn.radius(layout.x(12));
        this._wifiRefreshBtn.borderWidth(0);
        this._wifiRefreshBtn.on(dxui.Utils.EVENT.CLICK, function () {
            self._refreshWifiList();
        });
        this._wifiRefreshLbl = dxui.Label.build('network_wifi_refresh_lbl', this._wifiRefreshBtn);
        this._wifiRefreshLbl.textFont(font.get(layout.fontSize(24)));
        this._wifiRefreshLbl.textColor(theme.textOnDark);
        this._wifiRefreshLbl.align(dxui.Utils.ALIGN.CENTER, 0, 0);

        this._wifiList = dxui.View.build('network_wifi_list', card);
        layout.clearStyle(this._wifiList);
        this._wifiList.setSize(layout.x(624), listH);
        this._wifiList.setPos(layout.x(28), layout.y(96));
        this._wifiList.bgColor(0xf5f5f5);
        this._wifiList.bgOpa(100);
        this._wifiList.radius(layout.x(14));
        this._wifiList.scroll(true);
        this._wifiList.flexFlow(dxui.Utils.FLEX_FLOW.COLUMN);
        this._wifiList.flexAlign(
            dxui.Utils.FLEX_ALIGN.START,
            dxui.Utils.FLEX_ALIGN.CENTER,
            dxui.Utils.FLEX_ALIGN.CENTER
        );
        this._wifiList.padTop(layout.y(8));
        this._wifiList.padBottom(layout.y(8));
        this._wifiList.obj.lvObjSetStylePadGap(
            layout.y(8),
            dxui.Utils.ENUM._LV_STYLE_STATE_CMP_SAME
        );

        this._wifiEmptyLbl = dxui.Label.build('network_wifi_empty', this._wifiList);
        this._wifiEmptyLbl.setSize(layout.x(580), layout.y(40));
        this._wifiEmptyLbl.textFont(font.get(layout.fontSize(24)));
        this._wifiEmptyLbl.textColor(theme.textSecondary);
        this._wifiEmptyLbl.textAlign(dxui.Utils.TEXT_ALIGN.CENTER);
        this._wifiEmptyLbl.hide();

        this._wifiSlots = [];
        for (let i = 0; i < 10; i++) {
            this._wifiSlots.push(this._createWifiSlot(i));
        }

        // 扫描遮罩盖在列表上：spinner + 文案
        this._wifiScanOverlay = dxui.View.build('network_wifi_scan_overlay', card);
        layout.clearStyle(this._wifiScanOverlay);
        this._wifiScanOverlay.setSize(layout.x(624), listH);
        this._wifiScanOverlay.setPos(layout.x(28), layout.y(96));
        this._wifiScanOverlay.bgColor(0xf5f5f5);
        this._wifiScanOverlay.bgOpa(100);
        this._wifiScanOverlay.radius(layout.x(14));
        this._wifiScanOverlay.scroll(false);
        this._wifiScanOverlay.clickable(true);
        this._wifiScanOverlay.hide();

        this._wifiScanSpinner = loadingSpinner.build(this._wifiScanOverlay, {
            idPrefix: 'network_wifi_scan_spinner',
            size: layout.x(80),
            color: theme.accent,
        });
        this._wifiScanSpinner.root.align(dxui.Utils.ALIGN.CENTER, 0, layout.y(-24));
        this.addCleanup(function () {
            if (self._wifiScanSpinner) {
                self._wifiScanSpinner.stop();
            }
        });

        this._wifiScanLbl = dxui.Label.build('network_wifi_scan_lbl', this._wifiScanOverlay);
        this._wifiScanLbl.setSize(layout.x(400), layout.y(36));
        this._wifiScanLbl.align(dxui.Utils.ALIGN.CENTER, 0, layout.y(48));
        this._wifiScanLbl.textFont(font.get(layout.fontSize(24)));
        this._wifiScanLbl.textColor(theme.textSecondary);
        this._wifiScanLbl.textAlign(dxui.Utils.TEXT_ALIGN.CENTER);
        this._wifiScanLbl.text(t('network.wifi.scanning'));

        const closeBtn = dxui.Button.build('network_wifi_close', card);
        closeBtn.setSize(layout.x(320), layout.y(70));
        closeBtn.align(dxui.Utils.ALIGN.BOTTOM_MID, 0, -layout.y(20));
        closeBtn.bgColor(0xeeeeee);
        closeBtn.radius(layout.x(12));
        closeBtn.borderWidth(0);
        closeBtn.on(dxui.Utils.EVENT.CLICK, function () {
            self._hideWifiListDialog();
        });
        this._wifiCloseLbl = dxui.Label.build('network_wifi_close_lbl', closeBtn);
        this._wifiCloseLbl.textFont(font.get(layout.fontSize(26)));
        this._wifiCloseLbl.textColor(0x555555);
        this._wifiCloseLbl.align(dxui.Utils.ALIGN.CENTER, 0, 0);
    }

    /**
     * WiFi 密码弹层：遮罩 + 卡片（SSID、密码输入、取消/连接）。
     */
    _buildWifiPasswordDialog() {
        const self = this;
        this._pwdMask = dxui.View.build('network_pwd_mask', this.root);
        this._pwdMask.setSize(layout.width, layout.height);
        this._pwdMask.bgColor(0x000000);
        this._pwdMask.bgOpa(theme.maskOpa);
        this._pwdMask.radius(0);
        this._pwdMask.borderWidth(0);
        this._pwdMask.padAll(0);
        layout.disableScroll(this._pwdMask);
        this._pwdMask.clickable(true);
        this._pwdMask.hide();

        const card = dxui.View.build('network_pwd_card', this._pwdMask);
        card.setSize(layout.x(600), layout.y(360));
        card.align(dxui.Utils.ALIGN.CENTER, 0, layout.y(-80));
        card.bgColor(theme.pageBg);
        card.bgOpa(100);
        card.radius(layout.x(20));
        card.borderWidth(0);
        card.padAll(0);
        layout.disableScroll(card);
        card.clickable(true);

        this._pwdTitleLbl = dxui.Label.build('network_pwd_title', card);
        this._pwdTitleLbl.setSize(layout.x(540), layout.y(48));
        this._pwdTitleLbl.setPos(layout.x(30), layout.y(28));
        this._pwdTitleLbl.textFont(font.get(layout.fontSize(28), dxui.Utils.FONT_STYLE.BOLD));
        this._pwdTitleLbl.textColor(theme.textPrimary);
        this._pwdTitleLbl.textAlign(dxui.Utils.TEXT_ALIGN.CENTER);

        this._pwdHintLbl = dxui.Label.build('network_pwd_hint', card);
        this._pwdHintLbl.setSize(layout.x(540), layout.y(36));
        this._pwdHintLbl.setPos(layout.x(30), layout.y(80));
        this._pwdHintLbl.textFont(font.get(layout.fontSize(22)));
        this._pwdHintLbl.textColor(theme.textSecondary);
        this._pwdHintLbl.textAlign(dxui.Utils.TEXT_ALIGN.CENTER);

        const inputBox = dxui.View.build('network_pwd_box', card);
        layout.clearStyle(inputBox);
        inputBox.setSize(layout.x(520), layout.y(72));
        inputBox.setPos(layout.x(40), layout.y(130));
        inputBox.bgColor(0xf5f5f5);
        inputBox.bgOpa(100);
        inputBox.radius(layout.x(12));
        inputBox.borderWidth(layout.x(2));
        inputBox.setBorderColor(0xdcdcdc);
        inputBox.scroll(false);

        this._pwdInput = dxui.Textarea.build('network_pwd_input', inputBox);
        layout.clearStyle(this._pwdInput);
        this._pwdInput.setSize(layout.x(480), layout.y(52));
        this._pwdInput.align(dxui.Utils.ALIGN.CENTER, 0, 0);
        this._pwdInput.bgOpa(0);
        this._pwdInput.padAll(0);
        this._pwdInput.borderWidth(0);
        this._pwdInput.setOneLine(true);
        this._pwdInput.setMaxLength(64);
        this._pwdInput.setCursorClickPos(true);
        this._pwdInput.textFont(font.get(layout.fontSize(26)));
        this._pwdInput.textColor(theme.textPrimary);
        this._pwdInput.setAlign(dxui.Utils.TEXT_ALIGN.LEFT);
        this._pwdInput.text('');

        this._pwdKb = keyboard.bind(null, this._pwdInput, {
            mode: keyboard.MODE.ENGLISH,
            placeholder: t('network.wifi.passwordPlaceholder'),
            // 弹层内输入：避免背后 IP/其它输入热区抢走「点外面收起」
            exclusive: true,
        });

        const cancelBtn = dxui.Button.build('network_pwd_cancel', card);
        cancelBtn.setSize(layout.x(240), layout.y(70));
        cancelBtn.setPos(layout.x(40), layout.y(250));
        cancelBtn.bgColor(0xeeeeee);
        cancelBtn.radius(layout.x(12));
        cancelBtn.borderWidth(0);
        cancelBtn.on(dxui.Utils.EVENT.CLICK, function () {
            self._hideWifiPasswordDialog();
        });
        this._pwdCancelLbl = dxui.Label.build('network_pwd_cancel_lbl', cancelBtn);
        this._pwdCancelLbl.textFont(font.get(layout.fontSize(26)));
        this._pwdCancelLbl.textColor(0x555555);
        this._pwdCancelLbl.align(dxui.Utils.ALIGN.CENTER, 0, 0);

        const connectBtn = dxui.Button.build('network_pwd_connect', card);
        connectBtn.setSize(layout.x(240), layout.y(70));
        connectBtn.setPos(layout.x(320), layout.y(250));
        connectBtn.bgColor(theme.accent);
        connectBtn.radius(layout.x(12));
        connectBtn.borderWidth(0);
        connectBtn.on(dxui.Utils.EVENT.CLICK, function () {
            self._confirmWifiPassword();
        });
        this._pwdConnectLbl = dxui.Label.build('network_pwd_connect_lbl', connectBtn);
        this._pwdConnectLbl.textFont(font.get(layout.fontSize(26)));
        this._pwdConnectLbl.textColor(theme.textOnDark);
        this._pwdConnectLbl.align(dxui.Utils.ALIGN.CENTER, 0, 0);
    }

    /**
     * @param {string} [msgKey='network.saveSuccess']
     */
    _onSaveSuccess(msgKey) {
        this._loadFromStore().catch(function () {});
        popup.showSuccess(t(msgKey || 'network.saveSuccess'));
    }

    _bindNetworkChanged() {
        const self = this;
        this._unbindNetworkChanged();
        this._offNetworkChanged = networkStore.onNetworkChanged(function () {
            self._refreshActiveDisplay().catch(function () {});
        });
    }

    _unbindNetworkChanged() {
        if (typeof this._offNetworkChanged === 'function') {
            this._offNetworkChanged();
        }
        this._offNetworkChanged = null;
    }

    /**
     * @param {number} index
     * @returns {{ row: object, ssidLbl: object, metaLbl: object, ap: object|null }}
     */
    _createWifiSlot(index) {
        const self = this;
        const row = dxui.View.build('network_wifi_row_' + index, this._wifiList);
        layout.clearStyle(row);
        row.setSize(layout.x(592), layout.y(WIFI_ROW_H));
        row.bgColor(theme.pageBg);
        row.bgOpa(100);
        row.radius(layout.x(10));
        row.scroll(false);
        layout.disableScroll(row);
        row.clickable(true);
        row.hide();
        row.on(dxui.Utils.EVENT.CLICK, function () {
            if (self._wifiScanning) {
                return;
            }
            const slot = self._wifiSlots[index];
            if (!slot || !slot.ap) {
                return;
            }
            self._onSelectWifi(slot.ap);
        });

        const ssidLbl = dxui.Label.build('network_wifi_ssid_' + index, row);
        ssidLbl.setSize(layout.x(540), layout.y(40));
        ssidLbl.align(dxui.Utils.ALIGN.TOP_LEFT, layout.x(16), layout.y(14));
        ssidLbl.textFont(font.get(layout.fontSize(26)));
        ssidLbl.textColor(theme.textPrimary);
        ssidLbl.textAlign(dxui.Utils.TEXT_ALIGN.LEFT);
        ssidLbl.longMode(dxui.Utils.LABEL_LONG_MODE.CLIP);

        const metaLbl = dxui.Label.build('network_wifi_meta_' + index, row);
        metaLbl.setSize(layout.x(540), layout.y(30));
        metaLbl.align(dxui.Utils.ALIGN.TOP_LEFT, layout.x(16), layout.y(56));
        metaLbl.textFont(font.get(layout.fontSize(20)));
        metaLbl.textColor(theme.textSecondary);
        metaLbl.textAlign(dxui.Utils.TEXT_ALIGN.LEFT);
        metaLbl.longMode(dxui.Utils.LABEL_LONG_MODE.CLIP);

        return { row: row, ssidLbl: ssidLbl, metaLbl: metaLbl, ap: null };
    }

    _showWifiListDialog() {
        keyboard.hideAll();
        if (this._pager) {
            this._pager.hide();
        }
        if (this._wifiListTitleLbl) {
            this._wifiListTitleLbl.text(t('network.wifiList'));
        }
        if (this._wifiRefreshLbl) {
            this._wifiRefreshLbl.text(t('network.wifi.refresh'));
        }
        if (this._wifiCloseLbl) {
            this._wifiCloseLbl.text(t('network.wifi.close'));
        }
        if (this._wifiListMask) {
            this._wifiListMask.show();
            if (typeof this._wifiListMask.moveForeground === 'function') {
                this._wifiListMask.moveForeground();
            }
        }
        // 每次打开自动扫描并显示加载动画。
        this._refreshWifiList();
    }

    _hideWifiListDialog() {
        this._wifiScanToken += 1;
        this._wifiScanning = false;
        this._hideWifiScanning();
        this._setWifiRefreshEnabled(true);
        if (this._wifiListMask) {
            this._wifiListMask.hide();
        }
        if (this._pager && typeof this._pager.show === 'function') {
            this._pager.show();
        }
    }

    /**
     * 切换网络类型（仅改 UI 态，真正生效在保存）。
     * @param {string} id
     */
    _onSelectType(id) {
        if (id === this._type) {
            return;
        }
        keyboard.hideAll();
        this._type = id;
        this._refreshTypeStyles();
        this._refreshByType();
    }

    /**
     * 刷新WiFi列表。组件会复用并发扫描，本层只在Promise完成后恢复按钮。
     */
    _refreshWifiList() {
        if (this._wifiScanning) {
            return;
        }
        const self = this;
        const token = ++this._wifiScanToken;
        this._wifiScanning = true;
        this._setWifiRefreshEnabled(false);
        this._showWifiScanning();

        networkStore.scanWifi().then(function () {
            if (token !== self._wifiScanToken) return;
            self._wifiScanning = false;
            self._hideWifiScanning();
            self._paintWifiList();
            self._setWifiRefreshEnabled(true);
        }).catch(function (error) {
            if (token !== self._wifiScanToken) return;
            self._wifiScanning = false;
            self._hideWifiScanning();
            self._setWifiRefreshEnabled(true);
            popup.showError(error && error.message ? error.message : t('network.saveRequired'));
        });
    }

    /**
     * @param {boolean} enabled
     */
    _setWifiRefreshEnabled(enabled) {
        if (!this._wifiRefreshBtn) {
            return;
        }
        if (enabled) {
            this._wifiRefreshBtn.bgColor(theme.accent);
            this._wifiRefreshBtn.clickable(true);
        } else {
            this._wifiRefreshBtn.bgColor(theme.disabledBg);
            this._wifiRefreshBtn.clickable(false);
        }
    }

    _showWifiScanning() {
        for (let i = 0; i < this._wifiSlots.length; i++) {
            this._wifiSlots[i].ap = null;
            this._wifiSlots[i].row.hide();
        }
        if (this._wifiEmptyLbl) {
            this._wifiEmptyLbl.hide();
        }
        if (this._wifiScanLbl) {
            this._wifiScanLbl.text(t('network.wifi.scanning'));
        }
        if (this._wifiScanOverlay) {
            this._wifiScanOverlay.show();
            this._wifiScanOverlay.moveForeground();
        }
        if (this._wifiScanSpinner) {
            this._wifiScanSpinner.start();
        }
    }

    _hideWifiScanning() {
        if (this._wifiScanSpinner) {
            this._wifiScanSpinner.stop();
        }
        if (this._wifiScanOverlay) {
            this._wifiScanOverlay.hide();
        }
    }

    /**
     * @param {{ ssid: string, secured: boolean }} ap
     */
    _onSelectWifi(ap) {
        keyboard.hideAll();
        if (ap.secured) {
            this._showWifiPasswordDialog(ap.ssid);
            return;
        }
        this._connectWifi(ap.ssid, '');
    }

    /**
     * @param {string} ssid
     */
    _showWifiPasswordDialog(ssid) {
        this._pendingWifiSsid = ssid;
        if (this._pager) {
            this._pager.hide();
        }
        if (this._pwdTitleLbl) {
            this._pwdTitleLbl.text(t('network.wifi.passwordTitle'));
        }
        if (this._pwdHintLbl) {
            this._pwdHintLbl.text(ssid);
        }
        if (this._pwdCancelLbl) {
            this._pwdCancelLbl.text(t('network.wifi.cancel'));
        }
        if (this._pwdConnectLbl) {
            this._pwdConnectLbl.text(t('network.wifi.connect'));
        }
        if (this._pwdKb) {
            this._pwdKb.setPlaceholder(t('network.wifi.passwordPlaceholder'));
        }
        this._setInput(this._pwdInput, '');
        if (this._pwdMask) {
            this._pwdMask.show();
            if (typeof this._pwdMask.moveForeground === 'function') {
                this._pwdMask.moveForeground();
            }
        }
    }

    _hideWifiPasswordDialog() {
        this._pendingWifiSsid = '';
        if (this._pwdKb) {
            this._pwdKb.hide();
        }
        if (this._pwdMask) {
            this._pwdMask.hide();
        }
        // 密码层关掉后：若 WiFi 列表仍开着则继续藏翻页，否则恢复。
        const listOpen = this._wifiListMask
            && typeof this._wifiListMask.isHide === 'function'
            && !this._wifiListMask.isHide();
        if (!listOpen && this._pager && typeof this._pager.show === 'function') {
            this._pager.show();
        }
    }

    _confirmWifiPassword() {
        const password = this._readInput(this._pwdInput);
        if (!password) {
            popup.showError(t('network.wifi.passwordRequired'));
            return;
        }
        const ssid = this._pendingWifiSsid;
        this._hideWifiPasswordDialog();
        this._connectWifi(ssid, password);
    }

    /**
     * @param {string} ssid
     * @param {string} password
     */
    async _connectWifi(ssid, password) {
        const result = await networkStore.connectWifi(ssid, password);
        if (!result.ok) {
            if (result.error === 'password') {
                popup.showError(t('network.wifi.passwordRequired'));
            } else {
                popup.showError(this._saveErrorMessage(result));
            }
            return;
        }
        this._wifiSsid = ssid;
        this._type = 'wifi';
        this._refreshTypeStyles();
        this._refreshWifiEntry();
        this._hideWifiListDialog();
        this._onSaveSuccess('network.wifi.connectSuccess');
    }

    async _loadFromStore() {
        const cfg = await networkStore.load();
        this._applyDisplayConfig(cfg);
    }

    /**
     * 仅刷新运行时 IP（动态地址时）；静态编辑中的输入框不覆盖。
     */
    async _refreshActiveDisplay() {
        await networkStore.refreshStatus();
        // 静态编辑中不覆盖用户输入。
        if (this._ipMode === 'static') {
            return;
        }
        const cfg = networkStore.getDisplayConfig();
        this._setInput(this._ipInput, cfg.ip || '');
        this._setInput(this._maskInput, cfg.mask || '');
        this._setInput(this._gatewayInput, cfg.gateway || '');
        this._setInput(this._dnsInput, cfg.dns || '');
        this._setInput(this._macInput, cfg.mac || networkStore.getMac());
        if (cfg.ipMode && cfg.ipMode !== this._ipMode) {
            this._ipMode = cfg.ipMode;
            this._refreshIpModeStyles();
            this._refreshIpFieldsEditable();
        }
        if (cfg.type && cfg.type !== this._type) {
            this._type = cfg.type;
            this._refreshTypeStyles();
            this._refreshByType();
        }
        if (cfg.wifiSsid) {
            this._wifiSsid = cfg.wifiSsid;
            this._refreshWifiEntry();
        }
    }

    /**
     * @param {object} cfg
     */
    _applyDisplayConfig(cfg) {
        let nextType = cfg.type || 'ethernet';
        if (nextType === 'wifi' && !capabilityStore.hasWifi()) {
            nextType = 'ethernet';
        }
        this._type = nextType;
        this._ipMode = cfg.ipMode || 'dhcp';
        this._wifiSsid = cfg.wifiSsid || '';
        this._setInput(this._ipInput, cfg.ip || '');
        this._setInput(this._maskInput, cfg.mask || '');
        this._setInput(this._gatewayInput, cfg.gateway || '');
        this._setInput(this._dnsInput, cfg.dns || '');
        this._setInput(this._macInput, cfg.mac || networkStore.getMac());
        this._refreshTypeStyles();
        this._refreshIpModeStyles();
        this._refreshByType();
    }

    /**
     * @param {object|null} input
     * @param {string} value
     */
    _setInput(input, value) {
        if (!input) {
            return;
        }
        try {
            input.text(String(value || ''));
        } catch (_e) {
            // ignore
        }
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
        for (let c = 0; c < this._captions.length; c++) {
            const cap = this._captions[c];
            if (cap.key === 'type') {
                cap.label.text(t('network.type'));
            } else if (cap.key === 'ipMode') {
                cap.label.text(t('network.ipMode'));
            }
        }
        if (this._wifiEntryTitleLbl) {
            this._wifiEntryTitleLbl.text(t('network.wifi.select'));
        }
        if (this._wifiListTitleLbl) {
            this._wifiListTitleLbl.text(t('network.wifiList'));
        }
        if (this._wifiRefreshLbl) {
            this._wifiRefreshLbl.text(t('network.wifi.refresh'));
        }
        if (this._wifiCloseLbl) {
            this._wifiCloseLbl.text(t('network.wifi.close'));
        }
        if (this._wifiEmptyLbl) {
            this._wifiEmptyLbl.text(t('network.wifi.empty'));
        }
        if (this._wifiScanLbl) {
            this._wifiScanLbl.text(t('network.wifi.scanning'));
        }
        if (this._saveLbl) {
            this._saveLbl.text(t('network.save'));
        }
        this._refreshWifiEntry();

        const typeIds = Object.keys(this._typeButtons);
        for (let i = 0; i < typeIds.length; i++) {
            const entry = this._typeButtons[typeIds[i]];
            entry.label.text(t(entry.labelKey));
        }
        const modeIds = Object.keys(this._ipModeButtons);
        for (let j = 0; j < modeIds.length; j++) {
            const entry = this._ipModeButtons[modeIds[j]];
            entry.label.text(t(entry.labelKey));
        }
        for (let k = 0; k < this._fieldLabels.length; k++) {
            const item = this._fieldLabels[k];
            item.label.text(t('network.field.' + item.key));
        }
        for (let n = 0; n < this._kbApis.length; n++) {
            this._kbApis[n].kb.setPlaceholder(t('network.inputPlaceholder'));
        }
    }

    _refreshWifiEntry() {
        if (!this._wifiEntryValueLbl) {
            return;
        }
        this._wifiEntryValueLbl.text(
            this._wifiSsid ? this._wifiSsid : t('network.wifi.notSelected')
        );
        this._wifiEntryValueLbl.textColor(
            this._wifiSsid ? theme.textPrimary : theme.textSecondary
        );
    }

    _refreshTypeStyles() {
        this._refreshSegmentStyles(this._typeButtons, this._type);
    }

    _refreshIpModeStyles() {
        this._refreshSegmentStyles(this._ipModeButtons, this._ipMode);
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

    /**
     * 按网络类型切换区块：4G 隐藏动静态与 IP；WiFi 显示入口行。
     */
    _refreshByType() {
        const isCellular = this._type === 'cellular';
        const showIpConfig = !isCellular;

        this._setRowActive('ipMode', showIpConfig);
        this._setRowActive('ip', showIpConfig);
        this._setRowActive('mask', showIpConfig);
        this._setRowActive('gateway', showIpConfig);
        this._setRowActive('dns', showIpConfig);
        this._setRowActive('mac', showIpConfig);

        if (showIpConfig) {
            this._refreshIpFieldsEditable();
        } else {
            keyboard.hideAll();
        }

        this._setRowActive('wifiEntry', this._type === 'wifi');
        if (this._type === 'wifi') {
            this._refreshWifiEntry();
        } else {
            this._hideWifiListDialog();
        }

        if (this._pager) {
            this._pager.apply();
        }
    }

    /**
     * 动态：IP 相关只读；静态：可编辑。MAC 始终只读。
     */
    _refreshIpFieldsEditable() {
        const editable = this._ipMode === 'static';
        for (let i = 0; i < this._kbApis.length; i++) {
            const item = this._kbApis[i];
            if (item.inputBox) {
                item.inputBox.bgColor(editable ? 0xf5f5f5 : 0xe8e8e8);
            }
            if (item.input) {
                item.input.textColor(editable ? theme.textPrimary : theme.textSecondary);
                item.input.setCursorClickPos(editable);
                item.input.clickable(editable);
            }
            if (!editable && item.kb) {
                item.kb.hide();
            }
        }
    }

    _paintWifiList() {
        const list = networkStore.listWifi();
        if (!list.length) {
            if (this._wifiEmptyLbl) {
                this._wifiEmptyLbl.text(t('network.wifi.empty'));
                this._wifiEmptyLbl.show();
            }
            for (let i = 0; i < this._wifiSlots.length; i++) {
                this._wifiSlots[i].ap = null;
                this._wifiSlots[i].row.hide();
            }
            return;
        }
        if (this._wifiEmptyLbl) {
            this._wifiEmptyLbl.hide();
        }
        for (let i = 0; i < this._wifiSlots.length; i++) {
            const slot = this._wifiSlots[i];
            const ap = list[i];
            if (!ap) {
                slot.ap = null;
                slot.row.hide();
                continue;
            }
            slot.ap = ap;
            slot.ssidLbl.text(ap.ssid);
            const parts = [];
            parts.push(ap.signal + '%');
            parts.push(ap.secured ? t('network.wifi.secured') : t('network.wifi.open'));
            if (ap.ssid === this._wifiSsid) {
                parts.push(t('network.wifi.connected'));
                slot.row.bgColor(0xe8f0ff);
            } else {
                slot.row.bgColor(theme.pageBg);
            }
            slot.metaLbl.text(parts.join(' · '));
            slot.row.show();
        }
    }

    /**
     * @param {{ ok: boolean, error?: string, message?: string }} result
     * @returns {string}
     */
    _saveErrorMessage(result) {
        if (!result) {
            return t('network.saveRequired');
        }
        if (result.error) {
            const key = 'network.error.' + result.error;
            const localized = t(key);
            if (localized !== key) {
                return localized;
            }
        }
        return result.message || t('network.saveRequired');
    }

    async _onSave() {
        keyboard.hideAll();

        if (this._type === 'cellular') {
            const cellularResult = await networkStore.save({ type: 'cellular' });
            if (!cellularResult.ok) {
                popup.showError(this._saveErrorMessage(cellularResult));
                return;
            }
            this._onSaveSuccess();
            return;
        }

        const payload = {
            type: this._type,
            ipMode: this._ipMode,
            ip: this._readInput(this._ipInput),
            mask: this._readInput(this._maskInput),
            gateway: this._readInput(this._gatewayInput),
            dns: this._readInput(this._dnsInput),
            wifiSsid: this._wifiSsid,
        };
        const result = await networkStore.save(payload);
        if (!result.ok) {
            popup.showError(this._saveErrorMessage(result));
            return;
        }
        this._ipMode = payload.ipMode === 'static' ? 'static' : 'dhcp';
        this._type = payload.type;
        this._refreshIpModeStyles();
        this._refreshTypeStyles();
        this._refreshIpFieldsEditable();
        this._onSaveSuccess();
    }
}
