/**
 * @layer    view
 * @module   device_section_page
 * @fires    none
 * @listens  none
 * @depends  dxUi,BaseView,font,layout,theme,page_header,i18n,device_store
 *
 * 设备信息各大类独立子页：系统信息 / 数据容量 / 设备二维码。
 */

import dxui from '../../../../dxmodules/dxUi.js';
import BaseView from '../base_view.js';
import font from '../../components/font.js';
import layout from '../../components/layout.js';
import theme from '../../components/theme.js';
import pageHeader from '../../components/page_header.js';
import { t } from '../../i18n/index.js';
import deviceStore from './device_store.js';

/** 信息行高 */
const ROW_H = 96;
/** 行间距 */
const ROW_GAP = 12;
/** 二维码边长（设计稿） */
const QR_SIDE = 320;

/** 系统信息字段 */
const SYSTEM_FIELDS = ['sn', 'firmwareVersion', 'firmwareDate'];

/** 数据容量字段 */
const CAPACITY_FIELDS = [
    'totalSpaceMb',
    'usedSpaceMb',
    'freeSpaceMb',
    'personCount',
    'faceWhitelistCount',
    'passwordWhitelistCount',
    'cardWhitelistCount',
    'fingerprintWhitelistCount',
    'passRecordCount',
];

class DeviceSectionPage extends BaseView {
    /**
     * @param {string} routeName
     * @param {'system'|'capacity'|'qrcode'} sectionId
     * @param {string} titleKey
     */
    constructor(routeName, sectionId, titleKey) {
        super(routeName);
        this._sectionId = sectionId;
        this._titleKey = titleKey;
        this._header = null;
        this._content = null;
        /** @type {{ key: string, titleLbl: object, valueLbl: object }[]} */
        this._infoRows = [];
        /** @type {object|null} */
        this._qrNative = null;
        /** @type {object|null} */
        this._qrHintLbl = null;
        /** @type {string} */
        this._sn = '';
    }

    onCreate() {
        this.root = dxui.View.build('page_' + this.name, dxui.Utils.LAYER.MAIN);
        this.root.setSize(layout.width, layout.height);
        layout.clearStyle(this.root);
        this.root.bgColor(theme.pageBg);
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
        // 标题可先刷；数值等 Command 查询完成后再填。
        this._refreshLabels();
        const self = this;
        this._loadFromStore().catch(function () {
            self._sn = '';
        });
    }

    _buildBody() {
        const top = pageHeader.contentTop();
        const contentH = layout.height - top;
        const needScroll = this._sectionId === 'capacity';

        this._content = dxui.View.build(this.name + '_content', this.root);
        this._content.setSize(layout.width, contentH);
        this._content.setPos(0, top);
        layout.clearStyle(this._content);
        this._content.bgColor(0xf5f5f5);
        this._content.bgOpa(100);
        this._content.scroll(needScroll);
        this._content.flexFlow(dxui.Utils.FLEX_FLOW.COLUMN);
        this._content.flexAlign(
            dxui.Utils.FLEX_ALIGN.START,
            dxui.Utils.FLEX_ALIGN.CENTER,
            dxui.Utils.FLEX_ALIGN.CENTER
        );
        this._content.padTop(layout.y(16));
        this._content.padBottom(layout.y(32));
        this._content.obj.lvObjSetStylePadGap(
            layout.y(ROW_GAP),
            dxui.Utils.ENUM._LV_STYLE_STATE_CMP_SAME
        );

        this._infoRows = [];

        if (this._sectionId === 'system') {
            for (let i = 0; i < SYSTEM_FIELDS.length; i++) {
                this._buildInfoRow(SYSTEM_FIELDS[i]);
            }
            return;
        }
        if (this._sectionId === 'capacity') {
            for (let j = 0; j < CAPACITY_FIELDS.length; j++) {
                this._buildInfoRow(CAPACITY_FIELDS[j]);
            }
            return;
        }
        if (this._sectionId === 'qrcode') {
            this._buildQrBlock();
        }
    }

    /**
     * @param {string} fieldKey
     */
    _buildInfoRow(fieldKey) {
        const row = dxui.View.build(this.name + '_row_' + fieldKey, this._content);
        layout.clearStyle(row);
        row.setSize(layout.x(720), layout.y(ROW_H));
        row.bgColor(theme.pageBg);
        row.bgOpa(100);
        row.radius(layout.x(14));
        row.scroll(false);
        row.clickable(false);

        const titleLbl = dxui.Label.build(this.name + '_title_' + fieldKey, row);
        titleLbl.setSize(layout.x(360), layout.y(40));
        titleLbl.align(dxui.Utils.ALIGN.LEFT_MID, layout.x(24), 0);
        titleLbl.textFont(font.get(layout.fontSize(26)));
        titleLbl.textColor(theme.textPrimary);
        titleLbl.textAlign(dxui.Utils.TEXT_ALIGN.LEFT);

        const valueLbl = dxui.Label.build(this.name + '_val_' + fieldKey, row);
        valueLbl.setSize(layout.x(300), layout.y(40));
        valueLbl.align(dxui.Utils.ALIGN.RIGHT_MID, -layout.x(24), 0);
        valueLbl.textFont(font.get(layout.fontSize(24)));
        valueLbl.textColor(theme.textSecondary);
        valueLbl.textAlign(dxui.Utils.TEXT_ALIGN.RIGHT);

        this._infoRows.push({
            key: fieldKey,
            titleLbl: titleLbl,
            valueLbl: valueLbl,
        });
    }

    /**
     * 设备 SN 二维码（内容为 SN）。
     */
    _buildQrBlock() {
        const qrSide = layout.x(QR_SIDE);
        const pad = layout.y(40);
        const hintH = layout.y(48);
        const panelH = qrSide + pad * 2 + hintH + layout.y(16);

        const panel = dxui.View.build(this.name + '_qr_panel', this._content);
        layout.clearStyle(panel);
        panel.setSize(layout.x(720), panelH);
        panel.bgColor(theme.pageBg);
        panel.bgOpa(100);
        panel.radius(layout.x(14));
        panel.scroll(false);
        panel.clickable(false);

        const qrBox = dxui.View.build(this.name + '_qr_box', panel);
        layout.clearStyle(qrBox);
        qrBox.setSize(qrSide, qrSide);
        qrBox.align(dxui.Utils.ALIGN.TOP_MID, 0, pad);
        qrBox.bgOpa(0);

        this._qrNative = dxui.Utils.GG.NativeBasicComponent.lvQrcodeCreate(
            qrBox.obj,
            qrSide,
            0x000000,
            0xffffff
        );

        this._qrHintLbl = dxui.Label.build(this.name + '_qr_hint', panel);
        this._qrHintLbl.setSize(layout.x(680), hintH);
        this._qrHintLbl.align(dxui.Utils.ALIGN.BOTTOM_MID, 0, -layout.y(20));
        this._qrHintLbl.textFont(font.get(layout.fontSize(24)));
        this._qrHintLbl.textColor(theme.textSecondary);
        this._qrHintLbl.textAlign(dxui.Utils.TEXT_ALIGN.CENTER);
    }

    async _loadFromStore() {
        const info = await deviceStore.load();
        this._sn = info.sn || '';

        if (this._sectionId === 'qrcode') {
            if (this._qrNative && this._sn) {
                dxui.Utils.GG.NativeBasicComponent.lvQrcodeUpdate(this._qrNative, this._sn);
            }
            if (this._qrHintLbl) {
                this._qrHintLbl.text(this._sn ? ('SN: ' + this._sn) : '');
            }
            return;
        }

        const values = {
            sn: this._sn,
            firmwareVersion: info.firmwareVersion || '',
            firmwareDate: info.firmwareDate || '',
            totalSpaceMb: this._formatMb(info.totalSpaceMb),
            usedSpaceMb: this._formatMb(info.usedSpaceMb),
            freeSpaceMb: this._formatMb(info.freeSpaceMb),
            personCount: this._formatCount(info.personCount),
            faceWhitelistCount: this._formatCount(info.faceWhitelistCount),
            passwordWhitelistCount: this._formatCount(info.passwordWhitelistCount),
            cardWhitelistCount: this._formatCount(info.cardWhitelistCount),
            fingerprintWhitelistCount: this._formatCount(info.fingerprintWhitelistCount),
            passRecordCount: this._formatCount(info.passRecordCount),
        };

        for (let i = 0; i < this._infoRows.length; i++) {
            const row = this._infoRows[i];
            const text = values[row.key];
            row.valueLbl.text(text == null ? '' : String(text));
        }
    }

    /**
     * @param {number} value
     * @returns {string}
     */
    _formatMb(value) {
        const n = value == null || isNaN(value) ? 0 : Number(value);
        return n + ' MB';
    }

    /**
     * @param {number} value
     * @returns {string}
     */
    _formatCount(value) {
        const n = value == null || isNaN(value) ? 0 : Number(value);
        return String(n);
    }

    _refreshLabels() {
        for (let i = 0; i < this._infoRows.length; i++) {
            const row = this._infoRows[i];
            row.titleLbl.text(t('device.field.' + row.key));
        }
    }
}

/**
 * 注册设备信息各大类子页。
 * @returns {DeviceSectionPage[]}
 */
export function createDeviceSectionPages() {
    const items = [
        ['settings_device_system', 'system', 'device.section.system'],
        ['settings_device_capacity', 'capacity', 'device.section.capacity'],
        ['settings_device_qrcode', 'qrcode', 'device.section.qrcode'],
    ];
    const pages = [];
    for (let i = 0; i < items.length; i++) {
        const item = items[i];
        pages.push(new DeviceSectionPage(item[0], item[1], item[2]));
    }
    return pages;
}

export default DeviceSectionPage;
