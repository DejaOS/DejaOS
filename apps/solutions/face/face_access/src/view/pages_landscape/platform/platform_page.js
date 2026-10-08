/**
 * @layer view
 * @module platform_page
 * @depends dxUi,BaseView,font,layout,theme,page_header,keyboard,popup,i18n,platform_store,setting_pager
 *
 * WebRTC配置和网络诊断页。入口由能力标志控制，页面只通过Command访问Service。
 * 横屏：白底 + 透明分割线行；WebRTC 右上角保存；诊断为行内动作钮 + 内嵌结果区。
 */

import dxui from '../../../../dxmodules/dxUi.js';
import BaseView from '../../pages/base_view.js';
import font from '../../components/font.js';
import layout from '../../components/layout.js';
import theme from '../../components/theme.js';
import pageHeader from '../../components/page_header.js';
import keyboard from '../../components/keyboard.js';
import popup from '../../components/popup.js';
import { t } from '../../i18n/index.js';
import platformStore from '../../pages/platform/platform_store.js';
import { CONTENT_W } from '../ls_metrics.js';
import {
    SETTING_PAGE_SIZE,
    settingPageRowH,
    attachSettingPager,
    styleSettingRow,
    buildTopSaveButton,
} from '../../components/setting_pager.js';

const SEG_H = 68;
const ACTION_KEYS = ['ping', 'diagnose'];

export default class PlatformPage extends BaseView {
    constructor(options) {
        const mode = options && options.mode === 'diagnosis' ? 'diagnosis' : 'webrtc';
        super(mode === 'diagnosis' ? 'settings_network_diag' : 'settings_webrtc');
        this._mode = mode;
        this._header = null;
        this._content = null;
        this._listContent = null;
        this._listW = 0;
        this._rowH = 0;
        this._labels = [];
        this._buttons = [];
        this._keyboards = [];
        this._listRows = [];
        this._pager = null;
        this._saveBtn = null;
        this._saveLbl = null;
        this._server = null;
        this._port = null;
        this._target = null;
        this._status = null;
        this._serno = null;
        this._result = null;
        this._resultBox = null;
        this._resultLabelW = 0;
        this._resultBoxH = 0;
        this._contentH = 0;
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
            titleKey: this._mode === 'diagnosis' ? 'connection.section.diagnosis' : 'connection.section.webrtc',
        });
        this._buildBody();
    }

    onEnter() {
        this._header.refresh();
        this._refreshText();
        if (this._mode === 'webrtc') this._loadWebrtc();
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
        this._contentH = contentH;
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
        // 诊断页列表仅占上方两行，避免盖住结果区抢滚动
        const listH = this._mode === 'diagnosis'
            ? this._rowH * 2
            : this._rowH * SETTING_PAGE_SIZE;
        this._listContent.setSize(this._listW, listH);
        this._listContent.setPos(listX, 0);
        this._listContent.bgOpa(0);
        this._listContent.scroll(false);

        this._labels = [];
        this._buttons = [];
        this._keyboards = [];
        this._listRows = [];

        if (this._mode === 'webrtc') {
            this._status = this._buildInfo('webrtcStatus');
            this._serno = this._buildInfo('webrtcSerno');
            this._server = this._buildInput('webrtcServer', keyboard.MODE.ENGLISH);
            this._port = this._buildInput('webrtcPort', keyboard.MODE.NUMBER);

            const save = buildTopSaveButton(this.root, this.name + '_save', function () {
                self._saveWebrtc();
            });
            this._saveBtn = save.button;
            this._saveLbl = save.label;

            this._pager = attachSettingPager(this.root, {
                idPrefix: this.name,
                rowH: this._rowH,
                getRows: function () {
                    const out = [];
                    for (let i = 0; i < self._listRows.length; i++) {
                        out.push(self._listRows[i]);
                    }
                    return out;
                },
            });
        } else {
            this._target = this._buildInput('pingTarget', keyboard.MODE.ENGLISH);
            this._target.text('223.5.5.5');
            this._buildActionRow();
            this._result = this._buildResult(listX);
            // 诊断页行少且带结果区，固定排布；整页不滚动
            this._layoutDiagnosisRows();
        }
    }

    _layoutDiagnosisRows() {
        for (let i = 0; i < this._listRows.length; i++) {
            const row = this._listRows[i];
            row.show();
            row.align(dxui.Utils.ALIGN.TOP_LEFT, 0, i * this._rowH);
        }
    }

    /**
     * @param {string} key
     * @param {object} row
     */
    _registerListRow(key, row) {
        this._listRows.push(row);
    }

    /**
     * @param {string} key
     * @returns {object}
     */
    _buildRow(key) {
        const row = dxui.View.build(this.name + '_row_' + key, this._listContent);
        layout.clearStyle(row);
        row.setSize(this._listW, this._rowH);
        row.scroll(false);
        styleSettingRow(row);
        this._registerListRow(key, row);

        const label = dxui.Label.build(this.name + '_label_' + key, row);
        label.setSize(layout.x(260), layout.y(42));
        label.align(dxui.Utils.ALIGN.LEFT_MID, layout.x(24), 0);
        label.textFont(font.get(layout.fontSize(26)));
        label.textColor(theme.textPrimary);
        label.textAlign(dxui.Utils.TEXT_ALIGN.LEFT);
        this._labels.push({ key: key, label: label });
        return row;
    }

    /**
     * @param {string} key
     * @returns {object}
     */
    _buildInfo(key) {
        const row = this._buildRow(key);
        const value = dxui.Label.build(this.name + '_value_' + key, row);
        value.setSize(layout.x(400), layout.y(48));
        value.align(dxui.Utils.ALIGN.RIGHT_MID, -layout.x(24), 0);
        value.textFont(font.get(layout.fontSize(24)));
        value.textColor(theme.textSecondary);
        value.textAlign(dxui.Utils.TEXT_ALIGN.RIGHT);
        value.longMode(dxui.Utils.LABEL_LONG_MODE.SCROLL_CIRCULAR);
        value.text('-');
        return value;
    }

    /**
     * @param {string} key
     * @param {number} mode
     * @returns {object}
     */
    _buildInput(key, mode) {
        const row = this._buildRow(key);

        const inputBox = dxui.View.build(this.name + '_box_' + key, row);
        layout.clearStyle(inputBox);
        inputBox.setSize(layout.x(400), layout.y(64));
        inputBox.align(dxui.Utils.ALIGN.RIGHT_MID, -layout.x(20), 0);
        inputBox.bgColor(0xf5f5f5);
        inputBox.bgOpa(100);
        inputBox.radius(layout.x(12));
        inputBox.borderWidth(layout.x(2));
        inputBox.setBorderColor(0xdcdcdc);
        inputBox.scroll(false);

        const input = dxui.Textarea.build(this.name + '_input_' + key, inputBox);
        layout.clearStyle(input);
        input.setSize(layout.x(360), layout.y(48));
        input.align(dxui.Utils.ALIGN.CENTER, 0, 0);
        input.bgOpa(0);
        input.padAll(0);
        input.borderWidth(0);
        input.setOneLine(true);
        input.setMaxLength(253);
        input.setCursorClickPos(true);
        input.textFont(font.get(layout.fontSize(25)));
        input.textColor(theme.textPrimary);
        input.setAlign(dxui.Utils.TEXT_ALIGN.LEFT);
        input.text('');

        const kb = keyboard.bind(null, input, {
            mode: mode,
            lockMode: mode === keyboard.MODE.NUMBER ? mode : undefined,
        });
        this._keyboards.push(kb);
        return input;
    }

    /** Ping / 联合诊断：同排分段式动作钮 */
    _buildActionRow() {
        const row = dxui.View.build(this.name + '_row_actions', this._listContent);
        layout.clearStyle(row);
        row.setSize(this._listW, this._rowH);
        row.scroll(false);
        styleSettingRow(row);
        this._registerListRow('actions', row);

        const count = ACTION_KEYS.length;
        const gap = layout.x(16);
        const sidePad = layout.x(24);
        const controlW = this._listW - sidePad * 2;
        const btnW = Math.floor((controlW - gap * (count - 1)) / count);
        const btnH = Math.min(layout.y(SEG_H), this._rowH - layout.y(12));
        const btnY = Math.floor((this._rowH - btnH) / 2);
        const handlers = {
            ping: this._ping.bind(this),
            diagnose: this._diagnose.bind(this),
        };

        for (let i = 0; i < count; i++) {
            const key = ACTION_KEYS[i];
            const btn = dxui.Button.build(this.name + '_btn_' + key, row);
            btn.setSize(btnW, btnH);
            btn.setPos(sidePad + i * (btnW + gap), btnY);
            btn.bgColor(theme.activeBg);
            btn.radius(layout.x(12));
            btn.borderWidth(0);
            btn.on(dxui.Utils.EVENT.CLICK, handlers[key]);

            const label = dxui.Label.build(this.name + '_btn_label_' + key, btn);
            label.textFont(font.get(layout.fontSize(26)));
            label.textColor(theme.textOnDark);
            label.align(dxui.Utils.ALIGN.CENTER, 0, 0);
            this._buttons.push({ key: key, label: label });
        }
    }

    /**
     * 结果区压在内容区剩余高度内，整页不滑；仅框内可滑。
     * @param {number} listX
     * @returns {object}
     */
    _buildResult(listX) {
        const topOffset = this._rowH * 2 + layout.y(12);
        const bottomPad = layout.y(20);
        const boxH = Math.max(layout.y(120), this._contentH - topOffset - bottomPad);
        this._resultBoxH = boxH;
        this._resultLabelW = this._listW - layout.x(48);

        const box = dxui.View.build(this.name + '_result_box', this._content);
        layout.clearStyle(box);
        box.setSize(this._listW, boxH);
        box.setPos(listX, topOffset);
        box.bgColor(0xfafafa);
        box.bgOpa(100);
        box.radius(0);
        box.borderWidth(1);
        box.setBorderColor(0xd8d8d8);
        box.scroll(true);
        this._resultBox = box;

        const label = dxui.Label.build(this.name + '_result', box);
        label.setSize(this._resultLabelW, boxH - layout.y(40));
        label.align(dxui.Utils.ALIGN.TOP_LEFT, layout.x(24), layout.y(20));
        label.textFont(font.get(layout.fontSize(23)));
        label.textColor(theme.textPrimary);
        label.longMode(dxui.Utils.LABEL_LONG_MODE.WRAP);
        label.text(t('platform.diag.idle'));
        return label;
    }

    /**
     * 写入结果文案，并按行数抬高标签，使超出部分在结果框内滚动。
     * @param {string} text
     */
    _setResultText(text) {
        const str = String(text || '');
        if (!this._result) {
            return;
        }
        this._result.text(str);
        const charsPerLine = Math.max(12, Math.floor(this._resultLabelW / layout.x(14)));
        const rawLines = str.split('\n');
        let lines = 0;
        for (let i = 0; i < rawLines.length; i++) {
            const len = rawLines[i].length;
            lines += Math.max(1, Math.ceil(len / charsPerLine));
        }
        const minH = Math.max(layout.y(40), this._resultBoxH - layout.y(40));
        const h = Math.max(minH, lines * layout.y(30) + layout.y(8));
        this._result.setSize(this._resultLabelW, h);
        if (this._resultBox && typeof this._resultBox.scrollTo === 'function') {
            this._resultBox.scrollTo(0, 0);
        }
    }

    _read(input) {
        try { return String(input.text() || '').trim(); } catch (_e) { return ''; }
    }

    async _loadWebrtc() {
        try {
            const data = await platformStore.loadWebrtc();
            this._server.text(data.server || '');
            this._port.text(String(data.port || ''));
            this._status.text(t(data.connected ? 'platform.status.connected' : 'platform.status.disconnected'));
            this._serno.text(data.serno || '-');
        } catch (error) {
            popup.showError(error.message || t('platform.loadFailed'));
        }
    }

    async _saveWebrtc() {
        keyboard.hideAll();
        const result = await platformStore.saveWebrtc(this._read(this._server), this._read(this._port));
        if (!result.ok) return popup.showError(result.message);
        popup.showSuccess(t('platform.saveSuccess'));
        await this._loadWebrtc();
    }

    async _ping() {
        keyboard.hideAll();
        this._setResultText(t('platform.diag.running'));
        try {
            const result = await platformStore.ping(this._read(this._target));
            this._setResultText(this._formatPing(result));
        } catch (error) {
            this._setResultText(error.message || t('platform.diag.failed'));
        }
    }

    async _diagnose() {
        keyboard.hideAll();
        this._setResultText(t('platform.diag.running'));
        try {
            const result = await platformStore.diagnose();
            const lines = [t('platform.diag.overall') + ': ' + t('platform.diag.' + result.overall)];
            for (let i = 0; i < result.items.length; i++) {
                const item = result.items[i];
                lines.push(t('platform.diag.item.' + item.key) + ': ' + t('platform.diag.' + item.status)
                    + (item.target ? '  ' + item.target : '') + (item.message ? '  ' + item.message : ''));
            }
            this._setResultText(lines.join('\n'));
        } catch (error) {
            this._setResultText(error.message || t('platform.diag.failed'));
        }
    }

    _formatPing(result) {
        return t(result.success ? 'platform.diag.success' : 'platform.diag.failed')
            + '\n' + t('platform.diag.target') + ': ' + (result.target || '-')
            + '\nIP: ' + (result.address || '-')
            + '\n' + t('platform.diag.latency') + ': ' + (result.latencyMs == null ? '-' : result.latencyMs + 'ms')
            + '\n' + t('platform.diag.loss') + ': ' + result.packetLoss + '%'
            + (result.message ? '\n' + result.message : '');
    }

    _refreshText() {
        for (let i = 0; i < this._labels.length; i++) this._labels[i].label.text(t('platform.field.' + this._labels[i].key));
        for (let j = 0; j < this._buttons.length; j++) this._buttons[j].label.text(t('platform.action.' + this._buttons[j].key));
        if (this._saveLbl) this._saveLbl.text(t('platform.action.save'));
    }
}
