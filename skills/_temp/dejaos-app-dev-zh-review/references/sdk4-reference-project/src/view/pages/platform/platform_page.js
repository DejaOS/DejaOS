/**
 * @layer view
 * @module platform_page
 * @depends dxUi,BaseView,font,layout,theme,page_header,keyboard,popup,i18n,platform_store
 *
 * WebRTC配置和网络诊断页。入口由能力标志控制，页面只通过Command访问Service。
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
import platformStore from './platform_store.js';

const ROW_H = 96;

export default class PlatformPage extends BaseView {
    constructor(options) {
        const mode = options && options.mode === 'diagnosis' ? 'diagnosis' : 'webrtc';
        super(mode === 'diagnosis' ? 'settings_network_diag' : 'settings_webrtc');
        this._mode = mode;
        this._header = null;
        this._content = null;
        this._labels = [];
        this._server = null;
        this._port = null;
        this._target = null;
        this._status = null;
        this._serno = null;
        this._result = null;
        this._buttons = [];
        this._keyboards = [];
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
        const top = pageHeader.contentTop();
        this._content = dxui.View.build(this.name + '_content', this.root);
        this._content.setSize(layout.width, layout.height - top);
        this._content.setPos(0, top);
        layout.clearStyle(this._content);
        this._content.bgColor(0xf5f5f5);
        this._content.bgOpa(100);
        this._content.scroll(true);
        this._content.flexFlow(dxui.Utils.FLEX_FLOW.COLUMN);
        this._content.flexAlign(dxui.Utils.FLEX_ALIGN.START, dxui.Utils.FLEX_ALIGN.CENTER, dxui.Utils.FLEX_ALIGN.CENTER);
        this._content.padTop(layout.y(16));
        this._content.padBottom(layout.y(32));
        this._content.obj.lvObjSetStylePadGap(layout.y(12), dxui.Utils.ENUM._LV_STYLE_STATE_CMP_SAME);

        if (this._mode === 'webrtc') {
            this._status = this._buildInfo('webrtcStatus');
            this._serno = this._buildInfo('webrtcSerno');
            this._server = this._buildInput('webrtcServer', keyboard.MODE.ENGLISH);
            this._port = this._buildInput('webrtcPort', keyboard.MODE.NUMBER);
            this._buildButton('save', this._saveWebrtc.bind(this));
        } else {
            this._target = this._buildInput('pingTarget', keyboard.MODE.ENGLISH);
            this._target.text('223.5.5.5');
            this._buildButton('ping', this._ping.bind(this));
            this._buildButton('diagnose', this._diagnose.bind(this));
            this._result = this._buildResult();
        }
    }

    _buildRow(key) {
        const row = dxui.View.build(this.name + '_row_' + key, this._content);
        layout.clearStyle(row);
        row.setSize(layout.x(720), layout.y(ROW_H));
        row.bgColor(theme.pageBg);
        row.bgOpa(100);
        row.radius(layout.x(14));
        row.scroll(false);
        const label = dxui.Label.build(this.name + '_label_' + key, row);
        label.setSize(layout.x(260), layout.y(42));
        label.align(dxui.Utils.ALIGN.LEFT_MID, layout.x(24), 0);
        label.textFont(font.get(layout.fontSize(26)));
        label.textColor(theme.textPrimary);
        this._labels.push({ key: key, label: label });
        return row;
    }

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

    _buildInput(key, mode) {
        const row = this._buildRow(key);
        const input = dxui.Textarea.build(this.name + '_input_' + key, row);
        input.setSize(layout.x(400), layout.y(64));
        input.align(dxui.Utils.ALIGN.RIGHT_MID, -layout.x(20), 0);
        input.setOneLine(true);
        input.setMaxLength(253);
        input.textFont(font.get(layout.fontSize(25)));
        input.textColor(theme.textPrimary);
        input.bgColor(0xf5f5f5);
        input.bgOpa(100);
        input.radius(layout.x(12));
        input.borderWidth(layout.x(2));
        input.setBorderColor(0xdcdcdc);
        input.text('');
        const kb = keyboard.bind(null, input, { mode: mode, lockMode: mode === keyboard.MODE.NUMBER ? mode : undefined });
        this._keyboards.push(kb);
        return input;
    }

    _buildButton(key, handler) {
        const btn = dxui.Button.build(this.name + '_btn_' + key, this._content);
        btn.setSize(layout.x(720), layout.y(82));
        btn.bgColor(theme.activeBg);
        btn.radius(layout.x(14));
        btn.borderWidth(0);
        btn.on(dxui.Utils.EVENT.CLICK, handler);
        const label = dxui.Label.build(this.name + '_btn_label_' + key, btn);
        label.textFont(font.get(layout.fontSize(28)));
        label.textColor(theme.textOnDark);
        label.align(dxui.Utils.ALIGN.CENTER, 0, 0);
        this._buttons.push({ key: key, label: label });
    }

    _buildResult() {
        const box = dxui.View.build(this.name + '_result_box', this._content);
        layout.clearStyle(box);
        box.setSize(layout.x(720), layout.y(520));
        box.bgColor(theme.pageBg);
        box.bgOpa(100);
        box.radius(layout.x(14));
        box.scroll(false);
        const label = dxui.Label.build(this.name + '_result', box);
        label.setSize(layout.x(672), layout.y(472));
        label.align(dxui.Utils.ALIGN.TOP_LEFT, layout.x(24), layout.y(24));
        label.textFont(font.get(layout.fontSize(23)));
        label.textColor(theme.textPrimary);
        label.longMode(dxui.Utils.LABEL_LONG_MODE.WRAP);
        label.text(t('platform.diag.idle'));
        return label;
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
        this._result.text(t('platform.diag.running'));
        try {
            const result = await platformStore.ping(this._read(this._target));
            this._result.text(this._formatPing(result));
        } catch (error) {
            this._result.text(error.message || t('platform.diag.failed'));
        }
    }

    async _diagnose() {
        keyboard.hideAll();
        this._result.text(t('platform.diag.running'));
        try {
            const result = await platformStore.diagnose();
            const lines = [t('platform.diag.overall') + ': ' + t('platform.diag.' + result.overall)];
            for (let i = 0; i < result.items.length; i++) {
                const item = result.items[i];
                lines.push(t('platform.diag.item.' + item.key) + ': ' + t('platform.diag.' + item.status)
                    + (item.target ? '  ' + item.target : '') + (item.message ? '  ' + item.message : ''));
            }
            this._result.text(lines.join('\n'));
        } catch (error) {
            this._result.text(error.message || t('platform.diag.failed'));
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
    }
}